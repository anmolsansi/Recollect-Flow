/* global process, console, URL */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderStagingConfig,
  validateStagingOrigin,
  validateStagingResources,
} from './staging-guard.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try {
  const prod = readFileSync(resolve(root, 'wrangler.toml'), 'utf8');
  const resources = validateStagingResources(process.env, prod);
  const prepared = readFileSync(
    resolve(root, '.bg21-staging-preview.toml'),
    'utf8',
  );
  assert.equal(
    prepared,
    renderStagingConfig(resources),
    'Refusing hosted test: staging config differs from independently checked bindings',
  );
  assert.equal(
    process.env.BG_STAGING_BINDINGS_CONFIRMED,
    'yes',
    'Inspect Cloudflare dashboard resource bindings and set BG_STAGING_BINDINGS_CONFIRMED=yes only after confirming D1/R2 isolation',
  );
  const origin = validateStagingOrigin(
    process.env.BG_STAGING_ORIGIN,
    resources.worker,
  );
  if (process.env.BG21_PREVIEW_ORIGIN) {
    assert.equal(
      process.env.BG21_PREVIEW_ORIGIN,
      origin,
      'Explicit preview origin conflicts with the approved staging Worker',
    );
  }
  assert.ok(
    process.env.BG21_PREVIEW_ADMIN_TOKEN,
    'A separately managed staging ADMIN_TOKEN is required (never commit it)',
  );

  const manifest = JSON.parse(
    readFileSync(resolve(root, 'apps/web/dist/release-manifest.json'), 'utf8'),
  );
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  assert.equal(
    manifest.source_revision,
    head,
    'Rebuild release:package for the exact checked staging source revision',
  );

  const result = spawnSync(
    process.execPath,
    ['scripts/verify-remote-hosting.mjs'],
    {
      cwd: root,
      env: { ...process.env, BG21_PREVIEW_ORIGIN: origin },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    'Hosted isolated HTTPS acceptance failed: BG-21 stays open',
  );
  const browser = spawnSync(
    process.execPath,
    ['scripts/verify-browser-creation.mjs', '--hosted-staging'],
    {
      cwd: root,
      env: { ...process.env, BG_STAGING_ORIGIN: origin },
      stdio: 'inherit',
    },
  );
  if (browser.error) throw browser.error;
  assert.equal(
    browser.status,
    0,
    'Five-source hosted browser acceptance failed: BG-22 stays open',
  );
  console.log(
    'Authorized BG-21 HTTPS and BG-22 five-source staging checks passed. ' +
      'BG-21 release rollback/cache and BG-22 extracted-text/provider-retry gates remain.',
  );
} catch (error) {
  console.error(
    'BG21_STAGING_HOSTED_VERIFY_BLOCKED: ' +
      (error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
}
