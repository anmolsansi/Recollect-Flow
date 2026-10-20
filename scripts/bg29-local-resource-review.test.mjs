import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reviewBg29LocalResourceProfile } from './bg29-local-resource-review.mjs';

function sample() {
  return {
    event: 'bg29_local_workerd_isolate_resource_profile',
    environment: 'wrangler-dev-local-workerd-isolate-inspector',
    hosted_bindings_used: false,
    external_provider_calls: 0,
    near_limit_upload_bytes: 25_000_000,
    upload_wall_ms: 280.59,
    measured_window_wall_ms: 310,
    v8_heap_before_bytes: 2_000_000,
    v8_heap_after_bytes: 3_000_000,
    v8_heap_peak_observed_bytes: 7_383_656,
    heap_sample_count: 7,
    cpu_samples: 20,
    sampled_window_ms: 400,
    sampled_non_idle_ms: 312.56,
  };
}

test('local heap/CPU profile is valid but never certifies hosted 10ms Cron CPU', () => {
  const result = reviewBg29LocalResourceProfile(sample());
  assert.equal(result.local_resource_profile_valid, true, result.errors.join('; '));
  assert.equal(result.hosted_cron_cpu_budget_verified, false);
  assert.equal(result.hosted_memory_limit_verified, false);
  assert.equal(result.worker_free_cron_cpu_budget_ms, 10);
  assert.equal(
    result.cpu_metric_type,
    'local_sampled_non_idle_activity_not_billed_cron_cpu',
  );
});

test('rejects fabricated or absent measured CPU/heap metrics', () => {
  for (const modify of [
    (row) => (row.cpu_samples = 0),
    (row) => (row.heap_sample_count = 0),
    (row) => (row.sampled_non_idle_ms = Infinity),
    (row) => (row.sampled_non_idle_ms = 500),
    (row) => (row.v8_heap_peak_observed_bytes = 100),
    (row) => (row.upload_wall_ms = -1),
    (row) => (row.measured_window_wall_ms = NaN),
  ]) {
    const profile = sample();
    modify(profile);
    assert.equal(reviewBg29LocalResourceProfile(profile).local_resource_profile_valid, false);
  }
});

test('rejects hosted bindings, real egress and wrong test size', () => {
  for (const modify of [
    (row) => (row.hosted_bindings_used = true),
    (row) => (row.external_provider_calls = 1),
    (row) => (row.near_limit_upload_bytes = 1_000_000),
    (row) => (row.environment = 'hosted'),
  ]) {
    const profile = sample();
    modify(profile);
    assert.equal(reviewBg29LocalResourceProfile(profile).local_resource_profile_valid, false);
  }
});
