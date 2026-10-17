/* global process, console, fetch, AbortSignal, WebSocket, setTimeout, clearTimeout, setInterval, clearInterval, performance */
import { TextEncoder } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';

const API_PORT = 8793;
const INSPECTOR_PORT = 9237;
const ORIGIN = `http://127.0.0.1:${API_PORT}`;
const INSPECTOR = `ws://127.0.0.1:${INSPECTOR_PORT}/ws`;
const BYTES = 25_000_000;

async function inspectorSocket() {
  let ws;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    ws = new WebSocket(INSPECTOR);
    try {
      await new Promise((resolve, reject) => {
        const deadline = setTimeout(
          () => reject(new Error('CDP connection timeout')),
          1500,
        );
        ws.addEventListener(
          'open',
          () => {
            clearTimeout(deadline);
            resolve();
          },
          { once: true },
        );
        ws.addEventListener(
          'error',
          () => {
            clearTimeout(deadline);
            reject(new Error('Local inspector refused connection'));
          },
          { once: true },
        );
      });
      break;
    } catch {
      ws.close();
      ws = null;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!ws)
    throw new Error(
      'Local workerd inspector did not open on the configured loopback port',
    );
  const pending = new Map();
  let nextId = 0;
  ws.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error)
      request.reject(
        new Error(`CDP ${request.method}: ${message.error.message}`),
      );
    else request.resolve(message.result);
  });
  return {
    async send(method, params = {}) {
      const id = ++nextId;
      const result = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timed out: ${method}`));
        }, 10_000);
        pending.set(id, { method, timer, resolve, reject });
      });
      ws.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() {
      ws.close();
    },
  };
}

function assertHttp(response, status, action) {
  if (response.status !== status)
    throw new Error(`${action}: HTTP ${response.status}, expected ${status}`);
}

function profileSummary(profile) {
  const nodes = new Map((profile.nodes ?? []).map((node) => [node.id, node]));
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  let totalMicroseconds = 0;
  let activeMicroseconds = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const delta = deltas[index] ?? 0;
    totalMicroseconds += delta;
    if (
      !/^\\(idle\\)$/i.test(
        nodes.get(samples[index])?.callFrame?.functionName ?? '',
      )
    ) {
      activeMicroseconds += delta;
    }
  }
  return {
    cpu_samples: samples.length,
    sampled_window_ms: Math.round((totalMicroseconds / 1000) * 100) / 100,
    sampled_non_idle_ms: Math.round((activeMicroseconds / 1000) * 100) / 100,
    // This is local inspector sampled activity, not Cloudflare billed CPU time.
  };
}

const localToken = 'bg29-resource-' + randomUUID();
const token = 'bg29-upload-' + randomUUID();
let runtime;
let inspector;
try {
  runtime = await createLocalAcceptanceRuntime({
    apiPort: API_PORT,
    webPort: 5183,
    inspectorPort: INSPECTOR_PORT,
    captureToken: token,
    adminToken: localToken,
    localWorkerToken: localToken,
  });
  if (!runtime.apiOrigin.startsWith(ORIGIN))
    throw new Error('Unexpected nonlocal Worker origin');

  inspector = await inspectorSocket();
  await inspector.send('Runtime.enable');
  await inspector.send('Profiler.enable');
  const before = await inspector.send('Runtime.getHeapUsage');
  if (!Number.isFinite(before.usedSize))
    throw new Error('Inspector did not report isolated V8 heap usage');

  const heapSamples = [before.usedSize];
  const sample = async () => {
    try {
      const heap = await inspector.send('Runtime.getHeapUsage');
      if (Number.isFinite(heap.usedSize)) heapSamples.push(heap.usedSize);
    } catch {
      /* A missing sample is not evidence of low heap pressure. */
    }
  };
  const clockStarted = performance.now();
  await inspector.send('Profiler.start');
  const timer = setInterval(() => {
    void sample();
  }, 75);

  const init = await fetch(`${ORIGIN}/api/v1/uploads/init`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: 'bg29-resource-synthetic.pdf',
      mime_type: 'application/pdf',
      source_type: 'file',
      size_bytes: BYTES,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  assertHttp(init, 201, 'Reservation');
  const reservation = await init.json();
  const attachmentId = reservation?.data?.attachment_id;
  if (typeof attachmentId !== 'string' || !attachmentId)
    throw new Error('Missing attachment ID');
  const bytes = new Uint8Array(BYTES);
  bytes.set(
    new TextEncoder().encode(
      '%PDF-1.7\nSynthetic isolated resource profiling file',
    ),
  );
  const uploadStart = performance.now();
  const response = await fetch(
    `${ORIGIN}/api/v1/uploads/${encodeURIComponent(attachmentId)}/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/pdf',
        'Content-Length': String(BYTES),
      },
      body: bytes,
      signal: AbortSignal.timeout(60_000),
    },
  );
  const uploadWallMs =
    Math.round((performance.now() - uploadStart) * 100) / 100;
  assertHttp(response, 200, '25MB upload');
  const acknowledged = await response.json();
  const finalize = await fetch(
    `${ORIGIN}/api/v1/uploads/${encodeURIComponent(attachmentId)}/finalize`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ checksum: acknowledged?.data?.checksum }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  assertHttp(finalize, 200, 'Finalization');

  await sample();
  clearInterval(timer);
  const stopped = await inspector.send('Profiler.stop');
  const after = await inspector.send('Runtime.getHeapUsage');
  heapSamples.push(after.usedSize);
  const cpu = profileSummary(stopped.profile ?? {});
  if (cpu.cpu_samples < 1)
    throw new Error('Local CPU profiler returned no samples');
  const result = {
    event: 'bg29_local_workerd_isolate_resource_profile',
    environment: 'wrangler-dev-local-workerd-isolate-inspector',
    hosted_bindings_used: false,
    external_provider_calls: 0,
    near_limit_upload_bytes: BYTES,
    upload_wall_ms: uploadWallMs,
    measured_window_wall_ms:
      Math.round((performance.now() - clockStarted) * 100) / 100,
    v8_heap_before_bytes: before.usedSize,
    v8_heap_after_bytes: after.usedSize,
    v8_heap_peak_observed_bytes: Math.max(...heapSamples),
    heap_sample_count: heapSamples.length,
    ...cpu,
    limits:
      'Local V8 heap and sampled CPU activity are not production memory ceiling/billed CPU. ' +
      'Sampling may miss a transient allocation peak; confirmed local profiling does not ' +
      'replace Cloudflare staging or production Worker metrics.',
  };
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    'BG29 LOCAL RESOURCE PROFILE NOT VERIFIED:',
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
} finally {
  inspector?.close();
  await runtime?.close();
}
