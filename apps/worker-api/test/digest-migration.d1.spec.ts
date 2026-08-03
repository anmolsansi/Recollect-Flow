import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('OPE-226 migration rehearsal', () => {
  it('upgrades a populated database and preserves existing items', async () => {
    const database = env.OPE226_MIGRATION_DB!;
    const migrations = env.TEST_MIGRATIONS!;
    await applyD1Migrations(database, migrations.slice(0, -1));
    const now = '2026-08-03T00:00:00.000Z';
    await database
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, captured_at, created_at, updated_at
         ) VALUES (
           'ope226-migration-item', 'ope226-migration-key', 'note', 'test',
           'public', 'complete', ?1, ?1, ?1
         )`,
      )
      .bind(now)
      .run();

    await applyD1Migrations(database, migrations.slice(-1));

    const item = await database
      .prepare("SELECT id FROM items WHERE id = 'ope226-migration-item'")
      .first<{ id: string }>();
    expect(item?.id).toBe('ope226-migration-item');
    for (const table of [
      'digest_runs',
      'digest_deliveries',
      'digest_audit_events',
    ]) {
      const row = await database
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1`,
        )
        .bind(table)
        .first();
      expect(row, table).not.toBeNull();
    }
    const foreignKeyIssues = await database
      .prepare('PRAGMA foreign_key_check')
      .all();
    expect(foreignKeyIssues.results).toHaveLength(0);
  });
});
