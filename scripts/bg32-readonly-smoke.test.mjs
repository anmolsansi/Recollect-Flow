import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  runReadOnlySmoke,
  validateFrozenRelease,
} from './bg32-readonly-smoke.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const approved = JSON.parse(
  readFileSync(
    join(root, 'docs/releases/BG-31_CORE_RELEASE_2026-11-03.json'),
    'utf8',
  ),
);

function fixtureResponse(path, overrides = {}) {
  let status = 200;
  let type = 'text/html; charset=utf-8';
  let cache = 'no-cache, must-revalidate';
  let json = {};
  if (path === '/api/v1/health') {
    type = 'application/json';
    cache = 'private, no-store';
    json = { data: { status: 'ok' } };
  } else if (path.startsWith('/api/v1/items/')) {
    status = 403;
    type = 'application/json';
    cache = 'private, no-store';
  } else if (path === '/api/v1/bg32-readonly-no-route') {
    status = 404;
    type = 'application/json';
    cache = 'private, no-store';
  } else if (path.startsWith('/assets/')) {
    status = 404;
    type = 'text/plain';
    cache = 'no-store';
  } else if (path === '/release-manifest.json') {
    type = 'application/json';
    json = {
      release_id: approved.candidate.web_release_id,
      source_revision: approved.candidate.source_sha,
    };
  }
  return {
    status: overrides.status ?? status,
    redirected: overrides.redirected ?? false,
    headers: {
      get(name) {
        if (name === 'content-type') return overrides.contentType ?? type;
        if (name === 'cache-control') return overrides.cacheControl ?? cache;
        return null;
      },
    },
    async json() {
      return overrides.json ?? json;
    },
  };
}

function fakeFetch(overrides = {}) {
  const calls = [];
  async function send(url, opts) {
    const path = new URL(url).pathname;
    calls.push({ path, opts });
    if (overrides.throwPath === path)
      throw new Error('synthetic transport failure');
    return fixtureResponse(path, overrides.responses?.[path] ?? {});
  }
  return { send, calls };
}

test('reuses exact approved identity and rejects alternate origins', () => {
  const target = validateFrozenRelease(approved);
  assert.equal(target.origin, approved.deployment.origin);
  assert.equal(
    target.historical_worker_version,
    approved.deployment.version_id,
  );
  assert.throws(
    () => validateFrozenRelease(approved, 'https://wrong.example'),
    /must match/,
  );
  assert.throws(
    () =>
      validateFrozenRelease({
        ...approved,
        deployment: { ...approved.deployment, provider_dispatch_enabled: true },
      }),
    /Provider dispatch/,
  );
  assert.throws(
    () =>
      validateFrozenRelease({
        ...approved,
        approval: { ...approved.approval, scope_exceptions_accepted: false },
      }),
    /owner decision/,
  );
});

test('rejects substituted packet, frozen source, and Web release identity', () => {
  for (const altered of [
    { ...approved, revision: 'BG31-CORE-OTHER' },
    {
      ...approved,
      approval: { ...approved.approval, approved_packet_sha256: '0'.repeat(64) },
    },
    {
      ...approved,
      candidate: { ...approved.candidate, source_sha: 'a'.repeat(40) },
    },
    {
      ...approved,
      candidate: { ...approved.candidate, web_release_id: 'b'.repeat(64) },
    },
  ]) {
    assert.throws(() => validateFrozenRelease(altered), {
      name: 'AssertionError',
    });
  }
});

test('rejects substituted deployment, storage, and scheduling identities', () => {
  const fields = {
    account_id: 'wrong-account',
    d1_name: 'wrong-d1',
    d1_uuid: '00000000-0000-0000-0000-000000000000',
    r2_bucket: 'wrong-r2',
    r2_access: 'PUBLIC',
    version_id: '00000000-0000-0000-0000-000000000000',
    deployment_id: '00000000-0000-0000-0000-000000000000',
    migration_count: 21,
    cron: ['* * * * *'],
  };
  for (const [field, value] of Object.entries(fields)) {
    const changed = {
      ...approved,
      deployment: { ...approved.deployment, [field]: value },
    };
    assert.throws(() => validateFrozenRelease(changed), {
      name: 'AssertionError',
    }, `Field must be pinned: ${field}`);
  }
});

test('public smoke uses GET-only requests with no credential headers or mutations', async () => {
  const { send, calls } = fakeFetch();
  const result = await runReadOnlySmoke(approved, { fetchImpl: send });
  assert.equal(result.decision, 'PUBLIC_BOUNDARIES_PASS_NOT_RELEASE_GO');
  assert.equal(result.stages.length, 7);
  assert.equal(result.production_mutations_performed, false);
  assert.equal(result.owner_device_verified, false);
  assert.equal(result.full_v1_accepted, false);
  assert.ok(calls.every(({ opts }) => opts.method === 'GET'));
  assert.ok(
    calls.every(
      ({ opts }) => opts.credentials === 'omit' && opts.redirect === 'manual',
    ),
  );
  assert.ok(
    calls.every(({ opts }) => !('headers' in opts) && !('body' in opts)),
  );
});

test('failure on public route short-circuits without further network activity', async () => {
  const { send, calls } = fakeFetch({ responses: { '/': { status: 503 } } });
  const result = await runReadOnlySmoke(approved, { fetchImpl: send });
  assert.equal(result.decision, 'STOP');
  assert.equal(result.stages.at(-1).stage, 'homepage');
  assert.equal(calls.length, 2);
});

test('rejects redirected responses, unsafe private caching, and anonymous success', async () => {
  for (const responses of [
    { '/api/v1/health': { redirected: true } },
    { '/api/v1/health': { cacheControl: 'public, max-age=300' } },
    { '/api/v1/items/bg32-readonly-route-probe': { status: 200 } },
    { '/assets/bg32-missing-aBcD1234.js': { contentType: 'text/html' } },
  ]) {
    const result = await runReadOnlySmoke(approved, {
      fetchImpl: fakeFetch({ responses }).send,
    });
    assert.equal(result.decision, 'STOP');
    assert.ok(result.stages.some((stage) => stage.status === 'failed'));
  }
});

test('rejects wrong published Web revision and reports transport failure without proceeding', async () => {
  const wrong = fakeFetch({
    responses: {
      '/release-manifest.json': {
        json: {
          release_id: 'a'.repeat(64),
          source_revision: approved.candidate.source_sha,
        },
      },
    },
  });
  const release = await runReadOnlySmoke(approved, { fetchImpl: wrong.send });
  assert.equal(release.decision, 'STOP');
  assert.equal(release.stages.at(-1).stage, 'published-web-release');

  const unavailable = fakeFetch({ throwPath: '/api/v1/health' });
  const health = await runReadOnlySmoke(approved, {
    fetchImpl: unavailable.send,
  });
  assert.equal(health.decision, 'STOP');
  assert.equal(unavailable.calls.length, 1);
});
