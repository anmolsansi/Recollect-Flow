/* global process, console, URL */

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CdpClient, delay, waitUntil } from './browser-cdp.mjs';
import {
  createLocalAcceptanceRuntime,
  launchChrome,
} from './browser-acceptance-runtime.mjs';
import {
  buildBrowserFixtures,
  uploadAndLinkFixture,
} from './browser-acceptance-fixtures.mjs';

const captureToken = `bg07-capture-${randomUUID()}`;
const adminToken = `bg07-admin-${randomUUID()}`;
const localWorkerToken = `bg07-worker-${randomUUID()}`;

async function navigate(client, sessionId, url) {
  const expectedUrl = new URL(url).href;
  await client.send('Page.navigate', { url: expectedUrl }, sessionId);
  await client.waitForExpression(
    sessionId,
    `document.readyState === 'complete' && location.href === ${JSON.stringify(expectedUrl)}`,
    { timeoutMs: 15_000, description: `navigation to ${expectedUrl}` },
  );
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function verifyFileSignature(fixture, bytes) {
  if (fixture.kind === 'pdf') {
    assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.match(bytes.toString('latin1'), /%%EOF\n?$/);
    return;
  }
  if (fixture.kind === 'image') {
    assert.deepEqual(
      [...bytes.subarray(0, 8)],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    );
    return;
  }
  assert.match(
    bytes.toString('utf8'),
    /^RecollectFlow BG-07 generic download proof /,
  );
}

async function resetDownloadDirectory(downloadDir) {
  await rm(downloadDir, { recursive: true, force: true });
  await mkdir(downloadDir, { recursive: true });
}

async function waitForDownloadedFile(downloadDir, expectedFilename) {
  return waitUntil(
    async () => {
      const entries = await readdir(downloadDir).catch(() => []);
      if (
        entries.some(
          (entry) => entry.endsWith('.crdownload') || entry.endsWith('.tmp'),
        )
      ) {
        return false;
      }
      if (!entries.includes(expectedFilename)) return false;

      const filePath = join(downloadDir, expectedFilename);
      const first = await stat(filePath);
      await delay(100);
      const second = await stat(filePath);
      return first.size === second.size && second.size > 0 ? filePath : false;
    },
    {
      timeoutMs: 15_000,
      intervalMs: 100,
      description: `downloaded file ${expectedFilename}`,
    },
  );
}

async function downloadFixture({
  client,
  sessionId,
  runtime,
  fixture,
  downloadDir,
  navigateFirst = true,
}) {
  await resetDownloadDirectory(downloadDir);
  const itemUrl = `${runtime.webOrigin}/items/${fixture.itemId}`;
  if (navigateFirst) {
    await navigate(client, sessionId, itemUrl);
  }
  const expectedHref = `/api/v1/attachments/${fixture.attachmentId}/content`;
  const selector = `a[href="${expectedHref}"]`;
  await client.waitForExpression(
    sessionId,
    `Boolean(document.querySelector(${JSON.stringify(selector)}))`,
    { description: `Download link for ${fixture.kind} fixture` },
  );

  const actualHref = await client.evaluate(
    sessionId,
    `document.querySelector(${JSON.stringify(selector)})?.getAttribute('href')`,
  );
  assert.equal(actualHref, expectedHref);
  assert.equal(actualHref.includes('token='), false);
  assert.equal(actualHref.includes('authorization='), false);

  const downloadStarted = client.waitForEvent(
    'Browser.downloadWillBegin',
    (message) => message.params?.url?.endsWith(expectedHref),
    { timeoutMs: 10_000, description: `${fixture.kind} Download link` },
  );
  await client.evaluate(
    sessionId,
    `document.querySelector(${JSON.stringify(selector)})?.click()`,
  );
  const started = await downloadStarted;
  assert.equal(started.params?.suggestedFilename, fixture.filename);

  const filePath = await waitForDownloadedFile(downloadDir, fixture.filename);
  const downloaded = await readFile(filePath);
  assert.equal(downloaded.byteLength, fixture.sizeBytes);
  assert.equal(digest(downloaded), fixture.sha256);
  verifyFileSignature(fixture, downloaded);

  return {
    kind: fixture.kind,
    filename: fixture.filename,
    size_bytes: downloaded.byteLength,
    sha256: fixture.sha256,
    href: expectedHref,
  };
}

async function browserFetchStatus(client, sessionId, path) {
  return client.evaluate(
    sessionId,
    `fetch(${JSON.stringify(path)}, { credentials: 'include' }).then(async (response) => {
      await response.arrayBuffer();
      return response.status;
    })`,
  );
}

async function main() {
  let runtime = null;
  let chrome = null;
  let client = null;
  let chromeProfile = null;

  try {
    runtime = await createLocalAcceptanceRuntime({
      captureToken,
      adminToken,
      localWorkerToken,
    });

    const fixtures = [];
    for (const fixture of buildBrowserFixtures()) {
      fixtures.push(
        await uploadAndLinkFixture({
          apiOrigin: runtime.apiOrigin,
          captureToken,
          fixture,
        }),
      );
    }

    chromeProfile = await mkdtemp(join(tmpdir(), 'recollect-bg07-chrome-'));
    chrome = await launchChrome({ userDataDir: chromeProfile });
    client = await CdpClient.connect(chrome.webSocketUrl);

    const { targetId } = await client.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);

    await navigate(client, sessionId, runtime.webOrigin);
    await client.waitForExpression(
      sessionId,
      `Boolean(document.querySelector('input[type="password"]'))`,
      { description: 'real admin login form' },
    );

    await client.evaluate(
      sessionId,
      `(() => {
        const input = document.querySelector('input[type="password"]');
        const form = input?.closest('form');
        if (!input || !form) throw new Error('Admin login form was not found.');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        if (!setter) throw new Error('Native input value setter was not found.');
        setter.call(input, ${JSON.stringify(adminToken)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        form.requestSubmit();
        return true;
      })()`,
    );

    await client.waitForExpression(
      sessionId,
      `[...document.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Logout',
      )`,
      { timeoutMs: 15_000, description: 'authenticated Inbox' },
    );

    const cookies = await client.send(
      'Network.getCookies',
      { urls: [runtime.webOrigin] },
      sessionId,
    );
    const sessionCookie = cookies.cookies?.find(
      (cookie) => cookie.name === 'admin_session',
    );
    assert.ok(sessionCookie, 'Real login form did not create admin_session.');
    assert.equal(sessionCookie.httpOnly, true);
    assert.equal(sessionCookie.sameSite, 'Strict');

    const browserStorageContainsToken = await client.evaluate(
      sessionId,
      `[localStorage, sessionStorage].some((storage) =>
        Object.values(storage).some((value) => value === ${JSON.stringify(adminToken)})
      )`,
    );
    assert.equal(
      browserStorageContainsToken,
      false,
      'ADMIN_TOKEN must not be persisted in browser storage.',
    );

    const downloadDir = join(runtime.tempDir, 'downloads');
    await mkdir(downloadDir, { recursive: true });
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
      eventsEnabled: true,
    });

    const downloads = [];
    for (const fixture of fixtures) {
      downloads.push(
        await downloadFixture({
          client,
          sessionId,
          runtime,
          fixture,
          downloadDir,
        }),
      );
    }

    const reloadFixture = fixtures[0];
    assert.ok(reloadFixture, 'Expected a PDF fixture for reload verification.');
    await navigate(
      client,
      sessionId,
      `${runtime.webOrigin}/items/${reloadFixture.itemId}`,
    );
    await client.send('Page.reload', { ignoreCache: true }, sessionId);
    await client.waitForExpression(
      sessionId,
      `Boolean(document.querySelector(${JSON.stringify(
        `a[href="/api/v1/attachments/${reloadFixture.attachmentId}/content"]`,
      )}))`,
      { timeoutMs: 15_000, description: 'Download link after page reload' },
    );

    const reloadedCookies = await client.send(
      'Network.getCookies',
      { urls: [runtime.webOrigin] },
      sessionId,
    );
    assert.ok(
      reloadedCookies.cookies?.some(
        (cookie) => cookie.name === 'admin_session',
      ),
      'Authenticated session did not survive page reload.',
    );

    const reloadDownload = await downloadFixture({
      client,
      sessionId,
      runtime,
      fixture: reloadFixture,
      downloadDir,
      navigateFirst: false,
    });

    await navigate(client, sessionId, runtime.webOrigin);
    await client.waitForExpression(
      sessionId,
      `[...document.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Logout',
      )`,
      { description: 'Logout button before session teardown' },
    );
    await client.evaluate(
      sessionId,
      `[...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Logout')
        ?.click()`,
    );
    await client.waitForExpression(
      sessionId,
      `Boolean(document.querySelector('input[type="password"]'))`,
      { timeoutMs: 15_000, description: 'login form after logout' },
    );

    const protectedPath = `/api/v1/attachments/${reloadFixture.attachmentId}/content`;
    const logoutStatus = await browserFetchStatus(
      client,
      sessionId,
      protectedPath,
    );
    assert.equal(logoutStatus, 401, 'Logged-out browser read must be denied.');

    const tamperedCookie = await client.send(
      'Network.setCookie',
      {
        name: 'admin_session',
        value: 'authenticated.tampered',
        url: runtime.webOrigin,
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
      },
      sessionId,
    );
    assert.notEqual(
      tamperedCookie.success,
      false,
      'Chrome rejected the synthetic tampered-cookie fixture.',
    );
    const tamperedStatus = await browserFetchStatus(
      client,
      sessionId,
      protectedPath,
    );
    assert.equal(
      tamperedStatus,
      401,
      'Tampered browser session must be denied.',
    );

    await client.send(
      'Network.deleteCookies',
      { name: 'admin_session', url: runtime.webOrigin },
      sessionId,
    );
    await client.send(
      'Network.setCookie',
      {
        name: 'admin_session',
        value: 'authenticated.expired-fixture',
        url: runtime.webOrigin,
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
        expires: Math.floor(Date.now() / 1000) - 60,
      },
      sessionId,
    );
    const expiredCookies = await client.send(
      'Network.getCookies',
      { urls: [runtime.webOrigin] },
      sessionId,
    );
    assert.equal(
      expiredCookies.cookies?.some((cookie) => cookie.name === 'admin_session'),
      false,
      'Expired admin_session fixture must not remain an active browser cookie.',
    );
    const expiredStatus = await browserFetchStatus(
      client,
      sessionId,
      protectedPath,
    );
    assert.equal(expiredStatus, 401, 'Expired browser session must be denied.');

    console.log(
      JSON.stringify({
        status: 'login-proof-passed',
        fixtures_prepared: fixtures.length,
        downloads,
        reload_download: reloadDownload,
        session_failures: {
          logout_status: logoutStatus,
          tampered_status: tamperedStatus,
          expired_status: expiredStatus,
        },
        admin_session: {
          http_only: sessionCookie.httpOnly,
          same_site: sessionCookie.sameSite,
          secure: sessionCookie.secure,
        },
      }),
    );
  } finally {
    client?.close();
    await chrome?.close();
    if (chromeProfile) {
      await rm(chromeProfile, { recursive: true, force: true });
    }
    await runtime?.close();
  }
}

main().catch((error) => {
  console.error(
    `BG07_BROWSER_DOWNLOAD_ERROR ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
