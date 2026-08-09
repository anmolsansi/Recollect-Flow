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
import { JobAdminService } from '../src/jobs/job.admin.service';
import { JobService } from '../src/jobs/job.service';

const ITEM_ID = 'manual-retry-capacity-0000-0000-000000000001';

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

class CountingProvider extends MockAiAdapter {
  calls = 0;

  constructor() {
    super('openrouter');
  }

  override async extractData(
    text: string,
    config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    this.calls += 1;
    return super.extractData(text, config);
  }
}

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM ai_capacity_reservations'),
    env.DB.prepare('DELETE FROM ai_capacity_windows'),
    env.DB.prepare('DELETE FROM ai_circuit_breakers'),
    env.DB.prepare('DELETE FROM items'),
  ]);

  const now = '2026-08-09T20:45:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'manual-retry-capacity-key', 'text', 'test', 'public',
               'failed', ?2, ?2, ?2, 'manual retry capacity test')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-227 manual retry capacity guard', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('lets the admin requeue a failed job but still blocks hosted execution at hard quota', async () => {
    const now = new Date('2026-08-09T20:45:00.000Z');
    const jobs = new JobService(env.DB);
    const jobId = await jobs.enqueueProcessingJob(
      ITEM_ID,
      'enrich',
      'manual-retry-capacity-input',
      now,
    );
    await env.DB.prepare(
      `UPDATE processing_jobs
       SET status = 'failed', attempts = 1, last_error_code = 'AI_REQUEST_FAILED',
           privacy_level_snapshot = 'public', provider_eligibility = 'openrouter',
           hosted_processing_consent = 1
       WHERE id = ?1`,
    )
      .bind(jobId)
      .run();

    expect(
      await new JobAdminService(env.DB).manuallyRetryProcessingJob(
        jobId,
        'owner',
        now,
      ),
    ).toBe(true);

    const retried = await env.DB.prepare(
      `SELECT status, attempts, manual_retry_count, last_error_code
       FROM processing_jobs WHERE id = ?1`,
    )
      .bind(jobId)
      .first<{
        status: string;
        attempts: number;
        manual_retry_count: number;
        last_error_code: string | null;
      }>();
    expect(retried).toEqual({
      status: 'pending',
      attempts: 1,
      manual_retry_count: 1,
      last_error_code: null,
    });

    const runtimeEnv = guardedEnv();
    const current = new Date();
    const policy = getProviderCapacityPolicy(
      runtimeEnv,
      'openrouter',
      'enrich',
      'openrouter/free',
    );
    expect(policy).not.toBeNull();
    await new AiCapacityRepository(env.DB).ensureWindows(
      policy!.windows,
      current,
    );
    await env.DB.prepare(
      `UPDATE ai_capacity_windows
       SET request_consumed = request_limit, request_reserved = 0
       WHERE provider = 'openrouter' AND window_end > ?1
         AND request_limit IS NOT NULL`,
    )
      .bind(current.toISOString())
      .run();

    const registry = new AiProviderRegistry(runtimeEnv, env.DB);
    const provider = new CountingProvider();
    registry.register(provider);

    await expect(
      registry.extractData('manual retry still requires capacity', 'public'),
    ).rejects.toMatchObject({ code: 'QUOTA_PAUSED' });
    expect(provider.calls).toBe(0);

    const persisted = await env.DB.prepare(
      `SELECT status, attempts, manual_retry_count
       FROM processing_jobs WHERE id = ?1`,
    )
      .bind(jobId)
      .first<{
        status: string;
        attempts: number;
        manual_retry_count: number;
      }>();
    expect(persisted).toEqual({
      status: 'pending',
      attempts: 1,
      manual_retry_count: 1,
    });
  });
});
