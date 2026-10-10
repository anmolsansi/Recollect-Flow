/* global process, console */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import {
  openBrowser,
  login,
  navigate,
  waitFor,
  evaluate,
  clickButton,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg17-admin-' + randomUUID();
let runtime, browser;

async function begin() {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(
    browser,
    'Boolean(document.querySelector("form.capture-form"))',
    'capture form',
  );
}
async function enterText(value) {
  await evaluate(
    browser,
    `(() => {
    document.querySelector('input[name="mode"][value="note"]').click();
    const el = document.querySelector('[name="shared_text"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`,
  );
}
async function countEntries() {
  return evaluate(
    browser,
    'document.querySelectorAll(".capture-queued-entry").length',
  );
}
async function enableRecovery() {
  await evaluate(
    browser,
    'document.querySelector(".capture-recovery-controls input[type=checkbox]").click()',
  );
  await waitFor(
    browser,
    'localStorage.getItem("recollect:capture-recovery-enabled-v1") === "yes"',
    'durable preference',
  );
}
async function submit() {
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
}
async function savedId() {
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'a[href^="/items/"]\'))',
    'canonical saved link',
  );
  return evaluate(
    browser,
    'document.querySelector(\'a[href^="/items/"]\').getAttribute("href").split("/").pop()',
  );
}

try {
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg17-capture-' + randomUUID(),
    adminToken,
    localWorkerToken: 'bg17-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await begin();

  assert.equal(
    await evaluate(
      browser,
      'document.querySelector(".capture-recovery-controls input").checked',
    ),
    false,
  );
  await enableRecovery();
  report('durable-opt-in-not-default');

  // Fail the browser response only AFTER Worker/D1 has committed and responded.
  let committed = null;
  let dropCount = 0;
  const unsubscribe = browser.client.on(
    'Fetch.requestPaused',
    async (message) => {
      const p = message.params;
      if (!p?.request?.url?.includes('/api/v1/captures')) {
        await browser.client.send(
          'Fetch.continueRequest',
          { requestId: p.requestId },
          browser.sessionId,
        );
        return;
      }
      if (!dropCount && p.responseStatusCode) {
        dropCount++;
        try {
          const data = await browser.client.send(
            'Fetch.getResponseBody',
            { requestId: p.requestId },
            browser.sessionId,
          );
          committed = JSON.parse(
            data.base64Encoded
              ? Buffer.from(data.body, 'base64').toString('utf8')
              : data.body,
          ).data.capture_id;
        } finally {
          await browser.client.send(
            'Fetch.failRequest',
            { requestId: p.requestId, errorReason: 'Failed' },
            browser.sessionId,
          );
        }
      } else {
        await browser.client.send(
          'Fetch.continueRequest',
          { requestId: p.requestId },
          browser.sessionId,
        );
      }
    },
  );
  await browser.client.send(
    'Fetch.enable',
    {
      patterns: [{ urlPattern: '*api/v1/captures', requestStage: 'Response' }],
    },
    browser.sessionId,
  );
  await enterText('BG17 commit-response-lost ' + randomUUID());
  await submit();
  await waitFor(
    browser,
    'document.body.textContent.includes("This request may have reached the server")',
    'uncertain operation after lost response',
  );
  assert.ok(committed, 'Worker committed original request');
  assert.equal(await countEntries(), 1);
  await browser.client.send('Fetch.disable', {}, browser.sessionId);
  unsubscribe();

  await begin();
  await waitFor(
    browser,
    'document.querySelectorAll(".capture-queued-entry").length === 1',
    'saved retry restored after reload',
  );
  await clickButton(browser, 'Retry original');
  assert.equal(
    await savedId(),
    committed,
    'same key must replay same D1 capture ID',
  );
  await begin();
  assert.equal(
    await countEntries(),
    0,
    'acknowledged result must not reopen after reload',
  );
  report('lost-response-same-id-replayed-and-cleared');

  // Offline BEFORE sending. No misleading Saved state or automatic retry.
  await browser.client.send(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    browser.sessionId,
  );
  await enterText('BG17 offline-before-send ' + randomUUID());
  await submit();
  await waitFor(
    browser,
    'document.querySelectorAll(".capture-queued-entry").length === 1',
    'offline operation retained',
  );
  await browser.client.send(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    browser.sessionId,
  );
  await begin();
  await waitFor(
    browser,
    'document.querySelectorAll(".capture-queued-entry").length === 1',
    'offline persisted operation restored',
  );
  assert.equal(
    await evaluate(
      browser,
      'document.body.textContent.includes("Processing status:")',
    ),
    false,
  );
  await clickButton(browser, 'Retry original');
  assert.ok(await savedId());
  report('offline-before-send-restored');

  // Disable persistence, verify explicitly stored operations are cleared.
  await begin();
  await browser.client.send(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    browser.sessionId,
  );
  await enterText('BG17 memory-only ' + randomUUID());
  await submit();
  await waitFor(
    browser,
    'document.querySelectorAll(".capture-queued-entry").length === 1',
    'memory-only test operation',
  );
  await browser.client.send(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    browser.sessionId,
  );
  await evaluate(
    browser,
    'document.querySelector(".capture-recovery-controls input[type=checkbox]").click()',
  );
  await waitFor(
    browser,
    'localStorage.getItem("recollect:capture-recovery-enabled-v1") === null',
    'disabled persistence flag',
  );
  await begin();
  assert.equal(
    await countEntries(),
    0,
    'memory-only operation cannot survive reload',
  );
  report('nonpersistent-clear-on-reload');

  report('BG17-browser-recovery', {
    status: 'passed',
    environment: 'isolated Worker/D1/Chrome',
  });
} catch (error) {
  console.error(
    'BG17_BROWSER_FAILURE ' +
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
        recent_api: safeDiagnostics(browser),
      }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
}
