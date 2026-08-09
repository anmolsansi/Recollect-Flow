import type { PortableItemExport } from './export.types';
import type { PurgeReceiptRecord } from './recovery.types';

const RESTORABLE_TABLES = new Set([
  'items',
  'capture_events',
  'attachments',
  'extraction_records',
  'processing_jobs',
  'processing_job_results',
  'sync_attempts',
  'provider_usage',
  'item_field_overrides',
  'item_feedback_events',
  'audit_events',
  'item_deduplication_keys',
  'purge_receipts',
]);

interface TableInfoRow {
  name: string;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export class RestoreRepository {
  private readonly columnCache = new Map<string, string[]>();

  constructor(private readonly db: D1Database) {}

  async targetIsClean(): Promise<boolean> {
    for (const table of [
      'items',
      'capture_events',
      'attachments',
      'processing_jobs',
      'sync_attempts',
    ]) {
      const count = await this.db
        .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`)
        .first<{ count: number }>();
      if ((count?.count ?? 0) !== 0) return false;
    }
    return true;
  }

  private async columns(table: string): Promise<string[]> {
    if (!RESTORABLE_TABLES.has(table)) {
      throw new Error('RESTORE_TABLE_NOT_ALLOWED');
    }
    const cached = this.columnCache.get(table);
    if (cached) return cached;
    const result = await this.db
      .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
      .all<TableInfoRow>();
    const columns = result.results.map((row) => row.name);
    if (!columns.length) throw new Error('RESTORE_TABLE_SCHEMA_MISSING');
    this.columnCache.set(table, columns);
    return columns;
  }

  async insertRecord(
    table: string,
    record: Record<string, unknown>,
  ): Promise<void> {
    const allowed = await this.columns(table);
    const columns = allowed.filter((column) =>
      Object.prototype.hasOwnProperty.call(record, column),
    );
    if (!columns.length) throw new Error('RESTORE_RECORD_EMPTY');
    const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns
      .map(quoteIdentifier)
      .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    await this.db
      .prepare(sql)
      .bind(...columns.map((column) => record[column] ?? null))
      .run();
  }

  async insertPurgeReceipt(receipt: PurgeReceiptRecord): Promise<void> {
    await this.insertRecord('purge_receipts', {
      item_id: receipt.itemId,
      purge_workflow_id: receipt.purgeRequestId,
      receipt_version: receipt.receiptVersion,
      purged_at: receipt.purgedAt,
      backup_retention_until: receipt.backupRetentionUntil,
      created_at: receipt.purgedAt,
    });
  }

  async restoreItemShell(item: PortableItemExport): Promise<void> {
    await this.insertRecord('items', { ...item.item, duplicate_of: null });
  }
}
