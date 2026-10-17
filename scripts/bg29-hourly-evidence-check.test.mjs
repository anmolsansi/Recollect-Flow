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

test('a structurally valid D1-only ledger can never close full BG-29', () => {
  const result = assessBg29HourlyEvidence(fixture(), options);
  assert.equal(result.structurally_valid, true, result.errors.join('; '));
  assert.equal(result.bg29_078_verified, false);
  assert.equal(result.requires_external_log_authentication, true);
  assert.equal(result.d1_only_cannot_complete_full_pipeline, true);
});

test('rejects simulated fast-forwarded hours', () => {
  const input = fixture();
  input.sweeps[1].observed_at = '2026-10-16T04:17:45.000Z';
  assert.equal(assessBg29HourlyEvidence(input, options).structurally_valid, false);
});

test('rejects incorrectly scheduled or future cron events', () => {
  const input = fixture();
  input.sweeps[1].scheduled_at = '2026-10-16T06:17:00.000Z';
  assert.equal(assessBg29HourlyEvidence(input, options).structurally_valid, false);
  input.sweeps[1].scheduled_at = '2026-10-18T05:17:00.000Z';
  input.sweeps[1].observed_at = '2026-10-18T05:17:40.000Z';
  assert.equal(assessBg29HourlyEvidence(input, options).structurally_valid, false);
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
  const result = assessBg29HourlyEvidence({
    kind: 'bg29_multi_stage_local_drain',
    logical_elapsed_to_clear_hours: 3,
    sweeps: [{ tick: 0 }, { tick: 1 }],
  }, options);
  assert.equal(result.structurally_valid, false);
  assert.equal(result.bg29_078_verified, false);
});
