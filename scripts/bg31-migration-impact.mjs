/* global console, process */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareMigrationLedger,
  sourceMigrations,
} from './bg31-migration-ledger.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDirectory = join(root, 'migrations');

const objectKind = {
  TABLE: 'tables',
  INDEX: 'indexes',
  TRIGGER: 'triggers',
  VIEW: 'views',
};

function inspectSourceSql(filename, sql) {
  const stripped = sql.replace(/^\s*--[^\n]*$/gm, '');
  const creates = { tables: [], indexes: [], triggers: [], views: [] };
  const createPattern =
    /^CREATE\s+(?:UNIQUE\s+)?(?:VIRTUAL\s+)?(TABLE|INDEX|TRIGGER|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w]+)/gm;
  for (const [, kind, name] of stripped.matchAll(createPattern)) {
    creates[objectKind[kind]].push(name);
  }

  const alteredColumns = [];
  const alterPattern = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/gm;
  for (const [, table, column] of stripped.matchAll(alterPattern)) {
    alteredColumns.push({ table, column });
  }

  const renamedTables = [];
  const renamePattern = /^ALTER\s+TABLE\s+(\w+)\s+RENAME\s+TO\s+(\w+)/gm;
  for (const [, from, to] of stripped.matchAll(renamePattern)) {
    renamedTables.push({ from, to });
  }

  const droppedObjects = [];
  const dropPattern =
    /^DROP\s+(TABLE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+EXISTS\s+)?(\w+)/gm;
  for (const [, kind, name] of stripped.matchAll(dropPattern)) {
    droppedObjects.push({ kind, name });
  }

  // Only unindented, top-level writes are classified. Trigger bodies are
  // deliberately excluded: they describe future runtime work, not a backfill.
  let insideTrigger = false;
  const topLevelDataWrites = [];
  for (const line of stripped.split(/\r?\n/)) {
    if (/^CREATE\s+TRIGGER\b/.test(line)) insideTrigger = true;
    if (!insideTrigger) {
      const match = line.match(
        /^(INSERT\s+INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+(\w+)/,
      );
      if (match) topLevelDataWrites.push({ action: match[1], table: match[2] });
    }
    if (insideTrigger && /^END\s*;\s*$/.test(line)) insideTrigger = false;
  }

  const flags = [];
  if (droppedObjects.length || renamedTables.length) {
    flags.push('OBJECT_DROP_OR_RENAME_REVIEW');
  }
  if (topLevelDataWrites.length) flags.push('DATA_REWRITE_REVIEW');
  if (creates.triggers.length) {
    flags.push('TRIGGER_RUNTIME_COMPATIBILITY_REVIEW');
  }
  if (alteredColumns.length) {
    flags.push('OLD_CODE_COLUMN_COMPATIBILITY_REVIEW');
  }

  return {
    filename,
    sql_sha256: createHash('sha256').update(sql).digest('hex'),
    creates,
    altered_columns: alteredColumns,
    renamed_tables: renamedTables,
    dropped_objects: droppedObjects,
    top_level_data_writes: topLevelDataWrites,
    review_flags: flags,
    code_rollback_compatibility_verified: false,
  };
}

export function migrationSourceImpact(
  directory = defaultDirectory,
  suppliedLedger,
) {
  const names = sourceMigrations(directory);
  const migrations = names.map((name) =>
    inspectSourceSql(name, readFileSync(join(directory, name), 'utf8')),
  );
  const compared =
    suppliedLedger === undefined
      ? null
      : compareMigrationLedger(suppliedLedger, names);

  return {
    status: 'OFFLINE_SOURCE_SQL_REVIEW_ONLY',
    verified_live_migration_ledger: false,
    verified_pending_production_migrations: false,
    production_compatibility_verified: false,
    previous_deployable_artifact_verified: false,
    source_migration_count: names.length,
    source_migration_head: names.at(-1),
    pending_from_supplied_ledger_unverified:
      compared?.pending_forward_migrations ?? null,
    migrations,
    warning:
      'Source SQL inspection is not a SQL parser, execution, live ledger observation, isolated restore, or rollback proof. Confirm account/D1 identity, backups, exact applied filenames, old artifacts and $0 authorization separately.',
  };
}

const calledDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (calledDirectly) {
  try {
    if (process.argv.length > 3) {
      throw new Error(
        'Usage: node scripts/bg31-migration-impact.mjs [local-ledger.json]',
      );
    }
    const ledger =
      process.argv.length === 3
        ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
        : undefined;
    console.log(
      JSON.stringify(migrationSourceImpact(defaultDirectory, ledger), null, 2),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
