export class PurgeFreezeService {
  constructor(private readonly db: D1Database) {}

  async freezeItemWork(
    itemId: string,
    now: Date,
  ): Promise<{
    processingJobs: number;
    syncAttempts: number;
  }> {
    const nowIso = now.toISOString();
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE processing_jobs
           SET status = 'failed', last_error_code = 'PURGE_PENDING',
               lease_owner = NULL, lease_expires_at = NULL,
               updated_at = ?1
           WHERE item_id = ?2 AND status IN ('pending', 'processing')`,
        )
        .bind(nowIso, itemId),
      this.db
        .prepare(
          `UPDATE sync_attempts
           SET status = 'failed', last_error_code = 'PURGE_PENDING',
               lease_owner = NULL, lease_expires_at = NULL,
               updated_at = ?1
           WHERE item_id = ?2 AND status IN ('pending', 'processing')`,
        )
        .bind(nowIso, itemId),
    ]);
    return {
      processingJobs: results[0]?.meta.changes ?? 0,
      syncAttempts: results[1]?.meta.changes ?? 0,
    };
  }
}
