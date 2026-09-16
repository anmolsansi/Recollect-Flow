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

let targetOrigin;
try {
  targetOrigin = new URL(baseUrl);
} catch {
  throw new Error('WORKER_BASE_URL must be a valid absolute URL.');
}
if (!['http:', 'https:'].includes(targetOrigin.protocol)) {
  throw new Error('WORKER_BASE_URL must use http or https.');
}

const captureHeaders = {
  Authorization: `Bearer ${captureToken}`,
  'Content-Type': 'application/json',
};
const adminHeaders = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
};

const MAX_DIAGNOSTIC_RESPONSE_CHARS = 800;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boundedDiagnostic(body) {
  let serialized;
  try {
    serialized = JSON.stringify(body);
  } catch {
    serialized = '[unserializable response]';
  }
  for (const secret of [captureToken, adminToken]) {
    if (secret) serialized = serialized.replaceAll(secret, '[REDACTED]');
  }
  if (serialized.length <= MAX_DIAGNOSTIC_RESPONSE_CHARS) return serialized;
  return `${serialized.slice(0, MAX_DIAGNOSTIC_RESPONSE_CHARS)}...[truncated]`;
}

async function jsonRequest(path, options, expectedStatus, scenario = path) {
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
    `[${scenario}] ${options.method ?? 'GET'} ${path}: expected ${expectedStatus}, got ${response.status}: ${boundedDiagnostic(body)}`,
  );
  return body;
}

function readItemState(detail, itemId, scenario) {
  const item = detail?.data?.item;
  assert(
    item && typeof item === 'object' && !Array.isArray(item),
    `[${scenario}] Item detail response is missing data.item.`,
  );
  assert(
    item.id === itemId,
    `[${scenario}] Item detail returned an unexpected item ID.`,
  );
  assert(
    Number.isInteger(item.edit_version) && item.edit_version >= 1,
    `[${scenario}] Item detail edit_version must be a positive integer.`,
  );
  return {
    itemId: item.id,
    editVersion: item.edit_version,
    privacyLevel: item.privacy_level ?? null,
    sourceUrl: item.source_url ?? null,
    canonicalUrl: item.canonical_url ?? null,
    rawText: item.raw_text ?? null,
  };
}

async function readCurrentItem(itemId, scenario) {
  const detail = await jsonRequest(
    `/api/v1/items/${encodeURIComponent(itemId)}`,
    { headers: adminHeaders },
    200,
    scenario,
  );
  return readItemState(detail, itemId, scenario);
}

async function changePrivacy(itemId, current, fields, scenario) {
  const response = await jsonRequest(
    `/api/v1/items/${encodeURIComponent(itemId)}/privacy`,
    {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        edit_version: current.editVersion,
        ...fields,
      }),
    },
    200,
    scenario,
  );
  const returnedVersion = response?.data?.edit_version;
  assert(
    Number.isInteger(returnedVersion) && returnedVersion >= 1,
    `[${scenario}] Privacy response edit_version must be a positive integer.`,
  );
  const next = await readCurrentItem(itemId, `${scenario}:refetch`);
  assert(
    next.editVersion === returnedVersion,
    `[${scenario}] Refetched edit_version did not match the server mutation response.`,
  );
  assert(
    next.editVersion > current.editVersion,
    `[${scenario}] Successful privacy mutation did not advance edit_version.`,
  );
  return { response, current: next };
}

function assertStableEvidence(before, after, scenario) {
  assert(
    after.itemId === before.itemId,
    `[${scenario}] Canonical item ID changed.`,
  );
  assert(
    after.sourceUrl === before.sourceUrl,
    `[${scenario}] Source URL changed unexpectedly.`,
  );
  assert(
    after.canonicalUrl === before.canonicalUrl,
    `[${scenario}] Canonical URL changed unexpectedly.`,
  );
  assert(
    after.rawText === before.rawText,
    `[${scenario}] Raw source text changed unexpectedly.`,
  );
}

const runId = randomUUID();
const now = () => new Date().toISOString();

const health = await jsonRequest('/api/v1/health', {}, 200, 'health');
assert(health.data?.status === 'ok', 'Health response was not ok.');

await jsonRequest(
  '/api/v1/captures',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  },
  401,
  'anonymous-capture',
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
  'capture-primary',
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
  'capture-duplicate',
);
assert(
  firstCapture.data?.capture_id === secondCapture.data?.capture_id,
  'Canonical duplicate did not reuse the first item.',
);
assert(
  secondCapture.data?.duplicate_of === firstCapture.data?.capture_id,
  'Duplicate response did not identify the canonical item.',
);

