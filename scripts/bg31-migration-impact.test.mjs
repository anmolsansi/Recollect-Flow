import assert from 'node:assert/strict';
import test from 'node:test';
import { migrationSourceImpact } from './bg31-migration-impact.mjs';

const audit = migrationSourceImpact();
const migration = (prefix) =>
  audit.migrations.find((entry) => entry.filename.startsWith(prefix));

test('source impact is complete but not live evidence', () => {
  assert.equal(audit.status, 'OFFLINE_SOURCE_SQL_REVIEW_ONLY');
  assert.equal(audit.source_migration_count, 22);
  assert.equal(audit.source_migration_head, '0025_bg28_scheduled_backups.sql');
  assert.equal(audit.pending_from_supplied_ledger_unverified, null);
  assert.equal(audit.verified_live_migration_ledger, false);
  assert.equal(audit.verified_pending_production_migrations, false);
  assert.equal(audit.production_compatibility_verified, false);
  assert.equal(audit.previous_deployable_artifact_verified, false);
  for (const entry of audit.migrations) {
    assert.match(entry.sql_sha256, /^[a-f0-9]{64}$/);
    assert.equal(entry.code_rollback_compatibility_verified, false);
  }
});

test('FTS migration has a data copy and table replacement', () => {
  const initialFts = migration('0016_');
  assert.ok(initialFts.creates.tables.includes('item_search_fts'));
  assert.ok(initialFts.top_level_data_writes.length > 0);
  const url = migration('0022_');
  assert.ok(url.creates.tables.includes('url_acquisitions'));
  assert.ok(url.altered_columns.length > 0);
  assert.ok(url.dropped_objects.length > 0);
  assert.ok(url.renamed_tables.length > 0);
  assert.ok(url.review_flags.includes('OBJECT_DROP_OR_RENAME_REVIEW'));
  assert.ok(url.review_flags.includes('DATA_REWRITE_REVIEW'));
});

test('generation and status triggers do not imply a backfill', () => {
  const generations = migration('0023_');
  const columns = generations.altered_columns.map((entry) => entry.column);
  assert.ok(columns.includes('processing_generation'));
  assert.ok(generations.creates.triggers.length >= 3);
  assert.deepEqual(generations.top_level_data_writes, []);
  const status = migration('0024_');
  assert.ok(status.creates.views.includes('bg13_processing_snapshot'));
  assert.equal(status.creates.triggers.length, 4);
  assert.deepEqual(status.top_level_data_writes, []);
});

test('backup migration only creates the scheduled table', () => {
  const backup = migration('0025_');
  assert.ok(backup.creates.tables.includes('scheduled_backup_periods'));
  const indexes = backup.creates.indexes;
  assert.ok(indexes.includes('idx_scheduled_backup_periods_state'));
  assert.deepEqual(backup.creates.triggers, []);
  assert.deepEqual(backup.top_level_data_writes, []);
});

test('supplied ledgers remain unverified and fail closed', () => {
  const names = audit.migrations.map((entry) => entry.filename);
  const result = migrationSourceImpact(undefined, names.slice(0, -2));
  const pending = result.pending_from_supplied_ledger_unverified;
  assert.deepEqual(pending, names.slice(-2));
  assert.equal(result.verified_live_migration_ledger, false);
  assert.throws(() => migrationSourceImpact(undefined, [names[2]]), /STOP/);
  assert.throws(
    () => migrationSourceImpact(undefined, ['PRIVATE_SHOULD_NOT_LEAK']),
    (error) => {
      assert.doesNotMatch(error.message, /PRIVATE_SHOULD_NOT_LEAK/);
      return true;
    },
  );
});
