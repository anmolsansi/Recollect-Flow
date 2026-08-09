import type {
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
    itemId: string,
    requestedEditVersion: number,
    confirmationDigest: string,
    confirmationExpiresAt: string,
    now: Date,
  ): Promise<PurgeWorkflowRecord> {
    const workflowId = crypto.randomUUID();
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
