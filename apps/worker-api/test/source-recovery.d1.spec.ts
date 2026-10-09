import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
