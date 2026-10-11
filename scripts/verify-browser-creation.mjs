/* global console, process, fetch */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createBg21Preview } from './bg21-preview-runtime.mjs';
import { buildBrowserFixtures } from './browser-acceptance-fixtures.mjs';
import {
  apiRequest,
  openBrowser,
  navigate,
  login,
  waitFor,
  evaluate,
  clickButton,
  fillLabel,
  report,
  safeDiagnostics,
} from './bg14-browser-utils.mjs';

const runId = randomUUID().replaceAll('-', '');
const adminToken = 'bg22-admin-' + randomUUID();
const captureToken = 'bg22-capture-' + randomUUID();
let runtime;
let browser;
let fixtureDir;

async function changeField(selector, value) {
  await evaluate(
    browser,
    '(() => { const el = document.querySelector(' +
      JSON.stringify(selector) +
      '); if (!el) throw new Error("Missing field");' +
      ' const prototype = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype :' +
      ' el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;' +
      ' Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, ' +
      JSON.stringify(value) +
      '); el.dispatchEvent(new Event("input", { bubbles: true }));' +
      ' el.dispatchEvent(new Event("change", { bubbles: true })); return true; })()',
  );
}
async function itemDetails(id) {
  return apiRequest(runtime.apiOrigin, adminToken, 'GET', '/items/' + id);
}
async function saveText(
  mode,
  value,
  reason,
  privacy,
  { expectDuplicate = false } = {},
) {
  await navigate(browser, runtime.webOrigin + '/capture');
  await waitFor(
    browser,
    'Boolean(document.querySelector("form.capture-form"))',
    'capture form',
  );
  await evaluate(
    browser,
    'document.querySelector(' +
      JSON.stringify('input[name="mode"][value="' + mode + '"]') +
      ').click()',
  );
  const valueField = mode === 'url' ? '[name="url"]' : '[name="shared_text"]';
  await waitFor(
    browser,
    'Boolean(document.querySelector(' + JSON.stringify(valueField) + '))',
    'rendered ' + mode + ' capture field',
  );
  await changeField(valueField, value);
  await changeField('[name="user_reason"]', reason);
  await changeField('[name="privacy_level"]', privacy);
  await evaluate(
    browser,
    'document.querySelector("form.capture-form").requestSubmit()',
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("Processing status:") && Boolean(document.querySelector(\'a[href^="/items/"]\'))',
    'durable ' + mode + ' capture',
  );
  const id = await evaluate(
    browser,
    'document.querySelector(\'a[href^="/items/"]\').getAttribute("href").split("/").pop()',
  );
  const details = await itemDetails(id);
  assert.equal(details.item.source_type, mode);
  assert.equal(details.item.privacy_level, privacy);
  if (!expectDuplicate) assert.equal(details.item.user_note, reason);
  if (mode === 'url') assert.equal(details.item.source_url, value);
  else assert.equal(details.item.raw_text, value);
  report('BG22-create-' + mode, { capture_id: id, privacy });
  return id;
}
async function chooseFile(path) {
  const dom = await browser.client.send(
    'DOM.getDocument',
    { depth: -1 },
    browser.sessionId,
  );
  const field = await browser.client.send(
    'DOM.querySelector',
    { nodeId: dom.root.nodeId, selector: 'input[name="file"]' },
    browser.sessionId,
  );
  assert.ok(field.nodeId, 'File picker is missing');
  await browser.client.send(
    'DOM.setFileInputFiles',
    { nodeId: field.nodeId, files: [path] },
    browser.sessionId,
  );
  await waitFor(
    browser,
    'document.querySelector(\'input[name="file"]\')?.files?.length === 1',
    'original file selection',
  );
}
async function saveOriginal(fixture) {
  const path = join(fixtureDir, fixture.filename);
  await writeFile(path, fixture.bytes);
  await navigate(browser, runtime.webOrigin + '/capture/file');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[name="file"]\'))',
    'file form',
  );
  await chooseFile(path);
  await changeField('#file-reason', 'BG22 ' + fixture.kind + ' ' + runId);
  await evaluate(browser, 'document.querySelector("form").requestSubmit()');
  await waitFor(
    browser,
    'document.body.textContent.includes("Original bytes finalized") && Boolean(document.querySelector(\'a[href^="/items/"]\'))',
    'original finalized and linked',
    25000,
  );
  const id = await evaluate(
    browser,
    'document.querySelector(\'a[href^="/items/"]\').getAttribute("href").split("/").pop()',
  );
  const details = await itemDetails(id);
  assert.equal(details.item.source_type, fixture.sourceType);
  assert.equal(details.attachments.length, 1);
  const attachment = details.attachments[0];
  assert.equal(attachment.status, 'linked');
  assert.equal(attachment.size_bytes, fixture.sizeBytes);
  assert.equal(attachment.content_hash, fixture.sha256);
  await navigate(browser, runtime.webOrigin + '/items/' + id);
  await waitFor(
    browser,
    'document.body.textContent.includes("Source and coverage")',
    'item detail',
  );
  const download = await evaluate(
    browser,
    '(async () => { const response = await fetch(' +
      JSON.stringify('/api/v1/attachments/' + attachment.id + '/content') +
      ', { credentials: "include" });' +
      ' if (!response.ok) return { status: response.status };' +
      ' const bytes = await response.arrayBuffer();' +
      ' const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))' +
      '.map(x => x.toString(16).padStart(2, "0")).join("");' +
      ' return { status: response.status, size: bytes.byteLength, hash }; })()',
  );
  assert.deepEqual(download, {
    status: 200,
    size: fixture.sizeBytes,
    hash: fixture.sha256,
  });
  report('BG22-original-' + fixture.kind, {
    capture_id: id,
    attachment_id: attachment.id,
    sha256_verified: true,
  });
  return { id, attachmentId: attachment.id };
}
async function searchByReason(reason, expectedId) {
  await navigate(browser, runtime.webOrigin + '/');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[aria-label="Search"]\'))',
    'Inbox search',
  );
  await changeField('input[aria-label="Search"]', reason);
  await waitFor(
    browser,
    'Boolean(document.querySelector(' +
      JSON.stringify('a[href="/items/' + expectedId + '"]') +
      '))',
    'indexed reason ' + reason,
    20000,
  );
  const href = await evaluate(
    browser,
    'document.querySelector(' +
      JSON.stringify('a[href="/items/' + expectedId + '"]') +
      ').getAttribute("href")',
  );
  assert.equal(href, '/items/' + expectedId);
  await navigate(browser, runtime.webOrigin + href);
  await waitFor(
    browser,
    'document.body.textContent.includes("Source and coverage")',
    'searched item detail',
  );
  assert.equal(await evaluate(browser, 'location.pathname'), href);
  report('BG22-search-and-reopen', { capture_id: expectedId });
}
async function ensureLoggedOutProtection(id, attachmentId) {
  await navigate(browser, runtime.webOrigin + '/');
  await clickButton(browser, 'Logout');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'session revoked',
  );
  const checked = await evaluate(
    browser,
    '(async () => { const requests = await Promise.all([' +
      'fetch(' +
      JSON.stringify('/api/v1/items/' + id) +
      ', { credentials: "include" }),' +
      'fetch(' +
      JSON.stringify('/api/v1/attachments/' + attachmentId + '/content') +
      ', { credentials: "include" }),' +
      'fetch("/api/v1/captures", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },' +
      ' body: JSON.stringify({ idempotency_key: "bg22-unauthorized-' +
      runId +
      '", source_type: "note",' +
      ' shared_text: "unauthorized", source_app: "bg22", captured_at: new Date().toISOString(),' +
      ' client: { name: "bg22", version: "1.0" } }) })' +
      ']); return requests.map(r => r.status); })()',
  );
  assert.ok(
    checked.every((code) => code === 401 || code === 403),
    'Logged-out read, download and write must be denied: ' +
      JSON.stringify(checked),
  );
  await navigate(browser, runtime.webOrigin + '/items/' + id);
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'deep link demands login',
  );
  assert.equal(await evaluate(browser, 'location.pathname'), '/items/' + id);
  report('BG22-logout-denies-read-download-write', { statuses: checked });
}
async function run() {
  runtime = await createBg21Preview({
    port: 8993,
    adminToken,
    captureToken,
  });
  const manifest = JSON.parse(
    await readFile('apps/web/dist/release-manifest.json', 'utf8'),
  );
  const health = await fetch(runtime.webOrigin + '/api/v1/health');
  assert.equal(health.status, 200);
  browser = await openBrowser(runtime);
  const version = await browser.client.send('Browser.getVersion');
  await navigate(browser, runtime.webOrigin + '/');
  await waitFor(
    browser,
    'Boolean(document.querySelector(\'input[type="password"]\'))',
    'fresh unauthenticated profile',
  );
  report('BG22-isolated-bundled-preview', {
    browser_version: version.product,
    node: process.version,
    manifest_keys: Object.keys(manifest).sort(),
    origin_kind: 'local HTTP, not a remote HTTPS acceptance',
  });
  await login(browser, runtime.webOrigin, adminToken);

  const url = 'https://example.com/bg22-' + runId;
  const urlReason = 'bg22url' + runId;
  const textReason = 'bg22text' + runId;
  const noteReason = 'bg22note' + runId;
  const urlId = await saveText('url', url, urlReason, 'public');
  const textId = await saveText(
    'text',
    'BG22 searchable text ' + runId,
    textReason,
    'personal',
  );
  const noteId = await saveText(
    'note',
    'BG22 private note ' + runId,
    noteReason,
    'personal',
  );
  assert.equal(new Set([urlId, textId, noteId]).size, 3);

  for (const [reason, id] of [
    [urlReason, urlId],
    [textReason, textId],
    [noteReason, noteId],
  ]) {
    await searchByReason(reason, id);
  }

  const fixtures = buildBrowserFixtures(runId);
  const png = fixtures.find((fixture) => fixture.kind === 'image');
  const pdf = fixtures.find((fixture) => fixture.kind === 'pdf');
  assert.ok(png && pdf);
  const image = await saveOriginal(png);
  const file = await saveOriginal(pdf);

  await navigate(browser, runtime.webOrigin + '/items/' + noteId);
  const reviewLocal = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 16);
  await fillLabel(browser, 'Title', 'BG22 owner title ' + runId);
  await fillLabel(browser, 'Project', 'BG22 Project ' + runId);
  await fillLabel(browser, 'Review date', reviewLocal);
  await clickButton(browser, 'Save changes');
  await waitFor(
    browser,
    'document.body.textContent.includes("Changes saved.")',
    'owner title persisted',
  );
  await browser.client.send(
    'Page.reload',
    { ignoreCache: true },
    browser.sessionId,
  );
  await waitFor(
    browser,
    'document.body.textContent.includes("BG22 owner title")',
    'owner edit survives hard reload',
  );
  const noteDetail = await itemDetails(noteId);
  assert.equal(noteDetail.item.title, 'BG22 owner title ' + runId);
  assert.equal(noteDetail.item.project, 'BG22 Project ' + runId);
  assert.ok(noteDetail.item.review_at, 'Review date must persist');
  assert.equal(noteDetail.item.raw_text, 'BG22 private note ' + runId);
  const reviewShown = await evaluate(
    browser,
    'document.querySelector("input[type=datetime-local]")?.value',
  );
  assert.equal(reviewShown, reviewLocal);
  report('BG22-owner-metadata-persists-after-reload', {
    capture_id: noteId,
    source_unchanged: true,
  });

  const repeated = await saveText('url', url, 'bg22second' + runId, 'public', {
    expectDuplicate: true,
  });
  assert.equal(
    repeated,
    urlId,
    'Canonical duplicate must reuse original capture',
  );
  const duplicateDetail = await itemDetails(urlId);
  assert.ok(
    duplicateDetail.provenance.capture_events.length >= 2,
    'Duplicate reason event missing',
  );
  assert.ok(
    duplicateDetail.provenance.capture_events.some(
      (event) => event.user_note === 'bg22second' + runId,
    ),
    'Later duplicate reason must remain separately visible',
  );
  report('BG22-canonical-duplicate-event', { capture_id: urlId });

  await ensureLoggedOutProtection(noteId, image.attachmentId);
  report('BG22-local-browser-creation-matrix', {
    result: 'passed',
    item_count: 5,
    pdf_attachment_id: file.attachmentId,
    qualification:
      'Local bundled Worker test only; BG-21 hosted HTTPS and BG-22 outage/recovery acceptance remain open',
  });
}
try {
  fixtureDir = await mkdtemp(join(tmpdir(), 'recollect-bg22-'));
  await run();
} catch (error) {
  console.error(
    'BG22_BROWSER_FAILURE ' +
      JSON.stringify({
        reason: error instanceof Error ? error.message : String(error),
        recent_api: safeDiagnostics(browser),
      }),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  await runtime?.close();
  if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
}
