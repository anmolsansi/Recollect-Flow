/* global process, URL, crypto */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalAcceptanceRuntime } from './browser-acceptance-runtime.mjs';
import { openBrowser, login, navigate, waitFor, evaluate, apiRequest, report, safeDiagnostics } from './bg14-browser-utils.mjs';

const adminToken = 'bg16-admin-' + randomUUID();
let runtime, browser;
const marker = randomUUID().replaceAll('-', '');

async function setValue(name, value) {
  return evaluate(browser, `(() => {
    const el = document.querySelector('[name=${JSON.stringify(name)}]');
    if (!el) throw new Error('Missing capture control');
    const prototype = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}
async function selectMode(mode) {
  await evaluate(browser, `document.querySelector('input[name="mode"][value=${JSON.stringify(mode)}]').click()`);
  await waitFor(browser, `document.querySelector('input[name="mode"][value=${JSON.stringify(mode)}]').checked`, 'mode ' + mode);
}
async function submit() {
  await evaluate(browser, 'document.querySelector("form.capture-form").requestSubmit()');
}
async function itemSaved() {
  await waitFor(browser, 'Boolean(document.querySelector("a[href^=\"/items/\"]") && document.body.textContent.includes("Processing status:"))', 'saved item link');
  return evaluate(browser, 'document.querySelector("a[href^=\"/items/\"]').getAttribute("href").split("/").pop()');
}
async function begin() {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(browser, 'Boolean(document.querySelector("form.capture-form"))', 'capture form');
}
async function save(mode, value, reason) {
  await begin();
  await selectMode(mode);
  await setValue(mode === 'url' ? 'url' : 'shared_text', value);
  if (reason) await setValue('user_reason', reason);
  await submit();
  const id = await itemSaved();
  const detail = await apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
  assert.equal(detail.item.source_type, mode);
  if (mode === 'url') assert.equal(detail.item.source_url, value);
  else assert.equal(detail.item.raw_text, value);
  return { id, detail };
}

try {
  runtime = await createLocalAcceptanceRuntime({
    captureToken: 'bg16-capture-' + randomUUID(), adminToken,
    localWorkerToken: 'bg16-worker-' + randomUUID(),
  });
  browser = await openBrowser(runtime);
  await login(browser, runtime.webOrigin, adminToken);
  await begin();
  await selectMode('note');
  await submit();
  await waitFor(browser, 'Boolean(document.getElementById("shared-text-error"))', 'empty note validation');
  assert.equal(await evaluate(browser, 'document.activeElement?.name'), 'shared_text');
  report('empty-note-validation');

  const noteText = 'BG16 private note ' + marker;
  const note = await save('note', noteText, 'Owner note purpose ' + marker);
  assert.equal(note.detail.item.user_note, 'Owner note purpose ' + marker);
  report('note-created', { kind: 'synthetic', durable: true });

  const pasted = 'BG16 pasted article ' + marker;
  const text = await save('text', pasted, 'Different reason ' + marker);
  assert.equal(text.detail.item.raw_text, pasted);
  assert.notEqual(note.id, text.id);
  report('pasted-text-created', { kind: 'synthetic', durable: true });

  const url = 'https://example.com/bg16-' + marker;
  const first = await save('url', url, 'First reason');
  assert.equal(first.detail.item.privacy_level, 'unknown');
  const duplicate = await save('url', url, 'New reason for same URL');
  assert.equal(duplicate.id, first.id);
  await waitFor(browser, 'document.body.textContent.includes("Already Saved")', 'canonical duplicate reuse');
  const refreshed = await apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + first.id);
  assert.ok(refreshed.provenance.capture_events.some(event => event.user_note === 'New reason for same URL'));
  report('canonical-url-duplicate', { reused: true, separate_reason_event: true });

  await begin();
  await setValue('url', 'https://hidden.example');
  await selectMode('text');
  await setValue('shared_text', 'Mode switch ' + marker);
  await submit();
  const switchedId = await itemSaved();
  const switched = await apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + switchedId);
  assert.equal(switched.item.source_type, 'text');
  assert.equal(switched.item.source_url, null);
  report('mode-switch-excludes-hidden-url');

  await browser.client.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  }, browser.sessionId);
  await begin();
  const viewport = await evaluate(browser, '({ width: innerWidth, scroll: document.documentElement.scrollWidth })');
  assert.ok(viewport.scroll <= viewport.width + 8, 'Mobile layout overflow');
  report('mobile-capture-layout');
  report('BG16-browser-capture', { status: 'passed', environment: 'isolated local Worker/D1/Chrome' });
} catch (error) {
  console.error('BG16_BROWSER_FAILURE ' + JSON.stringify({
    reason: error instanceof Error ? error.message : String(error),
    recent_api: safeDiagnostics(browser),
  }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
}
