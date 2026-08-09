import { AppError } from '../shared/errors';

const CAPACITY_CODES = new Set([
  'QUOTA_PAUSED',
  'PROVIDER_UNAVAILABLE',
  'NO_ELIGIBLE_PROVIDER',
  'ZERO_COST_GUARD_REJECTED',
]);

export class CapacityJobService {
  constructor(private readonly db: D1Database) {}

  async deferProcessingJob(
    jobId: string,
    ownerId: string,
    errorCode: string,
    availableAt: Date,
    now: Date = new Date(),
  ): Promise<boolean> {
    if (!CAPACITY_CODES.has(errorCode)) {
      throw new AppError(
        500,
        'INVALID_CAPACITY_DEFERRAL',
        'Only approved capacity errors may use capacity deferral.',
      );
    }
    if (availableAt.getTime() <= now.getTime()) {
      throw new AppError(
        500,
        'INVALID_CAPACITY_DEFERRAL',
        'Capacity deferral must target a future time.',
      );
    }

    const nowIso = now.toISOString();
    const availableIso = availableAt.toISOString();
    const row = await this.db
      .prepare(
        `UPDATE processing_jobs
         SET status = 'pending', available_at = ?1, last_error_code = ?2,
             lease_owner = NULL, lease_expires_at = NULL, heartbeat_at = NULL,
             updated_at = ?3
         WHERE id = ?4 AND lease_owner = ?5 AND status = 'processing'
         RETURNING item_id, attempts`,
      )
      .bind(availableIso, errorCode, nowIso, jobId, ownerId)
      .first<{ item_id: string; attempts: number }>();
    if (!row) return false;

    await this.db
      .prepare(
        `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         ) VALUES (?1, ?2, 'job_capacity_deferred', 'worker', ?3, ?4)`,
      )
      .bind(
        crypto.randomUUID(),
        row.item_id,
        JSON.stringify({
          job_id: jobId,
          error_code: errorCode,
          available_at: availableIso,
          attempts_preserved: row.attempts,
        }),
        nowIso,
      )
      .run();
    return true;
  }
}
