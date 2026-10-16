/* global fetch, AbortSignal, setTimeout, performance, URL */
/**
 * BG-29 synthetic capture-acknowledgment benchmark.
 * localhost only. No uploads, external providers, production or personal data.
 */
import { randomUUID } from 'node:crypto';

export function percentileNearestRank(samples, fraction) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error('At least one measured sample is required');
  }
  if (
    !(fraction > 0 && fraction <= 1) ||
    samples.some((n) => !Number.isFinite(n) || n < 0)
  ) {
    throw new Error('Samples and percentile must be finite and nonnegative');
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return (
    Math.round(sorted[Math.ceil(fraction * sorted.length) - 1] * 100) / 100
  );
}

export function requireLocalOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'BG-29 benchmark accepts only a local HTTP origin without credentials or paths',
    );
  }
  return url.origin;
}

function positiveInteger(value, max, name) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`Invalid ${name}: expected integer from 1 to ${max}`);
  }
  return value;
}

export async function runCaptureBench({
  origin,
  captureToken,
  adminToken,
  count = 20,
  concurrency = 2,
  batchIntervalMs = 1000,
  fetchImpl = fetch,
  now = () => performance.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const base = requireLocalOrigin(origin);
  positiveInteger(count, 200, 'count');
  positiveInteger(concurrency, 5, 'concurrency');
  positiveInteger(batchIntervalMs, 5000, 'batchIntervalMs');
  if (
    typeof captureToken !== 'string' ||
    !captureToken ||
    typeof adminToken !== 'string' ||
    !adminToken
  ) {
    throw new Error('Synthetic capture and search tokens are required');
  }

  const sampleMs = [];
  const runId = randomUUID().replaceAll('-', '');
  let sampleSearch = null;
  const runStart = now();

  async function capture(index) {
    const marker = `bg29zephyr${runId}${index}`;
    const body = {
      idempotency_key: `bg29-${runId}-${index}`,
      source_type: index % 2 === 0 ? 'text' : 'note',
      source_app: 'BG-29 synthetic bench',
      shared_text: `Isolated synthetic capture ${marker} preserves search and raw input.`,
      privacy_level: 'sensitive',
      captured_at: new Date().toISOString(),
      client: { name: 'bg29', version: '1.0' },
    };
    const start = now();
    const response = await fetchImpl(`${base}/api/v1/captures`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${captureToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const elapsed = now() - start;
    if (response.status !== 201) {
      throw new Error(`Capture ${index} failed with HTTP ${response.status}`);
    }
    const result = await response.json();
    if (
      result?.data?.status !== 'saved' ||
      !result?.data?.capture_id ||
      result?.data?.replayed
    ) {
      throw new Error(
        `Capture ${index} lacked a durable new-item acknowledgment`,
      );
    }
    sampleMs.push(elapsed);
    if (index === 0) sampleSearch = { marker, id: result.data.capture_id };
  }

  // Deliberately bounded arrival pattern; capture durations exclude search/launch.
  for (let index = 0; index < count; index += concurrency) {
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, count - index) },
        (_, offset) => capture(index + offset),
      ),
    );
    if (index + concurrency < count) await sleep(batchIntervalMs);
  }

  const searchStart = now();
  const searchResponse = await fetchImpl(
    `${base}/api/v1/search?q=${encodeURIComponent(sampleSearch.marker)}&limit=10`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (searchResponse.status !== 200) {
    throw new Error(
      `Search verification failed with HTTP ${searchResponse.status}`,
    );
  }
  const searched = await searchResponse.json();
  if (!searched?.data?.some((item) => item.id === sampleSearch.id)) {
    throw new Error(
      'Search did not retrieve the acknowledged synthetic capture',
    );
  }
  const searchMs = now() - searchStart;
  const p50 = percentileNearestRank(sampleMs, 0.5);
  const p95 = percentileNearestRank(sampleMs, 0.95);
  return {
    scenario: 'BG-29 sensitive text/note isolated capture acknowledgment',
    environment: 'local-http-worker',
    count,
    concurrency,
    batch_interval_ms: batchIntervalMs,
    warmup_count: 0,
    failures: 0,
    duration_ms: Math.round((now() - runStart) * 100) / 100,
    capture_ack_ms: {
      p50,
      p95,
      min: percentileNearestRank(sampleMs, 1 / count),
      max: percentileNearestRank(sampleMs, 1),
    },
    search_verification_ms: Math.round(searchMs * 100) / 100,
    target_p95_ms: 2000,
    meets_local_target: p95 <= 2000,
    upload_included: false,
    provider_cost_verified: false,
    production_latency_verified: false,
  };
}
