import { applyD1Migrations, env } from 'cloudflare:test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { Env } from '../src/env';

describe('BG24 rotation with canonical D1 capture data', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replays the same operation across capture rotation without changing canonical data', async () => {
    const start = Date.parse('2026-10-15T20:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp();
    const payload = {
      idempotency_key: 'bg24-rotation-capture-0001',
      source_type: 'note',
      source_app: 'bg24-dummy-rehearsal',
      shared_text: 'Synthetic durable capture across rotation.',
      privacy_level: 'personal',
      captured_at: new Date(start).toISOString(),
      client: { name: 'bg24-rehearsal', version: '1' },
    };
    const request = (token: string, bindings: Env) =>
      app.request(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        bindings,
      );
    const first = await request(env.CAPTURE_TOKEN, env);
    expect(first.status).toBe(201);
    const body = (await first.json()) as { data: { capture_id: string } };
    const id = body.data.capture_id;
    expect(id).toBeTruthy();
    const before = await env.DB.prepare('SELECT * FROM items WHERE id = ?1')
      .bind(id)
      .first();
    const eventsBefore = await env.DB.prepare(
      'SELECT * FROM capture_events WHERE item_id = ?1',
    )
      .bind(id)
      .all();
    const rotating = {
      ...env,
      CAPTURE_TOKEN_ID: 'capture-old',
      CAPTURE_TOKEN_NEXT: 'dummy-next-D1-capture',
      CAPTURE_TOKEN_ROTATION: JSON.stringify({
        next_id: 'capture-next',
        activate_at: new Date(start).toISOString(),
        expires_at: new Date(start + 60_000).toISOString(),
        actor: 'test-operator',
      }),
    };
    vi.setSystemTime(start + 60_000);
    expect((await request(env.CAPTURE_TOKEN, rotating)).status).toBe(401);
    const replay = await request(rotating.CAPTURE_TOKEN_NEXT, rotating);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({
      data: { capture_id: id, replayed: true },
    });
    const promoted = {
      ...env,
      CAPTURE_TOKEN: rotating.CAPTURE_TOKEN_NEXT,
      CAPTURE_TOKEN_ID: 'capture-next',
    };
    expect((await request(promoted.CAPTURE_TOKEN, promoted)).status).toBe(200);
    expect(
      await env.DB.prepare('SELECT * FROM items WHERE id = ?1')
        .bind(id)
        .first(),
    ).toEqual(before);
    expect(
      (
        await env.DB.prepare('SELECT * FROM capture_events WHERE item_id = ?1')
          .bind(id)
          .all()
      ).results,
    ).toEqual(eventsBefore.results);
    expect(
      await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM capture_events WHERE item_id = ?1',
      )
        .bind(id)
        .first('count'),
    ).toBe(1);
  });
});
