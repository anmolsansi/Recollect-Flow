import type { PurgeReceiptRecord } from './recovery.types';

export class RestoreReceiptRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(receipt: PurgeReceiptRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO purge_receipts (
           item_id, purge_workflow_id, receipt_version,
           purged_at, backup_retention_until, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?4)
         ON CONFLICT(item_id) DO UPDATE SET
           purge_workflow_id = excluded.purge_workflow_id,
           receipt_version = excluded.receipt_version,
           purged_at = excluded.purged_at,
           backup_retention_until = excluded.backup_retention_until,
           created_at = excluded.created_at
         WHERE excluded.purged_at > purge_receipts.purged_at`,
      )
      .bind(
        receipt.itemId,
        receipt.purgeRequestId,
        receipt.receiptVersion,
        receipt.purgedAt,
        receipt.backupRetentionUntil,
      )
      .run();
  }
}
