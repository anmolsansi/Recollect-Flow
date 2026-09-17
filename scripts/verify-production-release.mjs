/* global Buffer, TextEncoder, URL, console, fetch, process */

import { createHash, randomUUID } from 'node:crypto';

const baseUrl = process.env.WORKER_BASE_URL?.replace(/\/$/, '');
const captureToken = process.env.CAPTURE_TOKEN;
const adminToken = process.env.ADMIN_TOKEN;
const allowRemoteSmoke = process.env.ALLOW_REMOTE_SMOKE === 'true';

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

const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
const targetMode = localHosts.has(targetOrigin.hostname) ? 'local' : 'remote';
if (targetMode === 'remote' && !allowRemoteSmoke) {
  throw new Error(
    'Remote smoke targets require explicit opt-in with ALLOW_REMOTE_SMOKE=true.',
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

const MAX_DIAGNOSTIC_RESPONSE_CHARS = 800;
const stageResults = [];
let activeStage = null;

const knownUnavailableStages = [
  {
    name: 'provider-adapter-execution',
    status: 'unavailable',
    reason:
      'Policy eligibility is verified here, but installed provider adapter execution requires configured provider capability and is separate evidence.',
  },
  {
    name: 'parseable-pdf-extraction-acceptance',
    status: 'unavailable',
    reason:
      'BG-04 prepares a genuinely parseable PDF fixture with a known phrase, but extraction acceptance remains separate processing evidence and is not inferred from upload success.',
  },
  {
    name: 'bare-url-acquisition-enrichment',
    status: 'unavailable',
    reason:
      'Bare-URL acquisition/enrichment is a later build-guide capability and must not be converted into a smoke pass by BG-04.',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function redactSecrets(value) {
  let text = String(value);
  for (const secret of [captureToken, adminToken]) {
    if (secret) text = text.replaceAll(secret, '[REDACTED]');
  }
  return text;
}

function boundedDiagnostic(body) {
  let serialized;
  try {
    serialized = JSON.stringify(body);
  } catch {
    serialized = '[unserializable response]';
  }
  serialized = redactSecrets(serialized);
  if (serialized.length <= MAX_DIAGNOSTIC_RESPONSE_CHARS) return serialized;
  return `${serialized.slice(0, MAX_DIAGNOSTIC_RESPONSE_CHARS)}...[truncated]`;
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return redactSecrets(message).slice(0, MAX_DIAGNOSTIC_RESPONSE_CHARS);
}

function requestUrl(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function requestDisplayPath(path) {
  try {
    const url = new URL(path, `${baseUrl}/`);
    return `${url.pathname}${url.search}`;
  } catch {
    return String(path).slice(0, 200);
  }
}

function recordHttp(method, path, expectedStatus, actualStatus) {
  if (!activeStage) return;
  activeStage.http.push({
    method,
    path: requestDisplayPath(path),
    expected_status: expectedStatus,
    actual_status: actualStatus,
  });
}

async function jsonRequest(path, options, expectedStatus, scenario = path) {
  const method = options.method ?? 'GET';
  const response = await fetch(requestUrl(path), options);
  recordHttp(method, path, expectedStatus, response.status);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { non_json_response: text.slice(0, 200) };
  }
  assert(
    response.status === expectedStatus,
    `[${scenario}] ${method} ${requestDisplayPath(path)}: expected ${expectedStatus}, got ${response.status}: ${boundedDiagnostic(body)}`,
  );
  return { body, response };
}

async function binaryRequest(path, options, expectedStatus, scenario = path) {
  const method = options.method ?? 'GET';
  const response = await fetch(requestUrl(path), options);
  recordHttp(method, path, expectedStatus, response.status);
  assert(
    response.status === expectedStatus,
    `[${scenario}] ${method} ${requestDisplayPath(path)}: expected ${expectedStatus}, got ${response.status}.`,
  );
  return {
    response,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

async function runStage(name, expectedHttp, work) {
  const stage = {
    name,
    status: 'running',
    started_at: new Date().toISOString(),
    expected_http: expectedHttp,
    http: [],
  };
  stageResults.push(stage);
  activeStage = stage;
  try {
    const value = await work();
    stage.status = 'passed';
    stage.finished_at = new Date().toISOString();
    return value;
  } catch (error) {
    stage.status = 'failed';
    stage.finished_at = new Date().toISOString();
    stage.error = safeErrorMessage(error);
    throw error;
  } finally {
    activeStage = null;
  }
}

function unavailableStage(name, reason, details = {}) {
  const stage = {
    name,
    status: 'unavailable',
    reason,
    ...details,
  };
  stageResults.push(stage);
  return stage;
}

function stageSummary(overall, error = null) {
  const allStages = [
    ...stageResults,
    ...knownUnavailableStages.filter(
      (known) => !stageResults.some((stage) => stage.name === known.name),
    ),
  ];
  const counts = allStages.reduce(
    (accumulator, stage) => {
      accumulator[stage.status] = (accumulator[stage.status] ?? 0) + 1;
      return accumulator;
    },
    { passed: 0, failed: 0, unavailable: 0 },
  );
  return {
    overall,
    target_origin: targetOrigin.origin,
    target_mode: targetMode,
    counts,
    stages: allStages,
    ...(error ? { error: safeErrorMessage(error) } : {}),
  };
}

function printFailureSummary(error) {
  console.error(
    `RELEASE_SMOKE_SUMMARY ${JSON.stringify(stageSummary('failed', error))}`,
  );
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
    lifecycleStatus: item.lifecycle_status ?? null,
    title: item.title ?? null,
    deletedAt: item.deleted_at ?? null,
    sourceUrl: item.source_url ?? null,
    canonicalUrl: item.canonical_url ?? null,
    rawText: item.raw_text ?? null,
  };
}

async function readItemDetail(itemId, scenario) {
  const { body } = await jsonRequest(
    `/api/v1/items/${encodeURIComponent(itemId)}`,
    { headers: adminHeaders },
    200,
    scenario,
  );
  return {
    body,
    state: readItemState(body, itemId, scenario),
  };
}

async function changePrivacy(itemId, current, fields, scenario) {
  const { body } = await jsonRequest(
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
  const returnedVersion = body?.data?.edit_version;
  assert(
    Number.isInteger(returnedVersion) && returnedVersion >= 1,
    `[${scenario}] Privacy response edit_version must be a positive integer.`,
  );
  const next = (await readItemDetail(itemId, `${scenario}:refetch`)).state;
  assert(
    next.editVersion === returnedVersion,
    `[${scenario}] Refetched edit_version did not match the server mutation response.`,
  );
  assert(
    next.editVersion > current.editVersion,
    `[${scenario}] Successful privacy mutation did not advance edit_version.`,
  );
  return { response: body, current: next };
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

function escapePdfText(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

function buildParseablePdf(phrase) {
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
  return new TextEncoder().encode(content);
}

const runId = randomUUID();
const stable = runId.replaceAll('-', '');
const now = () => new Date().toISOString();
const parseablePhrase = `RecollectFlow BG-04 parseable fixture ${stable}`;
const parseablePdfBytes = buildParseablePdf(parseablePhrase);
const parseablePdfSha256 = createHash('sha256')
  .update(parseablePdfBytes)
  .digest('hex');

console.error(
  JSON.stringify({
    event: 'release_smoke.target',
    target_origin: targetOrigin.origin,
    target_mode: targetMode,
    remote_opt_in: targetMode === 'remote' ? allowRemoteSmoke : false,
  }),
);

async function main() {
  const result = {
    run_id: runId,
    target_origin: targetOrigin.origin,
    target_mode: targetMode,
  };

  const health = await runStage(
    'health',
    [{ method: 'GET', path: '/api/v1/health', status: 200 }],
    async () => {
      const { body } = await jsonRequest('/api/v1/health', {}, 200, 'health');
      assert(healthBodyIsOk(body), 'Health response was not ok.');
      return body;
    },
  );
  result.health = health.data.status;

  await runStage(
    'anonymous-capture-denial',
    [{ method: 'POST', path: '/api/v1/captures', status: 401 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        401,
        'anonymous-capture',
      );
      assert(
        body?.error?.code === 'UNAUTHENTICATED',
        'Anonymous capture denial did not return UNAUTHENTICATED.',
      );
    },
  );
  result.anonymous_capture_status = 401;

  const captureBase = {
    source_type: 'url',
    source_app: 'production-release-verifier',
    privacy_level: 'unknown',
    captured_at: now(),
    client: { name: 'production-release-verifier', version: '1.0.0' },
  };
  const primaryPayload = {
    ...captureBase,
    idempotency_key: `release-${runId}-a`,
    url: `https://example.com/recollect-release/${runId}?stable=${stable}&utm_source=release-a`,
    user_reason: 'Neutral BG-04 production duplicate test A',
  };

  const firstCapture = await runStage(
    'capture-primary',
    [{ method: 'POST', path: '/api/v1/captures', status: 201 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify(primaryPayload),
        },
        201,
        'capture-primary',
      );
      assert(
        body.data?.capture_id,
        'Primary capture did not return a capture ID.',
      );
      assert(
        body.data?.replayed === false,
        'Primary capture was unexpectedly marked replayed.',
      );
      assert(
        body.data?.duplicate_of === null,
        'Primary capture was unexpectedly marked duplicate.',
      );
      return body;
    },
  );

  const itemId = firstCapture.data.capture_id;
  result.primary_item_id = itemId;

  const replayCapture = await runStage(
    'capture-idempotency-replay',
    [{ method: 'POST', path: '/api/v1/captures', status: 200 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify(primaryPayload),
        },
        200,
        'capture-idempotency-replay',
      );
      assert(
        body.data?.capture_id === itemId,
        'Idempotency replay did not return the original capture ID.',
      );
      assert(
        body.data?.replayed === true,
        'Idempotency replay did not report replayed=true.',
      );
      return body;
    },
  );
  result.exact_replay_status = 200;
  result.exact_replay = replayCapture.data.replayed;

  const secondCapture = await runStage(
    'capture-normalized-duplicate',
    [{ method: 'POST', path: '/api/v1/captures', status: 201 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify({
            ...captureBase,
            captured_at: now(),
            idempotency_key: `release-${runId}-b`,
            url: `https://example.com/recollect-release/${runId}?utm_medium=release-b&stable=${stable}`,
            user_reason: 'Neutral BG-04 production duplicate test B',
          }),
        },
        201,
        'capture-normalized-duplicate',
      );
      assert(
        body.data?.capture_id === itemId,
        'Canonical duplicate did not reuse the first item.',
      );
      assert(
        body.data?.duplicate_of === itemId,
        'Duplicate response did not identify the canonical item.',
      );
      assert(
        body.data?.replayed === false,
        'Fresh duplicate key was incorrectly reported as an idempotency replay.',
      );
      return body;
    },
  );
  result.duplicate_of = secondCapture.data.duplicate_of;

  const initialDetail = await runStage(
    'capture-provenance-and-source',
    [{ method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 }],
    async () => {
      const detail = await readItemDetail(itemId, 'capture-provenance');
      const events = detail.body?.data?.provenance?.capture_events;
      assert(
        Array.isArray(events),
        'Item detail did not return capture event provenance.',
      );
      assert(
        events.length >= 2,
        'Expected primary and normalized-duplicate capture events.',
      );
      assert(
        events.some((event) => event.duplicate_of === null),
        'Primary capture event was not present.',
      );
      assert(
        events.some((event) => event.duplicate_of === itemId),
        'Normalized duplicate capture event was not present.',
      );
      assert(
        events.length === 2,
        'Idempotency replay unexpectedly created an extra capture event.',
      );
      assert(
        detail.state.sourceUrl === primaryPayload.url,
        'Primary source URL was not preserved on the canonical item.',
      );
      return detail;
    },
  );
  const initialItem = initialDetail.state;

  const rawFixtureText = `BG-04 raw retrieval fixture ${stable}`;
  const rawCapture = await runStage(
    'raw-text-retrieval-without-ai',
    [
      { method: 'POST', path: '/api/v1/captures', status: 201 },
      { method: 'GET', path: '/api/v1/items/:rawItemId', status: 200 },
    ],
    async () => {
      const { body: capture } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify({
            source_type: 'note',
            source_app: 'production-release-verifier',
            privacy_level: 'unknown',
            captured_at: now(),
            idempotency_key: `release-${runId}-raw`,
            shared_text: rawFixtureText,
            user_reason: 'BG-04 raw retrieval proof without optional AI',
            client: {
              name: 'production-release-verifier',
              version: '1.0.0',
            },
          }),
        },
        201,
        'raw-text-capture',
      );
      const rawItemId = capture.data?.capture_id;
      assert(rawItemId, 'Raw-text capture did not return an item ID.');
      const detail = await readItemDetail(rawItemId, 'raw-text-detail');
      assert(
        detail.state.rawText === rawFixtureText,
        'Raw source text was not retrievable before optional AI processing.',
      );
      return { itemId: rawItemId };
    },
  );
  result.raw_item_id = rawCapture.itemId;

  const malformedConsent = await runStage(
    'privacy-malformed-consent-rejection',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 422,
      },
    ],
    async () => {
      const { body } = await jsonRequest(
        `/api/v1/items/${encodeURIComponent(itemId)}/privacy`,
        {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            edit_version: initialItem.editVersion,
            privacy_level: 'personal',
            derived_data_action: 'reprocess',
            hosted_processing_consent: 'yes',
          }),
        },
        422,
        'privacy-malformed-consent',
      );
      assert(
        body?.error?.code === 'VALIDATION_ERROR',
        'Malformed consent did not return VALIDATION_ERROR.',
      );
      return body;
    },
  );
  result.malformed_consent_error = malformedConsent.error.code;

  const publicChange = await runStage(
    'privacy-public-policy',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 200,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () =>
      changePrivacy(
        itemId,
        initialItem,
        {
          privacy_level: 'public',
          derived_data_action: 'reprocess',
        },
        'privacy-public',
      ),
  );
  const publicPolicy = publicChange.response;
  assert(
    publicPolicy.data?.provider_eligibility === 'openrouter',
    'Public data did not select OpenRouter.',
  );
  assert(
    Array.isArray(publicPolicy.data?.fallback_providers),
    'Public policy did not return a fallback provider list.',
  );
  assert(
    JSON.stringify(publicPolicy.data.fallback_providers) ===
      JSON.stringify(['gemini']),
    'Public policy fallback list does not match the current governing policy contract.',
  );
  const policyVersion = publicPolicy.data?.policy_version;
  assert(
    typeof policyVersion === 'string' && policyVersion.length > 0,
    'Public policy response did not publish a policy version.',
  );
  result.policy_version = policyVersion;
  result.policy_provider_eligibility = publicPolicy.data.provider_eligibility;
  result.policy_fallback_providers = publicPolicy.data.fallback_providers;
  result.provider_adapter_execution = 'not_verified_by_policy_stage';

  const beforeConflict = publicChange.current;
  const staleConflict = await runStage(
    'privacy-stale-version-conflict',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 409,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () => {
      const { body } = await jsonRequest(
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
        body?.error?.code === 'VERSION_CONFLICT',
        'Stale privacy mutation did not return VERSION_CONFLICT.',
      );
      const after = (await readItemDetail(itemId, 'privacy-stale-refetch'))
        .state;
      assert(
        after.editVersion === beforeConflict.editVersion,
        'Stale privacy mutation changed the authoritative edit version.',
      );
      assert(
        after.privacyLevel === beforeConflict.privacyLevel,
        'Stale privacy mutation changed the current privacy level.',
      );
      assertStableEvidence(beforeConflict, after, 'privacy-stale-version');
      return { response: body, current: after };
    },
  );
  result.stale_version_conflict = staleConflict.response.error.code;

  const personalWithoutConsentChange = await runStage(
    'privacy-personal-without-consent',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 200,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () =>
      changePrivacy(
        itemId,
        staleConflict.current,
        {
          privacy_level: 'personal',
          derived_data_action: 'reprocess',
          ai_provider: 'openrouter',
          credential_source: 'app_managed',
        },
        'privacy-personal-without-consent',
      ),
  );
  const personalWithoutConsent = personalWithoutConsentChange.response;
  assert(
    personalWithoutConsent.data?.provider_eligibility === 'none',
    'Personal data without consent did not fail closed.',
  );
  assert(
    personalWithoutConsent.data?.policy_version === policyVersion,
    'Policy version changed during the privacy sequence.',
  );

  const personalWithConsentChange = await runStage(
    'privacy-personal-with-consent',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 200,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () =>
      changePrivacy(
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
      ),
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
  assert(
    personalWithConsent.data?.policy_version === policyVersion,
    'Policy version changed during the privacy sequence.',
  );

  const sensitiveChange = await runStage(
    'privacy-sensitive',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}/privacy`,
        status: 200,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () =>
      changePrivacy(
        itemId,
        personalWithConsentChange.current,
        {
          privacy_level: 'sensitive',
          derived_data_action: 'purge',
        },
        'privacy-sensitive',
      ),
  );
  const sensitivePolicy = sensitiveChange.response;
  assert(
    sensitivePolicy.data?.provider_eligibility === 'none',
    'Sensitive data did not fail closed.',
  );
  assert(
    sensitivePolicy.data?.derived_data_action === 'purge',
    'Sensitive privacy response did not preserve the purge-derived-data action.',
  );
  assert(
    sensitivePolicy.data?.policy_version === policyVersion,
    'Policy version changed during the privacy sequence.',
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
  result.sensitive_edit_version = sensitiveChange.current.editVersion;

  const byteRoundTripPdfBytes = new TextEncoder().encode(
    `%PDF-1.7\n% BG-04 byte-round-trip fixture only; not parsing proof ${runId}\n`,
  );
  const byteRoundTripChecksum = createHash('sha256')
    .update(byteRoundTripPdfBytes)
    .digest('hex');

  const uploadInit = await runStage(
    'attachment-init',
    [{ method: 'POST', path: '/api/v1/uploads/init', status: 201 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/uploads/init',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify({
            filename: `recollect-release-${runId}.pdf`,
            mime_type: 'application/pdf',
            size_bytes: byteRoundTripPdfBytes.byteLength,
            content_hash: byteRoundTripChecksum,
            source_type: 'file',
          }),
        },
        201,
        'attachment-init',
      );
      assert(
        body.data?.attachment_id,
        'Upload init did not return an attachment ID.',
      );
      assert(body.data?.upload_url, 'Upload init did not return an upload URL.');
      return body;
    },
  );
  const attachmentId = uploadInit.data.attachment_id;

  await runStage(
    'attachment-upload',
    [
      {
        method: 'PUT',
        path: uploadInit.data.upload_url,
        status: 200,
      },
    ],
    async () => {
      const { body } = await jsonRequest(
        uploadInit.data.upload_url,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${captureToken}`,
            'Content-Type': 'application/pdf',
            'Content-Length': String(byteRoundTripPdfBytes.byteLength),
          },
          body: byteRoundTripPdfBytes,
        },
        200,
        'attachment-upload',
      );
      assert(
        body?.data?.status === 'uploaded',
        'Attachment upload did not report status=uploaded.',
      );
      assert(
        body?.data?.checksum === byteRoundTripChecksum,
        'Attachment upload checksum did not match the local byte fixture.',
      );
    },
  );

  const finalize = await runStage(
    'attachment-finalize',
    [
      {
        method: 'POST',
        path: `/api/v1/uploads/${attachmentId}/finalize`,
        status: 200,
      },
    ],
    async () => {
      const { body } = await jsonRequest(
        `/api/v1/uploads/${attachmentId}/finalize`,
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify({ checksum: byteRoundTripChecksum }),
        },
        200,
        'attachment-finalize',
      );
      assert(
        body?.data?.status === 'finalized',
        'Attachment finalize did not report status=finalized.',
      );
      assert(
        body?.data?.attachment_id === attachmentId,
        'Attachment finalize returned an unexpected attachment ID.',
      );
      assert(
        body?.data?.checksum === byteRoundTripChecksum,
        'Attachment finalize checksum did not match the uploaded bytes.',
      );
      return body;
    },
  );
  result.attachment_finalize_status = finalize.data.status;

  const fileCapture = await runStage(
    'attachment-link',
    [{ method: 'POST', path: '/api/v1/captures', status: 201 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/captures',
        {
          method: 'POST',
          headers: captureHeaders,
          body: JSON.stringify({
            idempotency_key: `release-${runId}-file`,
            source_type: 'file',
            source_app: 'production-release-verifier',
            attachment_id: attachmentId,
            user_reason: 'BG-04 byte-round-trip attachment proof',
            privacy_level: 'unknown',
            captured_at: now(),
            client: {
              name: 'production-release-verifier',
              version: '1.0.0',
            },
          }),
        },
        201,
        'attachment-link',
      );
      assert(body.data?.capture_id, 'File capture did not return an item ID.');
      return body;
    },
  );

  await runStage(
    'attachment-bearer-download',
    [
      {
        method: 'GET',
        path: `/api/v1/attachments/${attachmentId}/content`,
        status: 200,
      },
    ],
    async () => {
      const { bytes } = await binaryRequest(
        `/api/v1/attachments/${attachmentId}/content`,
        { headers: { Authorization: `Bearer ${captureToken}` } },
        200,
        'attachment-bearer-download',
      );
      assert(
        bytes.byteLength === byteRoundTripPdfBytes.byteLength,
        'Downloaded attachment byte length did not match the upload.',
      );
      const downloadedChecksum = createHash('sha256')
        .update(bytes)
        .digest('hex');
      assert(
        downloadedChecksum === byteRoundTripChecksum,
        'Downloaded attachment SHA-256 did not match the upload.',
      );
    },
  );

  await runStage(
    'attachment-anonymous-denial',
    [
      {
        method: 'GET',
        path: `/api/v1/attachments/${attachmentId}/content`,
        status: 401,
      },
    ],
    async () => {
      const { body } = await jsonRequest(
        `/api/v1/attachments/${attachmentId}/content`,
        {},
        401,
        'attachment-anonymous-denial',
      );
      assert(
        body?.error?.code === 'UNAUTHENTICATED',
        'Anonymous attachment download did not return UNAUTHENTICATED.',
      );
    },
  );

  await runBrowserCookieProbe(attachmentId);

  const beforeEdit = sensitiveChange.current;
  await runStage(
    'item-edit-stale-version-conflict',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}`,
        status: 409,
      },
    ],
    async () => {
      const { body } = await jsonRequest(
        `/api/v1/items/${encodeURIComponent(itemId)}`,
        {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            edit_version: initialItem.editVersion,
            title: `BG-04 stale edit ${stable}`,
          }),
        },
        409,
        'item-edit-stale-version',
      );
      assert(
        body?.error?.code === 'VERSION_CONFLICT',
        'Stale item edit did not return VERSION_CONFLICT.',
      );
    },
  );

  const editedState = await runStage(
    'item-edit-success',
    [
      {
        method: 'PATCH',
        path: `/api/v1/items/${itemId}`,
        status: 200,
      },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () => {
      const expectedTitle = `BG-04 release smoke ${stable}`;
      const { body } = await jsonRequest(
        `/api/v1/items/${encodeURIComponent(itemId)}`,
        {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            edit_version: beforeEdit.editVersion,
            title: expectedTitle,
          }),
        },
        200,
        'item-edit-success',
      );
      const returnedVersion = body?.data?.edit_version;
      assert(
        Number.isInteger(returnedVersion) &&
          returnedVersion > beforeEdit.editVersion,
        'Successful item edit did not return an advanced edit_version.',
      );
      const detail = await readItemDetail(itemId, 'item-edit-success:refetch');
      assert(
        detail.state.title === expectedTitle,
        'Edited title was not persisted.',
      );
      assert(
        detail.state.editVersion === returnedVersion,
        'Edited item refetch did not match the returned edit version.',
      );
      assertStableEvidence(beforeEdit, detail.state, 'item-edit-success');
      return detail.state;
    },
  );
  result.edited_title = editedState.title;

  const deletedVersion = await runStage(
    'item-soft-delete-and-search-exclusion',
    [
      {
        method: 'POST',
        path: `/api/v1/items/${itemId}/delete`,
        status: 200,
      },
      { method: 'GET', path: '/api/v1/items?q=...', status: 200 },
    ],
    async () => {
      const { body: deleted } = await jsonRequest(
        `/api/v1/items/${encodeURIComponent(itemId)}/delete`,
        {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ edit_version: editedState.editVersion }),
        },
        200,
        'item-soft-delete',
      );
      const returnedVersion = deleted?.data?.edit_version;
      assert(
        Number.isInteger(returnedVersion) &&
          returnedVersion > editedState.editVersion,
        'Soft delete did not advance edit_version.',
      );
      const { body: search } = await jsonRequest(
        `/api/v1/items?q=${encodeURIComponent(stable)}`,
        { headers: adminHeaders },
        200,
        'item-search-after-delete',
      );
      assert(Array.isArray(search?.data), 'Search response data was not an array.');
      assert(
        !search.data.some((item) => item.id === itemId),
        'Soft-deleted item remained visible in default search.',
      );
      return returnedVersion;
    },
  );

  const restoredState = await runStage(
    'item-restore-and-search-restoration',
    [
      {
        method: 'POST',
        path: `/api/v1/items/${itemId}/restore`,
        status: 200,
      },
      { method: 'GET', path: '/api/v1/items?q=...', status: 200 },
      { method: 'GET', path: `/api/v1/items/${itemId}`, status: 200 },
    ],
    async () => {
      const { body: restored } = await jsonRequest(
        `/api/v1/items/${encodeURIComponent(itemId)}/restore`,
        {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ edit_version: deletedVersion }),
        },
        200,
        'item-restore',
      );
      const returnedVersion = restored?.data?.edit_version;
      assert(
        Number.isInteger(returnedVersion) && returnedVersion > deletedVersion,
        'Restore did not advance edit_version.',
      );
      const { body: search } = await jsonRequest(
        `/api/v1/items?q=${encodeURIComponent(stable)}`,
        { headers: adminHeaders },
        200,
        'item-search-after-restore',
      );
      assert(
        search?.data?.some((item) => item.id === itemId),
        'Restored item did not reappear in default search.',
      );
      const detail = await readItemDetail(itemId, 'item-restore:refetch');
      assert(detail.state.deletedAt === null, 'Restored item remained deleted.');
      assert(
        detail.state.editVersion === returnedVersion,
        'Restored item refetch did not match the returned edit version.',
      );
      return detail.state;
    },
  );
  result.restored_edit_version = restoredState.editVersion;

  await runStage(
    'json-export-includes-run-item',
    [{ method: 'GET', path: '/api/v1/export?format=json', status: 200 }],
    async () => {
      const { body } = await jsonRequest(
        '/api/v1/export?format=json',
        { headers: adminHeaders },
        200,
        'json-export',
      );
      assert(
        body?.format === 'recollectflow-portable-export',
        'JSON export did not return the portable export envelope.',
      );
      assert(Array.isArray(body?.items), 'JSON export items were not an array.');
      assert(
        body.items.some((entry) => entry?.item?.id === itemId),
        'JSON export did not include the restored run-owned item.',
      );
      assert(
        body?.disclosures?.attachmentBytesIncluded === false,
        'JSON export unexpectedly claimed attachment bytes are embedded.',
      );
    },
  );

  result.attachment_id = attachmentId;
  result.attachment_item_id = fileCapture.data.capture_id;
  result.attachment_fixture = {
    purpose: 'byte-round-trip-only',
    parsing_proof: false,
    size_bytes: byteRoundTripPdfBytes.byteLength,
    sha256: byteRoundTripChecksum,
  };
  result.parseable_pdf_fixture = {
    purpose: 'future-extraction-acceptance',
    known_phrase: parseablePhrase,
    size_bytes: parseablePdfBytes.byteLength,
    sha256: parseablePdfSha256,
    extraction_verified: false,
  };
  result.default_smoke_permanent_purge = false;
  result.stage_summary = stageSummary('passed');
  return result;
}

function healthBodyIsOk(body) {
  return body?.data?.status === 'ok';
}

async function runBrowserCookieProbe(attachmentId) {
  const stage = {
    name: 'browser-cookie-attachment-download',
    status: 'running',
    started_at: new Date().toISOString(),
    expected_http: [
      { method: 'POST', path: '/api/v1/admin/session', status: 200 },
      {
        method: 'GET',
        path: `/api/v1/attachments/${attachmentId}/content`,
        desired_status: 200,
        known_current_status: 401,
      },
    ],
    http: [],
  };
  stageResults.push(stage);
  activeStage = stage;
  try {
    const { response } = await jsonRequest(
      '/api/v1/admin/session',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken }),
      },
      200,
      'browser-cookie-login',
    );
    const setCookie = response.headers.get('set-cookie');
    assert(
      setCookie,
      'Admin session login did not set an admin_session cookie.',
    );
    const cookie = setCookie.split(';', 1)[0];

    const download = await fetch(
      requestUrl(`/api/v1/attachments/${attachmentId}/content`),
      { headers: { Cookie: cookie } },
    );
    recordHttp(
      'GET',
      `/api/v1/attachments/${attachmentId}/content`,
      200,
      download.status,
    );
    await download.arrayBuffer();
    if (download.status === 200) {
      stage.status = 'passed';
      stage.reason =
        'Browser-cookie attachment download is now supported; remove the BG-07 unavailable marker after dedicated BG-07 browser acceptance.';
    } else {
      assert(
        download.status === 401,
        `Browser-cookie download known-gap probe expected current 401, got ${download.status}.`,
      );
      stage.status = 'unavailable';
      stage.reason =
        'Known BG-07 gap: attachment content is guarded by bearer capture/admin auth before the admin_session cookie can authorize browser download.';
    }
    stage.finished_at = new Date().toISOString();
  } catch (error) {
    stage.status = 'failed';
    stage.finished_at = new Date().toISOString();
    stage.error = safeErrorMessage(error);
    throw error;
  } finally {
    activeStage = null;
  }
}

try {
  const output = await main();
  console.log(JSON.stringify(output));
} catch (error) {
  printFailureSummary(error);
  console.error(`RELEASE_SMOKE_ERROR ${safeErrorMessage(error)}`);
  process.exitCode = 1;
}
