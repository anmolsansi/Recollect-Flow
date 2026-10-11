/* global process, console, fetch, URL, Buffer */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  openBrowser,
  login,
  navigate,
  waitFor,
  evaluate,
} from './bg14-browser-utils.mjs';

/**
 * Read-only HTTPS acceptance for a separately authorized and isolated preview.
 * Never run against the production Worker or real owner data.
 */
async function main() {
  const rawOrigin = process.env.BG21_PREVIEW_ORIGIN;
  const token = process.env.BG21_PREVIEW_ADMIN_TOKEN;
  if (!rawOrigin || !token) {
    throw new Error(
      'Provide BG21_PREVIEW_ORIGIN and BG21_PREVIEW_ADMIN_TOKEN for an isolated preview.',
    );
  }
  const parsed = new URL(rawOrigin);
  assert.equal(
    parsed.protocol,
    'https:',
    'Hosted preview must use actual HTTPS',
  );
  assert.equal(parsed.username, '');
  assert.equal(parsed.password, '');
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.search, '');
  assert.equal(parsed.hash, '');
  assert.notEqual(
    parsed.hostname,
    'recollect-flow.recollectflow.workers.dev',
    'Never target the canonical production Worker with this acceptance script',
  );
  const origin = parsed.origin;
  const manifest = JSON.parse(
    await readFile('apps/web/dist/release-manifest.json', 'utf8'),
  );
  assert.match(manifest.release_id, /^[a-f0-9]{64}$/);
  assert.match(manifest.source_revision, /^[a-f0-9]{40}$/);

  const health = await fetch(origin + '/api/v1/health', {
    redirect: 'manual',
  });
  assert.equal(health.status, 200);
  assert.match(health.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(health.headers.get('cache-control'), 'private, no-store');

  const htmlResponse = await fetch(origin + '/');
  assert.equal(htmlResponse.status, 200);
  assert.match(htmlResponse.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(
    htmlResponse.headers.get('cache-control'),
    'no-cache, must-revalidate',
  );
  const html = await htmlResponse.text();
  const bundlePath = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  assert.ok(
    bundlePath,
    'Hosted HTML must reference a versioned JavaScript bundle',
  );
  const expected = manifest.web_files.find(
    (entry) => '/' + entry.path === bundlePath,
  );
  assert.ok(
    expected,
    'Hosted HTML references an asset outside this release manifest',
  );
  const bundleResponse = await fetch(origin + bundlePath);
  assert.equal(bundleResponse.status, 200);
  assert.equal(
    bundleResponse.headers.get('cache-control'),
    'public, max-age=31536000, immutable',
  );
  const bytes = Buffer.from(await bundleResponse.arrayBuffer());
  const observedHash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(
    observedHash,
    expected.sha256,
    'Remote JS does not match the checked release',
  );
  assert.equal(
    bytes.includes(Buffer.from(token)),
    false,
    'Admin token exposed in public bundle',
  );

  for (const route of ['/capture', '/capture/file', '/items/' + randomUUID()]) {
    const page = await fetch(origin + route);
    assert.equal(page.status, 200, 'Hosted deep link: ' + route);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  }
  const unknown = await fetch(origin + '/api/v1/bg21-unimplemented');
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type') ?? '', /application\/json/);
  assert.equal(unknown.headers.get('cache-control'), 'private, no-store');
  const missingAsset = await fetch(origin + '/assets/bg21-missing-aBcD1234.js');
  assert.equal(missingAsset.status, 404);
  assert.doesNotMatch(
    missingAsset.headers.get('content-type') ?? '',
    /text\/html/,
  );

  const runtime = { webOrigin: origin };
  const browser = await openBrowser(runtime);
  try {
    await navigate(browser, origin + '/');
    await waitFor(
      browser,
      'Boolean(document.querySelector(\'input[type="password"]\'))',
      'unauthenticated remote preview',
    );
    await login(browser, origin, token);
    const cookies = await browser.client.send(
      'Network.getCookies',
      { urls: [origin] },
      browser.sessionId,
    );
    const session = cookies.cookies.find(
      (cookie) => cookie.name === 'admin_session',
    );
    assert.ok(session, 'Missing signed session cookie');
    assert.equal(session.secure, true, 'Hosted HTTPS session must be Secure');
    assert.equal(session.httpOnly, true);
    assert.equal(session.sameSite, 'Strict');
    await navigate(browser, origin + '/capture');
    await waitFor(
      browser,
      'Boolean(document.querySelector("form.capture-form"))',
      'hosted browser capture UI',
    );
    await navigate(browser, origin + '/');
    await evaluate(
      browser,
      '[...document.querySelectorAll("button")].find(b=>b.textContent?.trim()==="Logout").click()',
    );
    await waitFor(
      browser,
      'Boolean(document.querySelector(\'input[type="password"]\'))',
      'remote session revoked',
    );
    const denied = await evaluate(
      browser,
      'fetch("/api/v1/items/' +
        randomUUID() +
        '", {credentials: "include"}).then(response => response.status)',
    );
    assert.ok(
      [401, 403].includes(denied),
      'Signed-out private API must deny access',
    );
  } finally {
    await browser.close();
  }
  console.log(
    JSON.stringify({
      stage: 'BG21-remote-https-read-only',
      status: 'passed',
      origin,
      release_id: manifest.release_id,
      source_revision: manifest.source_revision,
      bundle_sha256: observedHash,
      qualification:
        'Preview resource isolation and old/new rollback require independent operator evidence.',
    }),
  );
}

main().catch((error) => {
  console.error(
    'BG21_REMOTE_PREVIEW_FAILURE ' +
      (error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
});
