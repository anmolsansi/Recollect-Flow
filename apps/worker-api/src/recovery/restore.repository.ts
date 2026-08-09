import type { PortableItemExport, PortableRecord } from './export.types';
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

function resetProcessingLease(
  record: PortableRecord,
  nowIso: string,
): PortableRecord {
  if (record.status !== 'processing') return record;
  return {
    ...record,
    status: 'pending',
    available_at: nowIso,
    lease_owner: null,
    lease_expires_at: null,
    heartbeat_at: null,
    last_error_code: 'RESTORE_LEASE_RESET',
  };
}

function resetSyncLease(record: PortableRecord, nowIso: string): PortableRecord {
  if (record.status !== 'processing') return record;
  return {
    ...record,
    status: 'pending',
    available_at: nowIso,
    lease_owner: null,
    lease_expires_at: null,
    last_error_code: 'RESTORE_LEASE_RESET',
  };
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

  async restoreItemShell(
    item: PortableItemExport,
    validItemIds: ReadonlySet<string>,
  ): Promise<void> {
    const duplicateOf = item.item.duplicate_of;
    const duplicateTargetIsAvailable =
      typeof duplicateOf === 'string' && validItemIds.has(duplicateOf);
    await this.insertRecord('items', {
      ...item.item,
      duplicate_of: null,
      lifecycle_status:
        item.item.lifecycle_status === 'Duplicate' && !duplicateTargetIsAvailable
          ? 'Inbox'
          : item.item.lifecycle_status,
    });
  }

  async restoreItemChildren(
    item: PortableItemExport,
    now: Date,
  ): Promise<void> {
    const nowIso = now.toISOString();
    for (const attachment of item.attachments) {
      await this.insertRecord('attachments', attachment);
    }
    for (const capture of item.captureEvents) {
      await this.insertRecord('capture_events', {
        ...capture,
        duplicate_of: null,
        attachment_id: null,
      });
    }
    for (const key of item.deduplicationKeys) {
      await this.insertRecord('item_deduplication_keys', key);
    }
    for (const job of item.processingJobs) {
      await this.insertRecord(
        'processing_jobs',
        resetProcessingLease(job, nowIso),
      );
    }
    for (const result of item.processingJobResults) {
      await this.insertRecord('processing_job_results', result);
    }
    for (const sync of item.syncAttempts) {
      await this.insertRecord('sync_attempts', resetSyncLease(sync, nowIso));
    }
    for (const usage of item.providerUsage) {
      await this.insertRecord('provider_usage', usage);
    }
    for (const override of item.fieldOverrides) {
      await this.insertRecord('item_field_overrides', override);
    }
    for (const feedback of item.feedbackEvents) {
      await this.insertRecord('item_feedback_events', feedback);
    }
    for (const audit of item.auditEvents) {
      await this.insertRecord('audit_events', audit);
    }
    for (const extraction of item.extractions) {
      await this.insertRecord('extraction_records', extraction);
    }
  }

  async restoreDeferredReferences(
    item: PortableItemExport,
    validItemIds: ReadonlySet<string>,
  ): Promise<void> {
    const itemId = item.item.id;
    const duplicateOf = item.item.duplicate_of;
    if (
      typeof itemId === 'string' &&
      typeof duplicateOf === 'string' &&
      validItemIds.has(duplicateOf)
    ) {
      await this.db
        .prepare('UPDATE items SET duplicate_of = ?1 WHERE id = ?2')
        .bind(duplicateOf, itemId)
        .run();
    }

    for (const capture of item.captureEvents) {
      if (typeof capture.id !== 'string') continue;
      const duplicate =
        typeof capture.duplicate_of === 'string' &&
        validItemIds.has(capture.duplicate_of)
          ? capture.duplicate_of
          : null;
      const attachment =
        typeof capture.attachment_id === 'string' ? capture.attachment_id : null;
      if (!duplicate && !attachment) continue;
      await this.db
        .prepare(
          `UPDATE capture_events
           SET duplicate_of = ?1, attachment_id = ?2
           WHERE id = ?3`,
        )
        .bind(duplicate, attachment, capture.id)
        .run();
    }
  }
}
