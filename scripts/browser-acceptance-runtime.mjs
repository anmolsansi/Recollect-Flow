/* global process, fetch, setTimeout */

import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { waitUntil } from './browser-cdp.mjs';

const npxExecutable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function boundedLogs(lines) {
  return lines.slice(-80).join('\n');
}

function appendLines(target, chunk) {
  target.push(...String(chunk).split(/\r?\n/).filter(Boolean));
  if (target.length > 120) target.splice(0, target.length - 120);
}

export function findChromeBinary() {
  const configured = [process.env.CHROME_BIN, process.env.CHROME_PATH].filter(
    Boolean,
  );
  const candidates = [
    ...configured,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status === 0) return candidate;
  }

  throw new Error(
    'Chrome/Chromium was not found. Set CHROME_BIN or install Chrome before running BG-07 browser acceptance.',
  );
}

export async function runCommand(command, args, options = {}) {
  const logs = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => appendLines(logs, chunk));
  child.stderr?.on('data', (chunk) => appendLines(logs, chunk));

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${exitCode}.\n${boundedLogs(logs)}`,
    );
  }
  return { logs };
}

export function startService(command, args, options = {}) {
  const logs = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => appendLines(logs, chunk));
  child.stderr?.on('data', (chunk) => appendLines(logs, chunk));
  child.once('error', (error) => appendLines(logs, error.message));
  return { child, logs };
}

export async function stopService(service) {
  const { child } = service;
  if (!child || child.exitCode !== null || child.killed) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 1_500)),
  ]);

  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

export async function waitForHttp(url, description, timeoutMs = 30_000) {
  return waitUntil(
    async () => {
      const response = await fetch(url).catch(() => null);
      return response?.ok ? true : false;
    },
    { timeoutMs, intervalMs: 200, description },
  );
}

export async function createLocalAcceptanceRuntime({
  rootDir = process.cwd(),
  apiPort = 8787,
  webPort = 5173,
  captureToken,
  adminToken,
  localWorkerToken,
}) {
  const tempDir = await mkdtemp(join(tmpdir(), 'recollect-bg07-'));
  const persistDir = join(tempDir, 'wrangler-state');
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const webOrigin = `http://127.0.0.1:${webPort}`;

  await runCommand(
    npxExecutable,
    [
      'wrangler',
      'd1',
      'migrations',
      'apply',
      'recollect-flow-prod',
      '--local',
      '--persist-to',
      persistDir,
    ],
    { cwd: rootDir },
  );

  const worker = startService(
    npxExecutable,
    [
      'wrangler',
      'dev',
      '--local',
      '--port',
      String(apiPort),
      '--persist-to',
      persistDir,
      '--var',
      `CAPTURE_TOKEN:${captureToken}`,
      '--var',
      `ADMIN_TOKEN:${adminToken}`,
      '--var',
      `LOCAL_WORKER_TOKEN:${localWorkerToken}`,
      '--var',
      'NOTION_ACCESS_TOKEN:bg07-local-notion',
      '--var',
      'TELEGRAM_BOT_TOKEN:bg07-local-telegram',
      '--var',
      'TELEGRAM_CHAT_ID:bg07-local-chat',
      '--var',
      `WEB_INBOX_BASE_URL:${webOrigin}`,
    ],
    { cwd: rootDir },
  );

  const web = startService(
    npmExecutable,
    [
      'run',
      'dev:web',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(webPort),
      '--strictPort',
    ],
    { cwd: rootDir },
  );

  try {
    await waitForHttp(
      `${apiOrigin}/api/v1/health`,
      'local Worker health endpoint',
    );
    await waitForHttp(webOrigin, 'local Vite Web application');
  } catch (error) {
    await stopService(web);
    await stopService(worker);
    await rm(tempDir, { recursive: true, force: true });
    const workerLogs = boundedLogs(worker.logs);
    const webLogs = boundedLogs(web.logs);
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nWorker logs:\n${workerLogs}\nWeb logs:\n${webLogs}`,
      { cause: error },
    );
  }

  return {
    apiOrigin,
    webOrigin,
    persistDir,
    tempDir,
    worker,
    web,
    async close() {
      await stopService(web);
      await stopService(worker);
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

export async function launchChrome({
  binary = findChromeBinary(),
  userDataDir,
  initialUrl = 'about:blank',
}) {
  const logs = [];
  const child = spawn(
    binary,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      initialUrl,
    ],
    {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: process.platform !== 'win32',
    },
  );

  let webSocketUrl = null;
  child.stderr?.on('data', (chunk) => {
    appendLines(logs, chunk);
    const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) webSocketUrl = match[1];
  });

  try {
    await waitUntil(() => webSocketUrl, {
      timeoutMs: 15_000,
      intervalMs: 50,
      description: 'Chrome DevTools endpoint',
    });
  } catch (error) {
    await stopService({ child, logs });
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nChrome logs:\n${boundedLogs(logs)}`,
      { cause: error },
    );
  }

  return {
    child,
    logs,
    webSocketUrl,
    close: () => stopService({ child, logs }),
  };
}
