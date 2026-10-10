/* global fetch, process, URL, Event, HTMLInputElement */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CdpClient } from './browser-cdp.mjs';
import { launchChrome } from './browser-acceptance-runtime.mjs';

export async function apiRequest(origin, token, method, path, payload, expectedStatus=200) {
  const response = await fetch(origin + '/api/v1' + path, {
    method,
    headers: {Authorization: 'Bearer ' + token, ...(payload === undefined ? {} : {'Content-Type': 'application/json'})},
    ...(payload === undefined ? {} : {body: JSON.stringify(payload)}),
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  assert.equal(response.status, expectedStatus,
    method + ' ' + path.split('?')[0] + ' expected ' + expectedStatus +
    ', received ' + response.status + ' (' + (body?.error?.code || 'unknown') + ')');
  return body?.data ?? body;
}

export async function captureFixture(origin, captureToken, values) {
  const id = randomUUID();
  const data = await apiRequest(origin, captureToken, 'POST', '/captures', {
    idempotency_key: 'bg14-' + id,
    source_app: 'bg14-browser-acceptance',
    privacy_level: 'personal',
    captured_at: new Date().toISOString(),
    client: {name:'bg14-browser-acceptance', version:'1.0.0'},
    ...values,
  }, 201);
  assert.ok(data.capture_id, 'Missing synthetic capture_id');
  return data.capture_id;
}

export async function openBrowser(runtime) {
  const profile = await mkdtemp(join(tmpdir(), 'recollect-bg14-browser-'));
  let chrome, client;
  try {
    chrome = await launchChrome({userDataDir:profile});
    client = await CdpClient.connect(chrome.webSocketUrl);
    const {targetId} = await client.send('Target.createTarget', {url:'about:blank'});
    const {sessionId} = await client.send('Target.attachToTarget', {targetId, flatten:true});
    await client.send('Page.enable', {}, sessionId);
    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Network.enable', {}, sessionId);
    const requests = new Map();
    const responses = [];
    client.on('Network.requestWillBeSent', (msg) => {
      const requestUrl = new URL(msg.params?.request?.url ?? runtime.webOrigin);
      if (!requestUrl.pathname.startsWith('/api/v1/')) return;
      requests.set(msg.params.requestId, {
        method: msg.params.request.method,
        path: requestUrl.pathname,
      });
    });
    client.on('Network.responseReceived', (msg) => {
      const request = requests.get(msg.params.requestId);
      if (!request) return;
      requests.delete(msg.params.requestId);
      responses.push({...request, status:msg.params.response.status});
      if(responses.length > 30) responses.shift();
    });
    return {
      client, sessionId, responses,
      async close() {client.close(); await chrome.close(); await rm(profile,{recursive:true,force:true});},
    };
  } catch (error) {
    client?.close();
    await chrome?.close();
    await rm(profile,{recursive:true,force:true});
    throw error;
  }
}

export async function navigate(browser, url) {
  await browser.client.send('Page.navigate',{url},browser.sessionId);
  await browser.client.waitForExpression(browser.sessionId,
    'document.readyState === "complete" && location.href === ' + JSON.stringify(url),
    {description:'navigation to ' + new URL(url).pathname,timeoutMs:15000});
}

export async function waitFor(browser, expression, description, timeoutMs=15000) {
  await browser.client.waitForExpression(browser.sessionId,expression,{description,timeoutMs});
}

export async function evaluate(browser, expression) {
  return browser.client.evaluate(browser.sessionId,expression);
}

export async function login(browser, origin, adminToken) {
  await navigate(browser,origin+'/');
  await waitFor(browser,'Boolean(document.querySelector(\'input[type="password"]\'))','real login form');
  await evaluate(browser, '(() => { const input=document.querySelector(\'input[type="password"]\');'+
    'const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;'+
    'setter.call(input,'+JSON.stringify(adminToken)+');'+
    'input.dispatchEvent(new Event("input",{bubbles:true}));'+
    'input.dispatchEvent(new Event("change",{bubbles:true}));'+
    'input.closest("form").requestSubmit(); return true; })()');
  await waitFor(browser,'[...document.querySelectorAll("button")].some(b=>b.textContent?.trim()==="Logout")','authenticated Inbox');
  const cookie=await browser.client.send('Network.getCookies',{urls:[origin]},browser.sessionId);
  const session=cookie.cookies?.find(c=>c.name==='admin_session');
  assert.ok(session,'No session cookie after real login');
  assert.equal(session.httpOnly,true);
  assert.equal(session.sameSite,'Strict');
  const leaks=await evaluate(browser,'[localStorage,sessionStorage].some(s=>Object.values(s).some(v=>v==='+JSON.stringify(adminToken)+'))');
  assert.equal(leaks,false,'ADMIN_TOKEN in browser storage');
}

export async function clickButton(browser, text) {
  const matcher='[...document.querySelectorAll("button")].find(b=>b.textContent?.trim()==='+JSON.stringify(text)+')';
  await waitFor(browser,'Boolean('+matcher+' && !'+matcher+'.disabled)','enabled '+text+' button');
  await evaluate(browser,matcher+'.click()');
}

export async function fillLabel(browser,label,value) {
  const selector='[...document.querySelectorAll("label")].find(l=>l.querySelector("strong")?.textContent?.trim()==='+JSON.stringify(label)+')?.querySelector("input,textarea")';
  await waitFor(browser,'Boolean('+selector+')','field '+label);
  await evaluate(browser,'(() => {const el='+selector+'; const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;'+
    'Object.getOwnPropertyDescriptor(proto,"value").set.call(el,'+JSON.stringify(value)+');'+
    'el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); return true;})()');
}

export function report(stage, detail={}) {
  process.stdout.write(JSON.stringify({stage,status:'passed',...detail})+'\n');
}

export function safeDiagnostics(browser) {
  return browser?.responses?.slice(-18) ?? [];
}
