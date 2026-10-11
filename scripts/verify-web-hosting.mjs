/* global console, process, fetch */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBg21Preview } from './bg21-preview-runtime.mjs';
import { waitUntil } from './browser-cdp.mjs';
import {
  openBrowser,
  navigate,
  waitFor,
  evaluate,
  apiRequest,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

let runtime;
let browser;
const marker = randomUUID();

async function inspect(path, method = 'GET') {
  return fetch(runtime.webOrigin + path, { method, redirect: 'manual' });
}

try {
  runtime = await createBg21Preview();
  const home = await inspect('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(home.headers.get('cache-control'), 'no-cache, must-revalidate');
  const html = await home.text();
  const js = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert.ok(js, 'Bundled index must reference built JavaScript');
  const script = await inspect(js);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type') ?? '', /javascript/);
  assert.equal(
    script.headers.get('cache-control'),
    'public, max-age=31536000, immutable',
  );
  assert.equal((await script.text()).includes(runtime.adminToken), false);

  for (const route of ['/capture', '/capture/file', '/items/' + marker]) {
    const response = await inspect(route);
    assert.equal(response.status, 200, 'Deep link must serve shell: ' + route);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  }
  const postToShell = await inspect('/capture', 'POST');
  assert.equal(postToShell.status, 405);
  for (const route of [
    '/unknown',
    '/items/a/b',
    '/capture/unknown',
    '/assets/missing-HaSh1234.js',
  ]) {
    const response = await inspect(route);
    assert.equal(
      response.status,
      404,
      'Unknown UI/asset must not serve HTML: ' + route,
    );
    assert.doesNotMatch(
      response.headers.get('content-type') ?? '',
      /text\/html/,
    );
  }
  for (const method of ['GET', 'POST']) {
    const api = await inspect('/api/v1/not-a-route', method);
    assert.equal(api.status, 404);
    assert.match(api.headers.get('content-type') ?? '', /application\/json/);
    assert.equal(api.headers.get('cache-control'), 'private, no-store');
    assert.equal((await api.json()).error.code, 'NOT_FOUND');
  }
  const anonymous = await inspect('/api/v1/items/' + marker);
  assert.equal(anonymous.status, 403);
  assert.equal(anonymous.headers.get('cache-control'), 'private, no-store');
  report('BG21-static-and-api-route-matrix');

  const saved = await apiRequest(
    runtime.apiOrigin,
    runtime.captureToken,
    'POST',
    '/captures',
    {
      idempotency_key: 'bg21-' + marker,
      source_type: 'note',
      source_app: 'bg21-local-preview',
      shared_text: 'BG21 bundled app fixture ' + marker,
      captured_at: new Date().toISOString(),
      client: { name: 'bg21-preview', version: '1.0' },
    },
    201,
  );
  const directLink = '/items/' + saved.capture_id;
  browser = await openBrowser(runtime);
  await navigate(browser, runtime.webOrigin + directLink);
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'deep link prompts for authentication',
  );
  assert.equal(await evaluate(browser, 'location.pathname'), directLink);
  await evaluate(
    browser,
    '(() => { const input = document.querySelector(\'input[type="password"]\'); ' +
      'const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; ' +
      'setter.call(input, ' +
      JSON.stringify(runtime.adminToken) +
      '); ' +
      'input.dispatchEvent(new Event("input", { bubbles: true })); ' +
      'input.closest("form").requestSubmit(); return true; })()',
  );
  await waitFor(
    browser,
    'Boolean([...document.querySelectorAll("textarea[readonly]")].some(t => t.value.includes("BG21 bundled app fixture")))',
    'authenticated item detail from direct link',
  );
  assert.equal(await evaluate(browser, 'location.pathname'), directLink);
  const itemApiPath = '/api/v1/items/' + saved.capture_id;
  const responsesBeforeReload = browser.responses.filter(
    (entry) => entry.path === itemApiPath && entry.status === 200,
  ).length;
  await browser.client.send(
    'Page.reload',
    { ignoreCache: true },
    browser.sessionId,
  );
  await waitUntil(
    () =>
      browser.responses.filter(
        (entry) => entry.path === itemApiPath && entry.status === 200,
      ).length > responsesBeforeReload,
    {
      timeoutMs: 20_000,
      description: 'new authenticated item fetch after hard reload',
    },
  );
  await waitFor(
    browser,
    'Boolean([...document.querySelectorAll("textarea[readonly]")].some(t => t.value.includes("BG21 bundled app fixture")))',
    'deep link hard reload with signed session',
  );
  // A malformed request from an authenticated cookie session must never
  // fall back to the public SPA shell or expose cached private responses.
  const malformed = await evaluate(
    browser,
    '(async () => { const response = await fetch("/api/v1/captures", {' +
      'method: "POST", credentials: "include", headers: {"Content-Type": "application/json"},' +
      'body: "{" }); return {status: response.status, contentType: response.headers.get("content-type"),' +
      'cache: response.headers.get("cache-control"), payload: await response.json()}; })()',
  );
  assert.ok([400, 422].includes(malformed.status), 'Malformed authenticated capture must fail validation');
  assert.match(malformed.contentType ?? '', /application\/json/);
  assert.equal(malformed.cache, 'private, no-store');
  assert.ok(malformed.payload?.error?.code, 'Malformed API response must return JSON error envelope');
  report('BG21-malformed-authenticated-api-stays-json', { status: malformed.status });

  const cookies = await browser.client.send(
    'Network.getCookies',
    { urls: [runtime.webOrigin] },
    browser.sessionId,
  );
  const session = cookies.cookies.find(
    (cookie) => cookie.name === 'admin_session',
  );
  assert.ok(session);
  assert.equal(session.httpOnly, true);
  assert.equal(session.sameSite, 'Strict');
  report('BG21-bundled-Chrome-login-and-reload', {
    cookie_secure: 'not tested on local HTTP',
  });

  // Prove real React Router Link navigation plus History API back/forward,
  // not only direct CDP navigation and a hard refresh.
  await evaluate(browser, 'document.querySelector(\'a[href="/"]\').click()');
  await waitFor(browser, 'location.pathname === "/" && Boolean(document.querySelector(\'a[href="/capture"]\'))', 'SPA Inbox link');
  await evaluate(browser, 'document.querySelector(\'a[href="/capture"]\').click()');
  await waitFor(browser, 'location.pathname === "/capture" && Boolean(document.querySelector("form.capture-form"))', 'SPA capture route');
  await evaluate(browser, 'history.back()');
  await waitFor(browser, 'location.pathname === "/" && Boolean(document.querySelector(\'a[href="/capture"]\'))', 'History back to Inbox');
  await evaluate(browser, 'history.forward()');
  await waitFor(browser, 'location.pathname === "/capture" && Boolean(document.querySelector("form.capture-form"))', 'History forward to capture');
  report('BG21-SPA-browser-back-forward', { back: '/', forward: '/capture' });

  await navigate(browser, runtime.webOrigin + '/');
  await waitFor(
    browser,
    '[...document.querySelectorAll("button")].some(b => b.textContent?.trim() === "Logout")',
    'logout button',
  );
  await evaluate(
    browser,
    '[...document.querySelectorAll("button")].find(b => b.textContent?.trim() === "Logout").click()',
  );
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'logout requires reauthentication',
  );
  await navigate(browser, runtime.webOrigin + directLink);
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'logout persists on deep link',
  );
  report('BG21-logout-private-item-protected');
  report('BG21-local-bundled-acceptance', {
    status: 'passed',
    preview: runtime.webOrigin,
  });
} catch (error) {
  console.error(
    'BG21_HOSTING_FAILURE ' +
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
