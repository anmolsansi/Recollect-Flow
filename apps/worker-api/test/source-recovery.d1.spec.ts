import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { JobService } from '../src/jobs/job.service';
import { SourceRecoveryService } from '../src/jobs/extraction/source-recovery.service';
import { SourceEvidenceService } from '../src/jobs/extraction/source-evidence.service';
import { SourceAcquisitionService } from '../src/jobs/extraction/source-acquisition.service';

const NOW = new Date('2026-10-09T12:00:00.000Z');

async function reset() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM url_acquisitions'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function seed(id: string, privacy = 'public') {
  await env.DB.prepare(
    `INSERT INTO items(id,idempotency_key,source_type,source_app,source_url,
      canonical_url,privacy_level,processing_status,lifecycle_status,
      captured_at,created_at,updated_at)
    VALUES(?1,?2,'url','test',?3,?3,?4,'pending','Inbox',?5,?5,?5)`,
  )
    .bind(
      id,
      `capture-${id}`,
      `https://example.com/${id}`,
      privacy,
      NOW.toISOString(),
    )
    .run();
}

async function jobCount(itemId: string, type = 'acquire_url') {
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM processing_jobs WHERE item_id=?1 AND job_type=?2',
  )
    .bind(itemId, type)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

describe('BG-11 source recovery', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });
  beforeEach(async () => {
    await reset();
  });

  it('denies private URLs without creating a source job', async () => {
    await seed('private-source', 'personal');
    const recovery = new SourceRecoveryService(env.DB);
    expect((await recovery.eligibility('private-source', 1)).eligible).toBe(
      false,
    );
    await expect(
      recovery.retry('private-source', 1, 'test', NOW),
    ).rejects.toMatchObject({ code: 'SOURCE_POLICY_BLOCKED' });
    expect(await jobCount('private-source')).toBe(0);
  });

  it('queues an old URL exactly once despite duplicate owner requests', async () => {
    await seed('old-source');
    const recovery = new SourceRecoveryService(env.DB);
    expect(await recovery.previewLegacy()).toMatchObject({
      count: 1,
      items: [{ item_id: 'old-source', source_revision: 1 }],
    });
    const first = await recovery.retry('old-source', 1, 'test', NOW);
    const second = await recovery.retry('old-source', 1, 'test', NOW);
    expect(first).toMatchObject({ status: 'pending', created: true });
    expect(second).toMatchObject({ job_id: first.job_id, created: false });
    expect(await jobCount('old-source')).toBe(1);
    expect((await recovery.eligibility('old-source', 1)).reason).toBe(
      'SOURCE_ALREADY_QUEUED',
    );
  });

  it('restricts reprocessing preview to eligible never-acquired public URL records', async () => {
    await seed('old-public');
    await seed('old-private', 'sensitive');
    await seed('old-deleted');
    await env.DB.prepare('UPDATE items SET deleted_at=?1 WHERE id=?2')
      .bind(NOW.toISOString(), 'old-deleted')
      .run();
    const recovery = new SourceRecoveryService(env.DB);
    expect(await recovery.previewLegacy(20)).toMatchObject({
      count: 1,
      items: [{ item_id: 'old-public', source_revision: 1 }],
    });
    const results = await recovery.reprocessLegacy(
      [
        { item_id: 'old-private', source_revision: 1 },
        { item_id: 'old-public', source_revision: 1 },
      ],
      'operator',
    );
    expect(results).toMatchObject([
      { result: 'skipped', reason: 'NOT_ELIGIBLE' },
      { result: 'queued' },
    ]);
    expect((await recovery.previewLegacy()).count).toBe(0);
    expect(await jobCount('old-public')).toBe(1);
  });

  it('rejects stale revisions and batches over the explicit cap', async () => {
    await seed('revision-item');
    const recovery = new SourceRecoveryService(env.DB);
    await expect(
      recovery.retry('revision-item', 2, 'test', NOW),
    ).rejects.toMatchObject({ code: 'SOURCE_REVISION_STALE' });
    await expect(
      recovery.reprocessLegacy(
        Array.from({ length: 21 }, (_, index) => ({
          item_id: `x-${index}`,
          source_revision: 1,
        })),
        'test',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await jobCount('revision-item')).toBe(0);
  });

  it('stores owner-supplied text without changing original source events', async () => {
    await seed('owner-evidence');
    await env.DB.prepare(
      `INSERT INTO capture_events(id,item_id,idempotency_key,source_type,source_app,
       source_url,privacy_level,captured_at,created_at)
       VALUES('original-event','owner-evidence','original-key','url','test',
       'https://example.com/owner-evidence','public',?1,?1)`,
    )
      .bind(NOW.toISOString())
      .run();
    const evidence = new SourceEvidenceService(env.DB);
    const result = await evidence.supplyText(
      'owner-evidence',
      1,
      'Personal excerpt sentinel bluewhale',
      NOW,
    );
    expect(result).toMatchObject({ edit_version: 2, source_revision: 1 });
    const item = await env.DB.prepare(
      `SELECT raw_text FROM items WHERE id='owner-evidence'`,
    ).first<{ raw_text: string }>();
    expect(item?.raw_text).toContain('bluewhale');
    const event = await env.DB.prepare(
      `SELECT raw_text FROM capture_events WHERE id='original-event'`,
    ).first<{ raw_text: string | null }>();
    expect(event?.raw_text).toBeNull();
    await expect(
      evidence.supplyText('owner-evidence', 2, 'replacement', NOW),
    ).rejects.toMatchObject({ code: 'SOURCE_TEXT_EXISTS' });
    expect(await jobCount('owner-evidence', 'enrich')).toBe(0);
  });

  it('changes URL generation, preserves old capture and enqueues only the current revision', async () => {
    await seed('swapped');
    const editor = new SourceEvidenceService(env.DB);
    const result = await editor.replaceUrl(
      'swapped',
      1,
      'https://example.com/new-page',
      NOW,
    );
    expect(result).toMatchObject({
      source_revision: 2,
      edit_version: 2,
      status: 'pending',
    });
    const current = await env.DB.prepare(
      `SELECT source_url,source_revision FROM items WHERE id='swapped'`,
    ).first<{ source_url: string; source_revision: number }>();
    expect(current).toMatchObject({
      source_url: 'https://example.com/new-page',
      source_revision: 2,
    });
    const job = await env.DB.prepare(
      `SELECT input_hash FROM processing_jobs WHERE item_id='swapped' AND job_type='acquire_url'`,
    ).first<{ input_hash: string }>();
    expect(job?.input_hash).toBe('url-source-v1:2');
    await expect(
      editor.replaceUrl('swapped', 1, 'https://example.com/other', NOW),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('rejects an old leased fetch after a source URL edit', async () => {
    await seed('raced');
    const recovery = new SourceRecoveryService(env.DB);
    const queued = await recovery.retry('raced', 1, 'owner', NOW);
    const leases = await new JobService(env.DB).leaseProcessingJobs(
      'acquire_url',
      'worker',
      5,
      1,
      NOW,
    );
    const oldJob = leases.find((j) => j.id === queued.job_id);
    expect(oldJob).toBeDefined();
    await new SourceEvidenceService(env.DB).replaceUrl(
      'raced',
      1,
      'https://example.com/new-target',
      NOW,
    );
    const fetch = vi.fn(async () => ({
      status: 'acquired_text' as const,
      coverage: 'acquired_text' as const,
      retryable: false,
      redirectCount: 0,
      acquiredText: 'STALE MUST NOT WIN',
    }));
    const service = new SourceAcquisitionService(env.DB, {
      fetcher: { fetch },
      now: () => new Date(NOW.getTime() + 1000),
    });
    expect(await service.process(oldJob!, 'worker')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    const evidence = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM url_acquisitions WHERE item_id='raced'`,
    ).first<{ total: number }>();
    expect(evidence?.total).toBe(0);
    expect(await jobCount('raced')).toBe(2);
  });
  it('requires authentication and validates the retry revision at the HTTP boundary', async () => {
    await seed('route-source');
    const app = createApp();
    const anonymous = await app.request(
      '/api/v1/items/route-source/source/retry',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_revision: 1 }),
      },
      env,
    );
    expect(anonymous.status).toBe(403);

    const invalid = await app.request(
      '/api/v1/items/route-source/source/retry',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source_revision: 0 }),
      },
      env,
    );
    expect(invalid.status).toBe(422);
    expect(await jobCount('route-source')).toBe(0);

    const request = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_revision: 1 }),
    };
    const accepted = await app.request(
      '/api/v1/items/route-source/source/retry',
      request,
      env,
    );
    expect(accepted.status).toBe(200);
    const payload = (await accepted.json()) as {
      data: { created: boolean; job_id: string };
    };
    expect(payload.data.created).toBe(true);

    const replay = await app.request(
      '/api/v1/items/route-source/source/retry',
      request,
      env,
    );
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      data: { created: false, job_id: payload.data.job_id },
    });
    expect(await jobCount('route-source')).toBe(1);
  });
  it('keeps a bookmark through a transient timeout and then accepts only successful evidence', async () => {
    await seed('slow-site');
    const recovery = new SourceRecoveryService(env.DB);
    const queued = await recovery.retry('slow-site', 1, 'owner', NOW);
    const jobs = new JobService(env.DB);
    const firstLease = (
      await jobs.leaseProcessingJobs('acquire_url', 'slow-worker', 5, 1, NOW)
    )[0]!;
    expect(firstLease.id).toBe(queued.job_id);
    const failedFetcher = vi.fn(async () => ({
      status: 'timeout' as const,
      coverage: 'url_only' as const,
      errorCode: 'SOURCE_TIMEOUT' as const,
      retryable: true,
      redirectCount: 0,
    }));
    const failed = new SourceAcquisitionService(env.DB, {
      fetcher: { fetch: failedFetcher },
      now: () => new Date(NOW.getTime() + 1000),
    });
    expect(await failed.process(firstLease, 'slow-worker')).toBe(false);
    const retryState = await env.DB.prepare(
      `SELECT status,available_at,attempts FROM processing_jobs WHERE id=?1`,
    )
      .bind(queued.job_id)
      .first<{ status: string; available_at: string; attempts: number }>();
    expect(retryState).toMatchObject({ status: 'pending', attempts: 1 });
    expect(new Date(retryState!.available_at).getTime()).toBeGreaterThan(
      NOW.getTime(),
    );

    const retried = (
      await jobs.leaseProcessingJobs(
        'acquire_url',
        'retry-worker',
        5,
        1,
        new Date(new Date(retryState!.available_at).getTime() + 1000),
      )
    )[0]!;
    expect(retried.id).toBe(queued.job_id);
    const succeeded = new SourceAcquisitionService(env.DB, {
      fetcher: {
        fetch: vi.fn(async () => ({
          status: 'acquired_text' as const,
          coverage: 'acquired_text' as const,
          retryable: false,
          redirectCount: 0,
          acquiredText: 'Now readable bluebird sentinel',
        })),
      },
      now: () => new Date(new Date(retryState!.available_at).getTime() + 2000),
    });
    expect(await succeeded.process(retried, 'retry-worker')).toBe(true);
    const accepted = await env.DB.prepare(
      `SELECT status,acquired_text,attempt_count FROM url_acquisitions WHERE item_id=?1`,
    )
      .bind('slow-site')
      .first<{
        status: string;
        acquired_text: string;
        attempt_count: number;
      }>();
    expect(accepted).toMatchObject({
      status: 'acquired_text',
      attempt_count: 2,
    });
    expect(accepted?.acquired_text).toContain('bluebird');
    expect((await recovery.eligibility('slow-site', 1)).eligible).toBe(false);
  });

  it('does not allow stale prior privacy to authorize a manual retry', async () => {
    await seed('changed-policy');
    await env.DB.prepare(
      `UPDATE items SET privacy_level='personal' WHERE id='changed-policy'`,
    ).run();
    const recovery = new SourceRecoveryService(env.DB);
    await expect(
      recovery.retry('changed-policy', 1, 'owner', NOW),
    ).rejects.toMatchObject({ code: 'SOURCE_POLICY_BLOCKED' });
    expect(await jobCount('changed-policy')).toBe(0);
  });
});
