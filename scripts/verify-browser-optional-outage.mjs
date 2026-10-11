/* global process, console, fetch */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBg21Preview } from './bg21-preview-runtime.mjs';
import {
  openBrowser,
  login,
  navigate,
  waitFor,
  evaluate,
  apiRequest,
  fillLabel,
  clickButton,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg22-outage-owner-' + randomUUID();
const captureToken = 'bg22-outage-capture-' + randomUUID();
const phrase = 'bg22-offline-raw-' + randomUUID().replaceAll('-', '');
let runtime, browser;

async function createNote(text) {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(
    browser,
    'Boolean(document.querySelector("form.capture-form"))',
    'capture form',
  );
  await evaluate(
    browser,
    'document.querySelector(\'input[name="mode"][value="note"]\').click()',
  );
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'[name="shared_text"]\'))',
    'note field',
  );
  await evaluate(
    browser,
    '(() => {const textarea=document.querySelector(\'[name="shared_text"]\');' +
      'Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(textarea,' +
      JSON.stringify(text) +
      ');textarea.dispatchEvent(new Event("input",{bubbles:true}));return true;})()',
  );
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Processing status:") && Boolean(document.querySelector(\'a[href^="/items/"]\'))',
    'durable local save while optional providers are unavailable',
  );
  return evaluate(
    browser,
    'document.querySelector(\'a[href^="/items/"]\').getAttribute("href").split("/").pop()',
  );
}

async function triggerBackground() {
  for (const path of [
    '/__scheduled?cron=17%20*%20*%20*%20*',
    '/cdn-cgi/local/scheduled?cron=17%20*%20*%20*%20*',
  ]) {
    const result = await fetch(runtime.apiOrigin + path);
    if (result.ok) return;
  }
  throw new Error('Isolated scheduled Worker trigger was unavailable');
}

async function detail(id) {
  return apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
}

try {
  runtime = await createBg21Preview({
    port: 8997,
    adminToken,
    captureToken,
    enableScheduled: true,
    optionalProvidersUnavailable: true,
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  const itemId = await createNote(
    'Original survives optional AI outage ' + phrase,
  );
  let saved = await detail(itemId);
  assert.equal(
    saved.item.raw_text,
    'Original survives optional AI outage ' + phrase,
  );
  assert.ok(
    saved.item.processing_status,
    'Raw save must expose processing state',
  );
  await triggerBackground();
  saved = await detail(itemId);
  assert.equal(
    saved.item.raw_text,
    'Original survives optional AI outage ' + phrase,
  );
  assert.equal(
    saved.item.processing_status,
    'pending',
    'Provider outage must defer optional enrichment',
  );
  assert.equal(
    saved.provenance.provider_usage.length,
    0,
    'Unavailable providers must not be billed',
  );
  await navigate(browser, runtime.webOrigin + '/');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[aria-label="Search"]\'))',
    'search available during outage',
  );
  await evaluate(
    browser,
    '(() => {const input=document.querySelector(\'input[aria-label="Search"]\');' +
      'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,' +
      JSON.stringify(phrase) +
      ');input.dispatchEvent(new Event("input",{bubbles:true}));})()',
  );
  await waitFor(
    browser,
    'Boolean(document.querySelector(' +
      JSON.stringify('a[href="/items/' + itemId + '"]') +
      '))',
    'saved raw item searchable without AI',
  );
  await navigate(browser, runtime.webOrigin + '/items/' + itemId);
  await waitFor(
    browser,
    'document.body.textContent.includes("Source and coverage")',
    'raw source detail available during outage',
  );
  await fillLabel(browser, 'Project', 'BG22 Offline Project');
  await clickButton(browser, 'Save changes');
  await waitFor(
    browser,
    'document.body.textContent.includes("Changes saved.")',
    'owner edit under optional outage',
  );
  saved = await detail(itemId);
  assert.equal(saved.item.project, 'BG22 Offline Project');
  report('BG22-optional-provider-outage-raw-save-search-and-owner-edit', {
    capture_id: itemId,
    status: saved.item.processing_status,
    provider_usage: saved.provenance.provider_usage.length,
  });

  await runtime.setOptionalProvidersAvailable(true);
  const healthy = await fetch(runtime.apiOrigin + '/api/v1/health');
  assert.equal(healthy.status, 200);
  const restored = await detail(itemId);
  assert.equal(restored.item.raw_text, saved.item.raw_text);
  assert.equal(restored.item.project, 'BG22 Offline Project');
  assert.equal(restored.item.id, saved.item.id);
  report('BG22-optional-providers-restored-owner-source-durable', {
    capture_id: itemId,
  });
  report('BG22-optional-outage-local-bundled', {
    result: 'passed',
    boundary:
      'local isolated mock-provider configuration, no external Notion or live AI request',
    qualification:
      'Deferred original job may respect server backoff; not a hosted provider failover proof',
  });
} catch (error) {
  console.error(
    'BG22_OPTIONAL_OUTAGE_FAILURE ' +
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
