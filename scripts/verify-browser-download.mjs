/* global process, console */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CdpClient } from './browser-cdp.mjs';
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
  await client.send('Page.navigate', { url }, sessionId);
  await client.waitForExpression(
    sessionId,
    `document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`,
    { timeoutMs: 15_000, description: `navigation to ${url}` },
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

    const primaryFixture = fixtures[0];
    assert.ok(primaryFixture, 'Expected at least one browser fixture.');
    const downloadDir = join(runtime.tempDir, 'downloads');
    await mkdir(downloadDir, { recursive: true });
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
      eventsEnabled: true,
    });

    const itemUrl = `${runtime.webOrigin}/items/${primaryFixture.itemId}`;
    await navigate(client, sessionId, itemUrl);
    const expectedHref = `/api/v1/attachments/${primaryFixture.attachmentId}/content`;
    await client.waitForExpression(
      sessionId,
      `Boolean(document.querySelector(${JSON.stringify(
        `a[href="${expectedHref}"]`,
      )}))`,
      { description: 'actual attachment Download link' },
    );

    const actualHref = await client.evaluate(
      sessionId,
      `document.querySelector(${JSON.stringify(
        `a[href="${expectedHref}"]`,
      )})?.getAttribute('href')`,
    );
    assert.equal(actualHref, expectedHref);
    assert.equal(actualHref.includes('token='), false);
    assert.equal(actualHref.includes('authorization='), false);

    const downloadStarted = client.waitForEvent(
      'Browser.downloadWillBegin',
      (message) => message.params?.url?.endsWith(expectedHref),
      { timeoutMs: 10_000, description: 'Download link browser request' },
    );
    await client.evaluate(
      sessionId,
      `document.querySelector(${JSON.stringify(
        `a[href="${expectedHref}"]`,
      )})?.click()`,
    );
    await downloadStarted;

    console.log(
      JSON.stringify({
        status: 'login-proof-passed',
        fixtures_prepared: fixtures.length,
        download_href: expectedHref,
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
