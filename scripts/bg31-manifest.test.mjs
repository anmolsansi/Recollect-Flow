import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(root, 'docs/releases/BG-31_RELEASE_MANIFEST.json'), 'utf8'),
);
const config = readFileSync(join(root, 'wrangler.toml'), 'utf8');
const docs = readFileSync(
  join(root, 'docs/releases/BG-31_RELEASE_MANIFEST.md'),
  'utf8',
);

test('BG-31 manifest remains explicitly NO-GO without live release evidence', () => {
  assert.equal(manifest.schema_version, 1);
  assert.match(manifest.manifest_id, /^BG31-DRAFT-/);
  assert.equal(manifest.decision, 'NO_GO');
  assert.equal(manifest.approval_status, 'NOT_GRANTED');
  assert.equal(
    manifest.cost_boundary,
    'STRICT_ZERO_ADDITIONAL_COST_LOCAL_DEVELOPMENT_ONLY',
  );
  assert.equal(manifest.gates.bg29_078, 'DEFERRED_NOT_VERIFIED');
  assert.equal(manifest.gates.ope247, 'IN_PROGRESS');
  assert.equal(manifest.gates.bg32_production_authorized, false);
  assert.equal(manifest.gates.production_deployment_performed, false);
  assert.equal(manifest.gates.external_provider_tests_authorized, false);
  assert.equal(manifest.gates.telegram_send_authorized, false);
  assert.equal(manifest.gates.release_go, false);
  assert.equal(manifest.smoke_verified, false);
  assert.match(docs, /NO-GO for production/);
  assert.match(docs, /NOT VERIFIED/);
});

test('BG-31 does not claim fabricated artifact, migration, approval, or backup proof', () => {
  for (const value of Object.values(manifest.release_candidate)) {
    assert.equal(value, null);
  }
  assert.equal(manifest.pending_forward_migrations, null);
  assert.equal(manifest.recovery.verified_d1_backup_id, null);
  assert.equal(
    manifest.recovery.verified_independent_originals_manifest_sha256,
    null,
  );
  assert.equal(manifest.recovery.isolated_restore_test_verified, false);
  assert.equal(manifest.recovery.newest_purge_receipts_verified, false);
  assert.equal(manifest.recovery.source_loss_domain_separated, false);
  assert.equal(manifest.recovery.operator, null);
  for (const [key, value] of Object.entries(manifest.live_inventory)) {
    if (key === 'worker_version') assert.equal(value, null);
    else assert.equal(value, false, key);
  }
});

test('BG-31 ordered migration list equals actual repository migrations', () => {
  const actual = readdirSync(join(root, 'migrations'))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  assert.deepEqual(manifest.source_migrations, actual);
  assert.equal(
    manifest.source_migrations.at(-1),
    '0025_bg28_scheduled_backups.sql',
  );
});

test('BG-31 declared target names and secrets match committed Worker config', () => {
  const target = manifest.source_targets;
  assert.match(config, new RegExp('name = "' + target.worker + '"'));
  assert.match(config, new RegExp('binding = "' + target.d1_binding + '"'));
  assert.match(config, new RegExp('database_id = "' + target.d1_uuid + '"'));
  assert.match(config, new RegExp('bucket_name = "' + target.r2_bucket + '"'));
  assert.match(config, /directory = "\.\/apps\/web\/dist"/);
  for (const secret of manifest.required_secret_names) {
    assert.match(config, new RegExp('"' + secret + '"'));
  }
  const required = config.match(
    /\[secrets\][\s\S]*?required\s*=\s*\[([^\]]+)\]/,
  );
  assert.ok(required);
  const names = [...required[1].matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual([...manifest.required_secret_names].sort(), names.sort());
});

test('BG-31 source target and $0 config drift is detected', () => {
  const target = manifest.source_targets;
  assert.match(
    config,
    new RegExp('^database_name = "' + target.d1_name + '"$', 'm'),
  );
  assert.match(
    config,
    new RegExp('^binding = "' + target.r2_binding + '"$', 'm'),
  );
  assert.match(config, /^binding = "AI"$/m);
  assert.match(config, /^binding = "ASSETS"$/m);
  assert.match(config, /^name = "LOGIN_RATE_LIMITER"$/m);
  assert.match(
    config,
    new RegExp('^' + target.notion_destination_var + ' = "[^"]+"$', 'm'),
  );
  assert.match(config, /^AI_PROVIDER_DEFAULT = "openrouter"$/m);
  assert.match(config, /^AI_PROVIDERS_ENABLED = "openrouter,cloudflare"$/m);
  assert.match(config, /^DIGEST_AI_ENABLED = "false"$/m);
  assert.doesNotMatch(config, /^HOSTED_BACKUP_AUTOCREATE_ENABLED = "true"$/m);
  assert.equal(manifest.live_inventory.secret_presence_verified, false);
});

test('BG-31 stage list and release safety boundary are complete', () => {
  assert.deepEqual(
    manifest.smoke_stages,
    Array.from({ length: 11 }, (_, i) => 'S' + String(i + 1).padStart(2, '0')),
  );
  for (const id of manifest.smoke_stages) {
    assert.match(docs, new RegExp('\\b' + id + ':'));
  }
  assert.match(docs, /independent-receipts\.json/);
  assert.match(docs, /dry_run=true/);
  assert.match(docs, /cannot be represented as a fully approved/);
});

test('BG-31 manifest contains no approval or credential values', () => {
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(
    serialized,
    /(?:sk-or-|ghp_|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/,
  );
  assert.ok(!('secret_values' in manifest));
  assert.equal(
    manifest.source_targets.telegram_destination_secret_name,
    'TELEGRAM_CHAT_ID',
  );
});

test('BG-31 CI checkpoint is distinct from a frozen deployable artifact', () => {
  const checkpoint = manifest.ci_fingerprint_checkpoint;
  assert.match(checkpoint.source_sha, /^[a-f0-9]{40}$/);
  assert.equal(checkpoint.conclusion, 'success');
  assert.match(checkpoint.web_release_id, /^[a-f0-9]{64}$/);
  assert.match(checkpoint.web_release_manifest_sha256, /^[a-f0-9]{64}$/);
  assert.match(checkpoint.worker_dry_run_index_js_sha256, /^[a-f0-9]{64}$/);
  assert.equal(checkpoint.uploaded_artifact, false);
  assert.equal(checkpoint.approved_for_deployment, false);
  assert.equal(manifest.release_candidate.source_sha, null);
  assert.equal(manifest.gates.bg32_production_authorized, false);
});

test('BG-31 strict-$0 Worker config never schedules Cron or opts into hosted egress', () => {
  // No production resource, provider, billing or network probe is performed.
  assert.doesNotMatch(config, /^\s*\[triggers\]\s*$/m);
  assert.doesNotMatch(config, /^\s*crons\s*=/m);
  for (const flag of [
    'HOSTED_SCHEDULED_WORK_ENABLED',
    'HOSTED_EXTERNAL_DISPATCH_ENABLED',
    'HOSTED_HTTP_DISPATCH_ENABLED',
    'HOSTED_BACKUP_AUTOCREATE_ENABLED',
  ]) {
    assert.doesNotMatch(
      config,
      new RegExp('^\\s*' + flag + '\\s*=\\s*"?true\\b', 'm'),
      flag + ' may not opt in to live work under the strict $0 default',
    );
  }
  assert.equal(manifest.decision, 'NO_GO');
  assert.equal(manifest.gates.bg32_production_authorized, false);
});
