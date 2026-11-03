import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assessBg29HourlyEvidence } from './bg29-hourly-evidence-check.mjs';

function fixture() {
  return {
    kind: 'bg29_cloudflare_real_hourly_cron',
    account_verified: true,
    worker_name: 'recollect-flow-bg29-staging',
    git_sha: 'a'.repeat(40),
    cron: '17 * * * *',
    providers_mocked: true,
    external_provider_calls: 0,
    additional_cost_usd: 0,
    evidence_url: 'https://example.invalid/independent-cloudflare-log',
    scope: 'd1_only',
    sweeps: [
      {
        cloudflare_event_id: 'fixture-event-1',
        scheduled_at: '2026-10-16T04:17:00.000Z',
        observed_at: '2026-10-16T04:17:30.000Z',
        originals: 24,
        pending: 14,
        processing: 0,
        retry: 0,
        failed: 0,
        notion_attempts: 10,
      },
      {
        cloudflare_event_id: 'fixture-event-2',
        scheduled_at: '2026-10-16T05:17:00.000Z',
        observed_at: '2026-10-16T05:17:40.000Z',
        originals: 24,
        pending: 0,
        processing: 0,
        retry: 0,
        failed: 0,
        notion_attempts: 24,
      },
    ],
  };
}

const options = { now: Date.parse('2026-10-17T00:00:00.000Z') };

test('recognizes the dedicated multistage Worker only for full scope', () => {
  const input = fixture();
  input.worker_name = 'recollect-flow-bg29-multistage-staging';
  assert.equal(
    assessBg29HourlyEvidence(input, options).structurally_valid,
    false,
  );
});

