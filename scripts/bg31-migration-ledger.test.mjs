import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  compareMigrationLedger,
  sourceMigrations,
} from './bg31-migration-ledger.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = sourceMigrations(join(root, 'migrations'));

function rejects(applied, expectedError) {
  assert.throws(
    () => compareMigrationLedger(applied, migrations),
    expectedError,
  );
}

test('offline ledger prefix returns only later forward migrations', () => {
  const result = compareMigrationLedger(migrations.slice(0, -2), migrations);
  assert.equal(result.status, 'OFFLINE_LEDGER_COMPARISON_ONLY');
  assert.equal(result.verified_production_ledger, false);
  assert.deepEqual(result.pending_forward_migrations, migrations.slice(-2));
  assert.equal(result.source_migration_head, migrations.at(-1));
});

test('offline ledger accepts exact names and an envelope', () => {
  const ledger = { applied_migrations: migrations.slice(0, 3) };
  const result = compareMigrationLedger(ledger, migrations);
  assert.deepEqual(result.pending_forward_migrations, migrations.slice(3));
  const all = compareMigrationLedger(migrations, migrations);
  assert.deepEqual(all.pending_forward_migrations, []);
  const objects = migrations.slice(0, 3).map((name) => ({ name }));
  const rows = compareMigrationLedger(objects, migrations);
  assert.equal(rows.supplied_applied_count, 3);
});

test('empty ledger is never accepted as production proof', () => {
  const result = compareMigrationLedger([], migrations);
  assert.equal(result.supplied_applied_count, 0);
  assert.equal(result.verified_production_ledger, false);
  assert.deepEqual(result.pending_forward_migrations, migrations);
});

test('invalid ledger inputs fail closed', () => {
  rejects({}, /Expected JSON/);
  rejects([null], /exact filename/);
  rejects([''], /exact filename/);
});

test('unknown, reordered and gapped migrations fail closed', () => {
  rejects(['9999_unknown.sql'], /STOP/);
  rejects([migrations[1]], /STOP/);
  rejects([migrations[0], migrations[2]], /STOP/);
  rejects([migrations[0], migrations[0]], /Duplicate/);
  rejects([...migrations, '9999_unknown.sql'], /more migrations/);
});

test('untrusted ledger filenames never appear in diagnostics', () => {
  const untrusted = 'PRIVATE_TOKEN_should_not_be_logged';
  assert.throws(
    () => compareMigrationLedger([untrusted], migrations),
    (error) => {
      assert.match(error.message, /STOP/);
      assert.match(error.message, /Supplied name withheld from logs/);
      assert.doesNotMatch(error.message, /PRIVATE_TOKEN/);
      return true;
    },
  );
});
