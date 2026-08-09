import type { BackupArtifactRecord, BackupState } from './recovery.types';

interface BackupArtifactRow {
  id: string;
  object_key: string;
  state: BackupState;
  schema_version: string;
  sha256: string | null;
  size_bytes: number | null;
  created_at: string;
  verified_at: string | null;
  expires_at: string;
  failure_code: string | null;
}

function record(row: BackupArtifactRow): BackupArtifactRecord {
  return {
    id: row.id,
    objectKey: row.object_key,
    state: row.state,
    schemaVersion: row.schema_version,
    sha256: row.sha256,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
    expiresAt: row.expires_at,
    failureCode: row.failure_code,
  };
}

export class BackupRepository {
  constructor(private readonly db: D1Database) {}

  async create(
    id: string,
    objectKey: string,
    schemaVersion: string,
    expiresAt: string,
    now: Date,
  ): Promise<BackupArtifactRecord> {
    const nowIso = now.toISOString();
    await this.db
      .prepare(
        `INSERT INTO backup_artifacts (
           id, object_key, state, schema_version, created_at, expires_at
         ) VALUES (?1, ?2, 'creating', ?3, ?4, ?5)`,
      )
      .bind(id, objectKey, schemaVersion, nowIso, expiresAt)
      .run();
    return (await this.find(id))!;
  }

  async markVerifying(
    id: string,
    sha256: string,
    sizeBytes: number,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE backup_artifacts
         SET state = 'verifying', sha256 = ?1, size_bytes = ?2,
             failure_code = NULL
         WHERE id = ?3 AND state = 'creating'`,
      )
      .bind(sha256, sizeBytes, id)
      .run();
    return result.meta.changes === 1;
  }

  async markComplete(id: string, verifiedAt: Date): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE backup_artifacts
         SET state = 'complete', verified_at = ?1, failure_code = NULL
         WHERE id = ?2 AND state = 'verifying'
           AND sha256 IS NOT NULL AND size_bytes IS NOT NULL`,
      )
      .bind(verifiedAt.toISOString(), id)
      .run();
    return result.meta.changes === 1;
  }

  async markFailed(id: string, errorCode: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE backup_artifacts
         SET state = 'failed', failure_code = ?1
         WHERE id = ?2 AND state IN ('creating', 'verifying')`,
      )
      .bind(errorCode, id)
      .run();
    return result.meta.changes === 1;
  }

  async findExpired(
    now: Date,
    limit = 100,
  ): Promise<BackupArtifactRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id, object_key, state, schema_version, sha256, size_bytes,
                created_at, verified_at, expires_at, failure_code
         FROM backup_artifacts
         WHERE state = 'complete' AND expires_at <= ?1
         ORDER BY expires_at ASC LIMIT ?2`,
      )
      .bind(now.toISOString(), limit)
      .all<BackupArtifactRow>();
    return result.results.map(record);
  }

  async markExpired(id: string, now: Date): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE backup_artifacts
         SET state = 'expired', expired_at = ?1
         WHERE id = ?2 AND state = 'complete' AND expires_at <= ?1`,
      )
      .bind(nowIso, id)
      .run();
    return result.meta.changes === 1;
  }

  async find(id: string): Promise<BackupArtifactRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, object_key, state, schema_version, sha256, size_bytes,
                created_at, verified_at, expires_at, failure_code
         FROM backup_artifacts WHERE id = ?1`,
      )
      .bind(id)
      .first<BackupArtifactRow>();
    return row ? record(row) : null;
  }

  async list(limit = 50): Promise<BackupArtifactRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id, object_key, state, schema_version, sha256, size_bytes,
                created_at, verified_at, expires_at, failure_code
         FROM backup_artifacts ORDER BY created_at DESC LIMIT ?1`,
      )
      .bind(limit)
      .all<BackupArtifactRow>();
    return result.results.map(record);
  }
}
