/* global Response, URL */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { percentileNearestRank, requireLocalOrigin, runCaptureBench } from './bg29-capture-bench.mjs';

test('nearest rank sorts samples and never averages away the slowest 5%', () => {
  assert.equal(percentileNearestRank([95, 3, 10, 5, 1], 0.5), 5);
  assert.equal(percentileNearestRank([95, 3, 10, 5, 1], 0.95), 95);
  assert.throws(() => percentileNearestRank([], 0.95), /sample/);
  assert.throws(() => percentileNearestRank([-1], 0.95), /finite/);
});

test('only local HTTP origins are accepted, never production or embedded credentials', () => {
  assert.equal(requireLocalOrigin('http://127.0.0.1:8787/'), 'http://127.0.0.1:8787');
  for (const url of [
    'https://127.0.0.1:8787/',
    'https://production.example.com/',
    'http://192.0.2.99/',
    'http://user:password@localhost:8787/',
    'http://localhost:8787/api',
  ]) assert.throws(() => requireLocalOrigin(url), /local HTTP origin/);
});

test('samples only acknowledgment, then checks persisted raw phrase via admin search', async () => {
  const saved = new Map();
  let clock = 0;
  let inspected = 0;
  const transport = async (url, options) => {
    const path = new URL(url);
    if (path.pathname === '/api/v1/captures') {
      const body = JSON.parse(options.body);
      assert.equal(body.privacy_level, 'sensitive');
      assert.match(body.shared_text, /Isolated synthetic capture/);
      assert.match(options.headers.Authorization, /^Bearer bg29-capture-token$/);
      const id = 'test-id-' + saved.size;
      saved.set(id, body.shared_text);
      return new Response(JSON.stringify({ data: { capture_id: id, status: 'saved', replayed: false } }), { status: 201 });
    }
    assert.equal(path.pathname, '/api/v1/search');
    assert.equal(options.headers.Authorization, 'Bearer bg29-admin-token');
    inspected += 1;
    const text = path.searchParams.get('q');
    return new Response(JSON.stringify({ data: [...saved].filter(([, value]) => value.includes(text)).map(([id]) => ({ id })) }), { status: 200 });
  };
  const report = await runCaptureBench({
    origin: 'http://127.0.0.1:8787',
    captureToken: 'bg29-capture-token',
    adminToken: 'bg29-admin-token',
    count: 4,
    concurrency: 2,
    batchIntervalMs: 1,
    fetchImpl: transport,
    now: () => (clock += 10),
    sleep: async () => {},
  });
  assert.equal(report.count, 4);
  assert.equal(saved.size, 4);
  assert.equal(inspected, 1);
  assert.equal(report.capture_ack_ms.p95, 20);
  assert.equal(report.upload_included, false);
  assert.equal(report.provider_cost_verified, false);
  assert.equal(report.meets_local_target, true);
});

test('fails closed on bad acknowledgment and does not report a passing sample', async () => {
  await assert.rejects(
    runCaptureBench({
      origin: 'http://localhost:8787',
      captureToken: 'capture',
      adminToken: 'admin',
      count: 1,
      fetchImpl: async () => new Response('{}', { status: 503 }),
    }),
    /HTTP 503/,
  );
});

test('fails closed when acknowledged raw item is missing from search', async () => {
  let calls = 0;
  await assert.rejects(
    runCaptureBench({
      origin: 'http://localhost:8787',
      captureToken: 'capture',
      adminToken: 'admin',
      count: 1,
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify(calls === 1
          ? { data: { status: 'saved', capture_id: 'synthetic', replayed: false } }
          : { data: [] }), { status: calls === 1 ? 201 : 200 });
      },
    }),
    /did not retrieve/,
  );
});

test('bounds caller-supplied rate and count to prevent accidental uncontrolled load', async () => {
  for (const options of [
    { count: 201 },
    { count: 0 },
    { concurrency: 6 },
    { batchIntervalMs: 0 },
  ]) {
    await assert.rejects(
      runCaptureBench({ origin: 'http://localhost:8787', captureToken: 'a', adminToken: 'b', ...options }),
      /Invalid/,
    );
  }
});
