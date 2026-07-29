import { AppError } from '../shared/errors';
import type {
  JobRecord,
  StoredJobStatus,
  SyncAttemptRecord,
  VisibleJobStatus,
} from './job.service';

const MAX_LIST_LIMIT = 100;
const MAX_MANUAL_RETRIES = 3;

export interface JobFilter {
  status?: VisibleJobStatus;
  jobType?: string;
  itemId?: string;
  limit?: number;
  now?: Date;
}

interface ProcessingAdminRow {
  id: string;
  item_id: string;
  job_type: string;
  status: StoredJobStatus;
  attempts: number;
  available_at: string;
  last_error_code: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  input_hash: string | null;
}

interface SyncAdminRow {
  id: string;
  item_id: string;
  destination: string;
  status: StoredJobStatus;
  attempts: number;
  available_at: string;
  last_error_code: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
}

interface RetryProcessingRow {
  item_id: string;
  job_type: string;
  status: StoredJobStatus;
  attempts: number;
  manual_retry_count: number;
  privacy_level_snapshot: string;
  provider_eligibility: string;
  hosted_processing_consent: number;
  deleted_at: string | null;
  privacy_level: string;
  optional_processing_paused: number;
}

interface RetrySyncRow {
  item_id: string;
  destination: string;
  status: StoredJobStatus;
  attempts: number;
  manual_retry_count: number;
  last_error_code: string | null;
  deleted_at: string | null;
  notion_missing_at: string | null;
}

function boundedLimit(limit: number | undefined): number {
  const value = limit ?? 50;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIST_LIMIT) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      `limit must be from 1 to ${MAX_LIST_LIMIT}.`,
    );
  }
  return value;
}

function visibleStatus(
  status: StoredJobStatus,
  availableAt: string,
  now: Date,
): VisibleJobStatus {
  return status === 'pending' && new Date(availableAt).getTime() > now.getTime()
    ? 'retry_wait'
    : status;
}

export class JobAdminService {
  constructor(private readonly db: D1Database) {}

  async listProcessingJobs(filter: JobFilter): Promise<JobRecord[]> {
    const now = filter.now ?? new Date();
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    if (filter.status) {
      if (filter.status === 'retry_wait') {
        conditions.push(
          `status = 'pending' AND available_at > ?${paramIndex++}`,
        );
        params.push(now.toISOString());
      } else {
        conditions.push(`status = ?${paramIndex++}`);
        params.push(filter.status);
      }
    }
    if (filter.jobType) {
      conditions.push(`job_type = ?${paramIndex++}`);
      params.push(filter.jobType);
    }
    if (filter.itemId) {
      conditions.push(`item_id = ?${paramIndex++}`);
      params.push(filter.itemId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(boundedLimit(filter.limit));
    const result = await this.db
      .prepare(
        `SELECT * FROM processing_jobs ${where}
         ORDER BY created_at DESC LIMIT ?${paramIndex}`,
      )
      .bind(...params)
      .all<ProcessingAdminRow>();
    return (result.results ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      jobType: row.job_type,
      status: row.status,
      visibleStatus: visibleStatus(row.status, row.available_at, now),
      attempts: row.attempts,
      availableAt: row.available_at,
      lastErrorCode: row.last_error_code,
      leaseOwner: row.lease_owner,
      leaseExpiresAt: row.lease_expires_at,
      inputHash: row.input_hash,
    }));
  }

