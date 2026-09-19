import { readFileSync } from 'node:fs';

import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobService } from '../src/jobs/job.service';
import { SourceAcquisitionService } from '../src/jobs/extraction/source-acquisition.service';
import type { SourceFetchOutcome } from '../src/jobs/extraction/source-fetcher.types';
import { ExportService } from '../src/recovery/export.service';
import { RestoreService } from '../src/recovery/restore.service';
import { CanonicalPurgeService } from '../src/recovery/canonical-purge.service';
import { executeSearch } from '../src/search/search.service';

const migration = readFileSync(
  new URL(
    '../../../migrations/0022_add_url_acquisition_evidence.sql',
    import.meta.url,
  ),
  'utf8',
);

const T0 = new Date('2026-09-19T12:00:00.000Z');

async function clearState(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM integrity_findings'),
    env.DB.prepare('DELETE FROM integrity_runs'),
    env.DB.prepare('DELETE FROM restore_runs'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM url_acquisitions'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM item_feedback_events'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function seedItem(
  id: string,
  privacyLevel: 'unknown' | 'public' | 'personal' | 'sensitive' = 'public',
  rawText: string | null = null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, source_url, canonical_url,
       raw_text, privacy_level, processing_status, lifecycle_status,
       captured_at, created_at, updated_at
     ) VALUES (?1, ?2, 'url', 'test', ?3, ?3, ?4, ?5, 'pending', 'Inbox', ?6, ?6, ?6)`,
  )
    .bind(
      id,
      `key-${id}`,
      `https://example.com/${id}`,
      rawText,
      privacyLevel,
      T0.toISOString(),
    )
    .run();
}

