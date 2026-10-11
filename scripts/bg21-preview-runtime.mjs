/* global process, fetch */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runCommand,
  startService,
  stopService,
  waitForHttp,
} from './browser-acceptance-runtime.mjs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** Runs the production Wrangler entry + compiled assets, never the Vite dev server. */
export async function createBg21Preview({ rootDir = process.cwd(), port = 8991 } = {}) {
  if (!existsSync(join(rootDir, 'apps/web/dist/release-manifest.json'))) {
    throw new Error('Run npm run release:package before BG-21 browser acceptance');
  }
  const tempDir = await mkdtemp(join(tmpdir(), 'recollect-bg21-'));
  const persistDir = join(tempDir, 'isolated-d1-r2');
  const origin = 'http://127.0.0.1:' + port;
  const adminToken = 'bg21-admin-' + randomUUID();
  const captureToken = 'bg21-capture-' + randomUUID();
  let worker;
  try {
    await runCommand(npx, [
      'wrangler', 'd1', 'migrations', 'apply', 'recollect-flow-prod',
      '--local', '--persist-to', persistDir,
    ], { cwd: rootDir });
    worker = startService(npx, [
      'wrangler', 'dev', '--local', '--port', String(port), '--persist-to', persistDir,
      '--var', 'ADMIN_TOKEN:' + adminToken,
      '--var', 'CAPTURE_TOKEN:' + captureToken,
      '--var', 'LOCAL_WORKER_TOKEN:bg21-local-only-' + randomUUID(),
      '--var', 'NOTION_ACCESS_TOKEN:bg21-local-notion',
      '--var', 'TELEGRAM_BOT_TOKEN:bg21-local-telegram',
      '--var', 'TELEGRAM_CHAT_ID:bg21-local-chat',
      '--var', 'WEB_INBOX_BASE_URL:' + origin,
    ], { cwd: rootDir });
    await waitForHttp(origin + '/api/v1/health', 'BG-21 bundled Worker health');
    await waitForHttp(origin + '/', 'BG-21 bundled Web shell');
  } catch (error) {
    if (worker) await stopService(worker);
    await rm(tempDir, { recursive: true, force: true });
    throw new Error('BG-21 isolated preview failed: ' +
      (error instanceof Error ? error.message : String(error)) +
      '\n' + (worker?.logs ?? []).slice(-50).join('\n'));
  }
  return {
    apiOrigin: origin,
    webOrigin: origin,
    adminToken,
    captureToken,
    persistDir,
    async close() {
      await stopService(worker);
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}
