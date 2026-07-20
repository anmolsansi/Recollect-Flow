/* global Buffer, TextEncoder, console, fetch, process */

import { createHash, randomUUID } from 'node:crypto';

const baseUrl = process.env.WORKER_BASE_URL?.replace(/\/$/, '');
const captureToken = process.env.CAPTURE_TOKEN;
const adminToken = process.env.ADMIN_TOKEN;

if (!baseUrl || !captureToken || !adminToken) {
  throw new Error(
    'WORKER_BASE_URL, CAPTURE_TOKEN, and ADMIN_TOKEN are required.',
  );
}

const captureHeaders = {
  Authorization: `Bearer ${captureToken}`,
  'Content-Type': 'application/json',
};
const adminHeaders = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function jsonRequest(path, options, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { non_json_response: text.slice(0, 200) };
  }
  assert(
    response.status === expectedStatus,
    `${options.method ?? 'GET'} ${path}: expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(body)}`,
  );
  return body;
}

const runId = randomUUID();
const now = () => new Date().toISOString();

const health = await jsonRequest('/api/v1/health', {}, 200);
assert(health.data?.status === 'ok', 'Health response was not ok.');

await jsonRequest(
  '/api/v1/captures',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  },
  401,
);

const captureBase = {
  source_type: 'url',
  source_app: 'production-release-verifier',
  privacy_level: 'unknown',
  captured_at: now(),
  client: { name: 'production-release-verifier', version: '1.0.0' },
};
const stable = runId.replaceAll('-', '');
const firstCapture = await jsonRequest(
  '/api/v1/captures',
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({
      ...captureBase,
      idempotency_key: `release-${runId}-a`,
      url: `https://example.com/recollect-release/${runId}?stable=${stable}&utm_source=release-a`,
      user_reason: 'Neutral production duplicate test A',
    }),
  },
  201,
);
const secondCapture = await jsonRequest(
  '/api/v1/captures',
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({
      ...captureBase,
      captured_at: now(),
      idempotency_key: `release-${runId}-b`,
      url: `https://example.com/recollect-release/${runId}?utm_medium=release-b&stable=${stable}`,
      user_reason: 'Neutral production duplicate test B',
    }),
  },
  201,
);
assert(
  firstCapture.data?.capture_id === secondCapture.data?.capture_id,
  'Canonical duplicate did not reuse the first item.',
);
assert(
  secondCapture.data?.duplicate_of === firstCapture.data?.capture_id,
  'Duplicate response did not identify the canonical item.',
);

const policy = await jsonRequest(
  `/api/v1/items/${firstCapture.data.capture_id}/privacy`,
  {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      privacy_level: 'sensitive',
      derived_data_action: 'purge',
    }),
  },
  200,
);
assert(
  policy.data?.provider_eligibility === 'none',
  'Sensitive data did not fail closed.',
);
assert(
  policy.data?.policy_version === '2026-07-20.1',
  'Unexpected policy version.',
);

const pdfBytes = new TextEncoder().encode(
  `%PDF-1.7\n% RecollectFlow neutral production release test ${runId}\n`,
);
const checksum = createHash('sha256').update(pdfBytes).digest('hex');
const uploadInit = await jsonRequest(
  '/api/v1/uploads/init',
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({
      filename: `recollect-release-${runId}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: pdfBytes.byteLength,
      content_hash: checksum,
      source_type: 'file',
    }),
  },
  201,
);
const attachmentId = uploadInit.data?.attachment_id;
assert(attachmentId, 'Upload init did not return an attachment ID.');

await jsonRequest(
  uploadInit.data.upload_url,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${captureToken}`,
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdfBytes.byteLength),
    },
    body: pdfBytes,
  },
  200,
);
await jsonRequest(
  `/api/v1/uploads/${attachmentId}/finalize`,
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({ checksum }),
  },
  200,
);

const fileCapture = await jsonRequest(
  '/api/v1/captures',
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({
      idempotency_key: `release-${runId}-file`,
      source_type: 'file',
      source_app: 'production-release-verifier',
      attachment_id: attachmentId,
      user_reason: 'Neutral production attachment test',
      privacy_level: 'unknown',
      captured_at: now(),
      client: { name: 'production-release-verifier', version: '1.0.0' },
    }),
  },
  201,
);

const authorizedDownload = await fetch(
  `${baseUrl}/api/v1/attachments/${attachmentId}/content`,
  { headers: { Authorization: `Bearer ${captureToken}` } },
);
assert(
  authorizedDownload.status === 200,
  'Authorized attachment download failed.',
);
const downloadedBytes = new Uint8Array(await authorizedDownload.arrayBuffer());
assert(
  Buffer.from(downloadedBytes).equals(Buffer.from(pdfBytes)),
  'Downloaded attachment bytes did not match the upload.',
);

const anonymousDownload = await fetch(
  `${baseUrl}/api/v1/attachments/${attachmentId}/content`,
);
assert(
  anonymousDownload.status === 401,
  'Anonymous attachment download was not rejected.',
);

console.log(
  JSON.stringify({
    health: 'ok',
    anonymous_capture_status: 401,
    duplicate_item_id: firstCapture.data.capture_id,
    duplicate_of: secondCapture.data.duplicate_of,
    policy_provider: policy.data.provider_eligibility,
    policy_version: policy.data.policy_version,
    attachment_id: attachmentId,
    attachment_item_id: fileCapture.data.capture_id,
    authorized_download: 200,
    anonymous_download: 401,
    attachment_sha256: checksum,
  }),
);
