const MAX_LEASE_MINUTES = 60;
const MAX_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 20;
const MAX_ERROR_CODE_LENGTH = 80;

export type StoredJobStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type VisibleJobStatus = StoredJobStatus | 'retry_wait';

export interface JobRecord {
  id: string;
  itemId: string;
  jobType: string;
  status: StoredJobStatus;
  visibleStatus: VisibleJobStatus;
  attempts: number;
  availableAt: string;
  lastErrorCode: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  inputHash: string | null;
}

export interface SyncAttemptRecord {
  id: string;
  itemId: string;
  destination: string;
  status: StoredJobStatus;
  visibleStatus: VisibleJobStatus;
  attempts: number;
  availableAt: string;
  lastErrorCode: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
}

export interface ProcessingResultInput {
  submissionId: string;
  inputHash: string;
  resultVersion: string;
  result: Record<string, unknown>;
}

export interface ProcessingResultOutcome {
  accepted: boolean;
  replayed: boolean;
}

interface ProcessingJobRow {
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

interface SyncAttemptRow {
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

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must not be empty`);
  return normalized;
}

function requireIntegerInRange(
  value: number,
  field: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${field} must be an integer from ${min} to ${max}`);
  }
  return value;
}

function safeErrorCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (
    !normalized ||
    normalized.length > MAX_ERROR_CODE_LENGTH ||
    !/^[A-Z0-9_.-]+$/.test(normalized)
  ) {
    throw new TypeError(
      'errorCode must be a stable code containing only A-Z, 0-9, _, . or -',
    );
  }
  return normalized;
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

function processingRecord(row: ProcessingJobRow, now: Date): JobRecord {
  return {
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
  };
}

function syncRecord(row: SyncAttemptRow, now: Date): SyncAttemptRecord {
  return {
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
  };
}

function retryAt(attempt: number, now: Date, exactRetryAt?: Date): string {
  if (exactRetryAt) {
    const time = exactRetryAt.getTime();
    if (!Number.isFinite(time) || time <= now.getTime()) {
      throw new RangeError('exactRetryAt must be a valid future date');
    }
    return exactRetryAt.toISOString();
  }
  const baseMilliseconds = Math.min(2 ** attempt * 60_000, 24 * 60 * 60_000);
  const jitter = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
  return new Date(
    now.getTime() +
      baseMilliseconds +
      Math.floor(baseMilliseconds * 0.2 * jitter),
  ).toISOString();
}

function auditDetails(details: Record<string, unknown>): string {
  return JSON.stringify(details);
}

export class JobService {
  constructor(private readonly db: D1Database) {}

  async enqueueProcessingJob(
    itemId: string,
    jobType: string,
    inputHash: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const normalizedItemId = requireNonEmpty(itemId, 'itemId');
    const normalizedJobType = requireNonEmpty(jobType, 'jobType');
    const normalizedInputHash = requireNonEmpty(inputHash, 'inputHash');
    const nowIso = now.toISOString();
    const jobId = crypto.randomUUID();
    const result = await this.db
      .prepare(
        `INSERT INTO processing_jobs (
           id, item_id, job_type, status, attempts, available_at, created_at,
           updated_at, input_hash
         )
         SELECT ?1, ?2, ?3, 'pending', 0, ?4, ?4, ?4, ?5
         WHERE NOT EXISTS (
           SELECT 1 FROM processing_jobs
           WHERE item_id = ?2 AND job_type = ?3
             AND status IN ('pending', 'processing')
         )`,
      )
      .bind(
        jobId,
        normalizedItemId,
        normalizedJobType,
        nowIso,
        normalizedInputHash,
      )
      .run();
    if (result.meta.changes > 0) {
      await this.writeAudit(
        normalizedItemId,
        'job_enqueued',
        'system',
        {
          job_id: jobId,
          job_type: normalizedJobType,
          input_hash: normalizedInputHash,
        },
        nowIso,
      );
    }
    return result.meta.changes > 0;
  }

