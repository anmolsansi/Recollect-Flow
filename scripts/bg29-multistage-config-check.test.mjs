import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateBg29MultistageConfig } from './bg29-multistage-config-check.mjs';

const original = readFileSync('wrangler.bg29-multistage-staging.toml', 'utf8');

test('safe staging config is only eligible for an offline dry-run', () => {
  assert.deepEqual(validateBg29MultistageConfig(original), {
    safeForOfflineDryRun: true,
    deploymentAuthorized: false,
    r2BucketProvisioned: false,
    cronEnabled: false,
  });
});

test('deny a Cron, even if someone adds it to the existing staging config', () => {
  assert.throws(
    () =>
      validateBg29MultistageConfig(
        original.replace('crons = []', 'crons = ["17 * * * *"]'),
      ),
    /BG29_STAGING_CONFIG_DENIED/,
  );
  assert.throws(
    () =>
      validateBg29MultistageConfig(
        original.replace('[triggers]\ncrons = []', ''),
      ),
    /BG29_STAGING_CONFIG_DENIED/,
  );
});

test('deny production D1, production R2, real AI and routes', () => {
  const badConfigs = [
    `${original}\n[[d1_databases]]\nbinding = "OTHER"\ndatabase_name = "new-production"\ndatabase_id = "76bd35c6-c833-4987-a47e-6aa8238bb832"\n`,
    original.replace(
      'b5cbeccc-92fb-4bbc-9597-f0174b84e57d',
      '5fcba514-d0f7-45e7-a632-d4c59233af71',
    ),
    original.replace(
      'bg29-multistage-r2-not-created-do-not-deploy',
      'recollect-flow-attachments-prod',
    ),
    original.replace('{"openrouter":"mock"}', '{"openrouter":"openrouter"}'),
    `${original}\nroutes = ["example.com/*"]\n`,
    `${original}\nNOTION_ACCESS_TOKEN = "secret"\n`,
    original.replace(
      'main = "apps/worker-api/src/bg29-staging-entry.ts"',
      'main = "apps/worker-api/src/index.ts"',
    ),
  ];
  for (const bad of badConfigs) {
    assert.throws(
      () => validateBg29MultistageConfig(bad),
      /BG29_STAGING_CONFIG_DENIED/,
    );
  }
});

test('deny missing or changed staging isolation switches', () => {
  for (const name of [
    'workers_dev = false',
    'preview_urls = false',
    'MOCK_AI_ENABLED = "true"',
    'HOSTED_BACKUP_AUTOCREATE_ENABLED = "false"',
  ]) {
    assert.throws(
      () => validateBg29MultistageConfig(original.replace(name, '')),
      /BG29_STAGING_CONFIG_DENIED/,
    );
  }
});
