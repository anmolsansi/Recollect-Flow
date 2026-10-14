import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getSignedCookie } from 'hono/cookie';
import type { AppContext, Env } from '../src/env';
import { errorResponse } from '../src/shared/errors';
import { createApp } from '../src/app';
import {
  credentialSchedule,
  matchCredential,
  matchesCaptureToken,
  requireCaptureToken,
  requireAdminToken,
  requireLocalWorkerToken,
  requireAttachmentContentRead,
  SESSION_LIFETIME_MS,
} from '../src/shared/auth';

const T0 = Date.parse('2026-10-14T20:00:00Z');
const bindings = {
  CAPTURE_TOKEN: 'dummy-capture-old-secret',
  ADMIN_TOKEN: 'dummy-admin-old-secret',
  LOCAL_WORKER_TOKEN: 'dummy-worker-old-secret',
} as Env;

function rotating(overrides = {}) {
  return {
    ...bindings,
    CAPTURE_TOKEN_ID: 'capture-old',
    CAPTURE_TOKEN_NEXT: 'dummy-capture-next-secret',
    CAPTURE_TOKEN_ROTATION: JSON.stringify({
      next_id: 'capture-next',
      activate_at: new Date(T0).toISOString(),
      expires_at: new Date(T0 + SESSION_LIFETIME_MS).toISOString(),
      actor: 'test-operator',
      ...overrides,
    }),
  };
}

