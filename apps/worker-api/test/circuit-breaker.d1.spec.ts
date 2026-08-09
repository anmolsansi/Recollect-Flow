import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AiCircuitBreakerRepository } from '../src/jobs/ai/circuit-breaker.repository';

describe('OPE-227 provider circuit breaker', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM ai_circuit_breakers').run();
  });

  it('opens after three consecutive qualifying failures', async () => {
    const breakers = new AiCircuitBreakerRepository(env.DB);
    const now = new Date('2026-08-09T16:00:00.000Z');

    expect(
      (await breakers.recordFailure('openrouter', 'enrich', 'PROVIDER_HTTP_ERROR', now))
        .state,
    ).toBe('closed');
    expect(
      (await breakers.recordFailure('openrouter', 'enrich', 'PROVIDER_HTTP_ERROR', now))
        .state,
    ).toBe('closed');
    const opened = await breakers.recordFailure(
      'openrouter',
      'enrich',
      'PROVIDER_HTTP_ERROR',
      now,
    );

    expect(opened.state).toBe('open');
    expect(opened.consecutiveFailures).toBe(3);
    expect(opened.nextProbeAt).toBe('2026-08-09T16:05:00.000Z');
  });

  it('admits exactly one half-open probe when the cooldown expires', async () => {
    const breakers = new AiCircuitBreakerRepository(env.DB);
    const failedAt = new Date('2026-08-09T17:00:00.000Z');
    for (let index = 0; index < 3; index += 1) {
      await breakers.recordFailure(
        'openrouter',
        'enrich',
        'PROVIDER_HTTP_ERROR',
        failedAt,
      );
    }

    const probeAt = new Date('2026-08-09T17:05:00.000Z');
    const [first, second] = await Promise.all([
      breakers.acquireHalfOpenProbe(
        'openrouter',
        'enrich',
        'probe-a',
        probeAt,
      ),
      breakers.acquireHalfOpenProbe(
        'openrouter',
        'enrich',
        'probe-b',
        probeAt,
      ),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect([first, second].find(Boolean)?.state).toBe('half_open');
  });

  it('closes and resets the breaker after a successful half-open probe', async () => {
    const breakers = new AiCircuitBreakerRepository(env.DB);
    const failedAt = new Date('2026-08-09T18:00:00.000Z');
    for (let index = 0; index < 3; index += 1) {
      await breakers.recordFailure(
        'cloudflare',
        'enrich',
        'PROVIDER_UNAVAILABLE',
        failedAt,
      );
    }

    const probeAt = new Date('2026-08-09T18:05:00.000Z');
    expect(
      await breakers.acquireHalfOpenProbe(
        'cloudflare',
        'enrich',
        'probe-owner',
        probeAt,
      ),
    ).not.toBeNull();
    expect(
      await breakers.recordSuccess(
        'cloudflare',
        'enrich',
        'probe-owner',
        probeAt,
      ),
    ).toBe(true);

    const row = await env.DB.prepare(
      `SELECT state, consecutive_failures, next_probe_at, last_error_code
       FROM ai_circuit_breakers
       WHERE provider = 'cloudflare' AND operation = 'enrich'`,
    ).first<{
      state: string;
      consecutive_failures: number;
      next_probe_at: string | null;
      last_error_code: string | null;
    }>();
    expect(row).toEqual({
      state: 'closed',
      consecutive_failures: 0,
      next_probe_at: null,
      last_error_code: null,
    });
  });

  it('reopens with a longer cooldown when a half-open probe fails', async () => {
    const breakers = new AiCircuitBreakerRepository(env.DB);
    const failedAt = new Date('2026-08-09T19:00:00.000Z');
    for (let index = 0; index < 3; index += 1) {
      await breakers.recordFailure(
        'openrouter',
        'vision_extract',
        'PROVIDER_HTTP_ERROR',
        failedAt,
      );
    }

    const probeAt = new Date('2026-08-09T19:05:00.000Z');
    await breakers.acquireHalfOpenProbe(
      'openrouter',
      'vision_extract',
      'probe-owner',
      probeAt,
    );
    const reopened = await breakers.recordFailure(
      'openrouter',
      'vision_extract',
      'PROVIDER_HTTP_ERROR',
      probeAt,
    );

    expect(reopened.state).toBe('open');
    expect(reopened.consecutiveFailures).toBe(4);
    expect(reopened.nextProbeAt).toBe('2026-08-09T19:15:00.000Z');
  });
});
