import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  renderStagingConfig,
  validateStagingOrigin,
  validateStagingResources,
} from './staging-guard.mjs';

const prod = readFileSync('wrangler.toml', 'utf8');
const valid = {
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  BG_STAGING_WORKER_NAME: 'recollect-flow-bg21-bg22-staging',
  BG_STAGING_D1_NAME: 'recollect-flow-bg21-bg22-staging',
  BG_STAGING_D1_ID: '11111111-2222-4333-8444-555555555555',
  BG_STAGING_R2_BUCKET: 'recollect-flow-attachments-bg21-bg22-staging',
};

test('staging generator denies missing or ambiguous account identity', () => {
  assert.throws(() => validateStagingResources({}, prod), /required/);
  assert.throws(
    () => validateStagingResources({ ...valid, CLOUDFLARE_ACCOUNT_ID: 'unknown' }, prod),
    /account identity/,
  );
});

test('staging generator rejects production Worker, D1 and R2 references', () => {
  for (const [key, value] of [
    ['BG_STAGING_WORKER_NAME', 'recollect-flow'],
    ['BG_STAGING_D1_NAME', 'recollect-flow-prod'],
    ['BG_STAGING_D1_ID', '5fcba514-d0f7-45e7-a632-d4c59233af71'],
    ['BG_STAGING_R2_BUCKET', 'recollect-flow-attachments-prod'],
  ]) {
    assert.throws(() => validateStagingResources({ ...valid, [key]: value }, prod));
  }
});

test('staging generator rejects shell/TOML injection and non-staging names', () => {
  for (const [key, value] of [
    ['BG_STAGING_WORKER_NAME', 'recollect-flow-bg21-bg22-staging"\nname = "prod'],
    ['BG_STAGING_D1_NAME', 'recollect-flow-dev'],
    ['BG_STAGING_R2_BUCKET', 'recollect_flow_staging'],
  ]) {
    assert.throws(() => validateStagingResources({ ...valid, [key]: value }, prod));
  }
});

test('output has no production binding, custom routes, cron or active external provider', () => {
  const resources = validateStagingResources(valid, prod);
  const config = renderStagingConfig(resources);
  assert.ok(config.includes('name = "recollect-flow-bg21-bg22-staging"'));
  assert.ok(config.includes('database_id = "11111111-2222-4333-8444-555555555555"'));
  assert.ok(config.includes('bucket_name = "recollect-flow-attachments-bg21-bg22-staging"'));
  assert.ok(config.includes('AI_PROVIDERS_ENABLED = ""'));
  assert.ok(config.includes('DIGEST_AI_ENABLED = "false"'));
  assert.ok(!config.includes('5fcba514-d0f7-45e7-a632-d4c59233af71'));
  assert.ok(!config.includes('recollect-flow-attachments-prod'));
  assert.ok(!config.includes('[triggers]'));
  assert.ok(!config.includes('crons ='));
  assert.ok(!config.includes('routes ='));
  assert.ok(!config.includes('TELEGRAM_BOT_TOKEN ='));
  assert.ok(!config.includes('NOTION_ACCESS_TOKEN ='));
});

test('remote staging origin must be exact distinct HTTPS worker', () => {
  const worker = valid.BG_STAGING_WORKER_NAME;
  const good = 'https://' + worker + '.recollectflow.workers.dev';
  assert.equal(validateStagingOrigin(good, worker), good);
  for (const origin of [
    'http://' + worker + '.recollectflow.workers.dev',
    'https://recollect-flow.recollectflow.workers.dev',
    'https://' + worker + '.evil.example',
    good + '/items/example',
    good + '?test=1',
    'https://user:pass@' + worker + '.recollectflow.workers.dev',
  ]) {
    assert.throws(() => validateStagingOrigin(origin, worker), origin);
  }
});
