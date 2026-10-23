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
  if (!manifest || manifest.schema_version !== 1 || manifest.generated_for !== 'BG-31') {
    throw new Error('Invalid BG-31 manifest version or ownership');
  }

  const missing = [];
  const requireField = (id, condition, nextAction) => {
    if (!condition) missing.push({ id, next_action: nextAction });
  };

  const candidate = manifest.release_candidate ?? {};
  const live = manifest.live_inventory ?? {};
  const recovery = manifest.recovery ?? {};
  const gates = manifest.gates ?? {};

  requireField('FREEZE_SOURCE', sha40.test(candidate.source_sha ?? ''),
    'Freeze a reviewed release source SHA with exact-head CI.');
  requireField('RECORD_EXACT_CI', hasValue(candidate.exact_head_ci),
    'Record a passing CI run on the exact frozen source.');
  requireField('MATCH_WORKER_WEB', sha64.test(candidate.worker_bundle_sha256 ?? '') &&
    sha64.test(candidate.web_release_id ?? '') &&
    sha64.test(candidate.web_release_manifest_sha256 ?? ''),
    'Store an immutable Worker bundle and matching Web asset manifest.');
  requireField('READ_LIVE_WORKER', hasValue(live.worker_version) &&
    live.production_account_verified === true,
    'Have an authorized operator inspect the current account and deployed Worker.');
  requireField('READ_D1_LEDGER', live.d1_ledger_verified === true &&
    live.d1_database_id_verified === true &&
    Array.isArray(manifest.pending_forward_migrations),
    'Inspect the correct production D1 ledger read-only and validate the ordered migration delta.');
  requireField('VERIFY_LIVE_BINDINGS', live.r2_binding_verified === true &&
    live.web_origin_verified === true,
    'Confirm the actual R2 binding, HTTPS Web origin and account without reading object bytes.');
  requireField('VERIFY_EXTERNAL_DESTINATIONS', live.notion_target_verified === true &&
    live.telegram_target_verified === true,
    'Confirm intended external destinations without sending messages.');
  requireField('VERIFY_SECRET_NAMES', live.secret_presence_verified === true,
    'Check required secret names are present without disclosing values.');
  requireField('VERIFY_INDEPENDENT_BACKUP', hasValue(recovery.verified_d1_backup_id) &&
    sha64.test(recovery.verified_independent_originals_manifest_sha256 ?? '') &&
    recovery.newest_purge_receipts_verified === true &&
    recovery.source_loss_domain_separated === true,
    'Verify a protected D1 export, independent original bytes and current purge receipts.');
  requireField('REHEARSE_RESTORE', recovery.isolated_restore_test_verified === true,
    'Complete and document an authorized isolated restore and anti-resurrection rehearsal.');
  requireField('IDENTIFY_RESTORE_OPERATOR', hasValue(recovery.operator),
    'Name the approved restore operator and verify read access.');
  requireField('IDENTIFY_COMPATIBLE_PREVIOUS_ARTIFACT',
    hasValue(candidate.prior_compatible_artifact),
    'Identify a tested old Worker/Web artifact compatible with the migration delta.');
  requireField('CLOSE_PREVIOUS_GATES',
    gates.bg29_078 === 'VERIFIED' && gates.ope247 === 'DONE',
    'Address inherited release-level gates; the $0 development exception is not acceptance.');
  requireField('CONFIRM_FINANCIAL_BOUNDARY',
    manifest.cost_boundary === 'STRICT_ZERO_ADDITIONAL_COST_LOCAL_DEVELOPMENT_ONLY' &&
      gates.zero_additional_cost_independently_verified === true,
    'Prove a hard zero-additional-cost ceiling with independent evidence. Never relax the owner-defined $0 restriction.');
  requireField('EXPLICIT_OWNER_AUTHORIZATION',
    manifest.approval_status === 'GRANTED' && gates.bg32_production_authorized === true,
    'Obtain a separate dated owner approval for exact immutable artifacts and targets.');

  return {
    manifest_id: manifest.manifest_id,
    decision: 'NO_GO',
    evidence_scope: 'OFFLINE_SELF_REPORTED_SOURCE_ONLY',
    external_verification_performed: false,
    production_mutations_performed: false,
    approval_inferred: false,
    missing_count: missing.length,
    missing,
    note: 'Reported field presence never proves account, backup, billing or approval authenticity. Human review and independent source evidence are mandatory.',
  };
}

const calledDirectly = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (calledDirectly) {
  try {
    if (process.argv.length > 3) {
      throw new Error('Usage: node scripts/bg31-readiness.mjs [offline-manifest.json]');
    }
    const manifest = JSON.parse(readFileSync(process.argv[2] ?? defaultManifest, 'utf8'));
    console.log(JSON.stringify(releaseReadiness(manifest), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
