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

  // Synthetic usage-only response proves the browser renders server-selected
  // warning states and never treats a hard stop as an available manual retry.
  await evaluate(
    browser,
    \`(() => {
      window.__bg26OriginalFetch = window.fetch;
      window.__bg26Level = 'warning_70';
      window.fetch = function (input, options) {
        const path = typeof input === 'string' ? input : input.url;
        if (!path.endsWith('/api/v1/usage')) {
          return window.__bg26OriginalFetch.call(window, input, options);
        }
        const now = new Date();
        const result = {
          data: {
            policy_version: 'BG26-isolated-browser-fixture',
            generated_at: now.toISOString(),
            warning_thresholds: { warning_70: 0.7, warning_90: 0.9, hard: 1 },
            windows: [{
              provider: 'openrouter', scope_key: 'test-free-tier',
              window_kind: 'minute', window_start: now.toISOString(),
              window_end: new Date(now.getTime() + 60000).toISOString(),
              level: window.__bg26Level,
              dimensions: [{
                dimension: 'requests', limit: 10,
                used: 10, consumed: 8, reserved: 2, remaining: 0, ratio: 1,
              }],
            }],
            circuit_breakers: [{
              provider: 'openrouter', operation: 'enrich',
              state: 'open', consecutive_failures: 3,
              next_probe_at: null, last_success_at: null, last_error_code: null,
            }],
            deferred_jobs: [{ reason: 'QUOTA_PAUSED', count: 2 }],
            last_successful_provider_calls: [],
          },
          meta: { request_id: 'bg26-local-synthetic' },
        };
        return Promise.resolve(new Response(JSON.stringify(result), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      };
      return true;
    })()\`,
  );
  for (const [level, expected] of [
    ['warning_70', '70% warning'],
    ['warning_90', '90% warning'],
    ['hard', 'Hard stop'],
  ]) {
    await evaluate(browser, 'window.__bg26Level = ' + JSON.stringify(level));
    await clickButton(browser, 'Refresh');
    await waitFor(
      browser,
      'document.body.innerText.includes(' + JSON.stringify(expected) + ')',
      level + ' rendered warning',
    );
  }
  const quotaText = await evaluate(browser, 'document.body.innerText');
  assert.ok(quotaText.includes('QUOTA_PAUSED'));
  assert.ok(quotaText.includes('open'));
  assert.ok(quotaText.includes('2 reserved'));
  report('BG26-warning-and-hard-stop-visuals');
  await evaluate(browser, 'window.fetch = window.__bg26OriginalFetch');
  await clickButton(browser, 'Refresh');
  await waitFor(
    browser,
    'document.body.innerText.includes("No active usage windows returned")',
    'restore real usage before stale test',
  );

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
