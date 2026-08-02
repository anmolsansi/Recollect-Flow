import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('OPE-248 migration rehearsal', () => {
  it('upgrades populated D1 through review and duplicate migrations', async () => {
    const database = env.OPE248_MIGRATION_DB!;
    const migrations = env.TEST_MIGRATIONS!;

    await applyD1Migrations(database, migrations.slice(0, 16));
    const now = new Date().toISOString();
    await database
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, captured_at, created_at, updated_at
         ) VALUES (
           'ope248-migration-item', 'ope248-migration-key', 'note', 'test',
           'public', 'complete', ?1, ?1, ?1
         )`,
      )
      .bind(now)
      .run();

    await applyD1Migrations(database, migrations.slice(16));

    const migrated = await database
      .prepare(
        `SELECT edit_version, deleted_from_lifecycle_status, duplicate_of
         FROM items WHERE id = 'ope248-migration-item'`,
      )
      .first<{
        edit_version: number;
        deleted_from_lifecycle_status: string | null;
        duplicate_of: string | null;
      }>();
    expect(migrated).toEqual({
      edit_version: 1,
      deleted_from_lifecycle_status: null,
      duplicate_of: null,
    });

    const feedbackTable = await database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name = 'item_feedback_events'`,
      )
      .first();
    expect(feedbackTable).not.toBeNull();

    const foreignKeyIssues = await database
      .prepare('PRAGMA foreign_key_check')
      .all();
    expect(foreignKeyIssues.results).toHaveLength(0);
  });
});