  async manuallyRetryProcessingJob(
    jobId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const job = await this.db
      .prepare(
        `SELECT j.*, i.deleted_at, i.privacy_level,
                COALESCE(c.enabled, 0) AS optional_processing_paused
         FROM processing_jobs j
         JOIN items i ON i.id = j.item_id
         LEFT JOIN operational_controls c
           ON c.control_key = 'optional_processing_paused'
         WHERE j.id = ?1`,
      )
      .bind(jobId)
      .first<RetryProcessingRow>();
    if (!job || job.status !== 'failed') return false;
    if (job.deleted_at) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'Deleted items cannot be retried.',
      );
    }
    if (job.optional_processing_paused) {
      throw new AppError(
        409,
        'QUOTA_PAUSED',
        'Optional processing is currently paused.',
      );
    }
    if (job.privacy_level !== job.privacy_level_snapshot) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'The job policy snapshot is stale; reprocess through the privacy workflow.',
      );
    }
    if (
      job.job_type === 'enrich' &&
      (job.provider_eligibility === 'none' ||
        (job.privacy_level === 'personal' &&
          job.hosted_processing_consent !== 1))
    ) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'The job is not eligible under the current privacy policy.',
      );
    }
    if (job.manual_retry_count >= MAX_MANUAL_RETRIES) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'The manual retry limit has been reached.',
      );
    }
    return this.retry(
      'processing_jobs',
      jobId,
      job.item_id,
      actorId,
      job.attempts,
      job.manual_retry_count,
      now,
    );
  }

  async listSyncAttempts(filter: JobFilter): Promise<SyncAttemptRecord[]> {
    const now = filter.now ?? new Date();
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    if (filter.status) {
      if (filter.status === 'retry_wait') {
        conditions.push(
          `status = 'pending' AND available_at > ?${paramIndex++}`,
        );
        params.push(now.toISOString());
      } else {
        conditions.push(`status = ?${paramIndex++}`);
        params.push(filter.status);
      }
    }
    if (filter.jobType) {
      conditions.push(`destination = ?${paramIndex++}`);
      params.push(filter.jobType);
    }
    if (filter.itemId) {
      conditions.push(`item_id = ?${paramIndex++}`);
      params.push(filter.itemId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(boundedLimit(filter.limit));
    const result = await this.db
      .prepare(
        `SELECT * FROM sync_attempts ${where}
         ORDER BY created_at DESC LIMIT ?${paramIndex}`,
      )
      .bind(...params)
      .all<SyncAdminRow>();
    return (result.results ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      destination: row.destination,
      status: row.status,
      visibleStatus: visibleStatus(row.status, row.available_at, now),
      attempts: row.attempts,
      availableAt: row.available_at,
      lastErrorCode: row.last_error_code,
      leaseOwner: row.lease_owner,
      leaseExpiresAt: row.lease_expires_at,
    }));
  }

  async manuallyRetrySyncAttempt(
    jobId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const job = await this.db
      .prepare(
        `SELECT s.*, i.deleted_at, i.notion_missing_at
         FROM sync_attempts s JOIN items i ON i.id = s.item_id
         WHERE s.id = ?1`,
      )
      .bind(jobId)
      .first<RetrySyncRow>();
    if (!job || job.status !== 'failed') return false;
    if (job.deleted_at) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'Deleted items cannot be synced.',
      );
    }
    if (
      job.destination === 'notion' &&
      (job.notion_missing_at || job.last_error_code === 'NOTION_PAGE_MISSING')
    ) {
      throw new AppError(
        409,
        'OWNER_APPROVAL_REQUIRED',
        'Use the Notion recreation action for a deleted page.',
      );
    }
    if (job.manual_retry_count >= MAX_MANUAL_RETRIES) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'The manual retry limit has been reached.',
      );
    }
    return this.retry(
      'sync_attempts',
      jobId,
      job.item_id,
      actorId,
      job.attempts,
      job.manual_retry_count,
      now,
    );
  }

  async approveNotionRecreation(
    itemId: string,
    actorId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const item = await this.db
      .prepare(
        `SELECT id FROM items
         WHERE id = ?1 AND deleted_at IS NULL
           AND notion_page_id IS NOT NULL AND notion_missing_at IS NOT NULL`,
      )
      .bind(itemId)
      .first<{ id: string }>();
    if (!item) return false;
    const attemptId = crypto.randomUUID();
    await this.db.batch([
      this.db
        .prepare(
          `UPDATE items
           SET notion_page_id = NULL, notion_missing_at = NULL, updated_at = ?1
           WHERE id = ?2`,
        )
        .bind(nowIso, itemId),
      this.db
        .prepare(
          `UPDATE sync_attempts
           SET status = 'failed', last_error_code = 'SUPERSEDED_BY_RECREATION',
               updated_at = ?1
           WHERE item_id = ?2 AND destination = 'notion'
             AND status IN ('pending', 'processing')`,
        )
        .bind(nowIso, itemId),
      this.db
        .prepare(
          `INSERT INTO sync_attempts (
             id, item_id, destination, status, attempts, available_at,
             created_at, updated_at
           ) VALUES (?1, ?2, 'notion', 'pending', 0, ?3, ?3, ?3)`,
        )
        .bind(attemptId, itemId, nowIso),
      this.db
        .prepare(
          `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           ) VALUES (?1, ?2, 'notion_recreation_approved', 'admin', ?3, ?4)`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({
            actor_id: actorId,
            sync_attempt_id: attemptId,
          }),
          nowIso,
        ),
    ]);
    return true;
  }

  private async retry(
    table: 'processing_jobs' | 'sync_attempts',
    jobId: string,
    itemId: string,
    actorId: string,
    attempts: number,
    manualRetryCount: number,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db.batch([
      this.db
        .prepare(
          `UPDATE ${table}
           SET status = 'pending', available_at = ?1, lease_owner = NULL,
               lease_expires_at = NULL, last_error_code = NULL,
               manual_retry_count = manual_retry_count + 1, updated_at = ?1
           WHERE id = ?2 AND status = 'failed'
             AND manual_retry_count = ?3`,
        )
        .bind(nowIso, jobId, manualRetryCount),
      this.db
        .prepare(
          `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           )
           SELECT ?1, ?2, ?3, 'admin', ?4, ?5
           FROM ${table}
           WHERE id = ?6 AND status = 'pending' AND manual_retry_count = ?7`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          table === 'processing_jobs'
            ? 'manual_retry_requested'
            : 'manual_sync_retry_requested',
          JSON.stringify({
            actor_id: actorId,
            [table === 'processing_jobs' ? 'job_id' : 'sync_attempt_id']: jobId,
            previous_attempts: attempts,
            manual_retry_count: manualRetryCount + 1,
          }),
          nowIso,
          jobId,
          manualRetryCount + 1,
        ),
    ]);
    return result[0]?.meta.changes === 1;
  }
}
