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
  apiRequest,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const adminToken = 'bg19-admin-' + randomUUID();
const marker = randomUUID().replaceAll('-', '');
let runtime, browser;

async function setValue(name, value) {
  await waitFor(
    browser,
    `Boolean(document.querySelector('[name=${JSON.stringify(name)}]:enabled'))`,
    'editable ' + name,
  );
  return evaluate(
    browser,
    `(() => {
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
  })()`,
  );
}
async function begin() {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(
    browser,
    'Boolean(document.querySelector("form.capture-form input[name=mode][value=note]:enabled"))',
    'BG19 capture form after draft restoration',
  );
}
async function note(value, project = '', reviewLocal = '', skipBegin = false) {
  if (!skipBegin) await begin();
  await evaluate(
    browser,
    'document.querySelector("input[name=mode][value=note]").click()',
  );
  await setValue('shared_text', value);
  if (project) await setValue('project', project);
  if (reviewLocal) await setValue('review_at', reviewLocal);
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Processing status:")',
    'capture confirmation',
  );
  const id = await evaluate(
    browser,
    `document.querySelector('a[href^="/items/"]').getAttribute('href').split('/').pop()`,
  );
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
    'Emulation.setTimezoneOverride',
    { timezoneId: 'Asia/Kolkata' },
    browser.sessionId,
  );
  await login(browser, runtime.webOrigin, adminToken);

  const id = await note(
    'BG19 note ' + marker,
    'BG19 Project',
    '2026-10-11T09:00',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Saved, including the follow-up details.")',
    'follow-up success',
  );
  let item = await detail(id);
  assert.equal(item.item.project, 'BG19 Project');
  assert.equal(item.item.review_at, '2026-10-11T03:30:00.000Z');
  report('note-follow-up-persists', {
    project: true,
    india_local_to_utc: true,
  });

  await navigate(browser, runtime.webOrigin + '/items/' + id);
  await waitFor(
    browser,
    'Boolean(document.querySelector("input[type=datetime-local]"))',
    'review item',
  );
  const shown = await evaluate(
    browser,
    'document.querySelector("input[type=datetime-local]").value',
  );
  assert.equal(
    shown,
    '2026-10-11T09:00',
    'Editor must show India local clock, not UTC digits',
  );
  report('item-editor-timezone-roundtrip');

  // Simulate a lost metadata PATCH response while capture POST still succeeds.
  await begin();
  await evaluate(
    browser,
    `(() => {
    window.__bg19Fetch = window.fetch;
    window.fetch = (...args) => {
      if (args[1]?.method === 'PATCH' && String(args[0]).includes('/items/')) {
        return Promise.reject(new TypeError('Injected metadata network failure'));
      }
      return window.__bg19Fetch(...args);
    };
  })()`,
  );
  const partialId = await note(
    'BG19 partial ' + marker,
    'Retry Project',
    '',
    true,
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Saved; project/reminder needs retry.")',
    'partial success warning',
  );
  item = await detail(partialId);
  assert.equal(item.item.project, null);
  await evaluate(browser, 'window.fetch = window.__bg19Fetch');
  await evaluate(
    browser,
    'document.querySelector("button") && Array.from(document.querySelectorAll("button")).find(el => el.textContent.includes("Retry follow-up only")).click()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Saved, including the follow-up details.")',
    'metadata-only retry',
  );
  item = await detail(partialId);
  assert.equal(item.item.project, 'Retry Project');
  assert.equal(
    item.provenance.capture_events.length,
    1,
    'Must not recapture original content',
  );
  report('partial-success-metadata-only-retry');

  // A second share of the same canonical URL must not replace prior owner metadata.
  const canonicalUrl = 'https://example.com/bg19-' + marker;
  await begin();
  await setValue('url', canonicalUrl);
  await setValue('project', 'Original Project');
  await setValue('review_at', '2026-10-11T09:00');
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Saved, including the follow-up details.")',
    'initial canonical follow-up',
  );
  const canonicalId = await evaluate(
    browser,
    `document.querySelector('a[href^="/items/"]').getAttribute('href').split('/').pop()`,
  );
  await begin();
  await setValue('url', canonicalUrl);
  await setValue('project', 'Replacement Project');
  await setValue('review_at', '2026-10-12T09:00');
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Already Saved")',
    'canonical duplicate capture',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Its project and review date were not replaced.")',
    'duplicate metadata protection',
  );
  item = await detail(canonicalId);
  assert.equal(item.item.project, 'Original Project');
  assert.equal(item.item.review_at, '2026-10-11T03:30:00.000Z');
  assert.ok(
    item.provenance.capture_events.length >= 2,
    'Each share keeps its own provenance',
  );
  report('duplicate-does-not-clobber-owner-metadata');

  // Invalid optional input must be associated with its error and receive focus.
  await begin();
  await setValue('url', 'https://example.com/bg19-validation-' + marker);
  await setValue('project', 'x'.repeat(201));
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'Boolean(document.getElementById("follow-up-project-error"))',
    'field-linked metadata validation',
  );
  await waitFor(
    browser,
    'document.activeElement?.name === "project"',
    'metadata validation focus',
  );
  report('follow-up-field-error-and-focus');

  // No sideways scrolling at a narrow mobile viewport, with long errors.
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
  await begin();
  const viewport = await evaluate(
    browser,
    '({ viewport: innerWidth, content: document.documentElement.scrollWidth })',
  );
  assert.ok(
    viewport.content <= viewport.viewport + 8,
    'Follow-up form must not overflow on mobile',
  );
  report('mobile-follow-up-layout');

  // A 200 CSS-pixel viewport approximates a 200% browser zoom of 400 CSS pixels.
  await browser.client.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width: 200,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    },
    browser.sessionId,
  );
  await begin();
  const zoomViewport = await evaluate(
    browser,
    '({ viewport: innerWidth, content: document.documentElement.scrollWidth })',
  );
  assert.ok(
    zoomViewport.content <= zoomViewport.viewport + 8,
    'Follow-up form must not overflow at 200% zoom',
  );
  report('browser-zoom-equivalent-layout');

  // A physical Enter key event must activate the focused submit control.
  await waitFor(
    browser,
    'Boolean(document.querySelector("button[type=submit]") && !document.querySelector("button[type=submit]").disabled)',
    'enabled submit control',
  );
  await setValue('url', 'https://example.com/bg19-keyboard-' + marker);
  await evaluate(
    browser,
    'document.querySelector("button[type=submit]").focus()',
  );
  const keyboardReady = await evaluate(
    browser,
    '({ focused: document.activeElement?.matches("button[type=submit]"), disabled: document.querySelector("button[type=submit]")?.disabled, url: document.querySelector("input[name=url]")?.value })',
  );
  assert.equal(
    keyboardReady.focused,
    true,
    'Submit button must be keyboard focused',
  );
  assert.equal(keyboardReady.disabled, false, 'Submit button must be enabled');
  assert.ok(
    keyboardReady.url.includes('bg19-keyboard-'),
    'Valid URL must be present',
  );
  await browser.client.send(
    'Input.dispatchKeyEvent',
    {
      type: 'keyDown',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      text: '\r',
    },
    browser.sessionId,
  );
  await browser.client.send(
    'Input.dispatchKeyEvent',
    {
      type: 'keyUp',
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    },
    browser.sessionId,
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Processing status:")',
    'keyboard-only Enter save',
  );
  const statusAttributes = await evaluate(
    browser,
    '({ role: document.querySelector("section[role=status]")?.getAttribute("role"), live: document.querySelector("section[role=status]")?.getAttribute("aria-live"), headingFocus: document.activeElement?.tagName === "H2" })',
  );
  assert.equal(statusAttributes.role, 'status');
  assert.equal(statusAttributes.live, 'polite');
  assert.equal(
    statusAttributes.headingFocus,
    true,
    'Saved heading must receive focus after async save',
  );
  report('keyboard-submit-and-live-confirmation');

  report('BG19-browser-follow-up', {
    status: 'passed',
    environment: 'isolated Chrome/Worker/D1',
  });
} catch (error) {
  console.error(
    'BG19_BROWSER_FAILURE ' +
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
