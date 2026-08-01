import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { EnrichService } from '../src/jobs/enrich.service';
import type { JobRecord } from '../src/jobs/job.service';
import { POLICY_VERSION } from '../src/policy/policy.service';

interface StoredJobEvidence {
  id: string;
  item_id: string;
  job_type: string;
  status: JobRecord['status'];
  attempts: number;
  available_at: string;
  last_error_code: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  input_hash: string | null;
}

describe('OPE-222 acceptance evidence', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('enriches through the provider recorded on the job without changing source evidence', async () => {
    const itemId = 'ope222-e2e-item';
    const jobId = 'ope222-e2e-job';
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_url, source_app, source_type, raw_text,
         user_note, privacy_level, processing_status, captured_at, created_at,
         updated_at
       ) VALUES (?1, ?2, ?3, 'web', 'url', ?4, ?5, 'public', 'pending', ?6, ?6, ?6)`,
    )
      .bind(
        itemId,
        'ope222-e2e-key',
        'https://example.com/ope222',
        'Immutable raw source',
        'Immutable user note',
        now,
      )
      .run();

    await env.DB.prepare(
      `INSERT INTO processing_jobs (
         id, item_id, job_type, status, privacy_level_snapshot,
         provider_eligibility, policy_version, credential_source, attempts,
         lease_owner, lease_expires_at, created_at, updated_at, available_at
       ) VALUES (
         ?1, ?2, 'enrich', 'processing', 'public', 'cloudflare', ?3,
         'app_managed', 1, 'ope222-owner', ?4, ?5, ?5, ?5
       )`,
    )
      .bind(
        jobId,
        itemId,
        POLICY_VERSION,
        new Date(Date.now() + 60_000).toISOString(),
        now,
      )
      .run();

    const rawJob = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?1',
    )
      .bind(jobId)
      .first<StoredJobEvidence>();
    expect(rawJob).not.toBeNull();
    if (!rawJob) throw new Error('Expected the acceptance job to exist');

    const jobRecord: JobRecord = {
      id: rawJob.id,
      itemId: rawJob.item_id,
      jobType: rawJob.job_type,
      status: rawJob.status,
      visibleStatus: rawJob.status,
      attempts: rawJob.attempts,
      availableAt: rawJob.available_at,
      lastErrorCode: rawJob.last_error_code,
      leaseOwner: rawJob.lease_owner,
      leaseExpiresAt: rawJob.lease_expires_at,
      inputHash: rawJob.input_hash,
    };

    const completed = await new EnrichService(env, env.DB).processEnrichmentJob(
      jobRecord,
      'ope222-owner',
    );
    expect(completed).toBe(true);

    const item = await env.DB.prepare(
      `SELECT title, summary, raw_text, user_note, topics_json, importance,
              why_it_matters, suggested_action, processing_status
       FROM items WHERE id = ?1`,
    )
      .bind(itemId)
      .first<{
        title: string | null;
        summary: string | null;
        raw_text: string | null;
        user_note: string | null;
        topics_json: string;
        importance: number;
        why_it_matters: string | null;
        suggested_action: string | null;
        processing_status: string;
      }>();
    expect(item).toMatchObject({
      title: 'Mock Title',
      summary: 'Mock summary',
      raw_text: 'Immutable raw source',
      user_note: 'Immutable user note',
      topics_json: '["mock_topic"]',
      importance: 5,
      why_it_matters: 'Mock matters',
      suggested_action: 'Mock action',
      processing_status: 'complete',
    });

    const usage = await env.DB.prepare(
      `SELECT provider, model, latency_ms, input_units, output_units, status
       FROM provider_usage WHERE item_id = ?1`,
    )
      .bind(itemId)
      .first<{
        provider: string;
        model: string;
        latency_ms: number;
        input_units: number;
        output_units: number;
        status: string;
      }>();
    expect(usage).toEqual({
      provider: 'cloudflare',
      model: 'mock-model',
      latency_ms: 10,
      input_units: 10,
      output_units: 10,
      status: 'success',
    });

    const storedJob = await env.DB.prepare(
      `SELECT status, policy_version, provider_eligibility, completed_at
       FROM processing_jobs WHERE id = ?1`,
    )
      .bind(jobId)
      .first<{
        status: string;
        policy_version: string;
        provider_eligibility: string;
        completed_at: string | null;
      }>();
    expect(storedJob?.status).toBe('complete');
    expect(storedJob?.policy_version).toBe(POLICY_VERSION);
    expect(storedJob?.provider_eligibility).toBe('cloudflare');
    expect(storedJob?.completed_at).not.toBeNull();
  });

  it('upgrades a populated database without losing jobs, results, constraints, or indexes', async () => {
    const migrationDb = env.OPE222_MIGRATION_DB!;
    const migrations = env.TEST_MIGRATIONS!;
    // Apply up to 0013 (0014, 0015, 0016 are remaining)
    await applyD1Migrations(migrationDb, migrations.slice(0, -3));
    const now = new Date().toISOString();

    await migrationDb
      .prepare(
        `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at
       ) VALUES (
         'ope222-migration-item', 'ope222-migration-key', 'url', 'test',
         'public', 'complete', ?1, ?1, ?1
       )`,
      )
      .bind(now)
      .run();
    await migrationDb
      .prepare(
        `INSERT INTO processing_jobs (
         id, item_id, job_type, status, attempts, available_at, created_at,
         updated_at, provider_eligibility, privacy_level_snapshot,
         policy_version, manual_retry_count
       ) VALUES (
         'ope222-migration-job', 'ope222-migration-item', 'enrich', 'complete',
         1, ?1, ?1, ?1, 'workers_ai', 'public', '2026-07-21.1', 2
       )`,
      )
      .bind(now)
      .run();
    await migrationDb
      .prepare(
        `INSERT INTO processing_job_results (
         job_id, submission_id, input_hash, result_version, result_json,
         created_at
       ) VALUES (
         'ope222-migration-job', 'ope222-submission', 'ope222-hash', '1',
         '{"ok":true}', ?1
       )`,
      )
      .bind(now)
      .run();

    await applyD1Migrations(migrationDb, migrations.slice(-3));

    const migratedJob = await migrationDb
      .prepare(
        `SELECT provider_eligibility, policy_version, manual_retry_count
       FROM processing_jobs WHERE id = 'ope222-migration-job'`,
      )
      .first<{
        provider_eligibility: string;
        policy_version: string;
        manual_retry_count: number;
      }>();
    expect(migratedJob).toEqual({
      provider_eligibility: 'cloudflare',
      policy_version: '2026-07-21.1',
      manual_retry_count: 2,
    });

    const result = await migrationDb
      .prepare(
        `SELECT result_json FROM processing_job_results
       WHERE job_id = 'ope222-migration-job'`,
      )
      .first<{ result_json: string }>();
    expect(result?.result_json).toBe('{"ok":true}');

    const indexRows = await migrationDb
      .prepare(`PRAGMA index_list('processing_jobs')`)
      .all<{ name: string }>();
    const indexes = indexRows.results.map((row) => row.name);
    expect(indexes).toContain('idx_processing_jobs_active_unique');
    expect(indexes).toContain('idx_processing_jobs_lease_ready');

    await expect(
      migrationDb
        .prepare(
          `UPDATE processing_jobs SET manual_retry_count = 4
         WHERE id = 'ope222-migration-job'`,
        )
        .run(),
    ).rejects.toThrow();

    const foreignKeyIssues = await migrationDb
      .prepare('PRAGMA foreign_key_check')
      .all();
    expect(foreignKeyIssues.results).toHaveLength(0);
  });
});
