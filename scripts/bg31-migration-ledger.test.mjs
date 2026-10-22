import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareMigrationLedger,
  sourceMigrations,
} from './bg31-migration-ledger.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = sourceMigrations(join(root, 'migrations'));

test('BG-31 offline ledger: exact prefix returns only later forward migrations', () => {
  const result = compareMigrationLedger(migrations.slice(0, -2), migrations);
  assert.equal(result.status, 'OFFLINE_LEDGER_COMPARISON_ONLY');
  assert.equal(result.verified_production_ledger, false);
  assert.deepEqual(result.pending_forward_migrations, migrations.slice(-2));
  assert.equal(result.source_migration_head, migrations.at(-1));
});

test('BG-31 offline ledger: accepts exact applied list as objects or envelope', () => {
  const prefix = migrations.slice(0, 3).map((name) => ({ name }));
  const result = compareMigrationLedger(
    { applied_migrations: prefix },
    migrations,
  );
  assert.deepEqual(result.pending_forward_migrations, migrations.slice(3));
  assert.deepEqual(
    compareMigrationLedger(migrations, migrations).pending_forward_migrations,
    [],
  );
});

test('BG-31 offline ledger: explicitly empty fresh database is not assumed live', () => {
  const result = compareMigrationLedger([], migrations);
  assert.equal(result.supplied_applied_count, 0);
  assert.equal(result.verified_production_ledger, false);
  assert.deepEqual(result.pending_forward_migrations, migrations);
});

test('BG-31 offline ledger: missing and invalid ledger are rejected', () => {
  assert.throws(() => compareMigrationLedger({}, migrations), /Expected JSON/);
  assert.throws(
    () => compareMigrationLedger([null], migrations),
    /exact filename/,
  );
  assert.throws(
    () => compareMigrationLedger([''], migrations),
    /exact filename/,
  );
});

test('BG-31 offline ledger: unknown, reordered and gapped migrations stop', () => {
  assert.throws(
    () => compareMigrationLedger(['9999_unknown.sql'], migrations),
    /STOP/,
  );
  assert.throws(
    () => compareMigrationLedger([migrations[1]], migrations),
    /STOP/,
  );
  assert.throws(
    () =>
      compareMigrationLedger(
        [migrations[0], migrations[2]],
        migrations,
      ),
    /STOP/,
  );
  assert.throws(
    () =>
      compareMigrationLedger(
        [migrations[0], migrations[0]],
        migrations,
      ),
    /Duplicate/,
  );
  assert.throws(
    () =>
      compareMigrationLedger(
        [...migrations, '9999_unknown.sql'],
        migrations,
      ),
    /more migrations/,
  );
});
