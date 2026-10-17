import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { assessZeroCostTemplate } from './bg29-zero-cost-preflight.mjs';

const example = await readFile('wrangler.bg29-staging.example.toml', 'utf8');

test('local BG29 example stays intentionally nondeployable', () => {
  const result = assessZeroCostTemplate(example);
  assert.equal(result.local_template_safe, true, result.reasons.join(', '));
  assert.equal(result.zero_dollar_deployment_authorized, false);
  assert.equal(result.account_plan_verified, false);
  assert.equal(result.r2_billing_risk_excluded, false);
});

test('accidentally enabling scheduled triggers fails preflight', () => {
  const changed = example + '\n[triggers]\ncrons = ["17 * * * *"]\n';
  const result = assessZeroCostTemplate(changed);
  assert.equal(result.local_template_safe, false);
  assert.match(result.reasons.join(' '), /Cron triggers/);
});

test('changing D1 placeholder fails preflight', () => {
  const changed = example.replace(
    'REPLACE_AFTER_EXPLICIT_ISOLATED_STAGING_APPROVAL',
    'unsupported-nonplaceholder-id',
  );
  const result = assessZeroCostTemplate(changed);
  assert.equal(result.local_template_safe, false);
});
