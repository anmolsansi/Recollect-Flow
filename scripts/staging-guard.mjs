/* global process, console */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT = '.bg21-staging-preview.toml';
const PRODUCTION = 'wrangler.toml';
const allowedName = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tomlValue(raw, key) {
  const match = raw.match(new RegExp('^' + key + ' = "([^"]+)"', 'm'));
  assert.ok(match, 'Expected ' + key + ' in the production configuration');
  return match[1];
}

export function validateStagingResources(values, productionToml) {
  const required = [
    'CLOUDFLARE_ACCOUNT_ID',
    'BG_STAGING_WORKER_NAME',
    'BG_STAGING_D1_NAME',
    'BG_STAGING_D1_ID',
    'BG_STAGING_R2_BUCKET',
  ];
  for (const key of required) {
    assert.ok(values[key], key + ' is required before preparing staging');
  }
  assert.match(
    values.CLOUDFLARE_ACCOUNT_ID,
    /^[0-9a-f]{32}$/i,
    'Explicit Cloudflare account identity is required',
  );
  for (const key of [
    'BG_STAGING_WORKER_NAME',
    'BG_STAGING_D1_NAME',
    'BG_STAGING_R2_BUCKET',
  ]) {
    const value = values[key];
    assert.ok(
      value.length >= 3 && value.length <= 63 && allowedName.test(value),
      key + ' must be a valid DNS-safe Cloudflare resource name',
    );
    assert.ok(value.endsWith('-staging'), key + ' must end with -staging');
  }
  assert.match(values.BG_STAGING_D1_ID, uuid, 'D1 ID must be a UUID');
  const prod = {
    worker: tomlValue(productionToml, 'name'),
    d1Name: tomlValue(productionToml, 'database_name'),
    d1Id: tomlValue(productionToml, 'database_id'),
    r2: tomlValue(productionToml, 'bucket_name'),
  };
  const bindings = [
    [values.BG_STAGING_WORKER_NAME, prod.worker, 'Worker'],
    [values.BG_STAGING_D1_NAME, prod.d1Name, 'D1 name'],
    [values.BG_STAGING_D1_ID, prod.d1Id, 'D1 ID'],
    [values.BG_STAGING_R2_BUCKET, prod.r2, 'R2 bucket'],
  ];
  for (const [staging, production, label] of bindings) {
    assert.notEqual(
      staging.toLowerCase(),
      production.toLowerCase(),
      label + ' must not be production',
    );
  }
  assert.notEqual(
    values.BG_STAGING_D1_NAME,
    values.BG_STAGING_R2_BUCKET,
    'D1 and R2 must be separately identified',
  );
  return Object.freeze({
    worker: values.BG_STAGING_WORKER_NAME,
    d1Name: values.BG_STAGING_D1_NAME,
    d1Id: values.BG_STAGING_D1_ID,
    r2: values.BG_STAGING_R2_BUCKET,
  });
}

export function renderStagingConfig(resources) {
  const value = (input) => JSON.stringify(input);
  return `# GENERATED STAGING-ONLY CONFIG. Do not edit or commit.
# Never use the production wrangler.toml for staging commands.
name = ${value(resources.worker)}
main = "apps/worker-api/src/index.ts"
compatibility_date = "2026-08-01"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]
workers_dev = true
preview_urls = false

[assets]
directory = "./apps/web/dist"
binding = "ASSETS"
not_found_handling = "none"
run_worker_first = ["/api", "/api/*", "/", "/capture", "/capture/*", "/items/*", "/assets/*"]

[[d1_databases]]
binding = "DB"
database_name = ${value(resources.d1Name)}
database_id = ${value(resources.d1Id)}
migrations_dir = "migrations"

[[r2_buckets]]
binding = "ATTACHMENTS"
bucket_name = ${value(resources.r2)}

[observability]
enabled = true

[vars]
NOTION_DATABASE_ID = ""
MAX_ATTACHMENT_BYTES = "25000000"
UPLOAD_TTL_SECONDS = "3600"
MOCK_AI_ENABLED = "false"
AI_PROVIDER_DEFAULT = "openrouter"
AI_PROVIDERS_ENABLED = ""
AI_PROVIDER_IMPLEMENTATIONS = "{}"
DIGEST_AI_ENABLED = "false"

# Staging requires synthetic-only integration credentials and an HTTPS
# staging URL as WEB_INBOX_BASE_URL. Never copy production secret values.
[secrets]
required = ["CAPTURE_TOKEN", "ADMIN_TOKEN", "LOCAL_WORKER_TOKEN", "NOTION_ACCESS_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "WEB_INBOX_BASE_URL"]
`;
}

export function validateStagingOrigin(raw, worker) {
  assert.ok(raw, 'BG_STAGING_ORIGIN is required for a hosted verification');
  const parsed = new URL(raw);
  assert.equal(parsed.protocol, 'https:', 'Staging must use HTTPS');
  assert.equal(parsed.username, '');
  assert.equal(parsed.password, '');
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.search, '');
  assert.equal(parsed.hash, '');
  assert.equal(parsed.port, '');
  assert.ok(
    parsed.hostname.startsWith(worker + '.') &&
      parsed.hostname.endsWith('.workers.dev'),
    'Staging origin must be the expected separate workers.dev Worker',
  );
  assert.notEqual(parsed.hostname, 'recollect-flow.recollectflow.workers.dev');
  return parsed.origin;
}

function main() {
  const cwd = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const prod = readFileSync(resolve(cwd, PRODUCTION), 'utf8');
  const validated = validateStagingResources(process.env, prod);
  if (process.argv[2] === 'prepare') {
    const output = resolve(cwd, OUTPUT);
    writeFileSync(output, renderStagingConfig(validated), {
      flag: 'w',
      mode: 0o600,
    });
    console.log(
      'Prepared ignored staging-only config: ' +
        OUTPUT +
        '\\nWorker: ' +
        validated.worker +
        '\\nD1: ' +
        validated.d1Name +
        '\\nR2: ' +
        validated.r2 +
        '\\nNo Cloudflare deployment or migration was performed.',
    );
  } else if (process.argv[2] === 'verify') {
    const expected = renderStagingConfig(validated);
    assert.equal(
      readFileSync(resolve(cwd, OUTPUT), 'utf8'),
      expected,
      'Generated config does not match verified staging resource identities',
    );
    console.log(
      'Staging-only binding preflight passed. Remote resources have not been inspected.',
    );
  } else if (process.argv[2] === 'origin') {
    console.log(
      validateStagingOrigin(process.env.BG_STAGING_ORIGIN, validated.worker),
    );
  } else {
    throw new Error(
      'Usage: node scripts/staging-guard.mjs prepare|verify|origin',
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error('STAGING_PRECHECK_FAILED: ' + error.message);
    process.exitCode = 1;
  }
}
