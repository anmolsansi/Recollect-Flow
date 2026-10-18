import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BG29_STAGING_AI_CAPTURE_IDS,
  createBg29StagingEnrichmentHarness,
} from '../src/jobs/ai/bg29-staging-enrichment';

const original = (id: string) =>
  `BG29_MC04_UNCHANGED_ORIGINAL_${id} synthetic text only`;

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function seed(id: string, text = original(id)): Promise<void> {
  const isFile = id.includes('-file-');
  const capturedAt = new Date(Date.now() - 30_000).toISOString();

  // Stage-local AI fixtures are pre-provided source text. This does not
  // assert that the URL acquisition or R2 file extraction stages ran.
  await env.DB.prepare(
    `INSERT INTO items (
      id, idempotency_key, source_type, source_app, privacy_level,
      processing_status, raw_text, captured_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, 'BG29 MC04 offline AI fixture', 'public',
      'pending', ?4, ?5, ?5, ?5)`,
  )
    .bind(id, `mc04-${id}`, isFile ? 'file' : 'url', text, capturedAt)
    .run();

  await env.DB.prepare(
    `INSERT INTO processing_jobs (
      id, item_id, job_type, status, attempts, available_at,
      created_at, updated_at, input_hash, provider_eligibility,
      privacy_level_snapshot, credential_source,
      hosted_processing_consent, zero_data_retention_required,
      data_collection_denied
    ) VALUES (?1, ?2, 'enrich', 'pending', 0, ?3, ?3, ?3, 'mc04-fixture',
      'openrouter', 'public', 'none', 0, 0, 1)`,
  )
    .bind(`mc04-job-${id}`, id, capturedAt)
    .run();
}

describe('BG-29.078 MC-04 actual D1 enrichment with exclusively mock AI', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('runs 24 actual enrichment jobs in bounded sweeps with no egress, no usage charges, and no lost originals', async () => {
    for (const id of BG29_STAGING_AI_CAPTURE_IDS) {
      await seed(id);
    }
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_EXTERNAL_AI_EGRESS');
      });
    try {
      const harness = createBg29StagingEnrichmentHarness(env.DB);
      await harness.run();
      const first = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM processing_jobs
         WHERE job_type = 'enrich' AND status = 'complete'`,
      ).first<{ total: number }>();
      expect(first?.total).toBe(10);

      await harness.run();
      await harness.run();

      const jobs = await env.DB.prepare(
        `SELECT item_id, status FROM processing_jobs
         WHERE job_type = 'enrich' ORDER BY item_id`,
      ).all<{ item_id: string; status: string }>();
      expect(jobs.results).toHaveLength(24);
      expect(jobs.results.map((j) => j.item_id)).toEqual(
        [...BG29_STAGING_AI_CAPTURE_IDS].sort(),
      );
      expect(jobs.results.every((job) => job.status === 'complete')).toBe(true);

      const records = await env.DB.prepare(
        `SELECT id, raw_text, summary, topics_json, suggested_action
         FROM items WHERE source_app = 'BG29 MC04 offline AI fixture'`,
      ).all<{
        id: string;
        raw_text: string;
        summary: string;
        topics_json: string;
        suggested_action: string;
      }>();
      expect(records.results).toHaveLength(24);
      for (const row of records.results) {
        expect(row.raw_text).toBe(original(row.id));
        expect(row.summary).toBe('Mock summary');
        expect(JSON.parse(row.topics_json)).toEqual(['mock_topic']);
        expect(row.suggested_action).toBe('Mock action');
      }

      const usage = await env.DB.prepare(
        `SELECT provider, model, status, estimated_cost_micros
         FROM provider_usage WHERE operation = 'enrich'`,
      ).all<{
        provider: string;
        model: string;
        status: string;
        estimated_cost_micros: number;
      }>();
      expect(usage.results).toHaveLength(24);
      expect(
        usage.results.every(
          (entry) =>
            entry.provider === 'openrouter' &&
            entry.model === 'mock-model' &&
            entry.status === 'success' &&
            entry.estimated_cost_micros === 0,
        ),
      ).toBe(true);

      const audits = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM audit_events
         WHERE event_type = 'enrichment_completed'`,
      ).first<{ total: number }>();
      expect(audits?.total).toBe(24);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  }, 60_000);

  it('persists a failed mock-provider attempt without touching external AI or the original content', async () => {
    const id = BG29_STAGING_AI_CAPTURE_IDS[0]!;
    const text = `${original(id)} TRIGGER_PROVIDER_FAILURE`;
    await seed(id, text);
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_EXTERNAL_AI_EGRESS');
      });
    try {
      const harness = createBg29StagingEnrichmentHarness(env.DB);
      await harness.run();

      const job = await env.DB.prepare(
        `SELECT status, attempts, last_error_code, available_at
         FROM processing_jobs WHERE id = ?1`,
      )
        .bind(`mc04-job-${id}`)
        .first<{
          status: string;
          attempts: number;
          last_error_code: string;
          available_at: string;
        }>();
      expect(job).toMatchObject({
        status: 'pending',
        attempts: 1,
        last_error_code: 'PROVIDER_OUTAGE',
      });
      expect(Date.parse(job!.available_at)).toBeGreaterThan(Date.now());
      expect(
        await env.DB.prepare(`SELECT raw_text FROM items WHERE id = ?1`)
          .bind(id)
          .first('raw_text'),
      ).toBe(text);

      // No early retry or repeated usage record before the backoff expires.
      await harness.run();
      const usage = await env.DB.prepare(
        `SELECT status, error_code, estimated_cost_micros
         FROM provider_usage WHERE item_id = ?1`,
      )
        .bind(id)
        .all<{
          status: string;
          error_code: string;
          estimated_cost_micros: number;
        }>();
      expect(usage.results).toEqual([
        {
          status: 'failed',
          error_code: 'PROVIDER_OUTAGE',
          estimated_cost_micros: 0,
        },
      ]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
