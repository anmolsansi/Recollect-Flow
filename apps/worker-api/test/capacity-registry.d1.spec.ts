import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import type {
  AiEnrichmentResult,
  AiProviderConfig,
  ExtractResult,
} from '../src/jobs/ai/ai.interface';
import { AiProviderRegistry } from '../src/jobs/ai/ai-provider.registry';
import { getProviderCapacityPolicy } from '../src/jobs/ai/capacity.policy';
import { AiCapacityRepository } from '../src/jobs/ai/capacity.repository';
import { MockAiAdapter } from '../src/jobs/ai/mock-ai.adapter';
import { AppError } from '../src/shared/errors';

function guardedEnv(): Env {
  return {
    ...(env as unknown as Record<string, unknown>),
    MOCK_AI_ENABLED: 'false',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"openrouter"}',
    OPENROUTER_API_KEY: 'test-openrouter-key',
    OPENROUTER_FREE_ACCOUNT_TIER: 'standard',
  } as unknown as Env;
}

class SuccessfulProvider extends MockAiAdapter {
  calls = 0;

  constructor() {
    super('openrouter');
  }

  override async extractData(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    this.calls += 1;
    const result = await super.extractData(text, config);
    return { ...result, model: 'openrouter/free', requestCount: 1 };
  }
}

class FailingProvider extends MockAiAdapter {
  calls = 0;

  constructor() {
    super('openrouter');
  }

  override async extractData(): Promise<AiEnrichmentResult<ExtractResult>> {
    this.calls += 1;
    throw Object.assign(
      new AppError(503, 'PROVIDER_HTTP_ERROR', 'Synthetic OpenRouter outage'),
      {
        provider: 'openrouter',
        model: 'openrouter/free',
        requestCount: 1,
        inputUnits: 8,
        outputUnits: 0,
      },
    );
  }
}

async function resetCapacityState(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ai_capacity_reservations'),
    env.DB.prepare('DELETE FROM ai_capacity_windows'),
    env.DB.prepare('DELETE FROM ai_circuit_breakers'),
  ]);
}

describe('OPE-227 guarded provider registry', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetCapacityState);

  it('reserves before execution and reconciles actual usage afterward', async () => {
    const registry = new AiProviderRegistry(guardedEnv(), env.DB);
    registry.register(new SuccessfulProvider());

    const result = await registry.extractData(
      'guarded provider success',
      'public',
    );
    expect(result.provider).toBe('openrouter');

    const reservation = await env.DB.prepare(
      `SELECT state, request_units, actual_request_units
       FROM ai_capacity_reservations
       ORDER BY created_at DESC LIMIT 1`,
    ).first<{
      state: string;
      request_units: number;
      actual_request_units: number;
    }>();
    expect(reservation).toEqual({
      state: 'reconciled',
      request_units: 2,
      actual_request_units: 1,
    });

    const minute = await env.DB.prepare(
      `SELECT request_reserved, request_consumed
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'
       ORDER BY window_start DESC LIMIT 1`,
    ).first<{ request_reserved: number; request_consumed: number }>();
    expect(minute).toEqual({ request_reserved: 0, request_consumed: 1 });
  });

  it('stops at the hard quota before invoking the provider', async () => {
    const runtimeEnv = guardedEnv();
    const now = new Date();
    const policy = getProviderCapacityPolicy(
      runtimeEnv,
      'openrouter',
      'enrich',
      'openrouter/free',
    );
    expect(policy).not.toBeNull();
    await new AiCapacityRepository(env.DB).ensureWindows(policy!.windows, now);
    await env.DB.prepare(
      `UPDATE ai_capacity_windows
       SET request_consumed = request_limit, request_reserved = 0
       WHERE provider = 'openrouter' AND window_end > ?1
         AND request_limit IS NOT NULL`,
    )
      .bind(now.toISOString())
      .run();

    const registry = new AiProviderRegistry(runtimeEnv, env.DB);
    const provider = new SuccessfulProvider();
    registry.register(provider);

    await expect(
      registry.extractData('must never reach provider', 'public'),
    ).rejects.toMatchObject({ code: 'QUOTA_PAUSED' });
    expect(provider.calls).toBe(0);
  });

  it('opens the breaker and prevents a fourth provider call', async () => {
    const registry = new AiProviderRegistry(guardedEnv(), env.DB);
    const failing = new FailingProvider();
    registry.register(failing);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        registry.extractData(`provider failure ${attempt}`, 'public'),
      ).rejects.toMatchObject({ code: 'PROVIDER_HTTP_ERROR' });
    }
    expect(failing.calls).toBe(3);

    await expect(
      registry.extractData('breaker blocks this call', 'public'),
    ).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(failing.calls).toBe(3);

    const breaker = await env.DB.prepare(
      `SELECT state, consecutive_failures, next_probe_at
       FROM ai_circuit_breakers
       WHERE provider = 'openrouter' AND operation = 'enrich'`,
    ).first<{
      state: string;
      consecutive_failures: number;
      next_probe_at: string | null;
    }>();
    expect(breaker?.state).toBe('open');
    expect(breaker?.consecutive_failures).toBe(3);
    expect(breaker?.next_probe_at).toBeTruthy();
  });
});
