import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
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
  assert.ok(!ids.includes('READ_D1_LEDGER'));
  const withoutLedger = JSON.parse(JSON.stringify(source));
  withoutLedger.live_inventory.d1_ledger_verified = false;
  assert.ok(
    releaseReadiness(withoutLedger).missing.some(
      (entry) => entry.id === 'READ_D1_LEDGER',
    ),
  );
  assert.ok(ids.includes('VERIFY_INDEPENDENT_BACKUP'));
  assert.ok(ids.includes('EXPLICIT_OWNER_AUTHORIZATION'));
});

test('source data is never independent production verification', () => {
  const edited = JSON.parse(JSON.stringify(source));
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

test('metered R2 acceptance alone does not satisfy cost-plan review', () => {
  const manifest = JSON.parse(JSON.stringify(source));
  const missingCost = () =>
    releaseReadiness(manifest).missing.some(
      (entry) => entry.id === 'CONFIRM_FINANCIAL_BOUNDARY',
    );
  assert.equal(missingCost(), true);
  manifest.gates.r2_cost_plan_approved = true;
  assert.equal(missingCost(), true);
  manifest.gates.workers_plan_confirmed = true;
  assert.equal(missingCost(), false);
  assert.equal(releaseReadiness(manifest).decision, 'NO_GO');
});
