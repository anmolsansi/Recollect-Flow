import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CapacityJobService } from '../src/jobs/capacity-job.service';
import { JobService } from '../src/jobs/job.service';

const ITEM_ID = 'capacity-job-0000-0000-0000-000000000001';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const now = '2026-08-09T20:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'capacity-job-key', 'text', 'test', 'public',
               'pending', ?2, ?2, ?2, 'capacity job test')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-227 capacity job deferral', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('returns a leased job to pending without consuming another attempt', async () => {
    const now = new Date('2026-08-09T20:00:00.000Z');
    const jobs = new JobService(env.DB);
    await jobs.enqueueProcessingJob(ITEM_ID, 'enrich', 'capacity-input', now);
    const [leased] = await jobs.leaseProcessingJobs(
      'enrich',
      'capacity-worker',
      5,
      1,
      now,
    );
    expect(leased).toBeDefined();
    expect(leased?.attempts).toBe(1);

    const deferredUntil = new Date('2026-08-09T21:00:00.000Z');
    const deferred = await new CapacityJobService(env.DB).deferProcessingJob(
      leased!.id,
      'capacity-worker',
      'QUOTA_PAUSED',
      deferredUntil,
      now,
    );
    expect(deferred).toBe(true);

    const row = await env.DB.prepare(
      `SELECT status, attempts, available_at, last_error_code, lease_owner
       FROM processing_jobs WHERE id = ?1`,
    )
      .bind(leased!.id)
      .first<{
        status: string;
        attempts: number;
        available_at: string;
        last_error_code: string;
        lease_owner: string | null;
      }>();
    expect(row).toEqual({
      status: 'pending',
      attempts: 1,
      available_at: deferredUntil.toISOString(),
      last_error_code: 'QUOTA_PAUSED',
      lease_owner: null,
    });

    const audit = await env.DB.prepare(
      `SELECT details_json FROM audit_events
       WHERE item_id = ?1 AND event_type = 'job_capacity_deferred'`,
    )
      .bind(ITEM_ID)
      .first<{ details_json: string }>();
    expect(JSON.parse(audit!.details_json)).toMatchObject({
      error_code: 'QUOTA_PAUSED',
      attempts_preserved: 1,
    });
  });
});
