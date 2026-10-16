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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  it('recovers after the configured short window without an account lockout', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const start = Date.parse('2026-10-15T18:00:00Z');
    vi.setSystemTime(start);
    const buckets = new Map<string, number>();
    const env = {
      ...base,
      LOGIN_RATE_LIMITER: {
        limit: async ({ key }: { key: string }) => {
          const slot = key + ':' + Math.floor(Date.now() / 60_000);
          const count = (buckets.get(slot) ?? 0) + 1;
          buckets.set(slot, count);
          return { success: count <= 1 };
        },
      },
    };
    expect((await login(env, { token: marker })).status).toBe(401);
    expect((await login(env, { token: marker })).status).toBe(429);
    vi.setSystemTime(start + 60_000);
    expect((await login(env, { token: marker })).status).toBe(401);
    vi.useRealTimers();
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

    // BG-16 local Web origin differs from the API Worker origin behind Vite.
    const proxy = await createApp().request(
      'http://127.0.0.1:8787/api/v1/admin/session',
      {
        method: 'POST',
        headers: {
          Origin: 'http://127.0.0.1:5173',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: base.ADMIN_TOKEN }),
      },
      {
        ...env,
        WEB_INBOX_BASE_URL: 'http://127.0.0.1:5173',
      },
    );
    expect(proxy.status).toBe(200);
    const forged = await createApp().request(
      'http://127.0.0.1:8787/api/v1/admin/session',
      {
        method: 'POST',
        headers: {
          Origin: 'http://127.0.0.1:9999',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: base.ADMIN_TOKEN }),
      },
      {
        ...env,
        WEB_INBOX_BASE_URL: 'http://127.0.0.1:5173',
      },
    );
    expect(forged.status).toBe(403);
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
    const request = new Request('http://localhost/api/v1/shortcut/captures', {
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
    } as RequestInit & { duplex: 'half' });
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
      {
        ...base,
        LOGIN_RATE_LIMITER: {
          limit: () => {
            throw new Error('login limiter used on capture');
          },
        },
      },
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
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

describe('BG-25 cross-route rejection and diagnostic confidentiality', () => {
  it('rejects foreign and null Origin across cookie mutations before state changes', async () => {
    const app = createApp();
    const loginResponse = await login(base, { token: base.ADMIN_TOKEN });
    expect(loginResponse.status).toBe(200);
    const cookie = loginResponse.headers.get('set-cookie')!.split(';')[0]!;
    const mutations = [
      ['POST', '/api/v1/captures'],
      ['POST', '/api/v1/uploads/init'],
      ['POST', '/api/v1/digests/generate'],
      ['POST', '/api/v1/restore?dry_run=true'],
      ['DELETE', '/api/v1/admin/session'],
    ] as const;
    for (const [method, route] of mutations) {
      for (const origin of ['https://untrusted.example.test', 'null']) {
        const response = await app.request(
          'https://inbox.example.test' + route,
          { method, headers: { Cookie: cookie, Origin: origin } },
          base,
        );
        expect(response.status, method + ' ' + route + ' ' + origin).toBe(403);
        expect(await response.json()).toMatchObject({
          error: { code: 'ORIGIN_FORBIDDEN' },
        });
        expect(response.headers.get('set-cookie')).toBeNull();
      }
    }
    const valid = await app.request(
      'https://inbox.example.test/api/v1/admin/session',
      { headers: { Cookie: cookie } },
      base,
    );
    expect(valid.status).toBe(200);
    const logout = await app.request(
      'https://inbox.example.test/api/v1/admin/session',
      { method: 'DELETE', headers: { Cookie: cookie, Origin: 'https://inbox.example.test' } },
      base,
    );
    expect(logout.status).toBe(200);
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('does not pull an unauthorized upload or restore body stream', async () => {
    const app = createApp();
    for (const [method, route, expected] of [
      ['PUT', '/api/v1/uploads/11111111-1111-4111-8111-111111111111/content', 401],
      ['POST', '/api/v1/restore?dry_run=true', 403],
    ] as const) {
      let reads = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          reads += 1;
          controller.enqueue(new Uint8Array(100));
          controller.close();
        },
      });
      const request = new Request('http://localhost' + route, {
        method,
        body: stream,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' });
      const response = await app.fetch(request, {
        ...base,
        MAX_ATTACHMENT_BYTES: '1000',
      });
      expect(response.status, route).toBe(expected);
      // The Web streams implementation may eagerly call pull() once when
      // constructing Request; no code should actively consume request.body.
      expect(reads).toBeLessThanOrEqual(1);
    }
  });

  it('omits synthetic private material in rejected headers and malformed JSON', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const attempts = [
      createApp().request('/api/v1/captures?' + marker, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + marker,
          'Content-Type': 'application/json',
          'X-Request-Id': marker,
        },
        body: '{"content":"' + marker + '",',
      }, base),
      createApp().request('https://inbox.example.test/api/v1/admin/session?' + marker, {
        method: 'POST',
        headers: {
          Origin: 'https://inbox.example.test',
          'Content-Type': 'application/json',
          'X-Request-Id': 'rejected-id-' + marker,
        },
        body: '{"token":"' + marker + '"',
      }, base),
    ];
    const responses = await Promise.all(attempts);
    expect(responses[0].status).toBe(401);
    expect(responses[1].status).toBe(422);
    const diagnostics = JSON.stringify({
      logs: log.mock.calls,
      errors: error.mock.calls,
      responses: await Promise.all(responses.map((response) => response.text())),
    });
    // X-Request-Id is intentionally a safe diagnostic identifier and can be
    // provided by a caller. A user-supplied marker in that ID is not a secret
    // redaction guarantee, so tests must not invent that guarantee.
    expect(diagnostics).not.toContain('{"token":"' + marker);
    expect(diagnostics).not.toContain('{"content":"' + marker);
    expect(diagnostics).not.toContain('Bearer ' + marker);
  });
});