test('a structurally valid D1-only ledger can never close full BG-29', () => {
  const result = assessBg29HourlyEvidence(fixture(), options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
  assert.equal(result.requires_external_log_authentication, true);
  assert.equal(result.d1_only_cannot_complete_full_pipeline, true);
});

test('accepts actual Cron timestamps with nonzero seconds', () => {
  const input = fixture();
  input.sweeps[0].scheduled_at = '2026-10-16T04:17:37.889Z';
  input.sweeps[0].observed_at = '2026-10-16T04:17:39.242Z';
  input.sweeps[1].scheduled_at = '2026-10-16T05:17:37.889Z';
  input.sweeps[1].observed_at = '2026-10-16T05:17:39.330Z';
  const result = assessBg29HourlyEvidence(input, options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
});

test('rejects simulated fast-forwarded hours', () => {
  const input = fixture();
  input.sweeps[1].observed_at = '2026-10-16T04:17:45.000Z';
  assert.equal(
    assessBg29HourlyEvidence(input, options).structurally_valid,
    false,
  );
});

test('rejects incorrectly scheduled or future cron events', () => {
  const input = fixture();
  input.sweeps[1].scheduled_at = '2026-10-16T06:17:00.000Z';
  assert.equal(
    assessBg29HourlyEvidence(input, options).structurally_valid,
    false,
  );
  input.sweeps[1].scheduled_at = '2026-10-18T05:17:00.000Z';
  input.sweeps[1].observed_at = '2026-10-18T05:17:40.000Z';
  assert.equal(
    assessBg29HourlyEvidence(input, options).structurally_valid,
    false,
  );
});

test('rejects lost originals and remaining work', () => {
  const input = fixture();
  input.sweeps[1].originals = 23;
  input.sweeps[1].retry = 1;
  const result = assessBg29HourlyEvidence(input, options);
  assert.equal(result.structurally_valid, false);
  assert.match(result.errors.join(' '), /lost original|drain/);
});

test('rejects paid usage and live external provider calls', () => {
  const input = fixture();
  input.additional_cost_usd = 0.01;
  input.external_provider_calls = 1;
  const result = assessBg29HourlyEvidence(input, options);
  assert.equal(result.structurally_valid, false);
  assert.match(result.errors.join(' '), /cost|provider/i);
});

test('rejects non-Cloudflare logical-hour fixtures', () => {
  const result = assessBg29HourlyEvidence(
    {
      kind: 'bg29_multi_stage_local_drain',
      logical_elapsed_to_clear_hours: 3,
      sweeps: [{ tick: 0 }, { tick: 1 }],
    },
    options,
  );
  assert.equal(result.structurally_valid, false);
  assert.equal(result.bg29_078_verified, false);
});

function fullFixture() {
  const input = fixture();
  input.scope = 'full';
  input.full_pipeline = {
    original_manifest_count: 24,
    final_original_manifest_count: 24,
    url_acquired_count: 12,
    pdf_r2_hashes_verified: 12,
    pdf_extracted_count: 12,
    enrichment_result_count: 24,
    notion_projection_count: 24,
    notion_post_enrichment_updates: 1,
    source_hash_mismatches: 0,
    duplicate_final_pages: 0,
    stage_handoffs_observed: 1,
    recovery: {
      url_503_recovered: true,
      notion_429_recovered: true,
      stale_lease_recovered: true,
      bounded_attempts: true,
    },
    isolation: {
      dedicated_d1: true,
      dedicated_r2: true,
      production_untouched: true,
      cron_removed: true,
    },
    billing: {
      account_wide_reviewed: true,
      r2_class_a_reviewed: true,
      r2_class_b_reviewed: true,
      r2_storage_reviewed: true,
      post_run_bill_reconciled: true,
    },
  };
  const stages = { acquire_url: 12, extract: 12, enrich: 24, notion: 24 };
  for (const [index, sweep] of input.sweeps.entries()) {
    sweep.event_log_url = 'https://example.invalid/cloudflare-event-' + index;
    sweep.oldest_eligible_age_seconds = index === 0 ? 60 : null;
    sweep.resources = {
      worker_errors: 0,
      cpu_limit_breaches: 0,
      memory_limit_breaches: 0,
      cpu_ms: 2,
    };
    sweep.queues = Object.fromEntries(
      Object.entries(stages).map(([stage, count]) => [
        stage,
        {
          complete: index === 0 ? Math.floor(count / 2) : count,
          pending: index === 0 ? Math.ceil(count / 2) : 0,
          processing: 0,
          retry_eligible: 0,
          failed: 0,
        },
      ]),
    );
  }
  return input;
}

test('metered staging evidence requires the approved identity and actual cost reconciliation', () => {
  const input = fullFixture();
  input.worker_name = 'recollect-flow-bg29-multistage-staging';
  input.financial_policy = 'METERED_R2_RISK_ACCEPTED';
  input.authorization_reference = 'BG29-078-2026-10-31';
  input.additional_cost_usd = 0.01;
  const result = assessBg29HourlyEvidence(input, options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
  for (const cost of [null, -1, NaN]) {
    assert.equal(
      assessBg29HourlyEvidence({ ...input, additional_cost_usd: cost }, options)
        .structurally_valid,
      false,
    );
  }
  assert.equal(
    assessBg29HourlyEvidence(
      { ...input, authorization_reference: 'unapproved' },
      options,
    ).structurally_valid,
    false,
  );
  assert.equal(
    assessBg29HourlyEvidence({ ...input, financial_policy: 'unknown' }, options)
      .structurally_valid,
    false,
  );
});

test('complete-shaped full-stage data still requires independent reviewer authentication', () => {
  const result = assessBg29HourlyEvidence(fullFixture(), options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
  assert.equal(result.requires_external_log_authentication, true);
});

test('full scope fails closed on absent actual R2, enrichment or Notion update evidence', () => {
  for (const field of [
    'pdf_r2_hashes_verified',
    'pdf_extracted_count',
    'enrichment_result_count',
    'notion_post_enrichment_updates',
  ]) {
    const input = fullFixture();
    input.full_pipeline[field] = 0;
    const result = assessBg29HourlyEvidence(input, options);
    assert.equal(result.structurally_valid, false, field);
    assert.match(result.errors.join(' '), new RegExp(field));
  }
});

test('full scope rejects missing recovery, corrupted originals and duplicate pages', () => {
  const scenarios = [
    (input) => (input.full_pipeline.recovery.notion_429_recovered = false),
    (input) => (input.full_pipeline.recovery.stale_lease_recovered = false),
    (input) => (input.full_pipeline.source_hash_mismatches = 1),
    (input) => (input.full_pipeline.duplicate_final_pages = 1),
    (input) => (input.full_pipeline.final_original_manifest_count = 23),
  ];
  for (const modify of scenarios) {
    const input = fullFixture();
    modify(input);
    assert.equal(
      assessBg29HourlyEvidence(input, options).structurally_valid,
      false,
    );
  }
});

test('full scope rejects unresolved per-stage queues, missing metrics or CPU breach', () => {
  const tests = [
    (input) => (input.sweeps[1].queues.extract.pending = 1),
    (input) => (input.sweeps[1].queues.notion.complete = 23),
    (input) => (input.sweeps[1].resources.cpu_ms = 11),
    (input) => (input.sweeps[1].resources.worker_errors = 1),
    (input) => (input.sweeps[1].event_log_url = ''),
    (input) => (input.sweeps[1].queues.enrich.retry_eligible = 1),
    (input) => (input.sweeps[1].resources.cpu_ms = undefined),
  ];
  for (const modify of tests) {
    const input = fullFixture();
    modify(input);
    assert.equal(
      assessBg29HourlyEvidence(input, options).structurally_valid,
      false,
    );
  }
});

test('full scope accepts an explicit unavailable hosted CPU measurement limitation', () => {
  const input = fullFixture();
  input.sweeps[0].resources.cpu_ms = null;
  input.sweeps[0].resources.cpu_metric_unavailable_reason =
    'Cloudflare did not expose CPU sample for this event';
  const result = assessBg29HourlyEvidence(input, options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
});

test('full scope rejects missing post-run cost reconciliation or Cron shutdown', () => {
  for (const modify of [
    (input) => (input.full_pipeline.billing.r2_class_a_reviewed = false),
    (input) => (input.full_pipeline.billing.post_run_bill_reconciled = false),
    (input) => (input.full_pipeline.isolation.cron_removed = false),
  ]) {
    const input = fullFixture();
    modify(input);
    assert.equal(
      assessBg29HourlyEvidence(input, options).structurally_valid,
      false,
    );
  }
});

test('rejects duplicate Cron event IDs and more than ten eligible hourly sweeps', () => {
  const duplicate = fullFixture();
  duplicate.sweeps[1].cloudflare_event_id =
    duplicate.sweeps[0].cloudflare_event_id;
  assert.equal(
    assessBg29HourlyEvidence(duplicate, options).structurally_valid,
    false,
  );

  const overBudget = fullFixture();
  const firstScheduled = Date.parse(overBudget.sweeps[0].scheduled_at);
  const firstObserved = Date.parse(overBudget.sweeps[0].observed_at);
  overBudget.sweeps = Array.from({ length: 11 }, (_, index) => ({
    ...overBudget.sweeps[1],
    cloudflare_event_id: 'event-' + index,
    scheduled_at: new Date(firstScheduled + index * 3600000).toISOString(),
    observed_at: new Date(firstObserved + index * 3600000).toISOString(),
  }));
  const result = assessBg29HourlyEvidence(overBudget, {
    now: Date.parse('2026-11-01T00:00:00.000Z'),
  });
  assert.equal(result.structurally_valid, false);
  assert.match(result.errors.join(' '), /ten hourly sweeps/);
});
