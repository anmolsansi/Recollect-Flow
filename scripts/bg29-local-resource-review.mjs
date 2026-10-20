/**
 * Classification of the BG-29 near-limit local Workerd upload measurement.
 * The sampled non-idle duration is never Cloudflare billed Cron CPU time;
 * a local upload profile cannot certify the 10ms Workers Free Cron limit.
 */
export function reviewBg29LocalResourceProfile(profile) {
  const errors = [];
  const fail = (okay, reason) => {
    if (!okay) errors.push(reason);
  };
  const nonnegative = (value) => Number.isFinite(value) && value >= 0;
  const positiveCount = (value) => Number.isSafeInteger(value) && value > 0;

  fail(
    profile?.event === 'bg29_local_workerd_isolate_resource_profile' &&
      profile?.environment === 'wrangler-dev-local-workerd-isolate-inspector',
    'Measurement must come from the isolated local Workerd inspector',
  );
  fail(
    profile?.hosted_bindings_used === false &&
      profile?.external_provider_calls === 0,
    'No hosted bindings or provider requests are permitted',
  );
  fail(
    profile?.near_limit_upload_bytes === 25_000_000,
    'Measurement must use the configured 25MB near-limit upload',
  );
  for (const key of [
    'upload_wall_ms',
    'measured_window_wall_ms',
    'v8_heap_before_bytes',
    'v8_heap_after_bytes',
    'v8_heap_peak_observed_bytes',
    'sampled_window_ms',
    'sampled_non_idle_ms',
  ]) {
    fail(nonnegative(profile?.[key]), 'Invalid local measurement: ' + key);
  }
  for (const key of ['cpu_samples', 'heap_sample_count']) {
    fail(positiveCount(profile?.[key]), 'Missing local samples: ' + key);
  }
  fail(
    nonnegative(profile?.v8_heap_peak_observed_bytes) &&
      profile.v8_heap_peak_observed_bytes >= profile.v8_heap_before_bytes &&
      profile.v8_heap_peak_observed_bytes >= profile.v8_heap_after_bytes,
    'Observed peak V8 heap cannot be below its sampled endpoints',
  );
  fail(
    nonnegative(profile?.sampled_non_idle_ms) &&
      profile.sampled_non_idle_ms <= profile.sampled_window_ms,
    'Sampled non-idle activity must not exceed sampled CPU window',
  );

  return {
    local_resource_profile_valid: errors.length === 0,
    hosted_cron_cpu_budget_verified: false,
    hosted_memory_limit_verified: false,
    worker_free_cron_cpu_budget_ms: 10,
    // A 25MB upload profile is not a scheduled handler profile; do not
    // compare sampled non-idle duration to the billed Cron CPU budget.
    cpu_metric_type: 'local_sampled_non_idle_activity_not_billed_cron_cpu',
    errors,
  };
}
