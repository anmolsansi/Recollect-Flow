import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PRODUCTION_IDENTIFIERS = [
  'recollect-flow-prod',
  'recollect-flow-attachments-prod',
  '5fcba514-d0f7-45e7-a632-d4c59233af71',
];

export function assessZeroCostTemplate(config) {
  const errors = [];
  const requirePattern = (pattern, explanation) => {
    if (!pattern.test(config)) errors.push(explanation);
  };

  requirePattern(
    /^name\s*=\s*"recollect-flow-bg29-staging"\s*$/m,
    'Expected dedicated BG-29 staging Worker name',
  );
  requirePattern(
    /^workers_dev\s*=\s*false\s*$/m,
    'workers_dev must remain disabled before authorization',
  );
  requirePattern(
    /^preview_urls\s*=\s*false\s*$/m,
    'preview_urls must remain disabled before authorization',
  );
  requirePattern(
    /^database_name\s*=\s*"recollect-flow-bg29-staging"\s*$/m,
    'Only the isolated staging D1 name is allowed',
  );
  requirePattern(
    /^database_id\s*=\s*"REPLACE_AFTER_EXPLICIT_ISOLATED_STAGING_APPROVAL"\s*$/m,
    'Keep the nondeployable staging D1 placeholder until account verification',
  );
  requirePattern(
    /^bucket_name\s*=\s*"recollect-flow-bg29-staging-attachments"\s*$/m,
    'Only the dedicated staging R2 name is allowed',
  );
  requirePattern(
    /^MOCK_AI_ENABLED\s*=\s*"true"\s*$/m,
    'AI must use an explicit mock',
  );
  requirePattern(
    /^AI_PROVIDER_IMPLEMENTATIONS\s*=\s*'\{"openrouter":"mock"\}'\s*$/m,
    'Only the mock AI implementation is permitted',
  );
  requirePattern(
    /^DIGEST_AI_ENABLED\s*=\s*"false"\s*$/m,
    'Digest AI must be disabled',
  );
  requirePattern(
    /^HOSTED_BACKUP_AUTOCREATE_ENABLED\s*=\s*"false"\s*$/m,
    'Hosted backup auto-creation must be disabled',
  );
  requirePattern(
    /^WEB_INBOX_BASE_URL\s*=\s*"https:\/\/invalid\.test"\s*$/m,
    'No real external Web inbox is permitted',
  );

  for (const identifier of PRODUCTION_IDENTIFIERS) {
    if (config.includes(identifier))
      errors.push(
        'Production resource identifier must never appear in staging',
      );
  }
  if (/^\s*\[triggers\]\s*$/m.test(config) || /^\s*crons\s*=/m.test(config))
    errors.push(
      'Cron triggers require later explicit isolated account verification',
    );
  if (/^\s*(routes?|route)\s*=/m.test(config))
    errors.push('Production or public routes are not permitted');
  if (/^\s*\[ai\]\s*$/m.test(config))
    errors.push('Real AI binding is not permitted');
  if (
    /^\s*(NOTION_ACCESS_TOKEN|TELEGRAM_BOT_TOKEN|OPENROUTER_API_KEY|CLOUDFLARE_API_TOKEN)\s*=/m.test(
      config,
    )
  )
    errors.push('Never embed live tokens or credentials in staging config');

  return {
    local_template_safe: errors.length === 0,
    account_plan_verified: false,
    available_free_quotas_verified: false,
    r2_billing_risk_excluded: false,
    zero_dollar_deployment_authorized: false,
    reasons: errors,
    next_action:
      'Read-only verification of Cloudflare account plan, remaining Workers/D1/R2 quotas, existing R2 subscription, and billing risk is required. Do not deploy.',
  };
}

async function main() {
  const path = resolve('wrangler.bg29-staging.example.toml');
  const result = assessZeroCostTemplate(await readFile(path, 'utf8'));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.local_template_safe) process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
