/* global process, console */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function localWrangler(args, persistDir) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    command,
    ['wrangler', 'd1', ...args, '--local', '--persist-to', persistDir],
    { encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `Local Wrangler failed (exit ${result.status}): ${(result.stderr ?? '').slice(-1000)}`,
      { cause: result.error },
    );
  }
  return result.stdout;
}

function sql(sqlText, dir) {
  const raw = localWrangler(
    ['execute', 'DB', '--command', sqlText, '--json'],
    dir,
  );
  const result = JSON.parse(raw);
  const records = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if ('canonical_items' in value || 'total' in value) records.push(value);
    for (const child of Object.values(value)) visit(child);
  }
  visit(result);
  return records;
}

const dir = await mkdtemp(join(tmpdir(), 'bg29-fts-smoke-'));
try {
  // Every invocation is --local with a brand-new persistence directory.
  localWrangler(['migrations', 'apply', 'DB'], dir);
  const itemId = 'bg29-local-fts-rebuild';
  sql(
    `INSERT INTO items (
    id, idempotency_key, source_type, source_app,
    privacy_level, processing_status, captured_at,
    created_at, updated_at, raw_text
  ) VALUES ('${itemId}', 'bg29-fts-rebuild-key', 'text', 'bg29',
    'sensitive', 'complete', '2026-10-01T00:00:00Z',
    '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z',
    'bg29rebuildneedle synthetic original');`,
    dir,
  );

  const corrupted = sql(
    `DELETE FROM item_search_fts WHERE item_id = '${itemId}'`,
    dir,
  );
  assert.ok(Array.isArray(corrupted));

  const readEvidence = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const fileRaw = localWrangler(
      [
        'execute',
        'DB',
        '--file',
        'scripts/rebuild-item-search-index.sql',
        '--json',
      ],
      dir,
    );
    const parsed = JSON.parse(fileRaw);
    const counts = [];
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      if ('canonical_items' in value) counts.push(value);
      for (const child of Object.values(value)) visit(child);
    }
    visit(parsed);
    const last = counts.at(-1);
    assert.ok(last, 'Rebuild script must report its health query');
    assert.equal(last.canonical_items, 1);
    assert.equal(last.indexed_rows, 1);
    assert.equal(last.distinct_indexed_items, 1);
    for (const key of [
      'missing_from_fts',
      'orphaned_or_deleted_in_fts',
      'duplicate_item_ids',
    ])
      assert.equal(last[key], 0, `FTS drift on ${key}`);
    const search = sql(
      `SELECT COUNT(*) AS total FROM item_search_fts WHERE item_search_fts MATCH 'bg29rebuildneedle'`,
      dir,
    );
    assert.equal(search.at(-1)?.total, 1);
    readEvidence.push(last);
  }
  console.log(
    JSON.stringify({
      event: 'bg29_fts_rebuild_twice',
      environment: 'disposable-local-wrangler-d1',
      rebuilds: readEvidence.length,
      canonical: 1,
      missing_or_duplicate_after_each: 0,
      remote_mutation: false,
    }),
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
