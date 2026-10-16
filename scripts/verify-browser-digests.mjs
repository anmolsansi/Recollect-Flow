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
  apiRequest,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg27-admin-' + randomUUID();
let runtime, browser;

try {
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg27-capture-' + randomUUID(),
    adminToken,
    localWorkerToken: 'bg27-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await navigate(browser, runtime.webOrigin + '/digests');
  await waitFor(
    browser,
    'document.body.innerText.includes("No digest has been generated yet")',
    'digest review empty state',
  );
  assert.equal(
    browser.responses.some(
      (response) =>
        response.path.endsWith('/deliver') && response.method === 'POST',
    ),
    false,
  );
  report('BG27-admin-digest-empty-state');

  await clickButton(browser, 'Generate preview only');
  await waitFor(
    browser,
    'document.body.innerText.includes("Preview generated.")',
    'manual digest preview generated',
  );
  await waitFor(
    browser,
    'document.body.innerText.includes("Empty period.")',
    'empty digest suppression shown',
  );
  const selected = await evaluate(
    browser,
    'document.querySelector("#digest-run").value',
  );
  assert.ok(selected, 'No generated digest run ID');
  const detail = await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'GET',
    '/digests/' + encodeURIComponent(selected),
  );
  assert.equal(detail.preview.empty, true);
  assert.equal(detail.preview.currentEligibleCount, 0);
  assert.equal(detail.deliveries.length, 0);
  assert.ok(
    (await evaluate(browser, 'document.body.innerText')).includes(
      'Asia/Kolkata',
    ),
  );
  report('BG27-preview-does-not-send');

  await clickButton(browser, 'Mark reviewed');
  await waitFor(
    browser,
    'document.body.innerText.includes("Digest marked reviewed.")',
    'manual digest review saved',
  );
  const reviewed = await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'GET',
    '/digests/' + encodeURIComponent(selected),
  );
  assert.equal(reviewed.run.reviewStatus, 'reviewed');
  assert.equal(reviewed.deliveries.length, 0);
  const queueDisabled = await evaluate(
    browser,
    '[...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Queue reviewed digest")?.disabled',
  );
  assert.equal(queueDisabled, true, 'Empty period must not offer a send');
  report('BG27-review-is-separate-from-queue');

  await clickButton(browser, 'Regenerate preview');
  await waitFor(
    browser,
    'document.body.innerText.includes("New generation created for review.")',
    'regenerated preview',
  );
  await waitFor(
    browser,
    'document.querySelector("#digest-run")?.value !== ' +
      JSON.stringify(selected),
    'new generation selected',
  );
  const replacement = await evaluate(
    browser,
    'document.querySelector("#digest-run").value',
  );
  const regenerated = await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'GET',
    '/digests/' + encodeURIComponent(replacement),
  );
  assert.equal(regenerated.run.reviewStatus, 'generated');
  assert.equal(regenerated.run.generationVersion, 2);
  assert.equal(regenerated.deliveries.length, 0);
  report('BG27-regeneration-requires-new-review');

  await evaluate(
    browser,
    `(() => {
      window.__bg27Fetch = window.fetch;
      window.fetch = async function(input, options) {
        const response = await window.__bg27Fetch.call(window, input, options);
        const path = typeof input === 'string' ? input : input.url;
        if (!path.includes('/api/v1/digests/')) return response;
        if (path.includes('/generate') || path.includes('/regenerate') ||
            path.includes('/review') || path.includes('/deliver') ||
            !path.endsWith(${JSON.stringify('/' + replacement)})) {
          return response;
        }
        const envelope = await response.clone().json();
        envelope.data.deliveries = [{
          id: 'synthetic-unknown',
          state: 'unknown',
          attempts: 1,
          availableAt: new Date().toISOString(),
          leaseExpiresAt: null,
          lastErrorCode: 'TELEGRAM_TIMEOUT_AMBIGUOUS',
          telegramMessageId: null,
          sentAt: null,
        }];
        return new Response(JSON.stringify(envelope), {
          status: response.status,
          headers: {'Content-Type': 'application/json'},
        });
      };
      return true;
    })()`,
  );
  await clickButton(browser, 'Refresh current state');
  await waitFor(
    browser,
    'document.body.innerText.includes("Delivery outcome unknown.")',
    'unknown-delivery reconciliation prompt',
  );
  const unknownText = await evaluate(browser, 'document.body.innerText');
  assert.ok(unknownText.includes('TELEGRAM_TIMEOUT_AMBIGUOUS'));
  assert.equal(unknownText.includes('Retry definite failure'), false);
  assert.equal(
    await evaluate(
      browser,
      '[...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Record verified reconciliation")?.disabled',
    ),
    true,
  );
  report('BG27-unknown-requires-evidence-not-retry');

  await browser.client.send(
    'Emulation.setDeviceMetricsOverride',
    { width: 375, height: 812, deviceScaleFactor: 1, mobile: true },
    browser.sessionId,
  );
  const viewport = await evaluate(
    browser,
    '({ width: innerWidth, scroll: document.documentElement.scrollWidth })',
  );
  assert.ok(
    viewport.scroll <= viewport.width + 8,
    'Digest review layout overflow',
  );
  report('BG27-mobile-layout');

  await evaluate(browser, 'window.fetch = window.__bg27Fetch');
  await browser.client.send('Network.clearBrowserCookies', {}, browser.sessionId);
  await navigate(browser, runtime.webOrigin + '/items/' + replacement);
  await waitFor(
    browser,
    'document.body.innerText.includes("Admin Access")',
    'deep link requires real admin session',
  );
  report('BG27-logged-out-deep-link-gate');
} catch (error) {
  console.error(
    'BG27_BROWSER_FAILURE ' +
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
