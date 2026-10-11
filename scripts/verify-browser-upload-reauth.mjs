/* global process, console, Buffer */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { waitUntil } from './browser-cdp.mjs';
import { createBg21Preview } from './bg21-preview-runtime.mjs';
import { buildBrowserFixtures } from './browser-acceptance-fixtures.mjs';
import {
  openBrowser,
  login,
  navigate,
  waitFor,
  evaluate,
  clickButton,
  apiRequest,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg22-upload-owner-' + randomUUID();
const captureToken = 'bg22-upload-capture-' + randomUUID();
let runtime, browser, folder;

async function chooseFile(path) {
  const dom = await browser.client.send('DOM.getDocument', { depth: -1 }, browser.sessionId);
  const field = await browser.client.send(
    'DOM.querySelector',
    { nodeId: dom.root.nodeId, selector: 'input[name="file"]' },
    browser.sessionId,
  );
  assert.ok(field.nodeId, 'File picker missing');
  await browser.client.send(
    'DOM.setFileInputFiles',
    { nodeId: field.nodeId, files: [path] },
    browser.sessionId,
  );
  await waitFor(
    browser,
    'document.querySelector(\'input[name="file"]\')?.files?.length === 1',
    'matching original file selected',
  );
}

async function queuedOperation() {
  return evaluate(
    browser,
    `(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('recollect-capture-recovery', 2);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const operations = await new Promise((resolve, reject) => {
        const req = db.transaction('operations', 'readonly').objectStore('operations').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return operations.filter(operation => operation.attachment).map(operation => ({
        id: operation.id,
        reservationKey: operation.attachment.reservationKey,
        attachmentId: operation.attachment.attachmentId,
        stage: operation.stage,
      }));
    })()`,
  );
}

try {
  const fixture = buildBrowserFixtures(randomUUID()).find((value) => value.kind === 'pdf');
  assert.ok(fixture);
  folder = await mkdtemp(join(tmpdir(), 'recollect-bg22-reauth-'));
  const filePath = join(folder, fixture.filename);
  await writeFile(filePath, fixture.bytes);
  runtime = await createBg21Preview({ port: 8998, adminToken, captureToken });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(
    browser,
    'Boolean(document.querySelector(".capture-recovery-controls input[type=checkbox]"))',
    'durable browser-recovery preference',
  );
  await evaluate(browser, 'document.querySelector(".capture-recovery-controls input[type=checkbox]").click()');
  await waitFor(
    browser,
    'localStorage.getItem("recollect:capture-recovery-enabled-v1") === "yes"',
    'recovery enabled before file upload',
  );
  await navigate(browser, runtime.webOrigin + '/capture/file');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[name="file"]\'))',
    'file form ready',
  );
  await chooseFile(filePath);

  let intercepted = false;
  const unsubscribe = browser.client.on('Fetch.requestPaused', async (message) => {
    const request = message.params;
    if (intercepted) {
      await browser.client.send(
        'Fetch.continueRequest',
        { requestId: request.requestId },
        browser.sessionId,
      );
      return;
    }
    intercepted = true;
    await browser.client.send(
      'Network.deleteCookies',
      { name: 'admin_session', url: runtime.webOrigin },
      browser.sessionId,
    );
    const payload = Buffer.from(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Login required' } }),
    ).toString('base64');
    await browser.client.send(
      'Fetch.fulfillRequest',
      {
        requestId: request.requestId,
        responseCode: 401,
        responseHeaders: [{ name: 'content-type', value: 'application/json' }],
        body: payload,
      },
      browser.sessionId,
    );
  });
  await browser.client.send(
    'Fetch.enable',
    { patterns: [{ urlPattern: '*api/v1/uploads/*/content', requestStage: 'Request' }] },
    browser.sessionId,
  );
  await evaluate(browser, 'document.querySelector("form").requestSubmit()');
  await waitUntil(() => intercepted, {
    timeoutMs: 20000,
    description: 'file transfer intercepted after reservation',
  });
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    '401 file transfer triggers real sign-in',
    20000,
  );
  await browser.client.send('Fetch.disable', {}, browser.sessionId);
  unsubscribe();

  const before = await queuedOperation();
  assert.equal(before.length, 1, 'One unsettled original upload retained');
  assert.ok(before[0].reservationKey, 'Original attachment reservation missing');
  report('BG22-expired-file-upload-retains-operation', { stage: before[0].stage });

  await login(browser, runtime.webOrigin, adminToken);
  await navigate(browser, runtime.webOrigin + '/capture/file');
  await waitFor(
    browser,
    'Boolean(document.querySelector(".capture-queued-entry"))',
    'pending file operation restored after login',
  );
  const after = await queuedOperation();
  assert.deepEqual(after, before, 'Reauthentication must not replace the original operation');
  await clickButton(browser, 'Resume this save');
  await waitFor(
    browser,
    'document.body.textContent.includes("Retry needed.")',
    'file recovery stage available',
  );
  await chooseFile(filePath);
  await clickButton(browser, 'Retry original save');
  await waitFor(
    browser,
    'document.body.textContent.includes("Original bytes finalized") && Boolean(document.querySelector(\'a[href^="/items/"]\'))',
    'file upload resumed and finalized',
    25000,
  );
  const id = await evaluate(
    browser,
    'document.querySelector(\'a[href^="/items/"]\').getAttribute("href").split("/").pop()',
  );
  const item = await apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
  assert.equal(item.attachments.length, 1, 'Retry must link exactly one original');
  assert.equal(item.attachments[0].status, 'linked');
  assert.equal(item.attachments[0].content_hash, fixture.sha256);
  assert.equal(item.attachments[0].size_bytes, fixture.sizeBytes);
  assert.equal(item.provenance.capture_events.length, 1, 'No second logical capture event');
  assert.deepEqual(await queuedOperation(), [], 'Acknowledged upload clears retained retry');
  report('BG22-expired-file-upload-reauth-and-single-original', {
    capture_id: id,
    attachment_id: item.attachments[0].id,
    sha256_verified: true,
  });
} catch (error) {
  console.error(
    'BG22_UPLOAD_REAUTH_FAILURE ' +
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
        recent_api: safeDiagnostics(browser),
      }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
  if (folder) await rm(folder, { recursive: true, force: true });
}
