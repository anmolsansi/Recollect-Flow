import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HOUR_MS = 60 * 60 * 1000;
const MIN_OBSERVED_HOUR_MS = 55 * 60 * 1000;
const DEFAULT_MAX_LAG_MS = 15 * 60 * 1000;

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
    let priorObserved = null;
    let priorScheduled = null;
    let originalCount = null;

    for (const [index, sweep] of data.sweeps.entries()) {
      const observed = asUtcTimestamp(sweep?.observed_at);
      const scheduled = asUtcTimestamp(sweep?.scheduled_at);
      requireField(
        Boolean(sweep?.cloudflare_event_id),
        `Sweep ${index} must have a source event ID`,
      );
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
        new Date(scheduled).getUTCMinutes() === 17 &&
          new Date(scheduled).getUTCSeconds() === 0,
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
        first.originals >= 24 && first.originals <= 48,
        'Fixture must contain 24 to 48 originals',
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
