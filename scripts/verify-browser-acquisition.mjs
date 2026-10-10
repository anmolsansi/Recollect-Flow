/* global fetch, process, console */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { waitUntil } from './browser-cdp.mjs';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import {
  captureFixture,
  apiRequest,
  openBrowser,
  login,
  navigate,
  waitFor,
  evaluate,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';
import { recordBrowserFailure } from './bg14-browser-failure.mjs';

// A reserved public-looking URL is intercepted only by the test-only Worker.
const fixtureUrl =
  'https://example.com/bg14-fixture-' + randomUUID().replaceAll('-', '');
const phrase = 'birch lantern quartz meadow';
const captureToken = 'bg14-positive-capture-' + randomUUID();
const adminToken = 'bg14-positive-admin-' + randomUUID();
const localWorkerToken = 'bg14-positive-worker-' + randomUUID();
let runtime, browser, capturedItemId;

async function exercise() {
  runtime = await createLocalAcceptanceRuntime({
    captureToken,
    adminToken,
    localWorkerToken,
    enableScheduled: true,
    fixtureWorker: true,
  });
  const itemId = await captureFixture(runtime.apiOrigin, captureToken, {
    source_type: 'url',
    url: fixtureUrl,
    privacy_level: 'public',
    user_reason: 'BG14 isolated positive acquisition proof',
  });
  capturedItemId = itemId;
  assert.match(itemId, /^[0-9a-f-]{36}$/i);
  // The fixture entrypoint invokes only the real acquisition service and
  // a bounded upstream fetch mock; no delivery or external network occurs.
  const scheduledRoutes = [
    '/__scheduled?cron=17%20*%20*%20*%20*',
    '/cdn-cgi/local/scheduled?cron=17%20*%20*%20*%20*',
  ];
  let triggered = false;
  for (const route of scheduledRoutes) {
    const res = await fetch(runtime.apiOrigin + route);
    if (res.ok) {
      triggered = true;
      break;
    }
  }
  assert.ok(triggered, 'Wrangler local scheduled trigger unavailable');
  const result = await waitUntil(
    async () => {
      const value = await apiRequest(
        runtime.apiOrigin,
        adminToken,
        'GET',
        '/items/' + itemId,
      );
      return value.url_acquisition ? value : false;
    },
    {
      timeoutMs: 15000,
      intervalMs: 350,
      description: 'public fixture source acquisition',
    },
  );
  assert.equal(
    result.url_acquisition.status,
    'acquired_text',
    'Public fixture did not produce acquired text',
  );
  assert.ok(
    result.url_acquisition.acquired_text.includes(phrase),
    'Missing internal source phrase',
  );
  assert.equal(
    result.item.source_url,
    fixtureUrl,
    'Original source URL must remain unchanged',
  );
  report('real-url-acquisition', {
    status: result.url_acquisition.status,
    source: 'test-only Worker upstream response, real parser and D1',
  });

  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await navigate(browser, runtime.webOrigin + '/items/' + itemId);
  await waitFor(
    browser,
    'Boolean(document.querySelector("textarea[readonly]")?.value.includes(' +
      JSON.stringify(phrase) +
      '))',
    'acquired phrase in read-only source detail',
  );
  await waitFor(
    browser,
    'document.body.innerText.includes("acquired_text")',
    'successful acquisition status',
  );
  await navigate(browser, runtime.webOrigin + '/');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[aria-label="Search"]\'))',
    'Inbox search',
  );
  await evaluate(
    browser,
    '(() => {const el=document.querySelector(\'input[aria-label="Search"]\');' +
      'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,' +
      JSON.stringify(phrase) +
      ');' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));return true;})()',
  );
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'a[href="/items/' + itemId + '"]\'))',
    'source phrase found by real Inbox search',
    16000,
  );
  report('acquired-text-search', {
    result: 'isolated source fixture is searchable in real Inbox',
  });
}

try {
  await exercise();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  await recordBrowserFailure(browser, reason, 'url-acquisition').catch(
    () => undefined,
  );
  console.error(
    'BG14_URL_ACQUISITION_ERROR ' +
      JSON.stringify({ reason, requests: safeDiagnostics(browser) }),
  );
  const jobs = runtime
    ? await apiRequest(
        runtime.apiOrigin,
        adminToken,
        'GET',
        '/jobs?kind=processing&type=acquire_url',
      ).catch(() => null)
    : null;
  const item =
    capturedItemId && runtime
      ? await apiRequest(
          runtime.apiOrigin,
          adminToken,
          'GET',
          '/items/' + capturedItemId,
        ).catch(() => null)
      : null;
  console.error(
    'BG14_SOURCE_DIAGNOSTICS ' +
      JSON.stringify({
        jobs: jobs?.jobs?.map((j) => ({
          status: j.status,
          job_type: j.jobType,
          last_error_code: j.lastErrorCode,
        })),
        acquisition_status: item?.url_acquisition?.status ?? null,
        worker_events: (runtime?.worker?.logs ?? [])
          .filter((v) =>
            /url_acquisition|scheduled_cron|SOURCE_|Error|error|Warning/.test(
              v,
            ),
          )
          .slice(-16),
      }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
}
