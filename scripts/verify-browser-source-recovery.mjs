/* global fetch, process, console, URL */

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { CdpClient } from './browser-cdp.mjs';
import {
  createLocalAcceptanceRuntime,
  launchChrome,
} from './browser-acceptance-runtime.mjs';

const captureToken = 'bg11-keyboard-capture-test-token';
const adminToken = 'bg11-keyboard-admin-test-token';
const localWorkerToken = 'bg11-keyboard-worker-token';

async function navigate(client, sessionId, url) {
  await client.send('Page.navigate', { url }, sessionId);
  await client.waitForExpression(
    sessionId,
    'document.readyState === "complete" && Boolean(document.body)',
    { description: `navigated to ${new URL(url).pathname}` },
  );
}
async function press(client, sessionId, key) {
  const params = {
    key,
    code: key,
    windowsVirtualKeyCode: key === 'Tab' ? 9 : 13,
    nativeVirtualKeyCode: key === 'Tab' ? 9 : 13,
  };
  await client.send(
    'Input.dispatchKeyEvent',
    { type: 'keyDown', ...params },
    sessionId,
  );
  await client.send(
    'Input.dispatchKeyEvent',
    { type: 'keyUp', ...params },
    sessionId,
  );
}
async function main() {
  let runtime, chrome, client, profile;
  try {
    runtime = await createLocalAcceptanceRuntime({
      captureToken,
      adminToken,
      localWorkerToken,
    });
    const itemUrl = `https://example.com/bg11-keyboard-${randomUUID()}`;
    const capture = await fetch(`${runtime.apiOrigin}/api/v1/captures`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${captureToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        source_type: 'url',
        source_app: 'bg11-keyboard',
        url: itemUrl,
        user_reason: 'synthetic accessibility proof',
        privacy_level: 'personal',
        captured_at: new Date().toISOString(),
        client: { name: 'bg11-keyboard', version: '1.0.0' },
      }),
    });
    const captureBody = await capture.json();
    assert.equal(
      capture.status,
      201,
      `URL capture failed: ${JSON.stringify(captureBody)}`,
    );
    const itemId = captureBody?.data?.capture_id;
    assert.ok(itemId, 'capture must return an item id');

    profile = await mkdtemp(join(tmpdir(), 'recollect-bg11-chrome-'));
    chrome = await launchChrome({ userDataDir: profile });
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
    await navigate(client, sessionId, runtime.webOrigin);
    await client.waitForExpression(
      sessionId,
      'Boolean(document.querySelector(\'input[type="password"]\'))',
      { description: 'admin login' },
    );
    await client.evaluate(
      sessionId,
      `(() => {
      const input=document.querySelector('input[type="password"]');
      const form=input?.closest('form');
      if(!input||!form) throw new Error('missing admin login');
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
      if(!setter) throw new Error('missing native value setter');
      setter.call(input,${JSON.stringify(adminToken)});
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      form.requestSubmit();
      return true;
    })()`,
    );
    await client.waitForExpression(
      sessionId,
      '[...document.querySelectorAll("button")].some(b=>b.textContent?.trim()==="Logout")',
      { description: 'authenticated session' },
    );
    await navigate(client, sessionId, `${runtime.webOrigin}/items/${itemId}`);
    await client.waitForExpression(
      sessionId,
      'Boolean(document.querySelector(\'textarea[placeholder^="Paste an excerpt"]\'))',
      { description: 'owner-text recovery form' },
    );

    // This is real keyboard navigation in headless Chrome, not element.click().
    await client.evaluate(
      sessionId,
      'document.querySelector(\'textarea[placeholder^="Paste an excerpt"]\').focus()',
    );
    await client.send(
      'Input.insertText',
      { text: 'BG11 keyboard sentinel supplied excerpt' },
      sessionId,
    );
    await client.waitForExpression(
      sessionId,
      'Boolean(document.querySelector(\'textarea[placeholder^="Paste an excerpt"]\')?.value.includes("BG11 keyboard sentinel"))',
      { description: 'typed text' },
    );
    await press(client, sessionId, 'Tab');
    const focusedSave = await client.evaluate(
      sessionId,
      'document.activeElement?.textContent?.trim()',
    );
    assert.equal(
      focusedSave,
      'Save supplied text',
      'Tab from owner text must focus Save supplied text',
    );
    await press(client, sessionId, 'Enter');
    await client.waitForExpression(
      sessionId,
      `Boolean(document.querySelector('textarea[readonly]')?.value.includes('BG11 keyboard sentinel'))`,
      {
        timeoutMs: 15000,
        description: 'keyboard-triggered save persisted to item',
      },
    );
    const state = await client.evaluate(
      sessionId,
      `({
      supplied:document.querySelector('textarea[readonly]')?.value,
      hasSourceLink:Boolean(document.querySelector('a[target="_blank"][rel*="noopener"]')),
      recoveryText:document.querySelector('[role="status"]')?.textContent,
    })`,
    );
    assert.ok(state?.supplied.includes('BG11 keyboard sentinel'));
    assert.equal(
      state?.hasSourceLink,
      true,
      'the original saved URL must remain navigable',
    );
    assert.ok(state?.recoveryText, 'recovery status must remain accessible');
    console.log(
      JSON.stringify({
        result: 'pass',
        scenario: 'BG-11 keyboard navigation, Enter submit, saved source link',
        source_host_calls: 0,
        environment: 'isolated local worker/D1/Chrome',
      }),
    );
  } finally {
    client?.close();
    await chrome?.close();
    await runtime?.close();
    if (profile) await rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