  async leaseProcessingJobs(
    jobType: string,
    ownerId: string,
    ttlMinutes: number,
    limit: number,
    now: Date = new Date(),
  ): Promise<JobRecord[]> {
    const normalizedType = requireNonEmpty(jobType, 'jobType');
    const normalizedOwner = requireNonEmpty(ownerId, 'ownerId');
    requireIntegerInRange(ttlMinutes, 'ttlMinutes', 1, MAX_LEASE_MINUTES);
    requireIntegerInRange(limit, 'limit', 1, MAX_BATCH_SIZE);
    const nowIso = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + ttlMinutes * 60_000,
    ).toISOString();
    const staleRows = await this.db
      .prepare(
        `SELECT id FROM processing_jobs
         WHERE job_type = ?1 AND status = 'processing'
           AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?2`,
      )
      .bind(normalizedType, nowIso)
      .all<{ id: string }>();
    const staleIds = new Set((staleRows.results ?? []).map((row) => row.id));
    const result = await this.db
      .prepare(
        `UPDATE processing_jobs
         SET status = 'processing', lease_owner = ?1, lease_expires_at = ?2,
             heartbeat_at = ?3, updated_at = ?3
         WHERE id IN (
           SELECT id FROM processing_jobs
           WHERE job_type = ?4
             AND (
               (status = 'pending' AND available_at <= ?3)
               OR
               (status = 'processing' AND lease_expires_at IS NOT NULL
                 AND lease_expires_at <= ?3)
             )
           ORDER BY priority DESC, available_at ASC, created_at ASC
           LIMIT ?5
         )
         RETURNING *`,
      )
      .bind(normalizedOwner, expiresAt, nowIso, normalizedType, limit)
      .all<ProcessingJobRow>();
    const rows = result.results ?? [];
    if (rows.length) {
      await this.db.batch(
        rows.map((row) =>
          this.db
            .prepare(
              `INSERT INTO audit_events (
                 id, item_id, event_type, actor_type, details_json, created_at
               ) VALUES (?1, ?2, 'lease_acquired', 'worker', ?3, ?4)`,
            )
            .bind(
              crypto.randomUUID(),
              row.item_id,
              auditDetails({
                job_id: row.id,
                job_type: row.job_type,
                attempt: row.attempts,
                lease_owner: normalizedOwner,
                lease_expires_at: expiresAt,
                stale_recovery: staleIds.has(row.id),
              }),
              nowIso,
            ),
        ),
      );
    }
    return rows.map((row) => processingRecord(row, now));
  }

  async heartbeatProcessingJob(
    jobId: string,
    ownerId: string,
    ttlMinutes: number,
    now: Date = new Date(),
  ): Promise<boolean> {
    requireNonEmpty(jobId, 'jobId');
    requireNonEmpty(ownerId, 'ownerId');
    requireIntegerInRange(ttlMinutes, 'ttlMinutes', 1, MAX_LEASE_MINUTES);
    const expiresAt = new Date(
      now.getTime() + ttlMinutes * 60_000,
    ).toISOString();
    const result = await this.db
      .prepare(
        `UPDATE processing_jobs
         SET lease_expires_at = ?1, heartbeat_at = ?2, updated_at = ?2
         WHERE id = ?3 AND lease_owner = ?4 AND status = 'processing'
           AND lease_expires_at > ?2`,
      )
      .bind(expiresAt, now.toISOString(), jobId, ownerId)
      .run();
    return result.meta.changes > 0;
  }

  async completeProcessingJob(
    jobId: string,
    ownerId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    requireNonEmpty(jobId, 'jobId');
    requireNonEmpty(ownerId, 'ownerId');
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE processing_jobs
         SET status = 'complete', lease_owner = NULL, lease_expires_at = NULL,
             completed_at = ?1, last_error_code = NULL, updated_at = ?1
         WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'
           AND lease_expires_at > ?1`,
      )
      .bind(nowIso, jobId, ownerId)
      .run();
    if (result.meta.changes > 0) {
      await this.auditProcessingJob(
        jobId,
        'job_completed',
        'worker',
        { job_id: jobId },
        nowIso,
      );
    }
    return result.meta.changes > 0;
  }

  async submitProcessingResult(
    jobId: string,
    ownerId: string,
    input: ProcessingResultInput,
    now: Date = new Date(),
  ): Promise<ProcessingResultOutcome> {
    requireNonEmpty(jobId, 'jobId');
    requireNonEmpty(ownerId, 'ownerId');
    requireNonEmpty(input.submissionId, 'submissionId');
    requireNonEmpty(input.inputHash, 'inputHash');
    requireNonEmpty(input.resultVersion, 'resultVersion');
    const existing = await this.db
      .prepare(
        `SELECT submission_id, input_hash, result_version, result_json
         FROM processing_job_results WHERE job_id = ?1`,
      )
      .bind(jobId)
      .first<{
        submission_id: string;
        input_hash: string;
        result_version: string;
        result_json: string;
      }>();
    const resultJson = JSON.stringify(input.result);
    if (existing) {
      const replayed =
        existing.submission_id === input.submissionId &&
        existing.input_hash === input.inputHash &&
        existing.result_version === input.resultVersion &&
        existing.result_json === resultJson;
      return { accepted: replayed, replayed };
    }

    const nowIso = now.toISOString();
    const job = await this.db
      .prepare(
        `SELECT item_id FROM processing_jobs
         WHERE id = ?1 AND lease_owner = ?2 AND status = 'processing'
           AND lease_expires_at > ?3
           AND (input_hash IS NULL OR input_hash = ?4)`,
      )
      .bind(jobId, ownerId, nowIso, input.inputHash)
      .first<{ item_id: string }>();
    if (!job) return { accepted: false, replayed: false };

    let batch: D1Result[];
    try {
      batch = await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO processing_job_results (
               job_id, submission_id, input_hash, result_version, result_json, created_at
             )
             SELECT ?1, ?2, ?3, ?4, ?5, ?6
             FROM processing_jobs
             WHERE id = ?1 AND lease_owner = ?7 AND status = 'processing'
               AND lease_expires_at > ?6
               AND (input_hash IS NULL OR input_hash = ?3)`,
          )
          .bind(
            jobId,
            input.submissionId,
            input.inputHash,
            input.resultVersion,
            resultJson,
            nowIso,
            ownerId,
          ),
        this.db
          .prepare(
            `UPDATE processing_jobs
             SET status = 'complete', result_version = ?1, completed_at = ?2,
                 lease_owner = NULL, lease_expires_at = NULL, updated_at = ?2
             WHERE id = ?3 AND lease_owner = ?4 AND status = 'processing'
               AND lease_expires_at > ?2`,
          )
          .bind(input.resultVersion, nowIso, jobId, ownerId),
        this.db
          .prepare(
            `INSERT INTO audit_events (
               id, item_id, event_type, actor_type, details_json, created_at
             )
             SELECT ?1, ?2, 'job_result_accepted', 'worker', ?3, ?4
             FROM processing_job_results WHERE job_id = ?5`,
          )
          .bind(
            crypto.randomUUID(),
            job.item_id,
            auditDetails({
              job_id: jobId,
              submission_id: input.submissionId,
              input_hash: input.inputHash,
              result_version: input.resultVersion,
            }),
            nowIso,
            jobId,
          ),
      ]);
    } catch (error) {
      const concurrent = await this.db
        .prepare(
          `SELECT submission_id, input_hash, result_version, result_json
           FROM processing_job_results WHERE job_id = ?1`,
        )
        .bind(jobId)
        .first<{
          submission_id: string;
          input_hash: string;
          result_version: string;
          result_json: string;
        }>();
      if (
        concurrent?.submission_id === input.submissionId &&
        concurrent.input_hash === input.inputHash &&
        concurrent.result_version === input.resultVersion &&
        concurrent.result_json === resultJson
      ) {
        return { accepted: true, replayed: true };
      }
      throw error;
    }
    return {
      accepted: batch[0]?.meta.changes === 1 && batch[1]?.meta.changes === 1,
      replayed: false,
    };
  }

  async submitExtractionResults(
    jobId: string,
    ownerId: string,
    itemId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results: any[], // array of validated extraction results mapped to attachment_ids
    enqueueEnrich: boolean,
    now: Date = new Date(),
  ): Promise<boolean> {
    requireNonEmpty(jobId, 'jobId');
    requireNonEmpty(ownerId, 'ownerId');
    requireNonEmpty(itemId, 'itemId');

    const nowIso = now.toISOString();

    const job = await this.db
      .prepare(
        `SELECT item_id FROM processing_jobs
         WHERE id = ?1 AND lease_owner = ?2 AND status = 'processing'
           AND lease_expires_at > ?3`,
      )
      .bind(jobId, ownerId, nowIso)
      .first<{ item_id: string }>();

    if (!job || job.item_id !== itemId) return false;

    const stmts: D1PreparedStatement[] = [];

    for (const res of results) {
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO extraction_records (
             id, item_id, attachment_id, extractor_name, extractor_version,
             extracted_text, image_description, confidence, page_count,
             completeness, coverage, provider_name, model_name, error_code,
             created_at, updated_at
           ) VALUES (
             ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15
           )
           ON CONFLICT (attachment_id) DO UPDATE SET
             extractor_name = excluded.extractor_name,
             extractor_version = excluded.extractor_version,
             extracted_text = excluded.extracted_text,
             image_description = excluded.image_description,
             confidence = excluded.confidence,
             page_count = excluded.page_count,
             completeness = excluded.completeness,
             coverage = excluded.coverage,
             provider_name = excluded.provider_name,
             model_name = excluded.model_name,
             error_code = excluded.error_code,
             updated_at = excluded.updated_at`,
          )
          .bind(
            crypto.randomUUID(),
            itemId,
            res.attachmentId,
            res.extractorName,
            res.extractorVersion,
            res.extractedText || null,
            res.imageDescription || null,
            res.confidence ?? null,
            res.pageCount ?? null,
            res.completeness,
            res.coverage,
            res.providerName || null,
            res.modelName || null,
            res.errorCode || null,
            nowIso,
          ),
      );
    }

    if (enqueueEnrich) {
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO processing_jobs (
              id, item_id, job_type, status, attempts, available_at, created_at,
              updated_at, input_hash
            )
            SELECT ?1, ?2, 'enrich', 'pending', 0, ?3, ?3, ?3, ?4
            WHERE NOT EXISTS (
              SELECT 1 FROM processing_jobs
              WHERE item_id = ?2 AND job_type = 'enrich'
                AND status IN ('pending', 'processing')
            )`,
          )
          .bind(crypto.randomUUID(), itemId, nowIso, 'enrich-after-extract'),
      );
    }

    stmts.push(
      this.db
        .prepare(
          `UPDATE processing_jobs
         SET status = 'complete', lease_owner = NULL, lease_expires_at = NULL,
             completed_at = ?1, last_error_code = NULL, updated_at = ?1
         WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'
           AND lease_expires_at > ?1`,
        )
        .bind(nowIso, jobId, ownerId),
    );

    await this.db.batch(stmts);
    return true;
  }

  async failProcessingJob(
    jobId: string,
    ownerId: string,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number = 5,
    now: Date = new Date(),
    exactRetryAt?: Date,
  ): Promise<boolean> {
    requireIntegerInRange(maxAttempts, 'maxAttempts', 1, MAX_ATTEMPTS);
    return this.failJob(
      'processing_jobs',
      jobId,
      ownerId,
      safeErrorCode(errorCode),
      retryable,
      maxAttempts,
      now,
      exactRetryAt,
    );
  }

  async leaseSyncAttempts(
    destination: string,
    ownerId: string,
    ttlMinutes: number,
    limit: number,
    now: Date = new Date(),
  ): Promise<SyncAttemptRecord[]> {
    const normalizedDestination = requireNonEmpty(destination, 'destination');
    const normalizedOwner = requireNonEmpty(ownerId, 'ownerId');
    requireIntegerInRange(ttlMinutes, 'ttlMinutes', 1, MAX_LEASE_MINUTES);
    requireIntegerInRange(limit, 'limit', 1, MAX_BATCH_SIZE);
    const nowIso = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + ttlMinutes * 60_000,
    ).toISOString();
    const staleRows = await this.db
      .prepare(
        `SELECT id FROM sync_attempts
         WHERE destination = ?1 AND status = 'processing'
           AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?2`,
      )
      .bind(normalizedDestination, nowIso)
      .all<{ id: string }>();
    const staleIds = new Set((staleRows.results ?? []).map((row) => row.id));
    const result = await this.db
      .prepare(
        `UPDATE sync_attempts
         SET status = 'processing', lease_owner = ?1, lease_expires_at = ?2,
             updated_at = ?3
         WHERE id IN (
           SELECT id FROM sync_attempts
           WHERE destination = ?4
             AND (
               (status = 'pending' AND available_at <= ?3)
               OR
               (status = 'processing' AND lease_expires_at IS NOT NULL
                 AND lease_expires_at <= ?3)
             )
           ORDER BY available_at ASC, created_at ASC
           LIMIT ?5
         )
         RETURNING *`,
      )
      .bind(normalizedOwner, expiresAt, nowIso, normalizedDestination, limit)
      .all<SyncAttemptRow>();
    const rows = result.results ?? [];
    if (rows.length) {
      await this.db.batch(
        rows.map((row) =>
          this.db
            .prepare(
              `INSERT INTO audit_events (
                 id, item_id, event_type, actor_type, details_json, created_at
               ) VALUES (?1, ?2, 'sync_lease_acquired', 'worker', ?3, ?4)`,
            )
            .bind(
              crypto.randomUUID(),
              row.item_id,
              auditDetails({
                sync_attempt_id: row.id,
                destination: row.destination,
                attempt: row.attempts,
                lease_owner: normalizedOwner,
                lease_expires_at: expiresAt,
                stale_recovery: staleIds.has(row.id),
              }),
              nowIso,
            ),
        ),
      );
    }
    return rows.map((row) => syncRecord(row, now));
  }

  async heartbeatSyncAttempt(
    jobId: string,
    ownerId: string,
    ttlMinutes: number,
    now: Date = new Date(),
  ): Promise<boolean> {
    requireIntegerInRange(ttlMinutes, 'ttlMinutes', 1, MAX_LEASE_MINUTES);
    const expiresAt = new Date(
      now.getTime() + ttlMinutes * 60_000,
    ).toISOString();
    const result = await this.db
      .prepare(
        `UPDATE sync_attempts
         SET lease_expires_at = ?1, updated_at = ?2
         WHERE id = ?3 AND lease_owner = ?4 AND status = 'processing'
           AND lease_expires_at > ?2`,
      )
      .bind(expiresAt, now.toISOString(), jobId, ownerId)
      .run();
    return result.meta.changes > 0;
  }

  async completeSyncAttempt(
    jobId: string,
    ownerId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE sync_attempts
         SET status = 'complete', lease_owner = NULL, lease_expires_at = NULL,
             completed_at = ?1, last_error_code = NULL, updated_at = ?1
         WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'
           AND lease_expires_at > ?1`,
      )
      .bind(nowIso, jobId, ownerId)
      .run();
    if (result.meta.changes > 0) {
      await this.auditSyncAttempt(
        jobId,
        'sync_completed',
        'worker',
        { sync_attempt_id: jobId },
        nowIso,
      );
    }
    return result.meta.changes > 0;
  }

  async failSyncAttempt(
    jobId: string,
    ownerId: string,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number = 5,
    now: Date = new Date(),
    exactRetryAt?: Date,
  ): Promise<boolean> {
    requireIntegerInRange(maxAttempts, 'maxAttempts', 1, MAX_ATTEMPTS);
    return this.failJob(
      'sync_attempts',
      jobId,
      ownerId,
      safeErrorCode(errorCode),
      retryable,
      maxAttempts,
      now,
      exactRetryAt,
    );
  }

  async releaseProcessingJob(
    jobId: string,
    ownerId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    return this.releaseJob('processing_jobs', jobId, ownerId, now);
  }

  async releaseSyncAttempt(
    jobId: string,
    ownerId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    return this.releaseJob('sync_attempts', jobId, ownerId, now);
  }

  async enqueueSyncAttempt(
    itemId: string,
    destination: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const normalizedItemId = requireNonEmpty(itemId, 'itemId');
    const normalizedDestination = requireNonEmpty(destination, 'destination');
    const nowIso = now.toISOString();
    const id = crypto.randomUUID();
    const result = await this.db
      .prepare(
        `INSERT INTO sync_attempts (
           id, item_id, destination, status, attempts, available_at,
           created_at, updated_at
         )
         SELECT ?1, ?2, ?3, 'pending', 0, ?4, ?4, ?4
         WHERE NOT EXISTS (
           SELECT 1 FROM sync_attempts
           WHERE item_id = ?2 AND destination = ?3
             AND status IN ('pending', 'processing')
         )`,
      )
      .bind(id, normalizedItemId, normalizedDestination, nowIso)
      .run();
    if (result.meta.changes > 0) {
      await this.writeAudit(
        normalizedItemId,
        'sync_enqueued',
        'system',
        { sync_attempt_id: id, destination: normalizedDestination },
        nowIso,
      );
    }
    return result.meta.changes > 0;
  }

  private async failJob(
    table: 'processing_jobs' | 'sync_attempts',
    jobId: string,
    ownerId: string,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number,
    now: Date,
    exactRetryAt?: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const row = await this.db
      .prepare(
        `SELECT item_id, attempts FROM ${table}
         WHERE id = ?1 AND lease_owner = ?2 AND status = 'processing'
           AND lease_expires_at > ?3`,
      )
      .bind(jobId, ownerId, nowIso)
      .first<{ item_id: string; attempts: number }>();
    if (!row) return false;
    const attempts = row.attempts + 1;
    const shouldRetry = retryable && attempts < maxAttempts;
    const availableAt = shouldRetry
      ? retryAt(attempts, now, exactRetryAt)
      : nowIso;
    const eventType =
      table === 'processing_jobs'
        ? shouldRetry
          ? 'retry_scheduled'
          : 'job_terminally_failed'
        : shouldRetry
          ? 'sync_retry_scheduled'
          : 'sync_terminally_failed';
    const retryColumn =
      table === 'sync_attempts' ? ', retry_after_at = ?8' : '';
    const bindings: unknown[] = [
      shouldRetry ? 'pending' : 'failed',
      attempts,
      availableAt,
      errorCode,
      nowIso,
      jobId,
      ownerId,
    ];
    if (table === 'sync_attempts')
      bindings.push(shouldRetry ? availableAt : null);
    const result = await this.db
      .prepare(
        `UPDATE ${table}
         SET status = ?1, attempts = ?2, available_at = ?3,
             last_error_code = ?4, lease_owner = NULL,
             lease_expires_at = NULL, updated_at = ?5${retryColumn}
         WHERE id = ?6 AND lease_owner = ?7 AND status = 'processing'`,
      )
      .bind(...bindings)
      .run();
    if (result.meta.changes > 0) {
      await this.writeAudit(
        row.item_id,
        eventType,
        'worker',
        {
          [table === 'processing_jobs' ? 'job_id' : 'sync_attempt_id']: jobId,
          attempt: attempts,
          error_code: errorCode,
          retryable: shouldRetry,
          retry_at: shouldRetry ? availableAt : null,
        },
        nowIso,
      );
    }
    return result.meta.changes > 0;
  }

  private async releaseJob(
    table: 'processing_jobs' | 'sync_attempts',
    jobId: string,
    ownerId: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE ${table}
         SET status = 'pending', available_at = ?1, lease_owner = NULL,
             lease_expires_at = NULL, updated_at = ?1
         WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'
           AND lease_expires_at > ?1`,
      )
      .bind(nowIso, jobId, ownerId)
      .run();
    return result.meta.changes > 0;
  }

  private async auditProcessingJob(
    jobId: string,
    eventType: string,
    actorType: string,
    details: Record<string, unknown>,
    at: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         )
         SELECT ?1, item_id, ?2, ?3, ?4, ?5
         FROM processing_jobs WHERE id = ?6`,
      )
      .bind(
        crypto.randomUUID(),
        eventType,
        actorType,
        auditDetails(details),
        at,
        jobId,
      )
      .run();
  }

  private async auditSyncAttempt(
    jobId: string,
    eventType: string,
    actorType: string,
    details: Record<string, unknown>,
    at: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         )
         SELECT ?1, item_id, ?2, ?3, ?4, ?5
         FROM sync_attempts WHERE id = ?6`,
      )
      .bind(
        crypto.randomUUID(),
        eventType,
        actorType,
        auditDetails(details),
        at,
        jobId,
      )
      .run();
  }

  private async writeAudit(
    itemId: string,
    eventType: string,
    actorType: string,
    details: Record<string, unknown>,
    at: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        itemId,
        eventType,
        actorType,
        auditDetails(details),
        at,
      )
      .run();
  }
}
