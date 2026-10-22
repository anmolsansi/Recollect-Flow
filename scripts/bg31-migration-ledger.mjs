/* global process, console */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function sourceMigrations(directory) {
  const names = readdirSync(directory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  if (names.length === 0) throw new Error('No source migrations found');
  return names;
}

export function compareMigrationLedger(raw, source) {
  const applied = Array.isArray(raw) ? raw : raw?.applied_migrations;
  if (!Array.isArray(applied)) {
    throw new Error('Expected JSON array or {"applied_migrations": [...]}');
  }
  const names = applied.map((entry) =>
    typeof entry === 'string' ? entry : entry?.name,
  );
  if (names.some((name) => typeof name !== 'string' || !name.trim())) {
    throw new Error('Each applied migration needs an exact filename/name');
  }
  if (new Set(names).size !== names.length) {
    throw new Error('Duplicate applied migration detected');
  }
  if (names.length > source.length) {
    throw new Error('Live ledger has more migrations than candidate source');
  }
  for (let i = 0; i < names.length; i += 1) {
    if (names[i] !== source[i]) {
      throw new Error(
        'STOP: ledger is unknown, out of order or non-prefix at index ' +
          i +
          ': got ' +
          names[i] +
          '; expected ' +
          source[i],
      );
    }
  }
  return {
    status: 'OFFLINE_LEDGER_COMPARISON_ONLY',
    verified_production_ledger: false,
    source_migration_head: source.at(-1),
    supplied_applied_count: names.length,
    pending_forward_migrations: source.slice(names.length),
    warning:
      'Caller must independently prove ledger origin, D1 UUID, account, time, and backup before any remote operation.',
  };
}

const calledDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (calledDirectly) {
  try {
    if (process.argv.length !== 3) {
      throw new Error(
        'Usage: node scripts/bg31-migration-ledger.mjs <read-only-ledger.json>',
      );
    }
    const ledger = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const result = compareMigrationLedger(
      ledger,
      sourceMigrations(join(root, 'migrations')),
    );
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
