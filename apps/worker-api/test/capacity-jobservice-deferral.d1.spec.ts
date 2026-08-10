import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CapacityJobService } from '../src/jobs/capacity-job.service';
import { JobService } from '../src/jobs/job.service';

const ITEM_ID = 'capacity-generic-0000-0000-0000-000000000001';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const now = '2026-08-09T21:30:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'capacity-generic-key', 'image', 'test', 'public',
               'pending', ?2, ?2, ?2, 'vision capacity fixture')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-227 generic processing capacity deferral', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('keeps a leased extraction job pending without consuming attempts', async () => {
    const now = new Date('2026-08-09T21:30:00.000Z');
    const jobs = new JobService(env.DB);
    expect(
      await jobs.enqueueProcessingJob(
        ITEM_ID,
        'extract',
        'capacity-generic-input',
        now,
      ),
    ).toBe(true);
    const [leased] = await jobs.leaseProcessingJobs(
      'extract',
      'vision-worker',
      5,
      1,
      now,
    );
    expect(leased).toBeDefined();
    const jobId = leased!.id;

    expect(
      await new CapacityJobService(env.DB).deferProcessingJob(
        jobId,
        'vision-worker',
        'QUOTA_PAUSED',
        new Date('2026-08-09T22:30:00.000Z'),
        now,
      ),
    ).toBe(true);

    const row = await env.DB.prepare(
      `SELECT status, attempts, last_error_code, available_at, lease_owner
       FROM processing_jobs WHERE id = ?1`,
    )
      .bind(jobId)
      .first<{
        status: string;
        attempts: number;
        last_error_code: string;
        available_at: string;
        lease_owner: string | null;
      }>();
    expect(row?.status).toBe('pending');
    expect(row?.attempts).toBe(0);
    expect(row?.last_error_code).toBe('QUOTA_PAUSED');
    expect(row?.lease_owner).toBeNull();
    expect(row?.available_at).toBe('2026-08-09T22:30:00.000Z');
  });
});
