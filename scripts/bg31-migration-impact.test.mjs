import assert from 'node:assert/strict';
import test from 'node:test';
import { migrationSourceImpact } from './bg31-migration-impact.mjs';

const audit = migrationSourceImpact();
const migration = (prefix) =>
  audit.migrations.find((entry) => entry.filename.startsWith(prefix));

test('source impact inventory is complete and never invents a live ledger', () => {
  assert.equal(audit.status, 'OFFLINE_SOURCE_SQL_REVIEW_ONLY');
  assert.equal(audit.source_migration_count, 22);
  assert.equal(audit.source_migration_head, '0025_bg28_scheduled_backups.sql');
  assert.equal(audit.pending_from_supplied_ledger_unverified, null);
  assert.equal(audit.verified_live_migration_ledger, false);
  assert.equal(audit.verified_pending_production_migrations, false);
  assert.equal(audit.production_compatibility_verified, false);
  assert.equal(audit.previous_deployable_artifact_verified, false);
  assert.ok(audit.migrations.every((entry) => /^[a-f0-9]{64}$/.test(entry.sql_sha256)));
  assert.ok(audit.migrations.every((entry) => !entry.code_rollback_compatibility_verified));
});

test('source SQL calls out FTS data copy and schema replacement', () => {
  assert.ok(migration('0016_').creates.tables.includes('item_search_fts'));
  assert.ok(migration('0016_').top_level_data_writes.some(
    (write) => write.action === 'INSERT INTO' && write.table === 'item_search_fts',
  ));
  const url = migration('0022_');
  assert.ok(url.creates.tables.includes('url_acquisitions'));
  assert.ok(url.altered_columns.some(
    (alter) => alter.table === 'items' && alter.column === 'source_revision',
  ));
  assert.ok(url.dropped_objects.some(
    (drop) => drop.kind === 'TABLE' && drop.name === 'item_search_fts',
  ));
  assert.ok(url.renamed_tables.some(
    (rename) => rename.to === 'item_search_fts',
  ));
  assert.ok(url.review_flags.includes('OBJECT_DROP_OR_RENAME_REVIEW'));
  assert.ok(url.review_flags.includes('DATA_REWRITE_REVIEW'));
});

test('processing generation/status are not misreported as historic data backfill', () => {
  const generations = migration('0023_');
  assert.ok(generations.altered_columns.some(
    (alter) => alter.table === 'items' && alter.column === 'processing_generation',
  ));
  assert.ok(generations.creates.triggers.length >= 3);
  assert.deepEqual(generations.top_level_data_writes, []);
  const status = migration('0024_');
  assert.ok(status.creates.views.includes('bg13_processing_snapshot'));
  assert.equal(status.creates.triggers.length, 4);
  assert.deepEqual(status.top_level_data_writes, []);
});

test('scheduled backup schema cannot be mistaken for activated backup job', () => {
  const backup = migration('0025_');
  assert.ok(backup.creates.tables.includes('scheduled_backup_periods'));
  assert.ok(backup.creates.indexes.includes('idx_scheduled_backup_periods_state'));
  assert.deepEqual(backup.creates.triggers, []);
  assert.deepEqual(backup.top_level_data_writes, []);
});

test('synthetic supplied ledger is still labeled unverified', () => {
  const names = audit.migrations.map((entry) => entry.filename);
  const result = migrationSourceImpact(undefined, names.slice(0, -2));
  assert.deepEqual(result.pending_from_supplied_ledger_unverified, names.slice(-2));
  assert.equal(result.verified_live_migration_ledger, false);
  assert.throws(
    () => migrationSourceImpact(undefined, [names[0], names[2]]),
    /STOP/,
  );
  assert.throws(
    () => migrationSourceImpact(undefined, ['PRIVATE_SHOULD_NOT_LEAK']),
    (error) => {
      assert.doesNotMatch(error.message, /PRIVATE_SHOULD_NOT_LEAK/);
      return true;
    },
  );
});
