/**
 * BG-26: bounded read-only operational summaries.
 *
 * Counts describe current canonical D1 records, not provider-account usage or
 * authoritative R2/D1 billing metrics. Never select private item content.
 */
export interface BacklogGroup {
  kind: 'processing' | 'sync';
  type: string;
  status: 'pending' | 'processing' | 'retry_wait' | 'failed';
  count: number;
  oldest_created_at: string | null;
  next_available_at: string | null;
  sample_error_code: string | null;
}

interface BacklogRow extends BacklogGroup {}

interface CountRow { count: number }
interface AttachmentRow {
  objects: number;
  bytes: number | null;
  orphaned_objects: number;
  orphaned_bytes: number | null;
}
interface BackupRow {
  id: string;
  state: string;
  sha256: string | null;
  size_bytes: number | null;
  verified_at: string | null;
  expires_at: string;
  failure_code: string | null;
}
interface IntegrityRow {
  id: string;
  state: string;
  finding_count: number;
  started_at: string;
  completed_at: string | null;
  last_error_code: string | null;
}

const SAFE_CODE = /^[A-Z][A-Z0-9_.-]{0,79}$/;
function safeCode(code: string | null): string | null {
  return code && SAFE_CODE.test(code) ? code : null;
}

export class OperationsSummaryService {
  constructor(private readonly db: D1Database) {}

  async status(now: Date = new Date()) {
    const at = now.toISOString();
    // Only current item generations are operationally actionable. Discard
    // historical superseded processing records and deleted items.
    const processingSql = String.raw`
      WITH current_jobs AS (
        SELECT j.job_type AS type, j.status, j.created_at, j.available_at,
               j.last_error_code,
               CASE WHEN j.status = 'pending' AND j.available_at > ?1
                    THEN 'retry_wait' ELSE j.status END AS visible_status
        FROM processing_jobs j
        JOIN items i ON i.id = j.item_id
        WHERE i.deleted_at IS NULL
          AND j.processing_generation = i.processing_generation
          AND j.status IN ('pending', 'processing', 'failed')
      )
      SELECT 'processing' AS kind, type, visible_status AS status,
             COUNT(*) AS count, MIN(created_at) AS oldest_created_at,
             MIN(CASE WHEN visible_status = 'retry_wait' THEN available_at END)
               AS next_available_at,
             MIN(last_error_code) AS sample_error_code
      FROM current_jobs
      GROUP BY type, visible_status
      ORDER BY type, visible_status
      LIMIT 101
    `;
    const syncSql = String.raw`
      WITH current_jobs AS (
        SELECT s.destination AS type, s.status, s.created_at, s.available_at,
               s.last_error_code,
               CASE WHEN s.status = 'pending' AND s.available_at > ?1
                    THEN 'retry_wait' ELSE s.status END AS visible_status
        FROM sync_attempts s
        JOIN items i ON i.id = s.item_id
        WHERE i.deleted_at IS NULL
          AND s.status IN ('pending', 'processing', 'failed')
      )
      SELECT 'sync' AS kind, type, visible_status AS status,
             COUNT(*) AS count, MIN(created_at) AS oldest_created_at,
             MIN(CASE WHEN visible_status = 'retry_wait' THEN available_at END)
               AS next_available_at,
             MIN(last_error_code) AS sample_error_code
      FROM current_jobs
      GROUP BY type, visible_status
      ORDER BY type, visible_status
      LIMIT 101
    `;
    const [
      processing, sync, partialPurges, failedBackups, newestVerifiedBackup,
      newestIntegrity, unknownDigests, missingNotion, attachments,
    ] = await Promise.all([
      this.db.prepare(processingSql).bind(at).all<BacklogRow>(),
      this.db.prepare(syncSql).bind(at).all<BacklogRow>(),
      this.db.prepare("SELECT COUNT(*) AS count FROM purge_workflows WHERE state = 'partial'").first<CountRow>(),
      this.db.prepare("SELECT COUNT(*) AS count FROM backup_artifacts WHERE state = 'failed'").first<CountRow>(),
      this.db.prepare("SELECT id, state, sha256, size_bytes, verified_at, expires_at, failure_code FROM backup_artifacts WHERE state = 'complete' AND verified_at IS NOT NULL ORDER BY verified_at DESC LIMIT 1").first<BackupRow>(),
      this.db.prepare("SELECT id, state, finding_count, started_at, completed_at, last_error_code FROM integrity_runs ORDER BY started_at DESC LIMIT 1").first<IntegrityRow>(),
      this.db.prepare("SELECT COUNT(*) AS count FROM digest_deliveries WHERE state = 'unknown'").first<CountRow>(),
      this.db.prepare("SELECT COUNT(*) AS count FROM items WHERE deleted_at IS NULL AND notion_missing_at IS NOT NULL").first<CountRow>(),
      this.db.prepare("SELECT COUNT(*) AS objects, COALESCE(SUM(size_bytes), 0) AS bytes, COALESCE(SUM(CASE WHEN status = 'orphaned' THEN 1 ELSE 0 END), 0) AS orphaned_objects, COALESCE(SUM(CASE WHEN status = 'orphaned' THEN size_bytes ELSE 0 END), 0) AS orphaned_bytes FROM attachments WHERE status IN ('uploaded', 'finalized', 'linked', 'orphaned')").first<AttachmentRow>(),
    ]);

    const processingRows = processing.results ?? [];
    const syncRows = sync.results ?? [];
    const truncated = processingRows.length > 100 || syncRows.length > 100;
    const groups = [...processingRows.slice(0, 100), ...syncRows.slice(0, 100)]
      .map((row) => ({
        kind: row.kind,
        type: row.type,
        status: row.status,
        count: row.count,
        oldest_created_at: row.oldest_created_at,
        next_available_at: row.next_available_at,
        sample_error_code: safeCode(row.sample_error_code),
      }));

    return {
      generated_at: at,
      backlog: {
        groups,
        truncated,
        scope: 'current non-deleted D1 item jobs, historical generations excluded',
      },
      recovery: {
        partial_purges: partialPurges?.count ?? 0,
        failed_backups: failedBackups?.count ?? 0,
        latest_verified_backup: newestVerifiedBackup ?? null,
        latest_integrity: newestIntegrity
          ? { ...newestIntegrity, last_error_code: safeCode(newestIntegrity.last_error_code) }
          : null,
        ambiguous_digests: unknownDigests?.count ?? 0,
        missing_notion_projections: missingNotion?.count ?? 0,
      },
      storage: {
        source: 'D1 attachment metadata, not authoritative R2 bucket inventory',
        measured_at: at,
        recorded_objects: attachments?.objects ?? 0,
        recorded_bytes: attachments?.bytes ?? 0,
        orphaned_objects: attachments?.orphaned_objects ?? 0,
        orphaned_bytes: attachments?.orphaned_bytes ?? 0,
        r2_provider_objects: null,
        r2_provider_bytes: null,
        d1_provider_rows_read: null,
        d1_provider_rows_written: null,
        d1_provider_storage_bytes: null,
      },
    };
  }
}
