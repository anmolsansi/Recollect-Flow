import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const configPath = 'wrangler.bg29-multistage-staging.toml';
const productionD1 = '5fcba514-d0f7-45e7-a632-d4c59233af71';
const stagingD1 = 'b5cbeccc-92fb-4bbc-9597-f0174b84e57d';

function mustMatch(source, expression, description) {
  if (!expression.test(source)) throw new Error(`BG29_STAGING_CONFIG_DENIED: ${description}`);
}

export function validateBg29MultistageConfig(raw) {
  // Comments cannot satisfy a required safety setting.
  const content = raw
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  mustMatch(content, /^name\s*=\s*"recollect-flow-bg29-multistage-staging"$/m, 'dedicated Worker name');
  mustMatch(content, /^main\s*=\s*"apps\/worker-api\/src\/bg29-staging-entry.ts"$/m, 'isolated entry');
  mustMatch(content, /^workers_dev\s*=\s*false$/m, 'workers.dev must be disabled');
  mustMatch(content, /^preview_urls\s*=\s*false$/m, 'preview URLs must be disabled');
  mustMatch(content, /^binding\s*=\s*"DB"$/m, 'D1 binding');
  mustMatch(content, /^database_name\s*=\s*"recollect-flow-bg29-staging"$/m, 'staging database name');
  mustMatch(content, new RegExp('^database_id\\s*=\\s*"' + stagingD1 + '"$', 'm'), 'known staging D1');
  mustMatch(content, /^binding\s*=\s*"ATTACHMENTS"$/m, 'R2 binding');
  mustMatch(content, /^bucket_name\s*=\s*"bg29-multistage-r2-NOT-CREATED-DO-NOT-DEPLOY"$/m, 'uncreated R2 placeholder');
  mustMatch(content, /^MOCK_AI_ENABLED\s*=\s*"true"$/m, 'mock AI enabled');
  mustMatch(content, /^DIGEST_AI_ENABLED\s*=\s*"false"$/m, 'digest AI disabled');
  mustMatch(content, /^HOSTED_BACKUP_AUTOCREATE_ENABLED\s*=\s*"false"$/m, 'hosted backups disabled');
  mustMatch(content, /^WEB_INBOX_BASE_URL\s*=\s*"https:\/\/invalid\.test"$/m, 'invalid inbox endpoint');
  mustMatch(content, /^AI_PROVIDER_IMPLEMENTATIONS\s*=\s*'\{"openrouter":"mock"\}'$/m, 'mock-only adapter');
  mustMatch(content, /^\[triggers\]\s*\ncrons\s*=\s*\[\]\s*$/m, 'explicit disabled Cron');

  if (content.includes(productionD1) || /recollect-flow-attachments-prod/.test(content)) {
    throw new Error('BG29_STAGING_CONFIG_DENIED: production binding');
  }
  if (/^\s*(routes|route|account_id|zone_id|secrets|token|OPENROUTER_API_KEY|NOTION_ACCESS_TOKEN|TELEGRAM_BOT_TOKEN)\s*=/im.test(content)) {
    throw new Error('BG29_STAGING_CONFIG_DENIED: unapproved route or secret');
  }
  if (/^\s*\[(?!\[?(?:d1_databases|r2_buckets)\]\]|(?:vars|triggers)\])/m.test(content)) {
    throw new Error('BG29_STAGING_CONFIG_DENIED: unapproved config section');
  }
  return {
    safeForOfflineDryRun: true,
    deploymentAuthorized: false,
    r2BucketProvisioned: false,
    cronEnabled: false,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const file = readFileSync(fileURLToPath(new URL(`../${configPath}`, import.meta.url)), 'utf8');
  console.log(JSON.stringify(validateBg29MultistageConfig(file)));
}
