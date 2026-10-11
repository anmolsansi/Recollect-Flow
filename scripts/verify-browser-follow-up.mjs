/* global process, console */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import {
  openBrowser, login, navigate, waitFor, evaluate, apiRequest,
  report, safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg19-admin-' + randomUUID();
const marker = randomUUID().replaceAll('-', '');
let runtime, browser;

async function setValue(name, value) {
  return evaluate(browser, `(() => {
    const el = document.querySelector('[name=${JSON.stringify(name)}]');
    if (!el) throw new Error('Missing field: ' + ${JSON.stringify(name)});
    const prototype = el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}
async function begin() {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(browser, 'Boolean(document.querySelector("form.capture-form"))', 'BG19 capture form');
}
async function note(value, project = '', reviewLocal = '') {
  await begin();
  await evaluate(browser, 'document.querySelector("input[name=mode][value=note]").click()');
  await setValue('shared_text', value);
  if (project) await setValue('project', project);
  if (reviewLocal) await setValue('review_at', reviewLocal);
  await evaluate(browser, 'document.querySelector("form.capture-form").requestSubmit()');
  await waitFor(browser, 'document.body.textContent.includes("Processing status:")', 'capture confirmation');
  const id = await evaluate(browser, 'document.querySelector("a[href^=\\"/items/\\"]").getAttribute("href").split("/").pop()');
  return id;
}
async function detail(id) {
  return apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
}

try {
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg19-capture-' + randomUUID(),
    adminToken,
    localWorkerToken: 'bg19-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await browser.client.send(
    'Emulation.setTimezoneOverride', { timezoneId: 'Asia/Kolkata' }, browser.sessionId,
  );
  await login(browser, runtime.webOrigin, adminToken);

  const id = await note('BG19 note ' + marker, 'BG19 Project', '2026-10-11T09:00');
  await waitFor(browser, 'document.body.textContent.includes("Saved, including the follow-up details.")', 'follow-up success');
  let item = await detail(id);
  assert.equal(item.item.project, 'BG19 Project');
  assert.equal(item.item.review_at, '2026-10-11T03:30:00.000Z');
  report('note-follow-up-persists', { project: true, india_local_to_utc: true });

  await navigate(browser, runtime.webOrigin + '/items/' + id);
  await waitFor(browser, 'Boolean(document.querySelector("input[type=datetime-local]"))', 'review item');
  const shown = await evaluate(browser, 'document.querySelector("input[type=datetime-local]").value');
  assert.equal(shown, '2026-10-11T09:00', 'Editor must show India local clock, not UTC digits');
  report('item-editor-timezone-roundtrip');

  // Simulate a lost metadata PATCH response while capture POST still succeeds.
  await begin();
  await evaluate(browser, `(() => {
    window.__bg19Fetch = window.fetch;
    window.fetch = (...args) => {
      if (args[1]?.method === 'PATCH' && String(args[0]).includes('/items/')) {
        return Promise.reject(new TypeError('Injected metadata network failure'));
      }
      return window.__bg19Fetch(...args);
    };
  })()`);
  const partialId = await note('BG19 partial ' + marker, 'Retry Project');
  await waitFor(browser, 'document.body.textContent.includes("Saved; project/reminder needs retry.")', 'partial success warning');
  item = await detail(partialId);
  assert.equal(item.item.project, null);
  await evaluate(browser, 'window.fetch = window.__bg19Fetch');
  await evaluate(browser, 'document.querySelector("button") && Array.from(document.querySelectorAll("button")).find(el => el.textContent.includes("Retry follow-up only")).click()');
  await waitFor(browser, 'document.body.textContent.includes("Saved, including the follow-up details.")', 'metadata-only retry');
  item = await detail(partialId);
  assert.equal(item.item.project, 'Retry Project');
  assert.equal(item.provenance.capture_events.length, 1, 'Must not recapture original content');
  report('partial-success-metadata-only-retry');

  // No sideways scrolling at a narrow mobile viewport, with long errors.
  await browser.client.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  }, browser.sessionId);
  await begin();
  const viewport = await evaluate(browser, '({ viewport: innerWidth, content: document.documentElement.scrollWidth })');
  assert.ok(viewport.content <= viewport.viewport + 8, 'Follow-up form must not overflow on mobile');
  report('mobile-follow-up-layout');
  report('BG19-browser-follow-up', { status: 'passed', environment: 'isolated Chrome/Worker/D1' });
} catch (error) {
  console.error('BG19_BROWSER_FAILURE ' + JSON.stringify({
    reason: error instanceof Error ? error.message : String(error),
    recent_api: safeDiagnostics(browser),
  }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
}