function adminRotating(overrides = {}) {
  return {
    ...bindings,
    ADMIN_TOKEN_ID: 'admin-old',
    ADMIN_TOKEN_NEXT: 'dummy-admin-next-secret',
    ADMIN_TOKEN_ROTATION: JSON.stringify({
      next_id: 'admin-next',
      activate_at: new Date(T0).toISOString(),
      expires_at: new Date(T0 + SESSION_LIFETIME_MS).toISOString(),
      actor: 'test-operator',
      ...overrides,
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function loginCookie(env: Env, token = env.ADMIN_TOKEN) {
  const response = await createApp().request(
    'https://inbox.example.test/api/v1/admin/session',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    },
    env,
  );
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

describe('bounded credential schedules', () => {
  it('keeps versioned next-key sessions valid through promotion with the same ID', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + 500);
    const cookie = await loginCookie(adminRotating());
    const promoted = {
      ...bindings,
      ADMIN_TOKEN: 'dummy-admin-next-secret',
      ADMIN_TOKEN_ID: 'admin-next',
    };
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    const app = createApp();
    expect(
      (
        await app.request(
          '/api/v1/admin/session',
          { headers: { Cookie: cookie } },
          promoted,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          '/api/v1/admin/session',
          { headers: { Cookie: cookie } },
          { ...promoted, ADMIN_TOKEN_ID: 'wrong-id' },
        )
      ).status,
    ).toBe(403);
  });
  it('signs old-token overlap login with the next admin key', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const env = adminRotating();
    const cookie = await loginCookie(env);
    const probe = new Hono();
    probe.get('/', async (c) =>
      c.json({
        old: await getSignedCookie(c, env.ADMIN_TOKEN, 'admin_session'),
        next: await getSignedCookie(c, env.ADMIN_TOKEN_NEXT, 'admin_session'),
      }),
    );
    const verified = await (
      await probe.request('/', { headers: { Cookie: cookie } })
    ).json();
    expect(verified.old).toBe(false);
    expect(verified.next).toBeTypeOf('string');
    expect(
      (
        await createApp().request(
          '/api/v1/admin/session',
          { headers: { Cookie: cookie } },
          env,
        )
      ).status,
    ).toBe(200);
  });
  it('rotates original downloads and rejects explicit bad bearer even with a valid cookie', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    const cookie = await loginCookie(bindings);
    const app = new Hono<AppContext>();
    app.get('/original', requireAttachmentContentRead, (c) =>
      c.text('synthetic original'),
    );
    app.onError((error, context) => errorResponse(context, error));
    expect(
      (
        await app.request(
          '/original',
          { headers: { Cookie: cookie } },
          rotating(),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          '/original',
          {
            headers: {
              Cookie: cookie,
              Authorization: 'Bearer ' + bindings.CAPTURE_TOKEN,
            },
          },
          rotating(),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await app.request(
          '/original',
          { headers: { Authorization: 'Bearer dummy-capture-next-secret' } },
          rotating(),
        )
      ).status,
    ).toBe(200);
  });
  it('rotates Shortcut credentials without accepting admin or retired capture keys', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    expect(
      await matchesCaptureToken('Bearer dummy-capture-next-secret', rotating()),
    ).toBe(true);
    expect(
      await matchesCaptureToken('Bearer ' + bindings.CAPTURE_TOKEN, rotating()),
    ).toBe(false);
    expect(
      await matchesCaptureToken('Bearer ' + bindings.ADMIN_TOKEN, rotating()),
    ).toBe(false);
  });
  it('keeps local-worker authorization isolated during rotation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    const env = {
      ...bindings,
      LOCAL_WORKER_TOKEN_NEXT: 'dummy-worker-next-secret',
      LOCAL_WORKER_TOKEN_ROTATION: rotating().CAPTURE_TOKEN_ROTATION,
    };
    const app = new Hono<AppContext>();
    app.get('/worker', requireLocalWorkerToken, (c) =>
      c.json({ accepted: true }),
    );
    app.onError((error, context) => errorResponse(context, error));
    for (const [token, status] of [
      ['dummy-worker-next-secret', 200],
      [bindings.LOCAL_WORKER_TOKEN, 403],
      [bindings.ADMIN_TOKEN, 403],
      [bindings.CAPTURE_TOKEN, 403],
    ] as const) {
      expect(
        (
          await app.request(
            '/worker',
            { headers: { Authorization: 'Bearer ' + token } },
            env,
          )
        ).status,
      ).toBe(status);
    }
  });
  it('accepts active admin next credentials and rejects expired admin current', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    const env = {
      ...bindings,
      ADMIN_TOKEN_NEXT: 'dummy-admin-next-secret',
      ADMIN_TOKEN_ROTATION: rotating().CAPTURE_TOKEN_ROTATION,
    };
    const app = new Hono<AppContext>();
    app.get('/admin', requireAdminToken, (c) => c.json({ accepted: true }));
    app.onError((error, context) => errorResponse(context, error));
    expect(
      (
        await app.request(
          '/admin',
          { headers: { Authorization: 'Bearer dummy-admin-next-secret' } },
          env,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          '/admin',
          { headers: { Authorization: 'Bearer ' + bindings.ADMIN_TOKEN } },
          env,
        )
      ).status,
    ).toBe(403);
  });
  it('applies capture schedule without accepting a worker credential', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    const app = new Hono<AppContext>();
    app.get('/capture', requireCaptureToken, (c) => c.json({ accepted: true }));
    app.onError((error, context) => errorResponse(context, error));
    for (const [token, status] of [
      [bindings.CAPTURE_TOKEN, 401],
      ['dummy-capture-next-secret', 200],
      [bindings.ADMIN_TOKEN, 200],
      [bindings.LOCAL_WORKER_TOKEN, 401],
    ] as const) {
      expect(
        (
          await app.request(
            '/capture',
            { headers: { Authorization: 'Bearer ' + token } },
            rotating(),
          )
        ).status,
      ).toBe(status);
    }
  });
  it('compares both configured slots even when the first matches', async () => {
    const digest = vi.spyOn(crypto.subtle, 'digest');
    expect(
      (await matchCredential(rotating(), 'CAPTURE', bindings.CAPTURE_TOKEN, T0))
        ?.id,
    ).toBe('capture-old');
    expect(digest).toHaveBeenCalledTimes(4);
    expect(
      await matchCredential(
        rotating(),
        'CAPTURE',
        'dummy-capture-next-secret',
        T0 - 1,
      ),
    ).toBeNull();
  });
  it('fails closed for incomplete rotation, duplicate labels or secret-bearing labels', () => {
    for (const env of [
      { ...bindings, CAPTURE_TOKEN_NEXT: 'next-without-metadata' },
      { ...rotating(), CAPTURE_TOKEN_NEXT: undefined },
      { ...rotating(), CAPTURE_TOKEN_NEXT: bindings.CAPTURE_TOKEN },
      rotating({ next_id: 'capture-old' }),
      rotating({ actor: bindings.CAPTURE_TOKEN }),
      rotating({ surprise: true }),
    ]) {
      expect(() => credentialSchedule(env, 'CAPTURE', T0)).toThrow(
        'Credential configuration is invalid.',
      );
    }
  });
  it('defaults to 24h and rejects a window longer than 72h', () => {
    expect(
      credentialSchedule(rotating({ expires_at: undefined }), 'CAPTURE', T0)
        .rotation?.expiresAt,
    ).toBe(T0 + SESSION_LIFETIME_MS);
    expect(() =>
      credentialSchedule(
        rotating({
          expires_at: new Date(T0 + 3 * SESSION_LIFETIME_MS + 1).toISOString(),
        }),
        'CAPTURE',
        T0,
      ),
    ).toThrow('Credential configuration is invalid.');
  });
  it('keeps one current key for legacy deployment configuration', () => {
    const schedule = credentialSchedule(bindings, 'CAPTURE', T0);
    expect(schedule.keys).toEqual([
      { id: 'current', secret: bindings.CAPTURE_TOKEN, eligible: true },
    ]);
    expect(schedule.issuance?.id).toBe('current');
    expect(SESSION_LIFETIME_MS).toBe(86_400_000);
  });
  it('activates next and retires current at exact request-time boundaries', () => {
    expect(
      credentialSchedule(rotating(), 'CAPTURE', T0 - 1).keys.map(
        (k) => k.eligible,
      ),
    ).toEqual([true, false]);
    expect(
      credentialSchedule(rotating(), 'CAPTURE', T0).keys.map((k) => k.eligible),
    ).toEqual([true, true]);
    expect(
      credentialSchedule(
        rotating(),
        'CAPTURE',
        T0 + SESSION_LIFETIME_MS,
      ).keys.map((k) => k.eligible),
    ).toEqual([false, true]);
  });
});
