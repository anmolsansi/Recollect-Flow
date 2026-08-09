import type {
  PurgeReceiptRecord,
  PurgeState,
  PurgeStepKind,
  PurgeStepState,
  PurgeWorkflowRecord,
} from './recovery.types';

const PURGE_STEPS: readonly PurgeStepKind[] = [
  'freeze_jobs',
  'delete_r2_attachments',
  'archive_notion_projection',
  'delete_d1_item_data',
  'finalize_receipt',
];
const PURGE_RECEIPT_VERSION = '2026-08-10.1';

interface PurgeWorkflowRow {
  id: string;
  item_id: string;
  state: PurgeState;
  confirmation_expires_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingPurgeConfirmation {
  workflowId: string;
  itemId: string;
  state: PurgeState;
  confirmationDigest: string;
  confirmationExpiresAt: string;
  requestedEditVersion: number;
}

export interface PurgeStepRecord {
  id: string;
  workflowId: string;
  kind: PurgeStepKind;
  state: PurgeStepState;
  attempts: number;
  lastErrorCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function workflowRecord(row: PurgeWorkflowRow): PurgeWorkflowRecord {
  return {
    id: row.id,
    itemId: row.item_id,
    state: row.state,
    confirmationExpiresAt: row.confirmation_expires_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PurgeRepository {
  constructor(private readonly db: D1Database) {}

  async createConfirmation(
    workflowId: string,
    itemId: string,
    requestedEditVersion: number,
    confirmationDigest: string,
    confirmationExpiresAt: string,
    now: Date,
  ): Promise<PurgeWorkflowRecord> {
    const nowIso = now.toISOString();
    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `INSERT INTO purge_workflows (
             id, item_id, state, confirmation_digest,
             confirmation_expires_at, requested_edit_version,
             created_at, updated_at
           ) VALUES (?1, ?2, 'confirmation_pending', ?3, ?4, ?5, ?6, ?6)`,
        )
        .bind(
          workflowId,
          itemId,
          confirmationDigest,
          confirmationExpiresAt,
          requestedEditVersion,
          nowIso,
        ),
    ];

    for (const step of PURGE_STEPS) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO purge_steps (
               id, purge_workflow_id, step_kind, state,
               attempts, created_at, updated_at
             ) VALUES (?1, ?2, ?3, 'pending', 0, ?4, ?4)`,
          )
          .bind(crypto.randomUUID(), workflowId, step, nowIso),
      );
    }
    await this.db.batch(statements);
    const workflow = await this.findWorkflow(workflowId);
    if (!workflow) throw new Error('Failed to persist purge workflow');
    return workflow;
  }

  async findPendingConfirmation(
    workflowId: string,
  ): Promise<PendingPurgeConfirmation | null> {
    const row = await this.db
      .prepare(
        `SELECT id, item_id, state, confirmation_digest,
                confirmation_expires_at, requested_edit_version
         FROM purge_workflows WHERE id = ?1`,
      )
      .bind(workflowId)
      .first<{
        id: string;
        item_id: string;
        state: PurgeState;
        confirmation_digest: string;
        confirmation_expires_at: string;
        requested_edit_version: number;
      }>();
    return row
      ? {
          workflowId: row.id,
          itemId: row.item_id,
          state: row.state,
          confirmationDigest: row.confirmation_digest,
          confirmationExpiresAt: row.confirmation_expires_at,
          requestedEditVersion: row.requested_edit_version,
        }
      : null;
  }

  async confirm(
    workflowId: string,
    confirmationDigest: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_workflows
         SET state = 'queued', confirmed_at = ?1, updated_at = ?1,
             last_error_code = NULL
         WHERE id = ?2 AND state = 'confirmation_pending'
           AND confirmation_digest = ?3 AND confirmation_expires_at > ?1`,
      )
      .bind(nowIso, workflowId, confirmationDigest)
      .run();
    return result.meta.changes === 1;
  }

  async cancelExpiredConfirmation(
    workflowId: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_workflows
         SET state = 'cancelled', last_error_code = 'PURGE_CONFIRMATION_EXPIRED',
             updated_at = ?1
         WHERE id = ?2 AND state = 'confirmation_pending'
           AND confirmation_expires_at <= ?1`,
      )
      .bind(nowIso, workflowId)
      .run();
    return result.meta.changes === 1;
  }

  async markWorkflowProcessing(workflowId: string, now: Date): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_workflows
         SET state = 'processing', last_error_code = NULL, updated_at = ?1
         WHERE id = ?2 AND state IN ('queued', 'partial')`,
      )
      .bind(nowIso, workflowId)
      .run();
    return result.meta.changes === 1;
  }

