import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
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
  requireCaptureWrite,
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

async function signedCookie(value: string, secret: string) {
  const app = new Hono();
  app.get('/', async (c) => {
    await setSignedCookie(c, 'admin_session', value, secret);
    return c.text('dummy');
  });
  return (await app.request('/')).headers.get('set-cookie')!.split(';')[0]!;
}

describe('bounded credential schedules', () => {
  it('immediately revokes compromised admin bearer and sessions with a fresh replacement', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const priorNextCookie = await loginCookie(adminRotating());
    const oldCookie = await signedCookie(
      `session:v2:admin-old:${T0 - 1000}:${T0 + 1000}`,
      bindings.ADMIN_TOKEN,
    );
    const emergency = {
      ...adminRotating({ next_id: 'admin-emergency', revoke_current: true }),
      ADMIN_TOKEN_NEXT: 'dummy-emergency-secret',
    };
    const app = createApp();
    for (const cookie of [oldCookie, priorNextCookie]) {
      expect(
        (
          await app.request(
            '/api/v1/admin/session',
            { headers: { Cookie: cookie } },
            emergency,
          )
        ).status,
      ).toBe(403);
    }
    for (const token of [bindings.ADMIN_TOKEN, 'dummy-admin-next-secret']) {
      expect(await matchCredential(emergency, 'ADMIN', token, T0)).toBeNull();
    }
    expect(
      await matchCredential(emergency, 'ADMIN', 'dummy-emergency-secret', T0),
    ).toMatchObject({ id: 'admin-emergency' });
    expect(
      await matchCredential(emergency, 'CAPTURE', bindings.CAPTURE_TOKEN, T0),
    ).not.toBeNull();
    expect(
      await matchCredential(
        emergency,
        'LOCAL_WORKER',
        bindings.LOCAL_WORKER_TOKEN,
        T0,
      ),
    ).not.toBeNull();
    expect(await loginCookie(emergency, 'dummy-emergency-secret')).toContain(
      'admin_session=',
    );
  });
  it.each(['CAPTURE', 'ADMIN', 'LOCAL_WORKER'] as const)(
    'keeps promoted %s clients valid after repeat retirement cleanup',
    async (scope) => {
      const promoted = {
        ...bindings,
        [`${scope}_TOKEN`]: 'dummy-promoted-secret',
        [`${scope}_TOKEN_ID`]: 'promoted-key',
      };
      for (let repeat = 0; repeat < 2; repeat++) {
        expect(
          await matchCredential(
            promoted,
            scope,
            'dummy-promoted-secret',
            T0 + SESSION_LIFETIME_MS,
          ),
        ).toMatchObject({ id: 'promoted-key' });
        expect(
          await matchCredential(
            promoted,
            scope,
            bindings[`${scope}_TOKEN`],
            T0 + SESSION_LIFETIME_MS,
          ),
        ).toBeNull();
        expect(
          credentialSchedule(promoted, scope, T0).rotation,
        ).toBeUndefined();
      }
    },
  );
  it('rejects copied old-key sessions exactly at the rotation retirement boundary', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const expiry = T0 + 3_600_000;
    const env = adminRotating({ expires_at: new Date(expiry).toISOString() });
    const app = createApp();
    for (const value of [
      `authenticated:${T0 + 7_200_000}`,
      `session:v2:admin-old:${T0 - 1000}:${T0 + 7_200_000}`,
    ]) {
      const cookie = await signedCookie(value, env.ADMIN_TOKEN);
      for (const [time, status] of [
        [expiry - 1, 200],
        [expiry, 403],
        [expiry + 1, 403],
      ] as const) {
        vi.setSystemTime(time);
        expect(
          (
            await app.request(
              '/api/v1/admin/session',
              { headers: { Cookie: cookie } },
              env,
            )
          ).status,
        ).toBe(status);
      }
    }
  });
  it('chooses the issuance key at activation for either eligible login token', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const env = adminRotating();
    const app = createApp();
    for (const [time, token, status, keyId] of [
      [T0 - 1, env.ADMIN_TOKEN, 200, 'admin-old'],
      [T0 - 1, env.ADMIN_TOKEN_NEXT, 401, null],
      [T0, env.ADMIN_TOKEN, 200, 'admin-next'],
      [T0, env.ADMIN_TOKEN_NEXT, 200, 'admin-next'],
      [T0 + SESSION_LIFETIME_MS, env.ADMIN_TOKEN, 401, null],
      [T0 + SESSION_LIFETIME_MS, env.ADMIN_TOKEN_NEXT, 200, 'admin-next'],
    ] as const) {
      vi.setSystemTime(time);
      const response = await app.request(
        '/api/v1/admin/session',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        },
        env,
      );
      expect(response.status).toBe(status);
      if (!keyId) {
        expect(response.headers.get('set-cookie')).toBeNull();
        continue;
      }
      const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
      const probe = new Hono();
      probe.get('/', async (c) =>
        c.text(
          String(
            await getSignedCookie(
              c,
              keyId === 'admin-old' ? env.ADMIN_TOKEN : env.ADMIN_TOKEN_NEXT,
              'admin_session',
            ),
          ),
        ),
      );
      expect(
        await (
          await probe.request('/', { headers: { Cookie: cookie } })
        ).text(),
      ).toBe(`session:v2:${keyId}:${time}:${time + SESSION_LIFETIME_MS}`);
    }
  });
  it('preserves actual operator, worker and Shortcut route permissions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + SESSION_LIFETIME_MS);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = createApp();
    const env = rotating();
    for (const token of [
      'dummy-capture-next-secret',
      bindings.LOCAL_WORKER_TOKEN,
    ]) {
      for (const path of ['/api/v1/jobs', '/api/v1/usage']) {
        expect(
          (
            await app.request(
              path,
              { headers: { Authorization: 'Bearer ' + token } },
              env,
            )
          ).status,
        ).toBe(403);
      }
    }
    expect(
      (
        await app.request(
          '/api/v1/worker/jobs/lease',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + bindings.ADMIN_TOKEN,
              'Content-Type': 'application/json',
            },
            body: '{}',
          },
          env,
        )
      ).status,
    ).toBe(403);
    for (const [token, code] of [
      ['dummy-capture-next-secret', 'INVALID_FORM'],
      [bindings.CAPTURE_TOKEN, 'UNAUTHORIZED'],
      [bindings.ADMIN_TOKEN, 'UNAUTHORIZED'],
    ] as const) {
      const response = await app.request(
        '/api/v1/shortcut/captures',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
        env,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: false,
        saved: false,
        code,
      });
    }
  });
  it('never borrows an ambient cookie after an explicit invalid bearer on reads or writes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const cookie = await loginCookie(bindings);
    const app = new Hono<AppContext>();
    app.post('/capture', requireCaptureWrite, (c) => c.text('accepted'));
    app.post('/admin', requireAdminToken, (c) => c.text('accepted'));
    app.get('/original', requireAttachmentContentRead, (c) =>
      c.text('accepted'),
    );
    app.onError((error, context) => errorResponse(context, error));
    for (const [method, path, status] of [
      ['POST', '/capture', 401],
      ['POST', '/admin', 403],
      ['GET', '/original', 401],
    ] as const) {
      expect(
        (
          await app.request(
            path,
            {
              method,
              headers: {
                Cookie: cookie,
                Authorization: 'Bearer invalid-explicit',
                Origin: 'http://localhost',
              },
            },
            bindings,
          )
        ).status,
      ).toBe(status);
    }
  });
  it('rejects malformed, missing, unexpected and oversized metadata with safe errors', () => {
    for (const metadata of [
      '{',
      'null',
      '[]',
      '{}',
      'x'.repeat(4097),
      JSON.stringify({
        next_id: 'next',
        activate_at: 'yesterday',
        actor: 'owner',
      }),
    ]) {
      expect(() =>
        credentialSchedule(
          { ...rotating(), CAPTURE_TOKEN_ROTATION: metadata },
          'CAPTURE',
          T0,
        ),
      ).toThrow('Credential configuration is invalid.');
    }
    for (const override of [
      { activate_at: undefined },
      { next_id: undefined },
      { actor: undefined },
      { actor: 'private@example.test' },
      { revoke_current: 'false' },
      { next_id: 'next:invalid' },
      { expires_at: '2026-10-15' },
    ]) {
      expect(() =>
        credentialSchedule(rotating(override), 'CAPTURE', T0),
      ).toThrow('Credential configuration is invalid.');
    }
    expect(() =>
      credentialSchedule(
        { ...bindings, CAPTURE_TOKEN_ID: 'bad.id' },
        'CAPTURE',
        T0,
      ),
    ).toThrow('Credential configuration is invalid.');
    expect(() => credentialSchedule(bindings, 'CAPTURE', NaN)).toThrow(
      'Credential configuration is invalid.',
    );
  });
  it('accepts exactly 72h and rejects zero, reversed and excessive windows', () => {
    const maximum = rotating({
      expires_at: new Date(T0 + 3 * SESSION_LIFETIME_MS).toISOString(),
    });
    expect(
      credentialSchedule(maximum, 'CAPTURE', T0 + 3 * SESSION_LIFETIME_MS - 1)
        .keys[0]?.eligible,
    ).toBe(true);
    expect(
      credentialSchedule(maximum, 'CAPTURE', T0 + 3 * SESSION_LIFETIME_MS)
        .keys[0]?.eligible,
    ).toBe(false);
    for (const end of [T0, T0 - 1, T0 + 3 * SESSION_LIFETIME_MS + 1]) {
      expect(() =>
        credentialSchedule(
          rotating({ expires_at: new Date(end).toISOString() }),
          'CAPTURE',
          T0,
        ),
      ).toThrow('Credential configuration is invalid.');
    }
  });
  it.each(['CAPTURE', 'ADMIN', 'LOCAL_WORKER'] as const)(
    'enforces every activation/expiry edge for %s',
    async (scope) => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const env = {
        ...bindings,
        [`${scope}_TOKEN_NEXT`]: 'dummy-next-scope-secret',
        [`${scope}_TOKEN_ROTATION`]: rotating().CAPTURE_TOKEN_ROTATION,
      };
      for (const [now, oldAllowed, nextAllowed] of [
        [T0 - 1, true, false],
        [T0, true, true],
        [T0 + 1, true, true],
        [T0 + SESSION_LIFETIME_MS - 1, true, true],
        [T0 + SESSION_LIFETIME_MS, false, true],
        [T0 + SESSION_LIFETIME_MS + 1, false, true],
      ] as const) {
        expect(
          Boolean(
            await matchCredential(env, scope, bindings[`${scope}_TOKEN`], now),
          ),
        ).toBe(oldAllowed);
        expect(
          Boolean(
            await matchCredential(env, scope, 'dummy-next-scope-secret', now),
          ),
        ).toBe(nextAllowed);
      }
    },
  );
  it.each(['CAPTURE', 'ADMIN', 'LOCAL_WORKER'] as const)(
    'rejects empty %s credentials and keeps the single-slot deployment valid',
    async (scope) => {
      for (const secret of ['', '   ']) {
        const env = { ...bindings, [`${scope}_TOKEN`]: secret };
        expect(credentialSchedule(env, scope, T0).keys).toEqual([]);
        expect(await matchCredential(env, scope, secret, T0)).toBeNull();
      }
      expect(
        await matchCredential(bindings, scope, bindings[`${scope}_TOKEN`], T0),
      ).toMatchObject({ id: 'current' });
      expect(await matchCredential(bindings, scope, null, T0)).toBeNull();
    },
  );
  it('emits only safe rotation identifiers, actor, times and outcome', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await matchCredential(rotating(), 'CAPTURE', bindings.CAPTURE_TOKEN, T0);
    const events = log.mock.calls.map((call) => JSON.parse(String(call[0])));
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'credential_rotation_auth',
        scope: 'CAPTURE',
        actor: 'test-operator',
        outcome: 'accepted',
        matched_key_id: 'capture-old',
      }),
    );
    expect(JSON.stringify(events)).not.toContain(bindings.CAPTURE_TOKEN);
    expect(JSON.stringify(events)).not.toContain('dummy-capture-next-secret');
  });
  it('accepts bounded current-key legacy cookies but never unbounded or next-key legacy cookies', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const app = createApp();
    const env = adminRotating();
    for (const [value, secret, status] of [
      ['authenticated:' + String(T0 + 1000), env.ADMIN_TOKEN, 200],
      ['authenticated', env.ADMIN_TOKEN, 403],
      ['authenticated:' + String(T0 + 1000), env.ADMIN_TOKEN_NEXT, 403],
    ] as const) {
      const cookie = await signedCookie(value, secret);
      expect(
        (
          await app.request(
            '/api/v1/admin/session',
            { headers: { Cookie: cookie } },
            env,
          )
        ).status,
      ).toBe(status);
    }
  });
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
    expect(verified).toMatchObject({ old: false, next: expect.any(String) });
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
