import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/env';
import {
  BG29_STAGING_URLS,
  createBg29StagingSourceFetcher,
} from '../src/jobs/extraction/bg29-staging-source';
import { processSourceAcquisitionJobs } from '../src/jobs/extraction/source-acquisition.worker';

const T0 = new Date('2026-10-18T02:17:37.889Z');

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM url_acquisitions'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function seed(index: number, url: string): Promise<void> {
  const itemId = `bg29-mc02-url-${index}`;
  await env.DB.prepare(
    `INSERT INTO items (
      id, idempotency_key, source_type, source_app, source_url,
      privacy_level, processing_status, captured_at, created_at, updated_at
    ) VALUES (?1, ?2, 'url', 'BG29 MC02 staging only', ?3, 'public',
      'pending', ?4, ?4, ?4)`,
  )
    .bind(itemId, `bg29-mc02-idempotency-${index}`, url, T0.toISOString())
    .run();
  await env.DB.prepare(
    `INSERT INTO processing_jobs (
      id, item_id, job_type, status, attempts, available_at,
      created_at, updated_at, input_hash, privacy_level_snapshot,
      provider_eligibility, policy_version, credential_source,
      hosted_processing_consent, zero_data_retention_required,
      data_collection_denied
    ) VALUES (?1, ?2, 'acquire_url', 'pending', 0, ?3, ?3, ?3,
      'url-source-v1:1', 'public', 'cloudflare', 'bg29-mc02',
      'none', 0, 0, 1)`,
  )
    .bind(`bg29-mc02-job-${index}`, itemId, T0.toISOString())
    .run();
}

describe('BG-29.078 MC-02 real D1 URL acquisition worker, offline transport', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await reset();
  });

  it('processes 12 real parser outputs, survives one retry and persists original identities', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('UNEXPECTED_NETWORK_EGRESS');
    });
    try {
      for (const [index, url] of BG29_STAGING_URLS.entries()) {
        await seed(index + 1, url);
      }
      let now = new Date(T0.getTime() + 500);
      const fetcher = createBg29StagingSourceFetcher({
        failOnceFor: BG29_STAGING_URLS[0],
      });
      const options = { fetcher, now: () => new Date(now) };
      await processSourceAcquisitionJobs(env as Env, options);

      const first = await env.DB.prepare(
        `SELECT status, attempts, last_error_code FROM processing_jobs
         WHERE id = 'bg29-mc02-job-1'`,
      ).first<{ status: string; attempts: number; last_error_code: string }>();
      expect(first?.status).toBe('pending');
      expect(first?.last_error_code).toBe('SOURCE_SERVER_ERROR');
      expect(first?.attempts).toBe(1);

      // Retry eligibility advances via the injected clock; this is a local
      // functional test, not real-hour hosted backlog acceptance evidence.
      now = new Date(T0.getTime() + 5_000);
      await processSourceAcquisitionJobs(env as Env, options);

      const accepted = await env.DB.prepare(
        `SELECT id, source_url FROM items
         WHERE source_app = 'BG29 MC02 staging only' AND deleted_at IS NULL
         ORDER BY id`,
      ).all<{ id: string; source_url: string }>();
      expect(accepted.results).toHaveLength(12);
      expect(new Set(accepted.results.map((row) => row.id)).size).toBe(12);

      const fetched = await env.DB.prepare(
        `SELECT i.source_url, a.status, a.coverage, a.acquired_text,
                a.acquired_text_hash, a.parser_name
         FROM url_acquisitions a JOIN items i ON a.item_id = i.id
         ORDER BY i.id`,
      ).all<{
        source_url: string;
        status: string;
        coverage: string;
        acquired_text: string;
        acquired_text_hash: string;
        parser_name: string;
      }>();
      expect(fetched.results).toHaveLength(12);
      for (const row of fetched.results) {
        const number = BG29_STAGING_URLS.indexOf(row.source_url) + 1;
        expect(number).toBeGreaterThan(0);
        expect(row.status).toBe('acquired_text');
        expect(row.coverage).toBe('acquired_text');
        expect(row.acquired_text).toContain(
          `BG29_STAGING_URL_SENTINEL_${String(number).padStart(2, '0')}`,
        );
        expect(row.acquired_text_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(row.parser_name).toBe('bounded-source-fetcher');
      }

      const terminal = await env.DB.prepare(
        `SELECT status, COUNT(*) AS count FROM processing_jobs
         WHERE job_type = 'acquire_url' GROUP BY status`,
      ).all<{ status: string; count: number }>();
      expect(terminal.results).toEqual([{ status: 'complete', count: 12 }]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('denies an unapproved URL in the actual D1 worker with no network calls', async () => {
    await seed(13, 'https://example.com/not-an-approved-bg29-fixture');
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('UNEXPECTED_NETWORK_EGRESS');
    });
    try {
      await processSourceAcquisitionJobs(env as Env, {
        fetcher: createBg29StagingSourceFetcher(),
        now: () => new Date(T0.getTime() + 500),
      });
      const row = await env.DB.prepare(
        `SELECT status, error_code, retryable FROM url_acquisitions
         WHERE item_id = 'bg29-mc02-url-13'`,
      ).first<{ status: string; error_code: string; retryable: number }>();
      expect(row).toEqual({
        status: 'destination_blocked',
        error_code: 'SOURCE_DESTINATION_BLOCKED',
        retryable: 0,
      });
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
