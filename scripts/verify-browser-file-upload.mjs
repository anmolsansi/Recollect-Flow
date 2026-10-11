/* global console, process */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import {
  openBrowser, login, navigate, waitFor, evaluate, apiRequest,
  report, safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg18-owner-' + randomUUID();
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l48AAAAASUVORK5CYII=',
  'base64',
);
let runtime, browser, folder;

async function chooseFile(path) {
  const document = await browser.client.send(
    'DOM.getDocument', { depth: -1 }, browser.sessionId,
  );
  const field = await browser.client.send(
    'DOM.querySelector',
    { nodeId: document.root.nodeId, selector: 'input[name="file"]' },
    browser.sessionId,
  );
  assert.ok(field.nodeId, 'File selector must exist.');
  await browser.client.send(
    'DOM.setFileInputFiles', { nodeId: field.nodeId, files: [path] },
    browser.sessionId,
  );
  await waitFor(browser, 'document.querySelector("input[name=file]")?.files?.length === 1', 'file selection');
}

async function verifyOriginal(name, mime, bytes) {
  const path = join(folder, name);
  await writeFile(path, bytes);
  await navigate(browser, runtime.webOrigin + '/capture/file');
  await waitFor(browser, 'Boolean(document.querySelector("input[name=file]"))', 'file capture');
  await chooseFile(path);
  await evaluate(browser, 'document.querySelector("form").requestSubmit()');
  await waitFor(
    browser, 'Boolean(document.querySelector("a[href^=\"/items/\"]")) && document.body.textContent.includes("Original bytes finalized")',
    'canonical file Saved state',
  );
  const id = await evaluate(browser, 'document.querySelector("a[href^=\"/items/\"]").getAttribute("href").split("/").pop()');
  const details = await apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
  assert.equal(details.item.source_type, mime === 'image/png' ? 'image' : 'file');
  assert.equal(details.attachments.length, 1);
  const attachment = details.attachments[0];
  assert.equal(attachment.status, 'linked');
  assert.equal(attachment.size_bytes, bytes.length);
  assert.equal(attachment.content_hash, createHash('sha256').update(bytes).digest('hex'));
  await navigate(browser, runtime.webOrigin + '/items/' + id);
  const observed = await evaluate(browser, `(async () => {
    const response = await fetch('/api/v1/attachments/${attachment.id}/content', { credentials: 'include' });
    if (!response.ok) return { status: response.status };
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    return { status: response.status, length: bytes.byteLength, hash };
  })()`);
  assert.deepEqual(observed, {
    status: 200, length: bytes.length,
    hash: createHash('sha256').update(bytes).digest('hex'),
  });
  report('BG18-original-linked', { mime, bytes: bytes.length, verified_browser_hash: true });
}

try {
  folder = await mkdtemp(join(tmpdir(), 'recollect-bg18-upload-'));
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg18-capture-' + randomUUID(),
    adminToken,
    localWorkerToken: 'bg18-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await verifyOriginal('bg18.pdf', 'application/pdf', pdf);
  await verifyOriginal('bg18.png', 'image/png', png);

  const invalidPath = join(folder, 'blocked.exe');
  await writeFile(invalidPath, 'not a supported document');
  await navigate(browser, runtime.webOrigin + '/capture/file');
  await waitFor(browser, 'Boolean(document.querySelector("input[name=file]"))', 'file capture');
  await chooseFile(invalidPath);
  await evaluate(browser, 'document.querySelector("form").requestSubmit()');
  await waitFor(browser, 'document.body.textContent.includes("file type is not supported")', 'bad file rejection');
  report('BG18-rejected-type');

  report('BG18-browser-acceptance', { status: 'passed', environment: 'isolated Chrome, Worker/D1 and R2' });
} catch (error) {
  console.error('BG18_BROWSER_FAILURE ' + JSON.stringify({
    reason: error instanceof Error ? error.message : String(error),
    recent_api: safeDiagnostics(browser),
  }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
  if (folder) await rm(folder, { recursive: true, force: true });
}
