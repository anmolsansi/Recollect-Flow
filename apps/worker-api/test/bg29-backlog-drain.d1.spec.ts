import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { JobService } from '../src/jobs/job.service';
import { OperationsSummaryService } from '../src/jobs/operations-summary.service';

const START = new Date('2026-10-01T10:00:00.000Z');

describe('BG-29 bounded synthetic backlog and interrupted worker acceptance', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM processing_job_results'),
      env.DB.prepare('DELETE FROM processing_jobs'),
      env.DB.prepare('DELETE FROM sync_attempts'),
      env.DB.prepare('DELETE FROM audit_events'),
      env.DB.prepare('DELETE FROM capture_events'),
      env.DB.prepare('DELETE FROM item_deduplication_keys'),
      env.DB.prepare('DELETE FROM items'),
    ]);
  });

  it('drains a bounded 15-job fixture across leases without double processing', async () => {
    for (let number = 1; number <= 15; number += 1) {
      const id = `bg29-drain-item-${number}`;
      await env.DB.prepare(
        `INSERT INTO items (id, idempotency_key, source_type, source_app,
           privacy_level, processing_status, captured_at, created_at,
           updated_at, raw_text)
         VALUES (?1, ?2, 'note', 'bg29', 'sensitive', 'pending',
           ?3, ?3, ?3, 'Synthetic durable source')`,
      )
        .bind(id, `bg29-drain-key-${number}`, START.toISOString())
        .run();
      await env.DB.prepare(
        `INSERT INTO processing_jobs (id, item_id, job_type, status,
           privacy_level_snapshot, provider_eligibility, attempts,
           available_at, created_at, updated_at)
         VALUES (?1, ?2, 'enrich', 'pending', 'sensitive', 'none', 0,
           ?3, ?3, ?3)`,
      )
        .bind(`bg29-drain-job-${number}`, id, START.toISOString())
        .run();
    }
    const jobs = new JobService(env.DB);
    const operations = new OperationsSummaryService(env.DB);
    const before = await operations.status(START);
    expect(
      before.backlog.groups.find(
        (group) => group.type === 'enrich' && group.status === 'pending',
      )?.count,
    ).toBe(15);

    const first = await jobs.leaseProcessingJobs(
      'enrich',
      'bg29-first-worker',
      5,
      10,
      START,
    );
    expect(first).toHaveLength(10);
    // Kill worker without finishing one lease. Its old lease remains protected
    // until a new worker acquires the same job after the TTL.
    const interrupted = first[0]!.id;
    for (const job of first.slice(1)) {
      expect(
        await jobs.completeProcessingJob(job.id, 'bg29-first-worker', START),
      ).toBe(true);
    }
    const second = await jobs.leaseProcessingJobs(
      'enrich',
      'bg29-second-worker',
      5,
      10,
      START,
    );
    expect(second).toHaveLength(5);
    expect(second.map((job) => job.id)).not.toContain(interrupted);
    for (const job of second) {
      expect(
        await jobs.completeProcessingJob(job.id, 'bg29-second-worker', START),
      ).toBe(true);
    }
    expect(
      await jobs.completeProcessingJob(
        interrupted,
        'bg29-second-worker',
        START,
      ),
    ).toBe(false);

    const afterExpiry = new Date(START.getTime() + 5 * 60_000 + 1);
    const recovered = await jobs.leaseProcessingJobs(
      'enrich',
      'bg29-recovery-worker',
      5,
      10,
      afterExpiry,
    );
    expect(recovered.map((job) => job.id)).toEqual([interrupted]);
    expect(
      await jobs.completeProcessingJob(
        interrupted,
        'bg29-first-worker',
        afterExpiry,
      ),
    ).toBe(false);
    expect(
      await jobs.completeProcessingJob(
        interrupted,
        'bg29-recovery-worker',
        afterExpiry,
      ),
    ).toBe(true);

    const outstanding = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM processing_jobs WHERE id LIKE 'bg29-drain-job-%' AND status != 'complete'`,
    ).first<{ total: number }>();
    expect(outstanding?.total).toBe(0);
    const originals = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM items WHERE id LIKE 'bg29-drain-item-%'
         AND raw_text = 'Synthetic durable source'`,
    ).first<{ total: number }>();
    expect(originals?.total).toBe(15);
    const final = await operations.status(afterExpiry);
    expect(final.backlog.groups.some((group) => group.type === 'enrich')).toBe(
      false,
    );

    console.log(
      JSON.stringify({
        event: 'bg29_bounded_queue_recovery',
        environment: 'workerd-vitest-d1',
        initial_pending: 15,
        lease_batch_limit: 10,
        first_batch_acquired: first.length,
        second_batch_acquired: second.length,
        expired_leases_recovered: recovered.length,
        final_outstanding: outstanding?.total,
        synthetic_elapsed_seconds:
          (afterExpiry.getTime() - START.getTime()) / 1000,
        caveat:
          'Synthetic accelerated logical clock; not an actual hourly cron throughput or recovery-time measurement.',
      }),
    );
  }, 60_000);
});
