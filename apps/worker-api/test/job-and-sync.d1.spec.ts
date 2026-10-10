import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { JobAdminService } from '../src/jobs/job.admin.service';
import { JobService } from '../src/jobs/job.service';
import { ProcessingReconciliationService } from '../src/jobs/processing-reconciliation.service';
import { processNotionSyncJobs } from '../src/sync/sync.worker';

const T0 = new Date('2026-07-30T00:00:00.000Z');

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function resetDatabase() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
    env.DB.prepare(
      `UPDATE operational_controls
       SET enabled = 0, updated_at = ?1, updated_by = 'test'`,
    ).bind(T0.toISOString()),
  ]);
}

async function insertItem(
  id: string,
  overrides: {
    privacy?: 'unknown' | 'public' | 'personal' | 'sensitive';
    deletedAt?: string | null;
    notionPageId?: string | null;
  } = {},
) {
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, source_url, raw_text,
       user_note, privacy_level, processing_status, captured_at, created_at,
       updated_at, deleted_at, notion_page_id
     ) VALUES (
       ?1, ?2, 'url', 'Safari', 'https://example.com', 'source text',
       'why saved', ?3, 'complete', ?4, ?4, ?4, ?5, ?6
     )`,
  )
    .bind(
      id,
      `key-${id}`,
      overrides.privacy ?? 'public',
      T0.toISOString(),
      overrides.deletedAt ?? null,
      overrides.notionPageId ?? null,
    )
    .run();
}

async function insertProcessingJob(
  id: string,
  itemId: string,
  options: {
    status?: 'pending' | 'processing' | 'complete' | 'failed';
    attempts?: number;
    availableAt?: string;
    leaseOwner?: string | null;
    leaseExpiresAt?: string | null;
    provider?: string;
    privacy?: string;
    consent?: number;
    inputHash?: string | null;
  } = {},
) {
  await env.DB.prepare(
    `INSERT INTO processing_jobs (
       id, item_id, job_type, status, attempts, available_at, created_at,
       updated_at, lease_owner, lease_expires_at, provider_eligibility,
       privacy_level_snapshot, hosted_processing_consent, input_hash
     ) VALUES (
       ?1, ?2, 'enrich', ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9, ?10, ?11, ?12
     )`,
  )
    .bind(
      id,
      itemId,
      options.status ?? 'pending',
      options.attempts ?? 0,
      options.availableAt ?? T0.toISOString(),
      T0.toISOString(),
      options.leaseOwner ?? null,
      options.leaseExpiresAt ?? null,
      options.provider ?? 'openrouter',
      options.privacy ?? 'public',
      options.consent ?? 0,
      options.inputHash ?? 'input-hash',
    )
    .run();
}

async function insertSyncAttempt(
  id: string,
  itemId: string,
  status: 'pending' | 'processing' | 'complete' | 'failed' = 'pending',
) {
  await env.DB.prepare(
    `INSERT INTO sync_attempts (
       id, item_id, destination, status, attempts, available_at,
       created_at, updated_at
     ) VALUES (?1, ?2, 'notion', ?3, 0, ?4, ?4, ?4)`,
  )
    .bind(id, itemId, status, T0.toISOString())
    .run();
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
});

beforeEach(resetDatabase);

describe('migration upgrade safety', () => {
  it('preserves existing rows, backfills availability, and closes duplicate active work', async () => {
    const migrationDb = env.MIGRATION_DB!;
    const migrations = env.TEST_MIGRATIONS!;
    await applyD1Migrations(migrationDb, migrations.slice(0, 7));
    await migrationDb
      .prepare(
        `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at
       ) VALUES (
         'migration-item', 'migration-key', 'url', 'test', 'public',
         'pending', ?1, ?1, ?1
       )`,
      )
      .bind(T0.toISOString())
      .run();
    for (const id of ['job-oldest', 'job-duplicate']) {
      await migrationDb
        .prepare(
          `INSERT INTO processing_jobs (
           id, item_id, job_type, status, attempts, available_at,
           created_at, updated_at
         ) VALUES (?1, 'migration-item', 'enrich', 'pending', 0, ?2, ?2, ?2)`,
        )
        .bind(id, T0.toISOString())
        .run();
    }
    for (const id of ['sync-oldest', 'sync-duplicate']) {
      await migrationDb
        .prepare(
          `INSERT INTO sync_attempts (
           id, item_id, destination, status, attempts, created_at, updated_at
         ) VALUES (?1, 'migration-item', 'notion', 'pending', 0, ?2, ?2)`,
        )
        .bind(id, T0.toISOString())
        .run();
    }
    await applyD1Migrations(migrationDb, migrations.slice(7));
    const syncRows = await migrationDb
      .prepare(
        `SELECT id, status, available_at, last_error_code
       FROM sync_attempts ORDER BY id`,
      )
      .all<{
        id: string;
        status: string;
        available_at: string;
        last_error_code: string | null;
      }>();
    expect(syncRows.results).toHaveLength(2);
    expect(
      syncRows.results.every((row) => row.available_at === T0.toISOString()),
    ).toBe(true);
    expect(
      syncRows.results.filter((row) => row.status === 'pending'),
    ).toHaveLength(1);
    expect(
      syncRows.results.find((row) => row.status === 'failed')?.last_error_code,
    ).toBe('MIGRATION_DUPLICATE_ACTIVE_SYNC');
    const processing = await migrationDb
      .prepare(`SELECT status, last_error_code FROM processing_jobs`)
      .all<{ status: string; last_error_code: string | null }>();
    expect(
      processing.results.filter((row) => row.status === 'pending'),
    ).toHaveLength(1);
    expect(
      processing.results.find((row) => row.status === 'failed')
        ?.last_error_code,
    ).toBe('MIGRATION_DUPLICATE_ACTIVE_JOB');
  });
});

describe('OPE-246 durable D1 jobs', () => {
  it('leases concurrently without duplicate ownership and safely recovers stale work', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertItem('00000000-0000-0000-0000-000000000002');
    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
    );
    await insertProcessingJob(
      '22222222-2222-2222-2222-222222222222',
      '00000000-0000-0000-0000-000000000002',
    );
    const jobs = new JobService(env.DB);
    const [first, second] = await Promise.all([
      jobs.leaseProcessingJobs('enrich', 'worker-one', 5, 1, T0),
      jobs.leaseProcessingJobs('enrich', 'worker-two', 5, 1, T0),
    ]);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]!.id).not.toBe(second[0]!.id);

    const staleId = first[0]!.id;
    await env.DB.prepare(
      `UPDATE processing_jobs SET lease_expires_at = ?1 WHERE id = ?2`,
    )
      .bind(new Date(T0.getTime() - 1).toISOString(), staleId)
      .run();
    const recovered = await jobs.leaseProcessingJobs(
      'enrich',
      'recovery-worker',
      5,
      1,
      T0,
    );
    expect(recovered[0]?.id).toBe(staleId);
    expect(await jobs.completeProcessingJob(staleId, 'worker-one', T0)).toBe(
      false,
    );
    expect(
      await jobs.completeProcessingJob(staleId, 'recovery-worker', T0),
    ).toBe(true);
  });

  it('previews and repairs only explicitly reviewed current-generation mismatches', async () => {
    const itemId = 'reconcile-item';
    const legacyId = 'legacy-item';
    await insertItem(itemId);
    await insertItem(legacyId);
    await insertProcessingJob('reconcile-job', itemId);
    await insertProcessingJob('legacy-job', legacyId);
    await env.DB.prepare(
      "UPDATE processing_jobs SET processing_generation = NULL WHERE id = 'legacy-job'",
    ).run();
    await env.DB.prepare(
      "UPDATE items SET processing_status = 'complete' WHERE id IN (?1, ?2)",
    )
      .bind(itemId, legacyId)
      .run();
    const service = new ProcessingReconciliationService(env.DB);
    const preview = await service.preview();
    expect(preview.candidates.map((entry) => entry.itemId)).toEqual([itemId]);
    expect(preview.candidates[0]?.derivedStatus).toBe('pending');
    expect(await service.reconcile([itemId, legacyId])).toEqual({
      updated: 1,
      skipped: 1,
    });
    expect(await service.preview()).toMatchObject({
      count: 0,
      candidates: [],
    });
  });

  it('completes a current save-only generation when AI is deliberately omitted', async () => {
    const itemId = 'save-only-item';
    await insertItem(itemId);
    await env.DB.prepare(
      "UPDATE items SET source_type = 'note', source_url = NULL, processing_status = 'pending' WHERE id = ?1",
    )
      .bind(itemId)
      .run();
    await insertProcessingJob('save-only-optional-job', itemId, {
      provider: 'none',
      status: 'failed',
    });
    expect(
      await env.DB.prepare(
        'SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = ?1',
      )
        .bind(itemId)
        .first('derived_status'),
    ).toBe('complete');
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('complete');
  });

  it('cannot mark a URL item complete when acquisition was never enqueued', async () => {
    const itemId = 'missing-acquire-item';
    await insertItem(itemId);
    await insertProcessingJob('optional-enrich-only', itemId, {
      status: 'complete',
    });
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('pending');
  });

  it('stays pending between source completion and its required AI chain', async () => {
    const itemId = 'missing-downstream-item';
    await insertItem(itemId);
    await insertProcessingJob('missing-downstream-source', itemId, {
      status: 'complete',
    });
    await env.DB.prepare(
      "UPDATE processing_jobs SET job_type = 'acquire_url' WHERE id = ?1",
    )
      .bind('missing-downstream-source')
      .run();
    expect(
      await env.DB.prepare(
        'SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = ?1',
      )
        .bind(itemId)
        .first('derived_status'),
    ).toBe('pending');
    await insertProcessingJob('missing-downstream-ai', itemId, {
      status: 'complete',
    });
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('complete');
  });

  it('keeps item, list status, and terminal job failure consistent', async () => {
    const itemId = 'atomic-terminal-item';
    const jobId = 'atomic-terminal-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('pending');
    await jobs.leaseProcessingJobs('enrich', 'atomic-worker', 5, 1, T0);
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('processing');
    expect(
      await jobs.failProcessingJob(
        jobId,
        'atomic-worker',
        'PROVIDER_UNAVAILABLE',
        false,
        5,
        T0,
      ),
    ).toBe(true);
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('failed');
    expect(
      await env.DB.prepare(
        'SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = ?1',
      )
        .bind(itemId)
        .first('derived_status'),
    ).toBe('failed');
  });

  it('returns the same terminal status in detail, list, and status-filter results', async () => {
    const itemId = 'cross-view-failed-item';
    const jobId = 'cross-view-failed-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'cross-view-worker', 5, 1, T0);
    expect(
      await jobs.failProcessingJob(
        jobId,
        'cross-view-worker',
        'MODEL_FAILED',
        false,
        5,
        T0,
      ),
    ).toBe(true);
    const app = createApp();
    const options = { headers: { Authorization: 'Bearer test-admin-token' } };
    const [detail, list, failed, pending] = await Promise.all([
      app.request(`/api/v1/items/${itemId}`, options, env),
      app.request('/api/v1/items?limit=20', options, env),
      app.request(
        '/api/v1/items?processing_status=failed&limit=20',
        options,
        env,
      ),
      app.request(
        '/api/v1/items?processing_status=pending&limit=20',
        options,
        env,
      ),
    ]);
    expect([detail.status, list.status, failed.status, pending.status]).toEqual(
      [200, 200, 200, 200],
    );
    const detailBody = (await detail.json()) as {
      data: { item: { processing_status: string } };
    };
    const listBody = (await list.json()) as {
      data: Array<{ id: string; processing_status: string }>;
    };
    const failedBody = (await failed.json()) as {
      data: Array<{ id: string; processing_status: string }>;
    };
    const pendingBody = (await pending.json()) as {
      data: Array<{ id: string; processing_status: string }>;
    };
    expect(detailBody.data.item.processing_status).toBe('failed');
    expect(
      listBody.data.find((item) => item.id === itemId)?.processing_status,
    ).toBe('failed');
    expect(
      failedBody.data.find((item) => item.id === itemId)?.processing_status,
    ).toBe('failed');
    expect(pendingBody.data.some((item) => item.id === itemId)).toBe(false);
  });

  it('retires old work and refuses stale completion after privacy epoch change', async () => {
    const itemId = 'atomic-privacy-item';
    const jobId = 'atomic-privacy-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'privacy-worker', 5, 1, T0);
    await env.DB.prepare(
      "UPDATE items SET privacy_level = 'personal' WHERE id = ?1",
    )
      .bind(itemId)
      .run();
    expect(
      await env.DB.prepare(
        'SELECT processing_generation FROM items WHERE id = ?1',
      )
        .bind(itemId)
        .first('processing_generation'),
    ).toBe(2);
    expect(await jobs.completeProcessingJob(jobId, 'privacy-worker', T0)).toBe(
      false,
    );
    expect(
      await env.DB.prepare(
        'SELECT last_error_code FROM processing_jobs WHERE id = ?1',
      )
        .bind(jobId)
        .first('last_error_code'),
    ).toBe('PROCESSING_SUPERSEDED');
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('pending');
  });

  it('rejects expired-owner terminal failures without mutating job or audit', async () => {
    const itemId = 'expired-lease-item';
    const jobId = 'expired-lease-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const service = new JobService(env.DB);
    await service.leaseProcessingJobs('enrich', 'late-worker', 1, 1, T0);
    const expiredAt = new Date(T0.getTime() + 61_000);
    expect(
      await service.failProcessingJob(
        jobId,
        'late-worker',
        'UPSTREAM_ERROR',
        false,
        5,
        expiredAt,
      ),
    ).toBe(false);
    expect(
      await env.DB.prepare('SELECT status FROM processing_jobs WHERE id = ?1')
        .bind(jobId)
        .first('status'),
    ).toBe('processing');
    expect(
      (
        await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM audit_events WHERE item_id = ?1 AND event_type = 'job_terminally_failed'",
        )
          .bind(itemId)
          .first<{ n: number }>()
      )?.n,
    ).toBe(0);
  });

  it('heartbeats, releases, derives retry_wait, and honors exact retry timing', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
    );
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'worker-one', 2, 1, T0);
    expect(
      await jobs.heartbeatProcessingJob(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        10,
        T0,
      ),
    ).toBe(true);
    expect(
      await jobs.releaseProcessingJob(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        T0,
      ),
    ).toBe(true);
    await jobs.leaseProcessingJobs('enrich', 'worker-one', 2, 1, T0);
    const retryAt = new Date(T0.getTime() + 60_000);
    expect(
      await jobs.failProcessingJob(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        'PROVIDER_UNAVAILABLE',
        true,
        5,
        T0,
        retryAt,
      ),
    ).toBe(true);
    const listed = await new JobAdminService(env.DB).listProcessingJobs({
      status: 'retry_wait',
      now: T0,
    });
    expect(listed[0]?.visibleStatus).toBe('retry_wait');
    expect(
      await jobs.leaseProcessingJobs(
        'enrich',
        'worker-two',
        2,
        1,
        new Date(T0.getTime() + 59_999),
      ),
    ).toHaveLength(0);
    expect(
      await jobs.leaseProcessingJobs('enrich', 'worker-two', 2, 1, retryAt),
    ).toHaveLength(1);
  });

  it('stores one idempotent result and rejects conflicting replay', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
    );
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'worker-one', 5, 1, T0);
    const input = {
      submissionId: '11111111-1111-4111-8111-111111111111',
      inputHash: 'input-hash',
      resultVersion: 'summary-v1',
      result: { summary: 'safe derived value' },
    };
    expect(
      await jobs.submitProcessingResult(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        input,
        T0,
      ),
    ).toEqual({ accepted: true, replayed: false });
    expect(
      await jobs.submitProcessingResult(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        input,
        T0,
      ),
    ).toEqual({ accepted: true, replayed: true });
    expect(
      await jobs.submitProcessingResult(
        '11111111-1111-1111-1111-111111111111',
        'worker-one',
        { ...input, submissionId: '22222222-2222-4222-8222-222222222222' },
        T0,
      ),
    ).toEqual({ accepted: false, replayed: false });
    const results = await env.DB.prepare(
      `SELECT * FROM processing_job_results WHERE job_id = '11111111-1111-1111-1111-111111111111'`,
    ).all();
    expect(results.results).toHaveLength(1);
  });

  it('accepts only one duplicate completion of the same owned job', async () => {
    const itemId = 'double-completion-item';
    const jobId = 'double-completion-job';
    await insertItem(itemId);
    // This case exercises enrichment only. A URL capture would also require acquisition.
    await env.DB.prepare(
      "UPDATE items SET source_type = 'note', source_url = NULL WHERE id = ?1",
    ).bind(itemId).run();
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'double-worker', 5, 1, T0);
    const result = await Promise.all([
      jobs.completeProcessingJob(jobId, 'double-worker', T0),
      jobs.completeProcessingJob(jobId, 'double-worker', T0),
    ]);
    expect(result.filter(Boolean)).toHaveLength(1);
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('complete');
  });

  it('rejects the old owner after an admin requeues a failed generation', async () => {
    const itemId = 'retry-owner-race-item';
    const jobId = 'retry-owner-race-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'retry-old-owner', 5, 1, T0);
    expect(
      await jobs.failProcessingJob(
        jobId,
        'retry-old-owner',
        'UPSTREAM_TIMEOUT',
        false,
        5,
        T0,
      ),
    ).toBe(true);
    expect(
      await new JobAdminService(env.DB).manuallyRetryProcessingJob(
        jobId,
        'admin:retry',
        T0,
      ),
    ).toBe(true);
    expect(await jobs.completeProcessingJob(jobId, 'retry-old-owner', T0)).toBe(
      false,
    );
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('pending');
  });

  it('accepts exactly one concurrent terminal mutation and projects its outcome', async () => {
    const itemId = 'race-terminal-item';
    const jobId = 'race-terminal-job';
    await insertItem(itemId);
    // This case exercises enrichment only. A URL capture would also require acquisition.
    await env.DB.prepare(
      "UPDATE items SET source_type = 'note', source_url = NULL WHERE id = ?1",
    ).bind(itemId).run();
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'race-worker', 5, 1, T0);
    const results = await Promise.all([
      jobs.completeProcessingJob(jobId, 'race-worker', T0),
      jobs.failProcessingJob(
        jobId,
        'race-worker',
        'MODEL_FAILED',
        false,
        5,
        T0,
      ),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const status = await env.DB.prepare(
      'SELECT status FROM processing_jobs WHERE id = ?1',
    )
      .bind(jobId)
      .first<string>('status');
    expect(status).toMatch(/^(complete|failed)$/);
    const derived = await env.DB.prepare(
      'SELECT processing_status FROM items WHERE id = ?1',
    )
      .bind(itemId)
      .first<string>('processing_status');
    expect(derived).toBe(status);
  });

  it('rejects a deleted item while an old worker still has a lease', async () => {
    const itemId = 'race-deleted-item';
    const jobId = 'race-deleted-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'deleted-worker', 5, 1, T0);
    await env.DB.prepare('UPDATE items SET deleted_at = ?1 WHERE id = ?2')
      .bind(T0.toISOString(), itemId)
      .run();
    expect(await jobs.completeProcessingJob(jobId, 'deleted-worker', T0)).toBe(
      false,
    );
    expect(
      await env.DB.prepare(
        'SELECT last_error_code FROM processing_jobs WHERE id = ?1',
      )
        .bind(jobId)
        .first('last_error_code'),
    ).toBe('PROCESSING_SUPERSEDED');
  });

  it('rejects a byte-identical replay after the item epoch changes', async () => {
    const itemId = 'result-replay-epoch-item';
    const jobId = 'result-replay-epoch-job';
    await insertItem(itemId);
    await insertProcessingJob(jobId, itemId);
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'result-owner', 5, 1, T0);
    const input = {
      submissionId: 'result-replay-epoch-submission',
      inputHash: 'input-hash',
      resultVersion: 'summary-v1',
      result: { summary: 'old result' },
    };
    expect(
      await jobs.submitProcessingResult(jobId, 'result-owner', input, T0),
    ).toEqual({ accepted: true, replayed: false });
    await env.DB.prepare(
      "UPDATE items SET privacy_level = 'personal' WHERE id = ?1",
    )
      .bind(itemId)
      .run();
    expect(
      await jobs.submitProcessingResult(jobId, 'result-owner', input, T0),
    ).toEqual({ accepted: false, replayed: false });
    expect(
      await env.DB.prepare('SELECT processing_status FROM items WHERE id = ?1')
        .bind(itemId)
        .first('processing_status'),
    ).toBe('pending');
  });

  it('keeps terminal failures bounded and policy-gates manual retries', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
      {
        attempts: 4,
        provider: 'none',
      },
    );
    const jobs = new JobService(env.DB);
    await jobs.leaseProcessingJobs('enrich', 'worker-one', 5, 1, T0);
    await jobs.failProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      'worker-one',
      'PROVIDER_UNAVAILABLE',
      true,
      5,
      T0,
    );
    expect(
      await env.DB.prepare(
        `SELECT status FROM processing_jobs WHERE id = '11111111-1111-1111-1111-111111111111'`,
      ).first('status'),
    ).toBe('failed');
    await expect(
      new JobAdminService(env.DB).manuallyRetryProcessingJob(
        '11111111-1111-1111-1111-111111111111',
        'admin:test',
        T0,
      ),
    ).rejects.toMatchObject({ code: 'JOB_NOT_LEASABLE' });
  });

  it('rejects generic manual retry for immutable URL acquisition evidence', async () => {
    const admin = new JobAdminService(env.DB);
    await insertItem('acquisition-retry-item');
    await insertProcessingJob(
      'acquisition-retry-job',
      'acquisition-retry-item',
      { status: 'failed' },
    );
    await env.DB.prepare(
      `UPDATE processing_jobs
       SET job_type = 'acquire_url', input_hash = 'url-source-v1:1'
       WHERE id = 'acquisition-retry-job'`,
    ).run();

    await expect(
      admin.manuallyRetryProcessingJob(
        'acquisition-retry-job',
        'admin:test',
        T0,
      ),
    ).rejects.toMatchObject({ code: 'OWNER_APPROVAL_REQUIRED' });
  });

  it('blocks manual retry for deletion, quota pause, stale privacy, and retry exhaustion', async () => {
    const admin = new JobAdminService(env.DB);
    await insertItem('deleted-item', { deletedAt: T0.toISOString() });
    await insertProcessingJob('deleted-job', 'deleted-item', {
      status: 'failed',
    });
    await expect(
      admin.manuallyRetryProcessingJob('deleted-job', 'admin:test', T0),
    ).rejects.toMatchObject({ code: 'JOB_NOT_LEASABLE' });

    await insertItem('quota-item');
    await insertProcessingJob('quota-job', 'quota-item', { status: 'failed' });
    await env.DB.prepare(
      `UPDATE operational_controls SET enabled = 1 WHERE control_key = 'optional_processing_paused'`,
    ).run();
    await expect(
      admin.manuallyRetryProcessingJob('quota-job', 'admin:test', T0),
    ).rejects.toMatchObject({ code: 'QUOTA_PAUSED' });
    await env.DB.prepare(
      `UPDATE operational_controls SET enabled = 0 WHERE control_key = 'optional_processing_paused'`,
    ).run();

    await insertItem('privacy-item', { privacy: 'personal' });
    await insertProcessingJob('privacy-job', 'privacy-item', {
      status: 'failed',
      privacy: 'public',
    });
    await expect(
      admin.manuallyRetryProcessingJob('privacy-job', 'admin:test', T0),
    ).rejects.toMatchObject({ code: 'JOB_NOT_LEASABLE' });

    await insertItem('exhausted-item');
    await insertProcessingJob('exhausted-job', 'exhausted-item', {
      status: 'failed',
    });
    await env.DB.prepare(
      `UPDATE processing_jobs SET manual_retry_count = 3 WHERE id = 'exhausted-job'`,
    ).run();
    await expect(
      admin.manuallyRetryProcessingJob('exhausted-job', 'admin:test', T0),
    ).rejects.toMatchObject({ code: 'JOB_NOT_LEASABLE' });
  });

  it('exposes authenticated admin and scoped local-worker routes', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
    );
    await env.DB.prepare(
      `UPDATE processing_jobs SET available_at = '1970-01-01T00:00:00.000Z'
       WHERE id = '11111111-1111-1111-1111-111111111111'`,
    ).run();
    const app = createApp();
    const unauthorized = await app.request('/api/v1/jobs', {}, env);
    expect(unauthorized.status).toBe(403);
    const listed = await app.request(
      '/api/v1/jobs?status=pending',
      { headers: { Authorization: 'Bearer test-admin-token' } },
      env,
    );
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as {
      data: { jobs: unknown[] };
    };
    expect(listedBody.data.jobs).toHaveLength(1);

    const wrongScope = await app.request(
      '/api/v1/worker/jobs/lease',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_type: 'enrich',
          owner_id: 'worker-one',
          ttl_minutes: 5,
          limit: 1,
        }),
      },
      env,
    );
    expect(wrongScope.status).toBe(403);
    const leased = await app.request(
      '/api/v1/worker/jobs/lease',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-local-worker-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_type: 'enrich',
          owner_id: 'worker-one',
          ttl_minutes: 5,
          limit: 1,
        }),
      },
      env,
    );
    expect(leased.status).toBe(200);
    const leasedBody = (await leased.json()) as {
      data: { jobs: Array<Record<string, unknown>> };
    };
    expect(leasedBody.data.jobs[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      leaseOwner: 'worker-one',
    });

    const rejectedFailure = await app.request(
      '/api/v1/worker/jobs/11111111-1111-1111-1111-111111111111/fail',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-local-worker-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: 'worker-one',
          error_code: 'PROVIDER_UNAVAILABLE',
          retryable: false,
          retry_after_seconds: 60,
        }),
      },
      env,
    );
    expect(rejectedFailure.status).toBe(422);

    const failed = await app.request(
      '/api/v1/worker/jobs/11111111-1111-1111-1111-111111111111/fail',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-local-worker-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: 'worker-one',
          error_code: 'PROVIDER_UNAVAILABLE',
          retryable: true,
          retry_after_seconds: 60,
        }),
      },
      env,
    );
    expect(failed.status).toBe(200);
    expect(await failed.json()).toMatchObject({
      data: {
        job_id: '11111111-1111-1111-1111-111111111111',
        status: 'retry_wait',
        retryable: true,
        retry_after_seconds: 60,
      },
    });
    const failedRow = await env.DB.prepare(
      `SELECT status, attempts, last_error_code, available_at
       FROM processing_jobs WHERE id = '11111111-1111-1111-1111-111111111111'`,
    ).first<{
      status: string;
      attempts: number;
      last_error_code: string | null;
      available_at: string;
    }>();
    expect(failedRow).toMatchObject({
      status: 'pending',
      attempts: 1,
      last_error_code: 'PROVIDER_UNAVAILABLE',
    });
    expect(new Date(failedRow!.available_at).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });
});

describe('OPE-221 retry-safe Notion worker', () => {
  it('keeps capture independent from Notion availability', async () => {
    const app = createApp();
    const response = await app.request(
      '/api/v1/captures',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-capture-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: 'capture-notion-outage-0001',
          source_type: 'url',
          source_app: 'ios-shortcut',
          url: 'https://example.com/notion-outage',
          captured_at: T0.toISOString(),
          client: { name: 'shortcut', version: '1.0' },
        }),
      },
      env,
    );
    expect(response.status).toBe(201);
    expect(
      await env.DB.prepare(
        `SELECT count(*) AS count FROM sync_attempts WHERE destination = 'notion'`,
      ).first('count'),
    ).toBe(1);
  });

  it('reprocessing changes enqueue an update to the existing page', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      notionPageId: 'notion-page-1',
    });
    await env.DB.prepare(
      `UPDATE items SET summary = 'new summary', updated_at = ?1 WHERE id = '00000000-0000-0000-0000-000000000001'`,
    )
      .bind(new Date(T0.getTime() + 1_000).toISOString())
      .run();
    expect(
      await env.DB.prepare(
        `SELECT projection_version FROM items WHERE id = '00000000-0000-0000-0000-000000000001'`,
      ).first('projection_version'),
    ).toBe(2);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'notion-page-1' }));
    const later = new Date(T0.getTime() + 2_000);
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => later,
      fetcher,
      batchSize: 1,
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://api.notion.com/v1/pages/notion-page-1',
    );
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(
      await env.DB.prepare(
        `SELECT status FROM sync_attempts WHERE item_id = '00000000-0000-0000-0000-000000000001'`,
      ).first('status'),
    ).toBe('complete');
  });

  it('adopts the existing page after D1 persistence fails, avoiding a second create', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001');
    await insertSyncAttempt('sync-1', '00000000-0000-0000-0000-000000000001');
    await env.DB.prepare(
      `CREATE TRIGGER fail_notion_page_persist
       BEFORE UPDATE OF notion_page_id ON items
       BEGIN SELECT RAISE(ABORT, 'simulated_persistence_failure'); END`,
    ).run();
    const firstFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'notion-page-1' }));
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => T0,
      fetcher: firstFetch,
      batchSize: 1,
    });
    expect(
      await env.DB.prepare(
        `SELECT status FROM sync_attempts WHERE id = 'sync-1'`,
      ).first('status'),
    ).toBe('pending');
    await env.DB.exec('DROP TRIGGER fail_notion_page_persist');

    const secondFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ id: 'notion-page-1' }] }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'notion-page-1' }));
    const later = new Date(T0.getTime() + 10 * 60_000);
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => later,
      fetcher: secondFetch,
      batchSize: 1,
    });
    expect(
      firstFetch.mock.calls.filter(
        (call) => call[0] === 'https://api.notion.com/v1/pages',
      ),
    ).toHaveLength(1);
    expect(
      secondFetch.mock.calls.filter(
        (call) => call[0] === 'https://api.notion.com/v1/pages',
      ),
    ).toHaveLength(0);
    expect(
      secondFetch.mock.calls.some((call) => call[1]?.method === 'PATCH'),
    ).toBe(true);
    expect(
      await env.DB.prepare(
        `SELECT notion_page_id FROM items WHERE id = '00000000-0000-0000-0000-000000000001'`,
      ).first('notion_page_id'),
    ).toBe('notion-page-1');
    expect(
      await env.DB.prepare(
        `SELECT status, last_error_code
         FROM sync_attempts WHERE id = 'sync-1'`,
      ).first(),
    ).toMatchObject({
      status: 'complete',
      last_error_code: null,
    });
  });

  it('records deleted pages and requires the explicit recreation workflow', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      notionPageId: 'deleted-page',
    });
    await insertSyncAttempt('sync-1', '00000000-0000-0000-0000-000000000001');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 404));
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => T0,
      fetcher,
      batchSize: 1,
    });
    expect(
      await env.DB.prepare(
        `SELECT last_error_code FROM sync_attempts WHERE id = 'sync-1'`,
      ).first('last_error_code'),
    ).toBe('NOTION_PAGE_MISSING');
    expect(
      await env.DB.prepare(
        `SELECT notion_missing_at FROM items WHERE id = '00000000-0000-0000-0000-000000000001'`,
      ).first('notion_missing_at'),
    ).toBe(T0.toISOString());
    await expect(
      new JobAdminService(env.DB).manuallyRetrySyncAttempt(
        'sync-1',
        'admin:test',
        T0,
      ),
    ).rejects.toMatchObject({ code: 'OWNER_APPROVAL_REQUIRED' });
    expect(
      await new JobAdminService(env.DB).approveNotionRecreation(
        '00000000-0000-0000-0000-000000000001',
        'admin:test',
        T0,
      ),
    ).toBe(true);
    expect(
      await env.DB.prepare(
        `SELECT notion_page_id FROM items WHERE id = '00000000-0000-0000-0000-000000000001'`,
      ).first('notion_page_id'),
    ).toBeNull();
  });

  it('persists Retry-After timing for 529 without leaking provider text', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      notionPageId: 'page-1',
    });
    await insertSyncAttempt('sync-1', '00000000-0000-0000-0000-000000000001');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({ message: 'sensitive provider response' }, 529, {
        'Retry-After': '7',
      }),
    );
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => T0,
      fetcher,
      batchSize: 1,
    });
    const attempt = await env.DB.prepare(
      `SELECT status, last_error_code, available_at
       FROM sync_attempts WHERE id = 'sync-1'`,
    ).first<{
      status: string;
      last_error_code: string;
      available_at: string;
    }>();
    expect(attempt).toMatchObject({
      status: 'pending',
      last_error_code: 'NOTION_RATE_LIMITED',
      available_at: new Date(T0.getTime() + 7_000).toISOString(),
    });
  });

  it('records invalid-property failures as terminal safe codes', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      notionPageId: 'page-1',
    });
    await insertSyncAttempt('sync-1', '00000000-0000-0000-0000-000000000001');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ message: 'provider internals' }, 400),
      );
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => T0,
      fetcher,
      batchSize: 1,
    });
    expect(
      await env.DB.prepare(
        `SELECT status, last_error_code FROM sync_attempts WHERE id = 'sync-1'`,
      ).first(),
    ).toMatchObject({
      status: 'failed',
      last_error_code: 'NOTION_INVALID_PROPERTY',
    });
  });

  it('turns outbound timeouts into retryable safe failures', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      notionPageId: 'page-1',
    });
    await insertSyncAttempt('sync-1', '00000000-0000-0000-0000-000000000001');
    const fetcher = vi.fn<typeof fetch>((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    await processNotionSyncJobs(env.DB, 'token', 'database', {
      now: () => T0,
      fetcher,
      batchSize: 1,
      timeoutMs: 5,
    });
    expect(
      await env.DB.prepare(
        `SELECT status, last_error_code FROM sync_attempts WHERE id = 'sync-1'`,
      ).first(),
    ).toMatchObject({
      status: 'pending',
      last_error_code: 'NOTION_TIMEOUT',
    });
  });
});
