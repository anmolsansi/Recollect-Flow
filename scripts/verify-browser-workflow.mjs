/* global process, console, URLSearchParams */
import assert from 'node:assert/strict';
import { recordBrowserFailure } from './bg14-browser-failure.mjs';
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import {
  apiRequest,
  captureFixture,
  openBrowser,
  login,
  navigate,
  evaluate,
  waitFor,
  clickButton,
  fillLabel,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const captureToken = 'bg14-capture-' + randomUUID();
const adminToken = 'bg14-admin-' + randomUUID();
const localWorkerToken = 'bg14-worker-' + randomUUID();
const marker = randomUUID().replaceAll('-', '');
const internalPhrase = 'bgfourteen' + marker;
const ownerTitle = 'Owner preserved title ' + marker;
const originalUrl = 'https://example.com/bg14-controlled-' + marker;
let runtime, browser;

async function detail(itemId) {
  return apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + itemId);
}
async function inbox(filter = '', q = '') {
  const params = new URLSearchParams({ limit: '25' });
  if (filter) params.set('lifecycle_status', filter);
  if (q) params.set('q', q);
  return apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items?' + params);
}
async function show(itemId) {
  await navigate(browser, runtime.webOrigin + '/items/' + itemId);
  await waitFor(
    browser,
    '[...document.querySelectorAll("h2")].some(h=>h.textContent?.trim()==="Review")',
    'real item detail',
  );
}
function visible(expression) {
  return evaluate(browser, expression);
}
async function assertUiHas(value, stage) {
  await waitFor(
    browser,
    'document.body.innerText.includes(' + JSON.stringify(value) + ')',
    stage,
  );
}
async function run() {
  runtime = await createLocalAcceptanceRuntime({
    captureToken,
    adminToken,
    localWorkerToken,
  });
  // Unique local synthetic capture; never a live third-party fetch.
  const textItemId = await captureFixture(runtime.apiOrigin, captureToken, {
    source_type: 'note',
    shared_text: 'RecollectFlow searchable ' + internalPhrase,
    user_reason: 'BG-14 local browser search regression',
  });
  const urlItemId = await captureFixture(runtime.apiOrigin, captureToken, {
    source_type: 'url',
    url: originalUrl,
    privacy_level: 'public',
    user_reason: 'BG-14 controlled URL status failure',
  });
  assert.notEqual(textItemId, urlItemId);
  report('isolated-fixtures', { count: 2 });

  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  assert.equal(await visible('location.href.includes("token=")'), false);
  report('real-login', { cookie: 'httpOnly/strict', storage: 'no token' });

  await show(textItemId);
  await waitFor(
    browser,
    'Boolean(document.querySelector("textarea[readonly]")?.value.includes("RecollectFlow"))',
    'note raw evidence visible in detail',
  );
  // Concurrency: the server changes while a stale browser draft is still open.
  const before = await detail(textItemId);
  const externalTitle = 'Concurrent owner title ' + marker;
  await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'PATCH',
    '/items/' + textItemId,
    {
      edit_version: before.item.edit_version,
      title: externalTitle,
    },
  );
  await fillLabel(browser, 'Title', 'Stale browser edit ' + marker);
  await clickButton(browser, 'Save changes');
  await assertUiHas(
    'changed and was refreshed',
    'version conflict error visible',
  );
  assert.equal((await detail(textItemId)).item.title, externalTitle);
  report('stale-version-conflict', {
    response: '409 VERSION_CONFLICT, browser refreshed',
  });

  await fillLabel(browser, 'Title', ownerTitle);
  await clickButton(browser, 'Save changes');
  await assertUiHas('Changes saved.', 'owner title save');
  assert.equal((await detail(textItemId)).item.title, ownerTitle);
  report('owner-edit', { title: 'saved as field override' });

  // Search from the visible Inbox input, not by a direct API-only call.
  await clickButton(browser, '← Back to Inbox');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[aria-label="Search"]\'))',
    'search input',
  );
  await evaluate(
    browser,
    '(() => {const el=document.querySelector(\'input[aria-label="Search"]\');' +
      'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,' +
      JSON.stringify(internalPhrase) +
      ');' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));return true;})()',
  );
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'a[href="/items/' + textItemId + '"]\'))',
    'search result for internal phrase',
    15000,
  );
  report('browser-search', {
    item_id: 'synthetic',
    result: 'matched internal phrase',
  });

  // Complete a controlled worker failure without requesting external source URLs.
  const jobs = await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'GET',
    '/jobs?kind=processing&type=acquire_url&item_id=' + urlItemId,
  );
  const pending = jobs.jobs.find(
    (job) => job.jobType === 'acquire_url' && job.status === 'pending',
  );
  assert.ok(pending, 'Expected current-generation pending acquire_url job');
  const workerOwner = 'bg14-owner-' + randomUUID();
  const leased = await apiRequest(
    runtime.apiOrigin,
    localWorkerToken,
    'POST',
    '/worker/jobs/lease',
    {
      job_type: 'acquire_url',
      owner_id: workerOwner,
      limit: 25,
    },
  );
  assert.ok(
    leased.jobs.some((job) => job.id === pending.id),
    'Fixture job not leased by synthetic worker',
  );
  await apiRequest(
    runtime.apiOrigin,
    localWorkerToken,
    'POST',
    '/worker/jobs/' + pending.id + '/fail',
    {
      owner_id: workerOwner,
      error_code: 'BG14_SYNTHETIC_SOURCE_UNAVAILABLE',
      retryable: false,
    },
  );
  const failed = await detail(urlItemId);
  const failedJob = failed.processing_jobs.find((job) => job.id === pending.id);
  assert.equal(failedJob?.visibleStatus, 'failed');
  assert.equal(failed.item.processing_status, 'failed');
  await show(urlItemId);
  await assertUiHas('Processing:', 'item aggregate visible');
  await assertUiHas('failed', 'job failed and aggregate failed visible');
  await assertUiHas(
    'BG14_SYNTHETIC_SOURCE_UNAVAILABLE',
    'safe error code visible',
  );
  report('atomic-failure', {
    job: 'failed',
    item: 'failed',
    source_requests: 0,
  });

  // The real browser retries the URL. We do not execute the queued outbound fetch.
  await clickButton(browser, 'Retry page fetch');
  await assertUiHas('Source fetch queued.', 'real browser retry feedback');
  const retried = await detail(urlItemId);
  assert.ok(
    retried.processing_jobs.some(
      (j) => j.jobType === 'acquire_url' && j.visibleStatus === 'pending',
    ),
    'Retry must leave an observable pending acquisition job',
  );
  report('retry-action', {
    status: 'queued; external fetch deliberately not executed',
  });

  // Preserve a user-entered title across generation-changing owner-source recovery.
  const urlBefore = await detail(urlItemId);
  await apiRequest(
    runtime.apiOrigin,
    adminToken,
    'PATCH',
    '/items/' + urlItemId,
    {
      edit_version: urlBefore.item.edit_version,
      title: ownerTitle,
    },
  );
  await show(urlItemId);
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'textarea[placeholder^="Paste an excerpt"]\'))',
    'source recovery editor',
  );
  await evaluate(
    browser,
    '(() => { const el=document.querySelector(\'textarea[placeholder^="Paste an excerpt"]\');' +
      'Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(el,' +
      JSON.stringify('BG14 owner evidence ' + internalPhrase) +
      ' );' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));return true;})()',
  );
  await clickButton(browser, 'Save supplied text');
  await assertUiHas(
    'Owner-supplied source text saved.',
    'real recovery action',
  );
  const recovered = await detail(urlItemId);
  assert.equal(
    recovered.item.title,
    ownerTitle,
    'Owner override must survive source processing',
  );
  assert.equal(
    recovered.item.raw_text,
    'BG14 owner evidence ' + internalPhrase,
  );
  assert.equal(recovered.item.source_url, originalUrl);
  report('owner-source-recovery', {
    raw_text: 'preserved',
    url: 'preserved',
    title: 'preserved',
  });

  // Browser lifecycle controls must agree with normal and Deleted search.
  await clickButton(browser, 'Soft delete');
  await assertUiHas('Item moved to Deleted.', 'soft delete feedback');
  assert.equal((await detail(urlItemId)).item.lifecycle_status, 'Deleted');
  assert.equal(
    (await inbox('', internalPhrase)).some((x) => x.id === urlItemId),
    false,
  );
  // Search envelope is an array for /items; apiRequest returns data array.
  const deleted = await inbox('Deleted');
  assert.ok(
    Array.isArray(deleted) && deleted.some((x) => x.id === urlItemId),
    'Deleted filter did not include fixture',
  );
  await clickButton(browser, 'Restore item');
  await assertUiHas('Item restored.', 'restore feedback');
  assert.equal((await detail(urlItemId)).item.deleted_at, null);
  report('lifecycle', { delete: 'filtered', restore: 'visible' });

  await browser.client.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    },
    browser.sessionId,
  );
  const width = await visible(
    '({viewport:innerWidth,document:document.documentElement.scrollWidth})',
  );
  assert.ok(
    width.document <= width.viewport + 8,
    'Mobile viewport overflow: ' + JSON.stringify(width),
  );
  await browser.client.send(
    'Emulation.clearDeviceMetricsOverride',
    {},
    browser.sessionId,
  );
  report('mobile-viewport', { viewport: 390 });

  await navigate(browser, runtime.webOrigin + '/');
  await clickButton(browser, 'Logout');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'logged-out form',
  );
  const anonymous = await visible(
    'fetch("/api/v1/items/' +
      urlItemId +
      '",{credentials:"include"}).then(r=>r.status)',
  );
  assert.equal(anonymous, 401, 'Logout must deny private item reads');
  report('logout', { private_read: 401 });
  report('browser-workflow', {
    status: 'passed',
    kind: 'isolated local Chrome/D1/R2',
  });
}
try {
  await run();
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  await recordBrowserFailure(browser, reason).catch(() => undefined);
  console.error(
    'BG14_BROWSER_FAILURE ' +
      JSON.stringify({ reason, requests: safeDiagnostics(browser) }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
}
