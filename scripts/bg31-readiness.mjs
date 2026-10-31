/* global console, process */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultManifest = join(root, 'docs/releases/BG-31_RELEASE_MANIFEST.json');
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function releaseReadiness(manifest) {
  if (
    !manifest ||
    manifest.schema_version !== 1 ||
    manifest.generated_for !== 'BG-31'
  ) {
    throw new Error('Invalid BG-31 manifest version or ownership');
  }

  const candidate = manifest.release_candidate ?? {};
  const live = manifest.live_inventory ?? {};
  const recovery = manifest.recovery ?? {};
  const gates = manifest.gates ?? {};

  const requirements = [
    {
      id: 'FREEZE_SOURCE',
      ready: sha40.test(candidate.source_sha ?? ''),
      action: 'Freeze a reviewed release source SHA with exact-head CI.',
    },
    {
      id: 'RECORD_EXACT_CI',
      ready: hasValue(candidate.exact_head_ci),
      action: 'Record a passing CI run on the exact frozen source.',
    },
    {
      id: 'MATCH_WORKER_WEB',
      ready:
        sha64.test(candidate.worker_bundle_sha256 ?? '') &&
        sha64.test(candidate.web_release_id ?? '') &&
        sha64.test(candidate.web_release_manifest_sha256 ?? ''),
      action: 'Store matched immutable Worker and Web artifacts.',
    },
    {
      id: 'READ_LIVE_WORKER',
      ready:
        hasValue(live.worker_version) &&
        live.production_account_verified === true,
      action: 'Inspect the current account and deployed Worker read-only.',
    },
    {
      id: 'READ_D1_LEDGER',
      ready:
        live.d1_ledger_verified === true &&
        live.d1_database_id_verified === true &&
        Array.isArray(manifest.pending_forward_migrations),
      action: 'Inspect the correct D1 ledger and validate the migration delta.',
    },
    {
      id: 'VERIFY_LIVE_BINDINGS',
      ready:
        live.r2_binding_verified === true && live.web_origin_verified === true,
      action: 'Confirm the actual R2 binding, HTTPS origin and account.',
    },
    {
      id: 'VERIFY_EXTERNAL_DESTINATIONS',
      ready:
        live.notion_target_verified === true &&
        live.telegram_target_verified === true,
      action: 'Confirm intended destinations without sending messages.',
    },
    {
      id: 'VERIFY_SECRET_NAMES',
      ready: live.secret_presence_verified === true,
      action: 'Verify required secret names exist without viewing values.',
    },
    {
      id: 'VERIFY_INDEPENDENT_BACKUP',
      ready:
        hasValue(recovery.verified_d1_backup_id) &&
        sha64.test(
          recovery.verified_independent_originals_manifest_sha256 ?? '',
        ) &&
        recovery.newest_purge_receipts_verified === true &&
        recovery.source_loss_domain_separated === true,
      action: 'Verify D1, original bytes and newest purge receipts.',
    },
    {
      id: 'REHEARSE_RESTORE',
      ready: recovery.isolated_restore_test_verified === true,
      action: 'Rehearse an authorized isolated restore and anti-resurrection.',
    },
    {
      id: 'IDENTIFY_RESTORE_OPERATOR',
      ready: hasValue(recovery.operator),
      action: 'Name the approved restore operator and verify read access.',
    },
    {
      id: 'IDENTIFY_COMPATIBLE_PREVIOUS_ARTIFACT',
      ready: hasValue(candidate.prior_compatible_artifact),
      action: 'Identify an old artifact compatible with the migration delta.',
    },
    {
      id: 'CLOSE_PREVIOUS_GATES',
      ready: gates.bg29_078 === 'VERIFIED' && gates.ope247 === 'DONE',
      action: 'Close independent release gates with actual proof.',
    },
    {
      id: 'CONFIRM_FINANCIAL_BOUNDARY',
      ready:
        manifest.cost_boundary ===
        'METERED_R2_RISK_ACCEPTED_PLAN_REVIEW_PENDING'
          ? gates.r2_cost_plan_approved === true &&
            gates.workers_plan_confirmed === true
          : manifest.cost_boundary ===
              'STRICT_ZERO_ADDITIONAL_COST_LOCAL_DEVELOPMENT_ONLY' &&
            gates.zero_additional_cost_independently_verified === true,
      action:
        manifest.cost_boundary ===
        'METERED_R2_RISK_ACCEPTED_PLAN_REVIEW_PENDING'
          ? 'Review the metered R2 cost plan and confirm the current Workers plan; alerts are not spending caps.'
          : 'Prove zero additional cost without relaxing the $0 restriction.',
    },
    {
      id: 'EXPLICIT_OWNER_AUTHORIZATION',
      ready:
        manifest.approval_status === 'GRANTED' &&
        gates.bg32_production_authorized === true,
      action: 'Get dated owner approval for specific artifacts and targets.',
    },
  ];

  const missing = requirements
    .filter((entry) => !entry.ready)
    .map((entry) => ({ id: entry.id, next_action: entry.action }));

  return {
    manifest_id: manifest.manifest_id,
    decision: 'NO_GO',
    evidence_scope: 'OFFLINE_SELF_REPORTED_SOURCE_ONLY',
    external_verification_performed: false,
    production_mutations_performed: false,
    approval_inferred: false,
    missing_count: missing.length,
    missing,
    note: 'Fields alone cannot prove acceptance. Owner review is required.',
  };
}

const calledDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (calledDirectly) {
  try {
    if (process.argv.length > 3) {
      throw new Error(
        'Usage: node scripts/bg31-readiness.mjs [offline-manifest.json]',
      );
    }
    const manifest = JSON.parse(
      readFileSync(process.argv[2] ?? defaultManifest, 'utf8'),
    );
    console.log(JSON.stringify(releaseReadiness(manifest), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
