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

const adminToken = 'bg26-admin-' + randomUUID();
let runtime, browser;

try {
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg26-capture-' + randomUUID(),
    adminToken,
    localWorkerToken: 'bg26-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await navigate(browser, runtime.webOrigin + '/operations');
  await waitFor(
    browser,
    'document.body.innerText.includes("Latest refresh succeeded.")',
    'operations initial load',
  );
  await waitFor(
    browser,
    'document.body.innerText.includes("AI usage and quota") && document.body.innerText.includes("Processing and Notion backlog")',
    'operations sections',
  );
  const text = await evaluate(browser, 'document.body.innerText');
  assert.ok(text.includes('No active usage windows returned'));
  assert.ok(text.includes('provider billing dashboard'));
  assert.ok(text.includes('Actual R2 bucket objects/bytes'));
  assert.ok(text.includes('Unavailable, no verified backup recorded'));
  assert.equal(
    text.includes(adminToken),
    false,
    'No admin token in dashboard text',
  );
  const requests = browser.responses.filter((v) =>
    ['/api/v1/usage', '/api/v1/operations/summary'].includes(v.path),
  );
  assert.equal(requests.filter((x) => x.status === 200).length, 2);
  report('BG26-live-admin-summary');

  await browser.client.send(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    browser.sessionId,
  );
  await clickButton(browser, 'Refresh');
  await waitFor(
    browser,
    'document.body.innerText.includes("Stale snapshot")',
    'visible stale reading after network outage',
  );
  assert.ok(
    (await evaluate(browser, 'document.body.innerText')).includes(
      'No active usage windows returned',
    ),
    'Last good snapshot must remain readable and visibly stale',
  );
  report('BG26-stale-and-last-good-snapshot');

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
  await clickButton(browser, 'Refresh');
  await waitFor(
    browser,
    'document.body.innerText.includes("Latest refresh succeeded.") && !document.body.innerText.includes("Stale snapshot")',
    'recovered operations reading',
  );
  report('BG26-error-recovery');

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
    'Operations layout overflow',
  );
  report('BG26-mobile-layout', { width: viewport.width });
} catch (error) {
  console.error(
    'BG26_BROWSER_FAILURE ' +
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