const itemId = firstCapture.data?.capture_id;
assert(itemId, 'Primary capture did not return a capture ID.');
const initialItem = await readCurrentItem(itemId, 'privacy-initial-detail');

const publicChange = await changePrivacy(
  itemId,
  initialItem,
  {
    privacy_level: 'public',
    derived_data_action: 'reprocess',
  },
  'privacy-public',
);
const publicPolicy = publicChange.response;
assert(
  publicPolicy.data?.provider_eligibility === 'openrouter',
  'Public data did not select OpenRouter.',
);
assert(
  JSON.stringify(publicPolicy.data?.fallback_providers) ===
    JSON.stringify(['gemini']),
  'Public data did not publish the Gemini fallback.',
);

const beforeConflict = publicChange.current;
const staleConflict = await jsonRequest(
  `/api/v1/items/${encodeURIComponent(itemId)}/privacy`,
  {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      edit_version: initialItem.editVersion,
      privacy_level: 'unknown',
      derived_data_action: 'reprocess',
    }),
  },
  409,
  'privacy-stale-version',
);
assert(
  staleConflict?.error?.code === 'VERSION_CONFLICT',
  'Stale privacy mutation did not return VERSION_CONFLICT.',
);
const afterConflict = await readCurrentItem(itemId, 'privacy-stale-refetch');
assert(
  afterConflict.editVersion === beforeConflict.editVersion,
  'Stale privacy mutation changed the authoritative edit version.',
);
assert(
  afterConflict.privacyLevel === beforeConflict.privacyLevel,
  'Stale privacy mutation changed the current privacy level.',
);
assertStableEvidence(beforeConflict, afterConflict, 'privacy-stale-version');

const personalWithoutConsentChange = await changePrivacy(
  itemId,
  afterConflict,
  {
    privacy_level: 'personal',
    derived_data_action: 'reprocess',
    ai_provider: 'openrouter',
    credential_source: 'app_managed',
  },
  'privacy-personal-without-consent',
);
const personalWithoutConsent = personalWithoutConsentChange.response;
assert(
  personalWithoutConsent.data?.provider_eligibility === 'none',
  'Personal data without consent did not fail closed.',
);

const personalWithConsentChange = await changePrivacy(
  itemId,
  personalWithoutConsentChange.current,
  {
    privacy_level: 'personal',
    derived_data_action: 'reprocess',
    ai_provider: 'openrouter',
    credential_source: 'app_managed',
    hosted_processing_consent: true,
    zero_data_retention_enforced: true,
    data_collection_denied: true,
  },
  'privacy-personal-with-consent',
);
const personalWithConsent = personalWithConsentChange.response;
assert(
  personalWithConsent.data?.provider_eligibility === 'openrouter',
  'Compliant Personal routing did not select OpenRouter.',
);
assert(
  personalWithConsent.data?.zero_data_retention_required === true &&
    personalWithConsent.data?.data_collection_denied === true,
  'Compliant Personal routing did not require both privacy controls.',
);

const sensitiveChange = await changePrivacy(
  itemId,
  personalWithConsentChange.current,
  {
    privacy_level: 'sensitive',
    derived_data_action: 'purge',
  },
  'privacy-sensitive',
);
const sensitivePolicy = sensitiveChange.response;
assert(
  sensitivePolicy.data?.provider_eligibility === 'none',
  'Sensitive data did not fail closed.',
);
assert(
  sensitivePolicy.data?.policy_version === '2026-07-21.1',
  'Unexpected policy version.',
);
assertStableEvidence(
  initialItem,
  sensitiveChange.current,
  'privacy-final-state',
);
assert(
  sensitiveChange.current.privacyLevel === 'sensitive',
  'Final item privacy level did not match the Sensitive scenario.',
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
  'attachment-init',
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
  'attachment-upload',
);
await jsonRequest(
  `/api/v1/uploads/${attachmentId}/finalize`,
  {
    method: 'POST',
    headers: captureHeaders,
    body: JSON.stringify({ checksum }),
  },
  200,
  'attachment-finalize',
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
  'attachment-capture',
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
    duplicate_item_id: itemId,
    duplicate_of: secondCapture.data.duplicate_of,
    initial_edit_version: initialItem.editVersion,
    public_edit_version: publicChange.current.editVersion,
    stale_version_conflict: staleConflict.error.code,
    personal_without_consent_edit_version:
      personalWithoutConsentChange.current.editVersion,
    personal_with_consent_edit_version:
      personalWithConsentChange.current.editVersion,
    sensitive_edit_version: sensitiveChange.current.editVersion,
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
