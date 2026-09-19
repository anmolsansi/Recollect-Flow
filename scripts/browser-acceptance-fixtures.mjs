/* global fetch */

import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function escapePdfText(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function buildPdf(phrase) {
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${escapePdfText(phrase)}) Tj\nET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let content = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(content, 'utf8'));
    content += object;
  }
  const xrefOffset = Buffer.byteLength(content, 'utf8');
  content += `xref\n0 ${objects.length + 1}\n`;
  content += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    content += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  content += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(content, 'utf8');
}

async function jsonRequest(url, options, expectedStatus, scenario) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { non_json_response: text.slice(0, 200) };
  }
  assert.equal(
    response.status,
    expectedStatus,
    `[${scenario}] expected HTTP ${expectedStatus}, received ${response.status}: ${JSON.stringify(body)}`,
  );
  return body;
}

export function buildBrowserFixtures(runId = randomUUID()) {
  const stable = runId.replaceAll('-', '');
  const pdfBytes = buildPdf(`RecollectFlow BG-07 browser proof ${stable}`);
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl7Z1sAAAAASUVORK5CYII=',
    'base64',
  );
  const textBytes = Buffer.from(
    `RecollectFlow BG-07 generic download proof ${stable}\n`,
    'utf8',
  );

  return [
    {
      kind: 'pdf',
      filename: `bg07-${stable}.pdf`,
      mimeType: 'application/pdf',
      sourceType: 'file',
      bytes: pdfBytes,
    },
    {
      kind: 'image',
      filename: `bg07-${stable}.png`,
      mimeType: 'image/png',
      sourceType: 'image',
      bytes: pngBytes,
    },
    {
      kind: 'text',
      filename: `bg07-${stable}.txt`,
      mimeType: 'text/plain',
      sourceType: 'file',
      bytes: textBytes,
    },
  ].map((fixture) => ({
    ...fixture,
    sizeBytes: fixture.bytes.byteLength,
    sha256: sha256(fixture.bytes),
  }));
}

export async function uploadAndLinkFixture({
  apiOrigin,
  captureToken,
  fixture,
}) {
  const headers = {
    Authorization: `Bearer ${captureToken}`,
    'Content-Type': 'application/json',
  };

  const initialized = await jsonRequest(
    `${apiOrigin}/api/v1/uploads/init`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: fixture.filename,
        mime_type: fixture.mimeType,
        size_bytes: fixture.sizeBytes,
        content_hash: fixture.sha256,
        source_type: fixture.sourceType,
      }),
    },
    201,
    `${fixture.kind}:init`,
  );
  const attachmentId = initialized?.data?.attachment_id;
  const uploadUrl = initialized?.data?.upload_url;
  assert.ok(attachmentId, `[${fixture.kind}:init] missing attachment_id`);
  assert.ok(uploadUrl, `[${fixture.kind}:init] missing upload_url`);

  const upload = await fetch(`${apiOrigin}${uploadUrl}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${captureToken}`,
      'Content-Type': fixture.mimeType,
      'Content-Length': String(fixture.sizeBytes),
    },
    body: fixture.bytes,
  });
  const uploadBody = await upload.json();
  assert.equal(upload.status, 200, `[${fixture.kind}:upload] HTTP ${upload.status}`);
  assert.equal(uploadBody?.data?.checksum, fixture.sha256);

  const finalized = await jsonRequest(
    `${apiOrigin}/api/v1/uploads/${attachmentId}/finalize`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ checksum: fixture.sha256 }),
    },
    200,
    `${fixture.kind}:finalize`,
  );
  assert.equal(finalized?.data?.status, 'finalized');

  const captured = await jsonRequest(
    `${apiOrigin}/api/v1/captures`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotency_key: `bg07-browser-${randomUUID()}`,
        source_type: fixture.sourceType,
        source_app: 'bg07-browser-acceptance',
        attachment_id: attachmentId,
        user_reason: 'Synthetic BG-07 local browser download verification',
        privacy_level: 'unknown',
        captured_at: new Date().toISOString(),
        client: { name: 'bg07-browser-acceptance', version: '1.0.0' },
      }),
    },
    201,
    `${fixture.kind}:capture`,
  );
  const itemId = captured?.data?.capture_id;
  assert.ok(itemId, `[${fixture.kind}:capture] missing capture_id`);

  return { ...fixture, attachmentId, itemId };
}
