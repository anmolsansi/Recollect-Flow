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

const publicPolicy = await jsonRequest(
  `/api/v1/items/${firstCapture.data.capture_id}/privacy`,
  {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      privacy_level: 'public',
      derived_data_action: 'reprocess',
    }),
  },
  200,
);
assert(
  publicPolicy.data?.provider_eligibility === 'openrouter',
  'Public data did not select OpenRouter.',
);
assert(
  JSON.stringify(publicPolicy.data?.fallback_providers) ===
    JSON.stringify(['gemini']),
  'Public data did not publish the Gemini fallback.',
);

const personalWithoutConsent = await jsonRequest(
  `/api/v1/items/${firstCapture.data.capture_id}/privacy`,
  {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      privacy_level: 'personal',
      derived_data_action: 'reprocess',
      ai_provider: 'openrouter',
      credential_source: 'app_managed',
    }),
  },
  200,
);
assert(
  personalWithoutConsent.data?.provider_eligibility === 'none',
  'Personal data without consent did not fail closed.',
);

const personalWithConsent = await jsonRequest(
  `/api/v1/items/${firstCapture.data.capture_id}/privacy`,
  {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      privacy_level: 'personal',
      derived_data_action: 'reprocess',
      ai_provider: 'openrouter',
      credential_source: 'app_managed',
      hosted_processing_consent: true,
      zero_data_retention_enforced: true,
      data_collection_denied: true,
    }),
  },
  200,
);
assert(
  personalWithConsent.data?.provider_eligibility === 'openrouter',
  'Compliant Personal routing did not select OpenRouter.',
);
assert(
  personalWithConsent.data?.zero_data_retention_required === true &&
    personalWithConsent.data?.data_collection_denied === true,
  'Compliant Personal routing did not require both privacy controls.',
);

const sensitivePolicy = await jsonRequest(
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
  sensitivePolicy.data?.provider_eligibility === 'none',
  'Sensitive data did not fail closed.',
);
assert(
  sensitivePolicy.data?.policy_version === '2026-07-21.1',
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
    public_policy_provider: publicPolicy.data.provider_eligibility,
    public_policy_fallbacks: publicPolicy.data.fallback_providers,
    personal_without_consent: personalWithoutConsent.data.provider_eligibility,
    personal_with_consent: personalWithConsent.data.provider_eligibility,
    personal_zdr_required:
      personalWithConsent.data.zero_data_retention_required,
    personal_data_collection_denied:
      personalWithConsent.data.data_collection_denied,
    sensitive_policy_provider: sensitivePolicy.data.provider_eligibility,
    policy_version: sensitivePolicy.data.policy_version,
    attachment_id: attachmentId,
    attachment_item_id: fileCapture.data.capture_id,
    authorized_download: 200,
    anonymous_download: 401,
    attachment_sha256: checksum,
  }),
);
