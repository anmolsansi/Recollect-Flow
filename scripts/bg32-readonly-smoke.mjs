/* global console, fetch, process, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recordPath = join(root, 'docs/releases/BG-31_CORE_RELEASE_2026-11-03.json');
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function validateFrozenRelease(record, originOverride) {
  assert.equal(record?.schema_version, 1, 'Invalid BG-31 core record version.');
  assert.equal(record?.scope, 'CORE_ONLY_FRESH_INSTALL', 'Unexpected release scope.');
  assert.equal(record?.approval?.scope_exceptions_accepted, true, 'Missing recorded owner decision.');
  assert.match(record?.candidate?.source_sha ?? '', sha40, 'Invalid frozen source SHA.');
  assert.match(record?.candidate?.web_release_id ?? '', sha64, 'Invalid Web release ID.');
  assert.match(record?.deployment?.version_id ?? '', uuid, 'Invalid deployed Worker version ID.');
  assert.equal(record?.deployment?.worker, 'recollect-flow', 'Wrong release Worker.');
  assert.equal(record?.deployment?.migration_ledger_verified, true, 'Historical migration proof absent.');
  assert.equal(record?.deployment?.provider_dispatch_enabled, false, 'Provider dispatch was not disabled in the approved scope.');
  const raw = record?.deployment?.origin;
  assert.equal(typeof raw, 'string', 'Missing recorded deployment origin.');
  const parsed = new URL(raw);
  assert.equal(parsed.protocol, 'https:', 'Production read-only smoke requires HTTPS.');
  assert.equal(parsed.username, '', 'User info is forbidden in release origin.');
  assert.equal(parsed.password, '', 'User info is forbidden in release origin.');
  assert.equal(parsed.pathname, '/', 'Release origin must not contain a path.');
  assert.equal(parsed.search, '', 'Release origin must not contain query parameters.');
  assert.equal(parsed.hash, '', 'Release origin must not contain a fragment.');
  assert.equal(raw, parsed.origin, 'Release origin must be canonical.');
  assert.equal(parsed.hostname, 'recollect-flow.openclawneutron.workers.dev', 'Unapproved deployment hostname.');
  if (originOverride !== undefined) {
    assert.equal(originOverride, raw, 'BG32_ORIGIN must match the approved release origin exactly.');
  }
  return {
    origin: parsed.origin,
    frozen_source_sha: record.candidate.source_sha,
    approved_web_release_id: record.candidate.web_release_id,
    historical_worker_version: record.deployment.version_id,
  };
}

function checkResponse(response, expectedStatus, expectedType, cachePolicy) {
  assert.equal(response.status, expectedStatus, 'Unexpected HTTP status.');
  assert.equal(response.redirected, false, 'Redirects are not accepted.');
  const type = response.headers.get('content-type') ?? '';
  assert.match(type, expectedType, 'Unexpected content type.');
  if (cachePolicy) {
    assert.equal(response.headers.get('cache-control'), cachePolicy, 'Unsafe cache policy.');
  }
}

export async function runReadOnlySmoke(record, options = {}) {
  const target = validateFrozenRelease(record, options.originOverride);
  const send = options.fetchImpl ?? fetch;
  const results = [];
  const steps = [
    { name: 'health', path: '/api/v1/health', status: 200, type: /application\/json/, cache: 'private, no-store' },
    { name: 'homepage', path: '/', status: 200, type: /text\/html/, cache: 'no-cache, must-revalidate' },
    { name: 'direct-item-shell', path: '/items/bg32-readonly-route-probe', status: 200, type: /text\/html/, cache: 'no-cache, must-revalidate' },
    { name: 'anonymous-private-api-denial', path: '/api/v1/items/bg32-readonly-route-probe', status: null, type: /application\/json/, cache: 'private, no-store' },
    { name: 'unknown-api-json-404', path: '/api/v1/bg32-readonly-no-route', status: 404, type: /application\/json/, cache: 'private, no-store' },
    { name: 'missing-asset-404', path: '/assets/bg32-missing-aBcD1234.js', status: 404, type: null, cache: null },
    { name: 'published-web-release', path: '/release-manifest.json', status: 200, type: /application\/json/, cache: null },
  ];
  for (const step of steps) {
    try {
      const response = await send(target.origin + step.path, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
        credentials: 'omit',
      });
      // Accept either unauthenticated denial variant but never a success or redirect.
      const expected = step.status === null ? response.status : step.status;
      if (step.status === null) {
        assert.ok([401, 403].includes(expected), 'Anonymous private API was not denied.');
      }
      if (step.type) {
        checkResponse(response, expected, step.type, step.cache);
      } else {
        assert.equal(response.status, expected, 'Missing asset was not 404.');
        assert.equal(response.redirected, false, 'Unexpected missing-asset redirect.');
        assert.doesNotMatch(response.headers.get('content-type') ?? '', /text\/html/, 'Missing asset must not serve SPA HTML.');
      }
      if (step.name === 'health') {
        const body = await response.json();
        assert.equal(body?.data?.status, 'ok', 'Health payload was not ok.');
      }
      if (step.name === 'published-web-release') {
        const body = await response.json();
        assert.equal(body?.release_id, target.approved_web_release_id, 'Web release ID differs from the approved deployed artifact.');
        assert.equal(body?.source_revision, target.frozen_source_sha, 'Published Web source differs from frozen approval.');
      }
      results.push({ stage: step.name, status: 'passed', http_status: response.status });
    } catch (error) {
      // Intentionally do not print response bodies, identifiers from paths, or credentials.
      results.push({ stage: step.name, status: 'failed', reason: error instanceof Error ? error.message.slice(0, 180) : 'Unknown verification failure' });
      return {
        task: 'BG-32',
        mode: 'READ_ONLY_PUBLIC_HTTP',
        decision: 'STOP',
        target_origin: target.origin,
        historical_worker_version: target.historical_worker_version,
        production_mutations_performed: false,
        authenticated_platform_inventory_verified: false,
        owner_device_verified: false,
        full_v1_accepted: false,
        stages: results,
      };
    }
  }
  return {
    task: 'BG-32',
    mode: 'READ_ONLY_PUBLIC_HTTP',
    decision: 'PUBLIC_BOUNDARIES_PASS_NOT_RELEASE_GO',
    target_origin: target.origin,
    historical_worker_version: target.historical_worker_version,
    production_mutations_performed: false,
    authenticated_platform_inventory_verified: false,
    owner_device_verified: false,
    full_v1_accepted: false,
    stages: results,
  };
}

const calledDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (calledDirectly) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/bg32-readonly-smoke.mjs');
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    const report = await runReadOnlySmoke(record, { originOverride: process.env.BG32_ORIGIN });
    console.log(JSON.stringify(report, null, 2));
    if (report.decision === 'STOP') process.exitCode = 1;
  } catch (error) {
    console.error('BG32_READONLY_PREFLIGHT_FAILED ' + (error instanceof Error ? error.message : 'Invalid release record.'));
    process.exitCode = 1;
  }
}
