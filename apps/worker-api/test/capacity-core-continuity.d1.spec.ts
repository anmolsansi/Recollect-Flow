import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { D1CaptureRepository } from '../src/captures/capture.repository';
import { CaptureService } from '../src/captures/capture.service';
import { getProviderCapacityPolicy } from '../src/jobs/ai/capacity.policy';
import { AiCapacityRepository } from '../src/jobs/ai/capacity.repository';
import { executeSearch } from '../src/search/search.service';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM ai_capacity_reservations'),
    env.DB.prepare('DELETE FROM ai_capacity_windows'),
    env.DB.prepare('DELETE FROM ai_circuit_breakers'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

describe('OPE-227 AI-independent core continuity', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('persists and lexically retrieves a capture while hosted AI quota is hard-stopped', async () => {
    const runtimeEnv = {
      ...(env as unknown as Record<string, unknown>),
      OPENROUTER_FREE_ACCOUNT_TIER: 'standard',
    } as unknown as Env;
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

    const capturedAt = new Date(current.getTime() - 1_000).toISOString();
    const service = new CaptureService(new D1CaptureRepository(env.DB));
    const saved = await service.save({
      idempotency_key: 'ope227-hard-quota-continuity',
      source_type: 'text',
      source_app: 'test',
      shared_text: 'OPE227 continuity zephyr searchable evidence',
      privacy_level: 'public',
      captured_at: capturedAt,
      client: { name: 'vitest', version: '1.0' },
    });
    const captureId = saved.capture.id;

    const stored = await env.DB.prepare(
      `SELECT id, raw_text, processing_status
       FROM items WHERE id = ?1`,
    )
      .bind(captureId)
      .first<{
        id: string;
        raw_text: string;
        processing_status: string;
      }>();
    expect(stored).toMatchObject({
      id: captureId,
      raw_text: 'OPE227 continuity zephyr searchable evidence',
    });

    const search = await executeSearch(env.DB, {
      q: 'zephyr',
      limit: 25,
    });
    expect(search.data.map((item) => item.id)).toContain(captureId);

    const scheduled = await env.DB.prepare(
      `SELECT status, provider_eligibility
       FROM processing_jobs
       WHERE item_id = ?1 AND job_type = 'enrich'`,
    )
      .bind(captureId)
      .first<{ status: string; provider_eligibility: string }>();
    expect(scheduled?.status).toBe('pending');

    const quota = await env.DB.prepare(
      `SELECT request_consumed, request_limit
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'day'
       ORDER BY window_start DESC LIMIT 1`,
    ).first<{ request_consumed: number; request_limit: number }>();
    expect(quota?.request_consumed).toBe(quota?.request_limit);
  });
});
