/* global Buffer, console */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as prettier from 'prettier';
import { releaseReadiness } from './bg31-readiness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(
  readFileSync(join(root, 'docs/releases/BG-31_RELEASE_MANIFEST.json'), 'utf8'),
);

test('offline readiness lists missing observations without claiming approval', () => {
  const report = releaseReadiness(source);
  assert.equal(report.decision, 'NO_GO');
  assert.equal(report.external_verification_performed, false);
  assert.equal(report.production_mutations_performed, false);
  assert.equal(report.approval_inferred, false);
  assert.ok(report.missing_count >= 12);
  const ids = report.missing.map((entry) => entry.id);
  assert.ok(ids.includes('READ_LIVE_WORKER'));
  assert.ok(ids.includes('READ_D1_LEDGER'));
  assert.ok(ids.includes('VERIFY_INDEPENDENT_BACKUP'));
  assert.ok(ids.includes('EXPLICIT_OWNER_AUTHORIZATION'));
});

test('source data is never independent production verification', () => {
  const edited = structuredClone(source);
  edited.release_candidate.source_sha = 'a'.repeat(40);
  edited.live_inventory.worker_version = 'manual-entry';
  edited.live_inventory.production_account_verified = true;
  const report = releaseReadiness(edited);
  assert.equal(report.decision, 'NO_GO');
  assert.equal(report.external_verification_performed, false);
  assert.equal(report.approval_inferred, false);
});

test('invalid manifest fails closed', () => {
  assert.throws(() => releaseReadiness(null), /Invalid BG-31/);
  assert.throws(() => releaseReadiness({ schema_version: 2 }), /Invalid BG-31/);
});

test('temporary formatter diagnostic', async () => {
  const code = readFileSync(join(root, 'scripts/bg31-readiness.mjs'), 'utf8');
  const formatted = await prettier.format(code, {
    filepath: 'scripts/bg31-readiness.mjs',
    singleQuote: true,
    trailingComma: 'all',
  });
  console.log('BG31_FORMATTED_BASE64=' + Buffer.from(formatted).toString('base64'));
});