  async markWorkflowPartial(
    workflowId: string,
    errorCode: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_workflows
         SET state = 'partial', last_error_code = ?1, updated_at = ?2
         WHERE id = ?3 AND state = 'processing'`,
      )
      .bind(errorCode, nowIso, workflowId)
      .run();
    return result.meta.changes === 1;
  }

  async markWorkflowComplete(workflowId: string, now: Date): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_workflows
         SET state = 'complete', last_error_code = NULL,
             completed_at = ?1, updated_at = ?1
         WHERE id = ?2 AND state = 'processing'`,
      )
      .bind(nowIso, workflowId)
      .run();
    return result.meta.changes === 1;
  }

  async claimStep(
    workflowId: string,
    kind: PurgeStepKind,
    now: Date,
  ): Promise<PurgeStepRecord | null> {
    const nowIso = now.toISOString();
    const row = await this.db
      .prepare(
        `UPDATE purge_steps
         SET state = 'processing', attempts = attempts + 1,
             started_at = COALESCE(started_at, ?1), last_error_code = NULL,
             updated_at = ?1
         WHERE purge_workflow_id = ?2 AND step_kind = ?3
           AND state IN ('pending', 'failed')
         RETURNING id, purge_workflow_id, step_kind, state, attempts,
                   last_error_code, started_at, completed_at`,
      )
      .bind(nowIso, workflowId, kind)
      .first<{
        id: string;
        purge_workflow_id: string;
        step_kind: PurgeStepKind;
        state: PurgeStepState;
        attempts: number;
        last_error_code: string | null;
        started_at: string | null;
        completed_at: string | null;
      }>();
    return row
      ? {
          id: row.id,
          workflowId: row.purge_workflow_id,
          kind: row.step_kind,
          state: row.state,
          attempts: row.attempts,
          lastErrorCode: row.last_error_code,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        }
      : null;
  }

  async completeStep(
    workflowId: string,
    kind: PurgeStepKind,
    now: Date,
    skipped = false,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_steps
         SET state = ?1, completed_at = ?2, last_error_code = NULL,
             updated_at = ?2
         WHERE purge_workflow_id = ?3 AND step_kind = ?4
           AND state = 'processing'`,
      )
      .bind(skipped ? 'skipped' : 'complete', nowIso, workflowId, kind)
      .run();
    return result.meta.changes === 1;
  }

  async failStep(
    workflowId: string,
    kind: PurgeStepKind,
    errorCode: string,
    now: Date,
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE purge_steps
         SET state = 'failed', last_error_code = ?1, updated_at = ?2
         WHERE purge_workflow_id = ?3 AND step_kind = ?4
           AND state = 'processing'`,
      )
      .bind(errorCode, nowIso, workflowId, kind)
      .run();
    return result.meta.changes === 1;
  }

  async createReceipt(
    itemId: string,
    workflowId: string,
    purgedAt: Date,
  ): Promise<PurgeReceiptRecord> {
    const nowIso = purgedAt.toISOString();
    const retention = await this.db
      .prepare(
        `SELECT MAX(expires_at) AS retention_until
         FROM backup_artifacts
         WHERE state = 'complete' AND expires_at > ?1`,
      )
      .bind(nowIso)
      .first<{ retention_until: string | null }>();
    const retentionUntil = retention?.retention_until ?? null;
    await this.db
      .prepare(
        `INSERT INTO purge_receipts (
           item_id, purge_workflow_id, receipt_version,
           purged_at, backup_retention_until, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?4)
         ON CONFLICT(item_id) DO NOTHING`,
      )
      .bind(
        itemId,
        workflowId,
        PURGE_RECEIPT_VERSION,
        nowIso,
        retentionUntil,
      )
      .run();
    const receipt = await this.db
      .prepare(
        `SELECT item_id, purge_workflow_id, receipt_version,
                purged_at, backup_retention_until
         FROM purge_receipts WHERE item_id = ?1`,
      )
      .bind(itemId)
      .first<{
        item_id: string;
        purge_workflow_id: string;
        receipt_version: string;
        purged_at: string;
        backup_retention_until: string | null;
      }>();
    if (!receipt) throw new Error('Failed to persist purge receipt');
    return {
      itemId: receipt.item_id,
      purgeRequestId: receipt.purge_workflow_id,
      purgedAt: receipt.purged_at,
      receiptVersion: receipt.receipt_version,
      backupRetentionUntil: receipt.backup_retention_until,
    };
  }

  async listReceipts(): Promise<PurgeReceiptRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT item_id, purge_workflow_id, receipt_version,
                purged_at, backup_retention_until
         FROM purge_receipts ORDER BY purged_at ASC, item_id ASC`,
      )
      .all<{
        item_id: string;
        purge_workflow_id: string;
        receipt_version: string;
        purged_at: string;
        backup_retention_until: string | null;
      }>();
    return result.results.map((receipt) => ({
      itemId: receipt.item_id,
      purgeRequestId: receipt.purge_workflow_id,
      purgedAt: receipt.purged_at,
      receiptVersion: receipt.receipt_version,
      backupRetentionUntil: receipt.backup_retention_until,
    }));
  }

  async findWorkflow(id: string): Promise<PurgeWorkflowRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, item_id, state, confirmation_expires_at, confirmed_at,
                completed_at, last_error_code, created_at, updated_at
         FROM purge_workflows WHERE id = ?1`,
      )
      .bind(id)
      .first<PurgeWorkflowRow>();
    return row ? workflowRecord(row) : null;
  }

  async listSteps(workflowId: string): Promise<PurgeStepRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id, purge_workflow_id, step_kind, state, attempts,
                last_error_code, started_at, completed_at
         FROM purge_steps
         WHERE purge_workflow_id = ?1
         ORDER BY CASE step_kind
           WHEN 'freeze_jobs' THEN 1
           WHEN 'delete_r2_attachments' THEN 2
           WHEN 'archive_notion_projection' THEN 3
           WHEN 'delete_d1_item_data' THEN 4
           WHEN 'finalize_receipt' THEN 5
           ELSE 99 END`,
      )
      .bind(workflowId)
      .all<{
        id: string;
        purge_workflow_id: string;
        step_kind: PurgeStepKind;
        state: PurgeStepState;
        attempts: number;
        last_error_code: string | null;
        started_at: string | null;
        completed_at: string | null;
      }>();
    return result.results.map((row) => ({
      id: row.id,
      workflowId: row.purge_workflow_id,
      kind: row.step_kind,
      state: row.state,
      attempts: row.attempts,
      lastErrorCode: row.last_error_code,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  }
}
