import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { createApp } from '../src/app';
import type { AppContext, Env } from '../src/env';
import { errorResponse } from '../src/shared/errors';

const marker = 'SECRET_BG25_DO_NOT_RECORD';
const base = {
  CAPTURE_TOKEN: 'dummy-capture-secret',
  ADMIN_TOKEN: 'dummy-admin-secret',
  LOCAL_WORKER_TOKEN: 'dummy-worker-secret',
} as Env;

const login = (
  bindings: Env,
  body: unknown,
  extra: Record<string, string> = {},
) =>
  createApp().request(
    'https://inbox.example.test/api/v1/admin/session',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify(body),
    },
    bindings,
  );

afterEach(() => vi.restoreAllMocks());

describe('BG-25 login admission', () => {
  it('bounds repeated attempts per fixed hashed client key and preserves a distinct client', async () => {
    const seen: string[] = [];
    const buckets = new Map<string, number>();
    const limiter = {
      limit: async ({ key }: { key: string }) => {
        seen.push(key);
        const next = (buckets.get(key) ?? 0) + 1;
        buckets.set(key, next);
        return { success: next <= 2 };
      },
    };
    const env = { ...base, LOGIN_RATE_LIMITER: limiter };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const status of [401, 401, 429]) {
      const response = await login(
        env,
        { token: marker },
        { 'CF-Connecting-IP': '192.0.2.5' },
      );
      expect(response.status).toBe(status);
      if (status === 429) {
        expect(response.headers.get('retry-after')).toBe('60');
        expect(await response.json()).toMatchObject({
          error: { code: 'LOGIN_RATE_LIMITED' },
        });
      }
    }
    expect(
      (await login(env, { token: marker }, { 'CF-Connecting-IP': '192.0.2.6' }))
        .status,
    ).toBe(401);
    expect(seen[0]).toEqual(seen[1]);
    expect(seen[0]).not.toEqual(seen[3]);
    expect(seen[0]).toMatch(/^admin-login:[a-f0-9]{32}$/);
    expect(JSON.stringify(seen)).not.toContain(marker);
    expect(JSON.stringify(seen)).not.toContain('192.0.2.5');
  });

  it('rejects cross-origin login, including null Origin, without limiter calls', async () => {
    const limit = vi.fn(async () => ({ success: true }));
    const env = { ...base, LOGIN_RATE_LIMITER: { limit } };
    for (const origin of ['https://evil.example.test', 'null']) {
      const response = await login(
        env,
        { token: base.ADMIN_TOKEN },
        { Origin: origin },
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        error: { code: 'ORIGIN_FORBIDDEN' },
      });
    }
    expect(limit).not.toHaveBeenCalled();
    const allowed = await login(
      env,
      { token: base.ADMIN_TOKEN },
      { Origin: 'https://inbox.example.test' },
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('fails closed on real hosts without an edge binding or when limiter errors', async () => {
    const response = await createApp().request(
      'https://recollect-flow.recollectflow.workers.dev/api/v1/admin/session',
      { method: 'POST', body: JSON.stringify({ token: base.ADMIN_TOKEN }) },
      base,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'AUTH_RATE_LIMIT_UNAVAILABLE' },
    });
    const broken = await login(
      {
        ...base,
        LOGIN_RATE_LIMITER: {
          limit: async () => {
            throw new Error(marker);
          },
        },
      },
      { token: base.ADMIN_TOKEN },
    );
    expect(broken.status).toBe(503);
    expect(JSON.stringify(await broken.json())).not.toContain(marker);
  });
});

describe('BG-25 bounded bodies and safe diagnostics', () => {
  it('rejects oversized JSON and malformed content before capture persistence', async () => {
    const app = createApp();
    const response = await app.request(
      '/api/v1/captures',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + base.CAPTURE_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shared_text: marker.repeat(200_000) }),
      },
      base,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: 'PAYLOAD_TOO_LARGE' },
    });
  });

  it('enforces raw upload admission even when Content-Length is absent', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2000));
        controller.close();
      },
    });
    const request = new Request(
      'http://localhost/api/v1/uploads/missing/content',
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + base.CAPTURE_TOKEN,
          'Content-Type': 'application/pdf',
        },
        body: stream,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' },
    );
    const response = await createApp().fetch(request, {
      ...base,
      MAX_ATTACHMENT_BYTES: '1000',
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: 'PAYLOAD_TOO_LARGE' },
    });
  });

  it('bounds streaming Shortcut multipart before form parsing', async () => {
    const bytes = new Uint8Array(1_050_000);
    const request = new Request(
      'http://localhost/api/v1/shortcut/captures',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + base.CAPTURE_TOKEN,
          'Content-Type': 'multipart/form-data; boundary=test',
        },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        duplex: 'half',
      } as RequestInit & { duplex: 'half' },
    );
    const response = await createApp().fetch(request, {
      ...base,
      MAX_ATTACHMENT_BYTES: '1000',
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: 'PAYLOAD_TOO_LARGE' },
    });
  });

  it('permits non-browser capture-bearer validation without login throttling', async () => {
    const response = await createApp().request(
      '/api/v1/captures',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + base.CAPTURE_TOKEN,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
      { ...base, LOGIN_RATE_LIMITER: { limit: () => { throw new Error('login limiter used on capture'); } } },
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('never logs an upstream exception, raw path segment or URL query marker', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = new Hono<AppContext>();
    app.use('*', async (c, next) => {
      c.set('requestId', 'bg25-test');
      await next();
    });
    app.get('/throw', () => {
      throw new Error(marker + '?token=' + marker);
    });
    app.onError((caught, c) => errorResponse(c, caught));
    const failure = await app.request('/throw', {}, base);
    expect(failure.status).toBe(500);
    expect(JSON.stringify(await failure.json())).not.toContain(marker);
    expect(JSON.stringify(error.mock.calls)).not.toContain(marker);
    await createApp().request(
      '/api/v1/unknown/' + marker + '?token=' + marker,
      {},
      base,
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(marker);
  });
});
