import type { RestoreState } from './recovery.types';

export interface RestoreRunRecord {
  id: string;
  state: RestoreState;
  schemaVersion: string;
  dryRun: boolean;
  itemCount: number;
  restoredCount: number;
  skippedPurgedCount: number;
  lastErrorCode: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface RestoreRunRow {
  id: string;
  state: RestoreState;
  schema_version: string;
  dry_run: number;
  item_count: number;
  restored_count: number;
  skipped_purged_count: number;
  last_error_code: string | null;
  started_at: string;
  completed_at: string | null;
}

function record(row: RestoreRunRow): RestoreRunRecord {
  return {
    id: row.id,
    state: row.state,
    schemaVersion: row.schema_version,
    dryRun: row.dry_run === 1,
    itemCount: row.item_count,
    restoredCount: row.restored_count,
    skippedPurgedCount: row.skipped_purged_count,
    lastErrorCode: row.last_error_code,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export class RestoreRunRepository {
  constructor(private readonly db: D1Database) {}

  async create(
    schemaVersion: string,
    dryRun: boolean,
    itemCount: number,
    startedAt: Date,
  ): Promise<RestoreRunRecord> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO restore_runs (
           id, state, schema_version, dry_run, item_count,
           restored_count, skipped_purged_count, started_at
         ) VALUES (?1, 'validating', ?2, ?3, ?4, 0, 0, ?5)`,
      )
      .bind(
        id,
        schemaVersion,
        dryRun ? 1 : 0,
        itemCount,
        startedAt.toISOString(),
      )
      .run();
    return (await this.find(id))!;
  }

  async update(
    id: string,
    state: RestoreState,
    options: {
      restoredCount?: number;
      skippedPurgedCount?: number;
      errorCode?: string | null;
      completedAt?: Date | null;
    } = {},
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE restore_runs
         SET state = ?1,
             restored_count = COALESCE(?2, restored_count),
             skipped_purged_count = COALESCE(?3, skipped_purged_count),
             last_error_code = ?4,
             completed_at = ?5
         WHERE id = ?6`,
      )
      .bind(
        state,
        options.restoredCount ?? null,
        options.skippedPurgedCount ?? null,
        options.errorCode ?? null,
        options.completedAt?.toISOString() ?? null,
        id,
      )
      .run();
  }

  async find(id: string): Promise<RestoreRunRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, state, schema_version, dry_run, item_count,
                restored_count, skipped_purged_count, last_error_code,
                started_at, completed_at
         FROM restore_runs WHERE id = ?1`,
      )
      .bind(id)
      .first<RestoreRunRow>();
    return row ? record(row) : null;
  }
}
