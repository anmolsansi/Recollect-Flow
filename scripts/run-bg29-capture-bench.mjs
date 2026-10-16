/* global process, console */
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import { runCaptureBench } from './bg29-capture-bench.mjs';

const count = Number(process.env.BG29_CAPTURE_COUNT ?? 20);
const concurrency = Number(process.env.BG29_CAPTURE_CONCURRENCY ?? 2);
const batchIntervalMs = Number(process.env.BG29_CAPTURE_INTERVAL_MS ?? 1000);
const captureToken = 'bg29-capture-' + randomUUID();
const adminToken = 'bg29-admin-' + randomUUID();

let runtime;
try {
  runtime = await createLocalAcceptanceRuntime({
    apiPort: 8792,
    webPort: 5182,
    captureToken,
    adminToken,
    localWorkerToken: 'bg29-worker-' + randomUUID(),
  });
  const report = await runCaptureBench({
    origin: runtime.apiOrigin,
    captureToken,
    adminToken,
    count,
    concurrency,
    batchIntervalMs,
  });
  console.log(
    JSON.stringify({ ...report, run_at: new Date().toISOString() }, null, 2),
  );
  if (!report.meets_local_target) process.exitCode = 1;
} catch (error) {
  console.error(
    'BG-29 isolated benchmark failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
} finally {
  await runtime?.close();
}
