import {
  parseDigestPayload,
  referencedItemIds,
} from '../digests/digest.renderer';

const PURGE_RECEIPT_VERSION = '2026-08-10.1';

export class CanonicalPurgeService {
  constructor(private readonly db: D1Database) {}

  async purgeDigestReferences(itemId: string): Promise<number> {
    const runs = await this.db
      .prepare('SELECT id, canonical_payload_json FROM digest_runs')
      .all<{ id: string; canonical_payload_json: string }>();
    const affected = (runs.results ?? []).filter((run) => {
      try {
        return referencedItemIds(
          parseDigestPayload(run.canonical_payload_json),
        ).includes(itemId);
      } catch {
        return run.canonical_payload_json.includes(itemId);
      }
    });
    for (const run of affected) {
      await this.db.batch([
        this.db
          .prepare('DELETE FROM digest_audit_events WHERE digest_run_id = ?1')
          .bind(run.id),
        this.db
          .prepare('DELETE FROM digest_deliveries WHERE digest_run_id = ?1')
          .bind(run.id),
        this.db.prepare('DELETE FROM digest_runs WHERE id = ?1').bind(run.id),
      ]);
    }
    return affected.length;
  }

  async purgeItem(
    itemId: string,
    purgeWorkflowId: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const retention = await this.db
      .prepare(
        `SELECT MAX(expires_at) AS retention_until
         FROM backup_artifacts
         WHERE state = 'complete' AND expires_at > ?1`,
      )
      .bind(nowIso)
      .first<{ retention_until: string | null }>();

    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE items
           SET duplicate_of = NULL,
               lifecycle_status = CASE
                 WHEN lifecycle_status = 'Duplicate' THEN 'Inbox'
                 ELSE lifecycle_status END,
               edit_version = edit_version + 1,
               updated_at = ?1
           WHERE duplicate_of = ?2`,
        )
        .bind(nowIso, itemId),
      this.db
        .prepare(
          'UPDATE capture_events SET duplicate_of = NULL WHERE duplicate_of = ?1',
        )
        .bind(itemId),
      this.db
        .prepare(
          `DELETE FROM processing_job_results
           WHERE job_id IN (SELECT id FROM processing_jobs WHERE item_id = ?1)`,
        )
        .bind(itemId),
      this.db
        .prepare('DELETE FROM extraction_records WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM item_field_overrides WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM item_feedback_events WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM processing_jobs WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM sync_attempts WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM provider_usage WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM audit_events WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM item_deduplication_keys WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM attachments WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare('DELETE FROM capture_events WHERE item_id = ?1')
        .bind(itemId),
      this.db
        .prepare(
          `INSERT INTO purge_receipts (
             item_id, purge_workflow_id, receipt_version,
             purged_at, backup_retention_until, created_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?4)
           ON CONFLICT(item_id) DO NOTHING`,
        )
        .bind(
          itemId,
          purgeWorkflowId,
          PURGE_RECEIPT_VERSION,
          nowIso,
          retention?.retention_until ?? null,
        ),
      this.db
        .prepare('DELETE FROM items WHERE id = ?1 AND deleted_at IS NOT NULL')
        .bind(itemId),
    ]);

    return results.at(-1)?.meta.changes === 1;
  }
}
