import { describe, expect, it, beforeEach } from 'vitest';
import { JobService } from '../src/jobs/job.service';
import { createD1Mock } from './d1-mock';

describe('JobService with Real D1 Mock', () => {
  let db: D1Database;
  let service: JobService;

  beforeEach(() => {
    db = createD1Mock();
    service = new JobService(db as D1Database);
  });

  const insertTestItem = async (
    id: string = '00000000-0000-0000-0000-000000000001',
  ) => {
    const now = new Date().toISOString();
    await db
      .prepare(
        `
      INSERT INTO items (id, idempotency_key, source_type, source_app, privacy_level, processing_status, captured_at, created_at, updated_at)
      VALUES (?1, ?2, 'url', 'test', 'public', 'pending', ?3, ?3, ?3)
    `,
      )
      .bind(id, `key-${id}`, now)
      .run();
  };

  const insertProcessingJob = async (
    id: string,
    itemId: string,
    type: string,
    status: string,
    attempts: number,
    availableAt: string,
  ) => {
    await db
      .prepare(
        `
      INSERT INTO processing_jobs (id, item_id, job_type, status, attempts, available_at, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)
    `,
      )
      .bind(id, itemId, type, status, attempts, availableAt)
      .run();
  };

  const insertSyncAttempt = async (
    id: string,
    itemId: string,
    dest: string,
    status: string,
    attempts: number,
    availableAt: string,
  ) => {
    await db
      .prepare(
        `
      INSERT INTO sync_attempts (id, item_id, destination, status, attempts, available_at, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)
    `,
      )
      .bind(id, itemId, dest, status, attempts, availableAt)
      .run();
  };

  it('should lease jobs with a valid query and lock them', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');
    await insertTestItem('00000000-0000-0000-0000-000000000002');
    const now = new Date();
    const past = new Date(now.getTime() - 1000).toISOString();

    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
      'enrich',
      'pending',
      0,
      past,
    );
    await insertProcessingJob(
      '22222222-2222-2222-2222-222222222222',
      '00000000-0000-0000-0000-000000000002',
      'enrich',
      'pending',
      0,
      past,
    );

    const jobs = await service.leaseProcessingJobs('enrich', 'worker-1', 5, 1);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.leaseOwner).toBe('worker-1');
    expect(jobs[0]!.status).toBe('processing');

    // A second worker should get the remaining job
    const jobs2 = await service.leaseProcessingJobs('enrich', 'worker-2', 5, 1);
    expect(jobs2).toHaveLength(1);
    expect(jobs2[0]!.id).not.toBe(jobs[0]!.id);
    expect(jobs2[0]!.leaseOwner).toBe('worker-2');
  });

  it('should allow expired lease takeover', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');
    const now = new Date();
    const past = new Date(now.getTime() - 10000).toISOString();

    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
      'enrich',
      'processing',
      0,
      past,
    );

    // Manually expire the lease
    await db
      .prepare(
        `UPDATE processing_jobs SET lease_expires_at = ?1, lease_owner = 'old-worker' WHERE id = '11111111-1111-1111-1111-111111111111'`,
      )
      .bind(past)
      .run();

    const jobs = await service.leaseProcessingJobs(
      'enrich',
      'new-worker',
      5,
      1,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.leaseOwner).toBe('new-worker');
  });

  it('should prevent old worker from completing after takeover', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');
    const now = new Date();
    const past = new Date(now.getTime() - 1000).toISOString();

    await insertProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
      'enrich',
      'pending',
      0,
      past,
    );

    // Worker 1 acquires lease
    await service.leaseProcessingJobs('enrich', 'worker-1', 5, 1);

    // Manually expire the lease
    await db
      .prepare(
        `UPDATE processing_jobs SET lease_expires_at = ?1 WHERE id = '11111111-1111-1111-1111-111111111111'`,
      )
      .bind(past)
      .run();

    // Worker 2 takes over
    await service.leaseProcessingJobs('enrich', 'worker-2', 5, 1);

    // Worker 1 tries to complete it
    const success = await service.completeProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      'worker-1',
    );
    expect(success).toBe(false); // Atomicity enforcement

    // Worker 2 can complete it
    const success2 = await service.completeProcessingJob(
      '11111111-1111-1111-1111-111111111111',
      'worker-2',
    );
    expect(success2).toBe(true);
  });

  it('should support idempotent job creation (enqueueSyncAttempt)', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');

    // First creation
    const created1 = await service.enqueueSyncAttempt(
      '00000000-0000-0000-0000-000000000001',
      'notion',
    );
    expect(created1).toBe(true);

    // Second creation for same item/dest should be ignored
    const created2 = await service.enqueueSyncAttempt(
      '00000000-0000-0000-0000-000000000001',
      'notion',
    );
    expect(created2).toBe(false);

    const jobs = (
      await db
        .prepare(
          `SELECT * FROM sync_attempts WHERE item_id = '00000000-0000-0000-0000-000000000001' AND destination = 'notion'`,
        )
        .all()
    ).results;
    expect(jobs).toHaveLength(1);
  });

  it('should fail job and calculate exponential backoff with jitter', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');
    const now = new Date();
    const past = new Date(now.getTime() - 1000).toISOString();

    await insertSyncAttempt(
      'sync-1',
      '00000000-0000-0000-0000-000000000001',
      'notion',
      'pending',
      0,
      past,
    );

    // Worker acquires
    await service.leaseSyncAttempts('notion', 'worker-1', 5, 1);

    // Fail it
    const failed = await service.failSyncAttempt(
      'sync-1',
      'worker-1',
      'SYNC_RATE_LIMITED',
      true,
      5,
      now,
    );
    expect(failed).toBe(true);

    const job = (await db
      .prepare(`SELECT * FROM sync_attempts WHERE id = 'sync-1'`)
      .first()) as Record<string, unknown>;
    expect(job!.status).toBe('pending');
    expect(job!.attempts).toBe(1);
    const retryAt = new Date(job!.available_at as string).getTime();
    expect(retryAt).toBeGreaterThan(now.getTime());
  });

  it('should accept exact Retry-After values', async () => {
    await insertTestItem('00000000-0000-0000-0000-000000000001');
    const now = new Date();
    const past = new Date(now.getTime() - 1000).toISOString();

    await insertSyncAttempt(
      'sync-1',
      '00000000-0000-0000-0000-000000000001',
      'notion',
      'pending',
      0,
      past,
    );

    // Worker acquires
    await service.leaseSyncAttempts('notion', 'worker-1', 5, 1);

    const exactRetryAt = new Date(now.getTime() + 60000);
    // Fail it with exact RetryAt
    const failed = await service.failSyncAttempt(
      'sync-1',
      'worker-1',
      'SYNC_RATE_LIMITED',
      true,
      5,
      now,
      exactRetryAt,
    );
    expect(failed).toBe(true);

    const job = (await db
      .prepare(`SELECT * FROM sync_attempts WHERE id = 'sync-1'`)
      .first()) as Record<string, unknown>;
    expect(new Date(job!.available_at as string).getTime()).toBe(
      exactRetryAt.getTime(),
    );
  });
});
