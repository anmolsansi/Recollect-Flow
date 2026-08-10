import type { IntegrityRunState } from './recovery.types';

export type IntegritySeverity = 'info' | 'warning' | 'error';

export interface IntegrityFindingInput {
  findingType: string;
  severity: IntegritySeverity;
  itemId?: string | null;
  attachmentId?: string | null;
  externalRef?: string | null;
  details?: Record<string, unknown>;
}

export interface IntegrityRunRecord {
  id: string;
  state: IntegrityRunState;
  findingCount: number;
  lastErrorCode: string | null;
  startedAt: string;
  completedAt: string | null;
}

export class IntegrityRepository {
  constructor(private readonly db: D1Database) {}

  async start(now: Date): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO integrity_runs (
           id, state, finding_count, started_at
         ) VALUES (?1, 'running', 0, ?2)`,
      )
      .bind(id, now.toISOString())
      .run();
    return id;
  }

  async addFinding(
    runId: string,
    finding: IntegrityFindingInput,
    now: Date,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO integrity_findings (
           id, integrity_run_id, finding_type, severity, item_id,
           attachment_id, external_ref, details_json, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        crypto.randomUUID(),
        runId,
        finding.findingType,
        finding.severity,
        finding.itemId ?? null,
        finding.attachmentId ?? null,
        finding.externalRef ?? null,
        JSON.stringify(finding.details ?? {}),
        now.toISOString(),
      )
      .run();
  }

  async complete(runId: string, now: Date): Promise<void> {
    const count = await this.db
      .prepare(
        'SELECT COUNT(*) AS count FROM integrity_findings WHERE integrity_run_id = ?1',
      )
      .bind(runId)
      .first<{ count: number }>();
    await this.db
      .prepare(
        `UPDATE integrity_runs
         SET state = 'complete', finding_count = ?1,
             last_error_code = NULL, completed_at = ?2
         WHERE id = ?3 AND state = 'running'`,
      )
      .bind(count?.count ?? 0, now.toISOString(), runId)
      .run();
  }

  async fail(runId: string, errorCode: string, now: Date): Promise<void> {
    await this.db
      .prepare(
        `UPDATE integrity_runs
         SET state = 'failed', last_error_code = ?1, completed_at = ?2
         WHERE id = ?3 AND state = 'running'`,
      )
      .bind(errorCode, now.toISOString(), runId)
      .run();
  }

  async get(runId: string): Promise<{
    run: IntegrityRunRecord | null;
    findings: Array<Record<string, unknown>>;
  }> {
    const row = await this.db
      .prepare(
        `SELECT id, state, finding_count, last_error_code,
                started_at, completed_at
         FROM integrity_runs WHERE id = ?1`,
      )
      .bind(runId)
      .first<{
        id: string;
        state: IntegrityRunState;
        finding_count: number;
        last_error_code: string | null;
        started_at: string;
        completed_at: string | null;
      }>();
    const findings = await this.db
      .prepare(
        `SELECT finding_type, severity, item_id, attachment_id,
                external_ref, details_json, created_at
         FROM integrity_findings
         WHERE integrity_run_id = ?1
         ORDER BY severity DESC, finding_type ASC, created_at ASC`,
      )
      .bind(runId)
      .all<Record<string, unknown>>();
    return {
      run: row
        ? {
            id: row.id,
            state: row.state,
            findingCount: row.finding_count,
            lastErrorCode: row.last_error_code,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          }
        : null,
      findings: findings.results,
    };
  }
}
