import { describe, expect, it, vi } from 'vitest';

import { handleFetch } from '../src/index';
import {
  hostedHttpDispatchEnabled,
  requiresHostedHttpDispatch,
} from '../src/hosted-http-dispatch';

const MANUAL_EXTERNAL_ACTIONS = [
  '/api/v1/digests/generate',
  '/api/v1/digests/run-123/regenerate',
  '/api/v1/digests/run-123/deliver',
  '/api/v1/digest-deliveries/delivery-123/retry',
  '/api/v1/jobs/job-123/retry',
  '/api/v1/items/item-123/notion/recreate',
  '/api/v1/items/item-123/source/retry',
  '/api/v1/admin/source-reprocess/run',
  '/api/v1/worker/jobs/lease',
];

function context(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

describe('BG-31 production HTTP manual-dispatch admission', () => {
  it.each(MANUAL_EXTERNAL_ACTIONS)(
    'classifies outbound/queue re-arming POST route %s',
    (pathname) => {
      expect(requiresHostedHttpDispatch('POST', pathname)).toBe(true);
      expect(requiresHostedHttpDispatch('GET', pathname)).toBe(false);
    },
  );

  it.each([
    '/api/v1/health',
    '/api/v1/digests',
    '/api/v1/digests/run-123',
    '/api/v1/digests/run-123/review',
    '/api/v1/digest-deliveries/delivery-123/cancel',
    '/api/v1/items/item-123/source/retry-eligibility',
    '/api/v1/admin/source-reprocess/preview',
    '/api/v1/digests/run-123/deliver/extra',
  ])('does not classify harmless or unknown route %s', (pathname) => {
    expect(requiresHostedHttpDispatch('GET', pathname)).toBe(false);
    expect(requiresHostedHttpDispatch('POST', pathname)).toBe(false);
  });

  it.each([
    [{}, 'missing flags'],
    [{ HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true' }, 'HTTP flag absent'],
    [{ HOSTED_HTTP_DISPATCH_ENABLED: 'true' }, 'external flag absent'],
    [
      {
        HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
        HOSTED_HTTP_DISPATCH_ENABLED: 'TRUE',
      },
      'case mismatch',
    ],
    [
      {
        HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
        HOSTED_HTTP_DISPATCH_ENABLED: '1',
      },
      'wrong boolean representation',
    ],
    [
      {
        HOSTED_EXTERNAL_DISPATCH_ENABLED: 'false',
        HOSTED_HTTP_DISPATCH_ENABLED: 'true',
      },
      'explicit global denial',
    ],
  ])('blocks before dispatch with %s (%s)', async (flags, reason) => {
    expect(reason).not.toBe('');
    expect(hostedHttpDispatchEnabled(flags)).toBe(false);

    // If a handler evaluates DB or reaches the network, this test must fail.
    const forbiddenFetch = vi.spyOn(globalThis, 'fetch');
    const environment = new Proxy(flags, {
      get(target, property, receiver) {
        if (property === 'DB' || property === 'ATTACHMENTS') {
          throw new Error('Forbidden provider/storage reached');
        }
        return Reflect.get(target, property, receiver);
      },
    }) as unknown as Cloudflare.Env;
    const ctx = context();
    try {
      for (const pathname of MANUAL_EXTERNAL_ACTIONS) {
        const response = await handleFetch(
          new Request('https://production.example.test' + pathname, {
            method: 'POST',
          }),
          environment,
          ctx,
        );
        expect(response.status).toBe(503);
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect((await response.json()).error.code).toBe(
          'HOSTED_EXTERNAL_DISPATCH_DISABLED',
        );
      }
      expect(ctx.waitUntil).not.toHaveBeenCalled();
      expect(forbiddenFetch).not.toHaveBeenCalled();
    } finally {
      forbiddenFetch.mockRestore();
    }
  });

  it('only accepts both literal true values, without overriding auth', async () => {
    const env = {
      HOSTED_HTTP_DISPATCH_ENABLED: 'true',
      HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
    } as Cloudflare.Env;
    expect(hostedHttpDispatchEnabled(env)).toBe(true);
    const response = await handleFetch(
      new Request('https://production.example.test/api/v1/digests/generate', {
        method: 'POST',
      }),
      env,
      context(),
    );
    expect(response.status).not.toBe(503);
    expect(response.ok).toBe(false);
  });

  it('preserves unprivileged health and static routes with flags off', async () => {
    const health = await handleFetch(
      new Request('https://production.example.test/api/v1/health'),
      {} as Cloudflare.Env,
      context(),
    );
    expect(health.status).toBe(200);
    const unknown = await handleFetch(
      new Request('https://production.example.test/unknown-static'),
      {} as Cloudflare.Env,
      context(),
    );
    expect(unknown.status).toBe(404);
  });
});
