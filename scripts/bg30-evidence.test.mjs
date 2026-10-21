import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = new URL(
  '../docs/verification/BG-30_RELEASE_MATRIX.json',
  import.meta.url,
);
const matrix = JSON.parse(readFileSync(source, 'utf8'));
const shaPattern = /^[0-9a-f]{40}$/;
const requiredColumns = [
  'id',
  'capability',
  'implemented',
  'local_test',
  'ci_evidence',
  'deployed_version',
  'production_evidence',
  'device_evidence',
  'remaining_gate',
  'accepted_limitation',
  'source_sha',
  'historical_evidence',
];

test('BG-30 evidence rows are explicit and uniquely identified', () => {
  assert.equal(matrix.schema_version, 1);
  assert.match(matrix.baseline_sha, shaPattern);
  assert.deepEqual(
    new Set(matrix.capabilities.map((entry) => entry.id)).size,
    matrix.capabilities.length,
  );
  assert.ok(matrix.capabilities.length >= 12);
  for (const row of matrix.capabilities) {
    for (const column of requiredColumns) {
      assert.ok(Object.hasOwn(row, column), row.id + ' missing ' + column);
    }
    assert.ok(['YES', 'NO', 'PARTIAL'].includes(row.implemented), row.id);
    assert.ok(row.remaining_gate?.trim(), row.id);
    if (row.source_sha !== null) {
      assert.match(row.source_sha, shaPattern, row.id);
    }
  }
});

test('unverified deployments cannot become production claims', () => {
  for (const row of matrix.capabilities) {
    if (row.deployed_version === null) {
      assert.equal(row.production_evidence, 'NOT_VERIFIED', row.id);
    }
    assert.notEqual(row.production_evidence, 'VERIFIED', row.id);
  }
  assert.equal(matrix.bg29_078, 'DEFERRED_NOT_VERIFIED');
  assert.equal(
    matrix.cost_permission,
    'STRICT_ZERO_ADDITIONAL_COST_LOCAL_DEVELOPMENT_ONLY',
  );
});

test('a local-worker API does not claim runnable Ollama acceptance', () => {
  const localClient = matrix.capabilities.find((row) => row.id === 'Ollama-client');
  assert.ok(localClient);
  assert.equal(localClient.implemented, 'NO');
  assert.equal(localClient.local_test, 'NOT_VERIFIED');
  assert.equal(localClient.deployed_version, null);
  const bg29 = matrix.capabilities.find((row) => row.id === 'BG-29');
  assert.match(bg29.remaining_gate, /BG-29\.078/);
});
