import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HOUR_MS = 60 * 60 * 1000;
const MIN_OBSERVED_HOUR_MS = 55 * 60 * 1000;
const DEFAULT_MAX_LAG_MS = 15 * 60 * 1000;
const MAX_ELIGIBLE_SWEEPS = 10;

function asUtcTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)
  )
    return null;
  const n = Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate an exported, operator-attributed Cloudflare Cron evidence ledger.
 * This checks structure and timing; it cannot authenticate an external log.
 * In particular, D1-only evidence must never complete the full R2 pipeline.
 */
export function assessBg29HourlyEvidence(data, { now = Date.now() } = {}) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return {
      structurally_valid: false,
      bg29_078_verified: false,
      errors: ['Expected an evidence object'],
    };

  const requireField = (condition, message) => {
    if (!condition) errors.push(message);
  };

  requireField(
    data.kind === 'bg29_cloudflare_real_hourly_cron',
    'Evidence kind must identify real Cloudflare hourly Cron',
  );
  requireField(
    data.account_verified === true,
    'Cloudflare account identity must be verified',
  );
  requireField(
    data.worker_name === 'recollect-flow-bg29-staging',
    'Only an isolated BG29 staging Worker is permitted',
  );
  requireField(
    /^\b[0-9a-f]{40}\b$/.test(data.git_sha ?? ''),
    'Require the exact 40-character source SHA',
  );
  requireField(
    data.cron === '17 * * * *',
    'The actual background Cron schedule must be preserved',
  );
  requireField(
    data.providers_mocked === true,
    'Real external provider calls are not allowed',
  );
  requireField(
    data.external_provider_calls === 0,
    'No external provider calls may occur',
  );
  requireField(
    data.additional_cost_usd === 0,
    'The total additional cost must be independently verified as zero',
  );
  requireField(
    typeof data.evidence_url === 'string' &&
      /^https:\/\//.test(data.evidence_url),
    'Immutable external run or evidence URL required',
  );
  requireField(
    data.scope === 'full' || data.scope === 'd1_only',
    'Declare full or D1-only test scope',
  );
  requireField(
    Array.isArray(data.sweeps) && data.sweeps.length >= 2,
    'At least two real hourly sweeps are required',
  );

  if (Array.isArray(data.sweeps)) {
    requireField(
      data.sweeps.length <= MAX_ELIGIBLE_SWEEPS,
      'The frozen acceptance budget allows no more than ten hourly sweeps',
    );
    const eventIds = new Set();
    let priorObserved = null;
    let priorScheduled = null;
    let originalCount = null;

    for (const [index, sweep] of data.sweeps.entries()) {
      const observed = asUtcTimestamp(sweep?.observed_at);
      const scheduled = asUtcTimestamp(sweep?.scheduled_at);
      requireField(
        typeof sweep?.cloudflare_event_id === 'string' &&
          sweep.cloudflare_event_id.length > 0,
        `Sweep ${index} must have a source event ID`,
      );
      if (sweep?.cloudflare_event_id) {
        requireField(
          !eventIds.has(sweep.cloudflare_event_id),
          `Sweep ${index} reuses a previous Cloudflare event ID`,
        );
        eventIds.add(sweep.cloudflare_event_id);
      }
      requireField(
        observed !== null && scheduled !== null,
        `Sweep ${index} needs UTC scheduled and observed timestamps`,
      );
      if (observed === null || scheduled === null) continue;
      requireField(
        observed >= scheduled && observed - scheduled <= DEFAULT_MAX_LAG_MS,
        `Sweep ${index} must be an actual scheduled event with bounded lag`,
      );
      requireField(observed <= now, `Sweep ${index} cannot be in the future`);
      requireField(
        new Date(scheduled).getUTCMinutes() === 17,
        `Sweep ${index} does not align with the configured Cron`,
      );
      if (priorObserved !== null)
        requireField(
          observed - priorObserved >= MIN_OBSERVED_HOUR_MS,
          `Sweep ${index} did not span real hourly elapsed time`,
        );
      if (priorScheduled !== null)
        requireField(
          scheduled - priorScheduled === HOUR_MS,
          `Sweep ${index} is not the next actual hourly Cron`,
        );
      priorObserved = observed;
      priorScheduled = scheduled;
      const counts = [
        'originals',
        'pending',
        'processing',
        'retry',
        'failed',
        'notion_attempts',
      ];
      for (const key of counts)
        requireField(
          Number.isSafeInteger(sweep[key]) && sweep[key] >= 0,
          `Sweep ${index} needs nonnegative ${key} count`,
        );
      if (originalCount === null) originalCount = sweep.originals;
      else
        requireField(
          sweep.originals === originalCount,
          `Sweep ${index} lost original items`,
        );
    }

    const first = data.sweeps[0];
    const last = data.sweeps.at(-1);
    if (first && last) {
      requireField(
        first.originals === 24,
        'Frozen BG-29 fixture must contain exactly 24 originals',
      );
      requireField(
        last.pending === 0 &&
          last.processing === 0 &&
          last.retry === 0 &&
          last.failed === 0,
        'All queues must drain without failed items',
      );
      requireField(
        last.notion_attempts > 0,
        'Notion mock attempts must be observed',
      );
    }
  }

  // The original D1-only validator remains useful for its limited scope.
  // Full BG-29.078 must additionally cover every real stage, stored source,
  // failure recovery, independent Notion projection and the final shutdown.
  // These declarations are only structural checks: a reviewer must still
  // authenticate event logs, hashes, binding IDs and billing externally.
  if (data.scope === 'full') {
    const full = data.full_pipeline;
    requireField(
      full && typeof full === 'object' && !Array.isArray(full),
      'Full scope requires the multi-stage evidence bundle',
    );
    if (full && typeof full === 'object' && !Array.isArray(full)) {
      for (const [field, expected] of Object.entries({
        original_manifest_count: 24,
        final_original_manifest_count: 24,
        url_acquired_count: 12,
        pdf_r2_hashes_verified: 12,
        pdf_extracted_count: 12,
        enrichment_result_count: 24,
        notion_projection_count: 24,
        source_hash_mismatches: 0,
        duplicate_final_pages: 0,
      })) {
        requireField(
          full[field] === expected,
          'Full multi-stage evidence requires ' + field + ' = ' + expected,
        );
      }
      requireField(
        Number.isSafeInteger(full.notion_post_enrichment_updates) &&
          full.notion_post_enrichment_updates >= 1,
        'Full pipeline must prove notion_post_enrichment_updates >= 1',
      );
      for (const name of [
        'url_503_recovered',
        'notion_429_recovered',
        'stale_lease_recovered',
        'bounded_attempts',
      ]) {
        requireField(
          full.recovery?.[name] === true,
          'Full pipeline must prove bounded recovery: ' + name,
        );
      }
      for (const name of [
        'dedicated_d1',
        'dedicated_r2',
        'production_untouched',
        'cron_removed',
      ]) {
        requireField(
          full.isolation?.[name] === true,
          'Full pipeline isolation or shutdown unverified: ' + name,
        );
      }
      for (const name of [
        'account_wide_reviewed',
        'r2_class_a_reviewed',
        'r2_class_b_reviewed',
        'r2_storage_reviewed',
        'post_run_bill_reconciled',
      ]) {
        requireField(
          full.billing?.[name] === true,
          'Full pipeline zero-cost reconciliation unverified: ' + name,
        );
      }
      requireField(
        Number.isSafeInteger(full.stage_handoffs_observed) &&
          full.stage_handoffs_observed >= 1,
        'At least one inter-sweep stage handoff needs attributable evidence',
      );
    }

    if (Array.isArray(data.sweeps)) {
      const expectedByStage = {
        acquire_url: 12,
        extract: 12,
        enrich: 24,
        notion: 24,
      };
      for (const [index, sweep] of data.sweeps.entries()) {
        requireField(
          typeof sweep?.event_log_url === 'string' &&
            /^https:\/\//.test(sweep.event_log_url),
          'Full sweep ' + index + ' needs its independent event log URL',
        );
        requireField(
          Number.isFinite(sweep?.oldest_eligible_age_seconds) &&
            sweep.oldest_eligible_age_seconds >= 0 ||
            sweep?.oldest_eligible_age_seconds === null,
          'Full sweep ' + index + ' needs measured oldest eligible age or explicit null',
        );
        for (const stage of Object.keys(expectedByStage)) {
          const row = sweep?.queues?.[stage];
          for (const status of [
            'complete',
            'pending',
            'processing',
            'retry_eligible',
            'failed',
          ]) {
            requireField(
              Number.isSafeInteger(row?.[status]) && row[status] >= 0,
              'Full sweep ' + index + ' needs ' + stage + '.' + status,
            );
          }
          // Retry-eligible is a subset of pending work.
          if (row) {
            requireField(
              row.retry_eligible <= row.pending,
              'Full sweep ' + index + ' has impossible retry queue counts',
            );
            requireField(
              row.complete + row.pending + row.processing + row.failed <=
                expectedByStage[stage],
              'Full sweep ' + index + ' exceeds the frozen workload for ' + stage,
            );
          }
        }
        const resource = sweep?.resources;
        requireField(
          resource?.worker_errors === 0 &&
            resource?.cpu_limit_breaches === 0 &&
            resource?.memory_limit_breaches === 0,
          'Full sweep ' + index + ' has Worker resource errors or missing metrics',
        );
        if (resource?.cpu_ms !== null) {
          requireField(
            Number.isFinite(resource?.cpu_ms) &&
              resource.cpu_ms >= 0 &&
              resource.cpu_ms <= 10,
            'Full sweep ' + index + ' exceeds Workers Free 10ms CPU budget or lacks a valid reading',
          );
        } else {
          requireField(
            typeof resource?.cpu_metric_unavailable_reason === 'string' &&
              resource.cpu_metric_unavailable_reason.length > 0,
            'Full sweep ' + index + ' must explain unavailable hosted CPU metrics',
          );
        }
      }
      const last = data.sweeps.at(-1);
      for (const [stage, expected] of Object.entries(expectedByStage)) {
        requireField(
          last?.queues?.[stage]?.complete === expected,
          'Final hosted queue is not complete for ' + stage,
        );
        for (const status of [
          'pending',
          'processing',
          'retry_eligible',
          'failed',
        ]) {
          requireField(
            last?.queues?.[stage]?.[status] === 0,
            'Final hosted queue still contains ' + stage + '.' + status,
          );
        }
      }
    }
  }

  const structurallyValid = errors.length === 0;
  return {
    structurally_valid: structurallyValid,
    // Even structurally valid exported records need external authenticity
    // review, cost signoff and hosted R2/file stage evidence. Fail closed.
    bg29_078_verified: false,
    requires_external_log_authentication: structurallyValid,
    d1_only_cannot_complete_full_pipeline: data.scope === 'd1_only',
    errors,
    note: 'No JSON ledger by itself authenticates Cloudflare logs, R2/file-stage coverage, or a zero-dollar final bill.',
  };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    process.stderr.write(
      'Usage: node scripts/bg29-hourly-evidence-check.mjs <external-evidence.json>\n',
    );
    process.exitCode = 2;
    return;
  }
  const evidence = JSON.parse(await readFile(resolve(input), 'utf8'));
  const result = assessBg29HourlyEvidence(evidence);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.structurally_valid) process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