async function seedAcquisitionJob(
  id: string,
  itemId: string,
  privacySnapshot: 'unknown' | 'public' | 'personal' | 'sensitive',
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO processing_jobs (
       id, item_id, job_type, status, attempts, available_at, created_at, updated_at,
       input_hash, privacy_level_snapshot, provider_eligibility, policy_version,
       credential_source, hosted_processing_consent, zero_data_retention_required,
       data_collection_denied
     ) VALUES (
       ?1, ?2, 'acquire_url', 'pending', 0, ?3, ?3, ?3,
       'url-source-v1:1', ?4, 'cloudflare', 'test-policy',
       'none', 0, 0, 1
     )`,
  )
    .bind(id, itemId, T0.toISOString(), privacySnapshot)
    .run();
}

async function lease(jobId: string, ownerId: string, now = T0) {
  const jobs = await new JobService(env.DB).leaseProcessingJobs(
    'acquire_url',
    ownerId,
    5,
    10,
    now,
  );
  const job = jobs.find((entry) => entry.id === jobId);
  if (!job) throw new Error('expected acquisition job to be leased');
  return job;
}

function serviceWith(
  outcome: SourceFetchOutcome,
  now = new Date(T0.getTime() + 1_000),
) {
  const fetch = vi.fn(async () => outcome);
  return {
    fetch,
    service: new SourceAcquisitionService(env.DB, {
      fetcher: { fetch },
      now: () => now,
    }),
  };
}

describe('BG-10 URL evidence migration contract', () => {
  it('adds versioned evidence and projects source text without replacing raw_text', () => {
    expect(migration).toContain('ADD COLUMN source_revision');
    expect(migration).toContain('CREATE TABLE url_acquisitions');
    expect(migration).toContain('source_url_snapshot');
    expect(migration).toContain('privacy_level_snapshot');
    expect(migration).toContain('acquired_text_hash');
    expect(migration).toContain('url_acquisitions_immutable');
    expect(migration).toContain('source_text');
    expect(migration).toContain('url_acquisitions_search_fts_ai');
    expect(migration).not.toContain('UPDATE items SET raw_text');
  });
});

describe('BG-10 durable URL acquisition chain', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await clearState();
  });

  it('records policy-blocked evidence without contacting a source host', async () => {
    await seedItem('policy-blocked-item', 'unknown');
    await seedAcquisitionJob(
      'policy-blocked-job',
      'policy-blocked-item',
      'unknown',
    );
    const job = await lease('policy-blocked-job', 'policy-owner');
    const fetch = vi.fn(async () => {
      throw new Error('network fetch must not run');
    });
    const service = new SourceAcquisitionService(env.DB, {
      fetcher: { fetch },
      now: () => new Date(T0.getTime() + 1_000),
    });

    expect(await service.process(job, 'policy-owner')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();

    const evidence = await env.DB.prepare(
      `SELECT status, coverage, error_code
       FROM url_acquisitions WHERE item_id = 'policy-blocked-item'`,
    ).first<Record<string, unknown>>();
    expect(evidence).toMatchObject({
      status: 'policy_blocked',
      coverage: 'url_only',
      error_code: 'SOURCE_FETCH_POLICY_BLOCKED',
    });

    const enrich = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM processing_jobs
       WHERE item_id = 'policy-blocked-item' AND job_type = 'enrich'`,
    ).first<{ count: number }>();
    expect(enrich?.count).toBe(0);
  });

  it('rejects a stale privacy snapshot before network I/O or evidence persistence', async () => {
    await seedItem('stale-policy-item', 'public');
    await seedAcquisitionJob('stale-policy-job', 'stale-policy-item', 'public');
    const job = await lease('stale-policy-job', 'stale-owner');
    await env.DB.prepare(
      `UPDATE items SET privacy_level = 'personal' WHERE id = 'stale-policy-item'`,
    ).run();

    const { service, fetch } = serviceWith({
      status: 'acquired_text',
      coverage: 'acquired_text',
      retryable: false,
      redirectCount: 0,
      acquiredText: 'must never be persisted',
      extractedCharacters: 23,
    });

    expect(await service.process(job, 'stale-owner')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    const evidence = await env.DB.prepare(
      `SELECT id FROM url_acquisitions WHERE item_id = 'stale-policy-item'`,
    ).first();
    expect(evidence).toBeNull();

    const storedJob = await env.DB.prepare(
      `SELECT status, last_error_code FROM processing_jobs
       WHERE id = 'stale-policy-job'`,
    ).first<Record<string, unknown>>();
    expect(storedJob).toMatchObject({
      status: 'failed',
      last_error_code: 'SOURCE_POLICY_STALE',
    });
  });

  it('persists acquired text, indexes an internal phrase, and converges on replay', async () => {
    await seedItem('acquired-item', 'public');
    await seedAcquisitionJob('acquired-job', 'acquired-item', 'public');
    const job = await lease('acquired-job', 'acquired-owner');
    const phrase = 'quasar nebula orchard';
    const { service, fetch } = serviceWith({
      status: 'acquired_text',
      coverage: 'acquired_text',
      retryable: false,
      fetchedFinalUrl: 'https://example.com/acquired-item/final',
      httpStatus: 200,
      contentType: 'text/html',
      responseBytes: 512,
      redirectCount: 1,
      acquiredText: `Headline followed by the private internal phrase ${phrase}.`,
      extractedCharacters: 74,
      title: 'Fetched source title',
      description: 'Fetched source description',
      siteName: 'Example',
    });

    expect(await service.process(job, 'acquired-owner')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    const evidence = await env.DB.prepare(
      `SELECT status, coverage, acquired_text, acquired_text_hash, source_revision
       FROM url_acquisitions WHERE item_id = 'acquired-item'`,
    ).first<Record<string, unknown>>();
    expect(evidence?.status).toBe('acquired_text');
    expect(evidence?.coverage).toBe('acquired_text');
    expect(String(evidence?.acquired_text)).toContain(phrase);
    expect(String(evidence?.acquired_text_hash)).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence?.source_revision).toBe(1);

    const search = await executeSearch(env.DB, {
      q: 'quasar',
      limit: 10,
      captured_to: '2026-09-20T00:00:00.000Z',
    });
    expect(search.data.map((entry) => entry.id)).toContain('acquired-item');
    expect(
      search.data
        .find((entry) => entry.id === 'acquired-item')
        ?.snippet.segments.map((segment) => segment.text)
        .join(' '),
    ).toContain('quasar');

    const enrichBeforeReplay = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM processing_jobs
       WHERE item_id = 'acquired-item' AND job_type = 'enrich'`,
    ).first<{ count: number }>();
    expect(enrichBeforeReplay?.count).toBe(1);

    // Simulate a worker crash/recovery artifact after durable evidence exists.
    await env.DB.prepare(
      `UPDATE processing_jobs
       SET status = 'processing', lease_owner = 'replay-owner',
           lease_expires_at = ?1, completed_at = NULL
       WHERE id = 'acquired-job'`,
    )
      .bind(new Date(T0.getTime() + 300_000).toISOString())
      .run();
    const replayJob = {
      ...job,
      status: 'processing' as const,
      leaseOwner: 'replay-owner',
    };
    expect(await service.process(replayJob, 'replay-owner')).toBe(true);

    const counts = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM url_acquisitions
          WHERE item_id = 'acquired-item') AS evidence_count,
         (SELECT COUNT(*) FROM processing_jobs
          WHERE item_id = 'acquired-item' AND job_type = 'enrich') AS enrich_count`,
    ).first<{ evidence_count: number; enrich_count: number }>();
    expect(counts).toEqual({ evidence_count: 1, enrich_count: 1 });
  });

  it('retries transient failures and persists the exhausted terminal outcome', async () => {
    await seedItem('retry-item', 'public');
    await seedAcquisitionJob('retry-job', 'retry-item', 'public');
    const first = await lease('retry-job', 'retry-owner');
    const failure: SourceFetchOutcome = {
      status: 'network_error',
      coverage: 'url_only',
      retryable: true,
      errorCode: 'SOURCE_NETWORK_ERROR',
      redirectCount: 0,
    };
    const firstRun = serviceWith(
      failure,
      new Date(T0.getTime() + 1_000),
    ).service;
    expect(await firstRun.process(first, 'retry-owner')).toBe(false);

    let stored = await env.DB.prepare(
      `SELECT status, attempts FROM processing_jobs WHERE id = 'retry-job'`,
    ).first<{ status: string; attempts: number }>();
    expect(stored).toEqual({ status: 'pending', attempts: 1 });
    expect(
      await env.DB.prepare(
        `SELECT id FROM url_acquisitions WHERE item_id = 'retry-item'`,
      ).first(),
    ).toBeNull();

    // Put the job at its third automatic attempt without depending on jitter timing.
    await env.DB.prepare(
      `UPDATE processing_jobs
       SET attempts = 2, available_at = ?1
       WHERE id = 'retry-job'`,
    )
      .bind(new Date(T0.getTime() + 2_000).toISOString())
      .run();
    const thirdAt = new Date(T0.getTime() + 2_000);
    const third = await lease('retry-job', 'retry-owner-3', thirdAt);
    const thirdRun = serviceWith(
      failure,
      new Date(T0.getTime() + 3_000),
    ).service;
    expect(await thirdRun.process(third, 'retry-owner-3')).toBe(true);

    stored = await env.DB.prepare(
      `SELECT status, attempts, last_error_code
       FROM processing_jobs WHERE id = 'retry-job'`,
    ).first<{ status: string; attempts: number; last_error_code: string }>();
    expect(stored).toEqual({
      status: 'failed',
      attempts: 3,
      last_error_code: 'SOURCE_NETWORK_ERROR',
    });

    const evidence = await env.DB.prepare(
      `SELECT status, retryable, error_code FROM url_acquisitions
       WHERE item_id = 'retry-item'`,
    ).first<Record<string, unknown>>();
    expect(evidence).toMatchObject({
      status: 'network_error',
      retryable: 1,
      error_code: 'SOURCE_NETWORK_ERROR',
    });
  });

  it('round-trips URL evidence and removes it plus search terms on purge', async () => {
    await seedItem('roundtrip-item', 'public');
    await seedAcquisitionJob('roundtrip-job', 'roundtrip-item', 'public');
    const job = await lease('roundtrip-job', 'roundtrip-owner');
    const phrase = 'cobalt lantern marigold';
    const { service } = serviceWith({
      status: 'acquired_text',
      coverage: 'acquired_text',
      retryable: false,
      redirectCount: 0,
      acquiredText: `Durable restored source text: ${phrase}`,
      extractedCharacters: 51,
    });
    expect(await service.process(job, 'roundtrip-owner')).toBe(true);

    const exported = await new ExportService(
      env.DB,
      () => new Date(T0.getTime() + 10_000),
    ).buildJson();
    expect(exported.items[0]?.urlAcquisitions).toHaveLength(1);

    await clearState();
    const restored = await new RestoreService(
      env.DB,
      env.ATTACHMENTS,
      () => new Date(T0.getTime() + 20_000),
    ).restore(exported);
    expect(restored.run).toMatchObject({
      state: 'complete',
      restoredCount: 1,
    });

    const restoredEvidence = await env.DB.prepare(
      `SELECT acquired_text FROM url_acquisitions
       WHERE item_id = 'roundtrip-item'`,
    ).first<{ acquired_text: string }>();
    expect(restoredEvidence?.acquired_text).toContain(phrase);

    const restoredSearch = await executeSearch(env.DB, {
      q: 'marigold',
      limit: 10,
      captured_to: '2026-09-20T00:00:00.000Z',
    });
    expect(restoredSearch.data.map((entry) => entry.id)).toContain(
      'roundtrip-item',
    );

    await env.DB.prepare(
      `UPDATE items
       SET lifecycle_status = 'Deleted', deleted_at = ?1
       WHERE id = 'roundtrip-item'`,
    )
      .bind(new Date(T0.getTime() + 30_000).toISOString())
      .run();

    expect(
      await new CanonicalPurgeService(env.DB).purgeItem(
        'roundtrip-item',
        'roundtrip-purge-workflow',
        new Date(T0.getTime() + 40_000),
      ),
    ).toBe(true);

    expect(
      await env.DB.prepare(
        `SELECT id FROM url_acquisitions WHERE item_id = 'roundtrip-item'`,
      ).first(),
    ).toBeNull();

    const purgedSearch = await executeSearch(env.DB, {
      q: 'marigold',
      limit: 10,
      captured_to: '2026-09-20T00:00:00.000Z',
    });
    expect(purgedSearch.data.map((entry) => entry.id)).not.toContain(
      'roundtrip-item',
    );
  });
});
