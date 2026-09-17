/* global Buffer, URL, process */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const verifierPath = fileURLToPath(
  new URL('./verify-production-release.mjs', import.meta.url),
);
const CAPTURE_TOKEN = 'release-test-capture-token';
const ADMIN_TOKEN = 'release-test-admin-token';
const POLICY_VERSION = '2026-07-31.2';

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function captureResponse({
  captureId,
  duplicateOf = null,
  replayed = false,
  privacyLevel = 'unknown',
}) {
  return {
    data: {
      capture_id: captureId,
      status: 'saved',
      processing_status: 'pending',
      duplicate_of: duplicateOf,
      privacy_level: privacyLevel,
      replayed,
      message: replayed ? 'Already saved.' : 'Saved to RecollectFlow.',
    },
  };
}

async function createVerifierServer({
  malformedInitialVersion = false,
  forceCurrentConflictPrivacyLevel = null,
  healthFailureEchoSecrets = false,
} = {}) {
  let itemVersion = 1;
  let privacyLevel = 'unknown';
  let title = null;
  let deleted = false;
  let sourceUrl = null;
  let canonicalUrl = null;
  let rawFixtureText = null;
  let uploadedBytes = Buffer.alloc(0);
  let uploadedChecksum = null;
  const privacyRequests = [];
  const detailVersions = [];
  const captureEvents = [];
  const seenIdempotency = new Map();
  let forcedCurrentConflictCount = 0;

  const itemId = 'release-item';
  const rawItemId = 'raw-item';
  const fileItemId = 'file-item';
  const attachmentId = 'release-attachment';

  const itemDetail = (id) => {
    if (id === rawItemId) {
      return {
        data: {
          item: {
            id: rawItemId,
            edit_version: 1,
            privacy_level: 'unknown',
            lifecycle_status: 'Inbox',
            title: null,
            deleted_at: null,
            source_url: null,
            canonical_url: null,
            raw_text: rawFixtureText,
          },
          provenance: { capture_events: [], provider_usage: [] },
        },
      };
    }

    const version =
      malformedInitialVersion && detailVersions.length === 0 ? 0 : itemVersion;
    detailVersions.push(version);
    return {
      data: {
        item: {
          id: itemId,
          edit_version: version,
          privacy_level: privacyLevel,
          lifecycle_status: deleted ? 'Deleted' : 'Inbox',
          title,
          deleted_at: deleted ? '2026-09-17T05:00:00.000Z' : null,
          source_url: sourceUrl,
          canonical_url: canonicalUrl,
          raw_text: null,
        },
        provenance: {
          capture_events: captureEvents,
          provider_usage: [],
        },
      },
    };
  };

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const authorization = request.headers.authorization;
    const bodyBuffer = await readRequestBody(request);
    let body = null;
    if (
      bodyBuffer.length > 0 &&
      request.headers['content-type']?.includes('application/json')
    ) {
      try {
        body = JSON.parse(bodyBuffer.toString('utf8'));
      } catch {
        body = null;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/health') {
      if (healthFailureEchoSecrets) {
        json(response, 500, {
          error: {
            code: 'INJECTED_FAILURE',
            capture_token: CAPTURE_TOKEN,
            admin_token: ADMIN_TOKEN,
          },
        });
        return;
      }
      json(response, 200, { data: { status: 'ok' } });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/api/v1/admin/session'
    ) {
      if (body?.token !== ADMIN_TOKEN) {
        json(response, 401, { error: { code: 'UNAUTHORIZED' } });
        return;
      }
      json(
        response,
        200,
        { data: { authenticated: true } },
        {
          'Set-Cookie':
            'admin_session=authenticated.test-signature; Path=/; HttpOnly; SameSite=Strict',
        },
      );
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/api/v1/captures'
    ) {
      if (authorization !== `Bearer ${CAPTURE_TOKEN}`) {
        json(response, 401, { error: { code: 'UNAUTHENTICATED' } });
        return;
      }

      if (body?.source_type === 'file') {
        json(
          response,
          201,
          captureResponse({ captureId: fileItemId, privacyLevel: 'unknown' }),
        );
        return;
      }

      if (body?.source_type === 'note') {
        rawFixtureText = body.shared_text;
        json(
          response,
          201,
          captureResponse({ captureId: rawItemId, privacyLevel: 'unknown' }),
        );
        return;
      }

      const existing = seenIdempotency.get(body?.idempotency_key);
      if (existing) {
        json(
          response,
          200,
          captureResponse({
            captureId: existing.captureId,
            duplicateOf: existing.duplicateOf,
            replayed: true,
            privacyLevel: 'unknown',
          }),
        );
        return;
      }

      if (captureEvents.length === 0) {
        sourceUrl = body.url;
        canonicalUrl = new URL(body.url);
        canonicalUrl.searchParams.delete('utm_source');
        canonicalUrl.searchParams.delete('utm_medium');
        canonicalUrl = canonicalUrl.toString();
        const event = {
          id: 'event-primary',
          duplicate_of: null,
          source_type: 'url',
          source_app: body.source_app,
          source_url: body.url,
          raw_text: null,
          user_note: null,
          quick_category: null,
          privacy_level: body.privacy_level,
          attachment_id: null,
          captured_at: body.captured_at,
          created_at: body.captured_at,
        };
        captureEvents.push(event);
        seenIdempotency.set(body.idempotency_key, {
          captureId: itemId,
          duplicateOf: null,
        });
        json(
          response,
          201,
          captureResponse({ captureId: itemId, privacyLevel: 'unknown' }),
        );
        return;
      }

      const event = {
        id: 'event-duplicate',
        duplicate_of: itemId,
        source_type: 'url',
        source_app: body.source_app,
        source_url: body.url,
        raw_text: null,
        user_note: null,
        quick_category: null,
        privacy_level: body.privacy_level,
        attachment_id: null,
        captured_at: body.captured_at,
        created_at: body.captured_at,
      };
      captureEvents.push(event);
      seenIdempotency.set(body.idempotency_key, {
        captureId: itemId,
        duplicateOf: itemId,
      });
      json(
        response,
        201,
        captureResponse({
          captureId: itemId,
          duplicateOf: itemId,
          privacyLevel: 'unknown',
        }),
      );
      return;
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname.startsWith('/api/v1/items/') &&
      !requestUrl.pathname.endsWith('/content')
    ) {
      const id = requestUrl.pathname.split('/').at(-1);
      if (id === itemId || id === rawItemId) {
        json(response, 200, itemDetail(id));
        return;
      }
    }

    if (
      request.method === 'PATCH' &&
      requestUrl.pathname === `/api/v1/items/${itemId}/privacy`
    ) {
      if (typeof body?.hosted_processing_consent === 'string') {
        json(response, 422, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed.',
          },
        });
        return;
      }

      privacyRequests.push(body);
      const requestedVersion = body?.edit_version;

      if (!Number.isInteger(requestedVersion) || requestedVersion < 1) {
        json(response, 422, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'edit_version must be a positive integer.',
          },
        });
        return;
      }

      if (requestedVersion !== itemVersion) {
        json(response, 409, {
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Item version conflict.',
          },
        });
        return;
      }

      if (
        forceCurrentConflictPrivacyLevel &&
        body?.privacy_level === forceCurrentConflictPrivacyLevel
      ) {
        forcedCurrentConflictCount += 1;
        json(response, 409, {
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Injected current conflict.',
          },
        });
        return;
      }

      privacyLevel = body.privacy_level;
      itemVersion += 3;
      const isPersonalWithConsent =
        body.privacy_level === 'personal' &&
        body.hosted_processing_consent === true;
      const provider =
        body.privacy_level === 'public' || isPersonalWithConsent
          ? 'openrouter'
          : 'none';

      json(response, 200, {
        data: {
          item_id: itemId,
          edit_version: itemVersion,
          privacy_level: privacyLevel,
          derived_data_action: body.derived_data_action,
          provider_eligibility: provider,
          fallback_providers: body.privacy_level === 'public' ? ['gemini'] : [],
          zero_data_retention_required: isPersonalWithConsent,
          data_collection_denied: isPersonalWithConsent,
          policy_version: POLICY_VERSION,
        },
      });
      return;
    }

    if (
      request.method === 'PATCH' &&
      requestUrl.pathname === `/api/v1/items/${itemId}`
    ) {
      if (body?.edit_version !== itemVersion) {
        json(response, 409, {
          error: { code: 'VERSION_CONFLICT', message: 'Item version conflict.' },
        });
        return;
      }
      title = body.title ?? title;
      itemVersion += 1;
      json(response, 200, {
        data: { item_id: itemId, edit_version: itemVersion },
      });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === `/api/v1/items/${itemId}/delete`
    ) {
      if (body?.edit_version !== itemVersion) {
        json(response, 409, { error: { code: 'VERSION_CONFLICT' } });
        return;
      }
      deleted = true;
      itemVersion += 1;
      json(response, 200, {
        data: { item_id: itemId, edit_version: itemVersion },
      });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === `/api/v1/items/${itemId}/restore`
    ) {
      if (body?.edit_version !== itemVersion) {
        json(response, 409, { error: { code: 'VERSION_CONFLICT' } });
        return;
      }
      deleted = false;
      itemVersion += 1;
      json(response, 200, {
        data: { item_id: itemId, edit_version: itemVersion },
      });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/items') {
      const query = requestUrl.searchParams.get('q') ?? '';
      const visible =
        !deleted && typeof title === 'string' && title.includes(query);
      json(response, 200, {
        data: visible
          ? [
              {
                id: itemId,
                title,
                source_type: 'url',
                source_app: 'production-release-verifier',
                project: null,
                topics: [],
                lifecycle_status: 'Inbox',
                processing_status: 'pending',
                privacy_level: privacyLevel,
                captured_at: '2026-09-17T05:00:00.000Z',
              },
            ]
          : [],
        meta: { request_id: 'test', count: visible ? 1 : 0, duration_ms: 1 },
      });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/export') {
      json(response, 200, {
        format: 'recollectflow-portable-export',
        schemaVersion: 'test',
        generatedAt: '2026-09-17T05:00:00.000Z',
        itemCount: 1,
        items: [{ item: { id: itemId, title } }],
        purgeReceipts: [],
        disclosures: {
          attachmentBytesIncluded: false,
          credentialsIncluded: false,
          ownerControlledCopiesOutsideRemoteDeletion: true,
        },
      });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === '/api/v1/uploads/init'
    ) {
      json(response, 201, {
        data: {
          attachment_id: attachmentId,
          upload_url: `/api/v1/uploads/${attachmentId}/content`,
        },
      });
      return;
    }

    if (
      request.method === 'PUT' &&
      requestUrl.pathname === `/api/v1/uploads/${attachmentId}/content`
    ) {
      assert.equal(authorization, `Bearer ${CAPTURE_TOKEN}`);
      uploadedBytes = bodyBuffer;
      uploadedChecksum = createHash('sha256')
        .update(uploadedBytes)
        .digest('hex');
      json(response, 200, {
        data: { status: 'uploaded', checksum: uploadedChecksum },
      });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === `/api/v1/uploads/${attachmentId}/finalize`
    ) {
      assert.equal(body?.checksum, uploadedChecksum);
      json(response, 200, {
        data: {
          status: 'finalized',
          attachment_id: attachmentId,
          checksum: uploadedChecksum,
        },
      });
      return;
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname === `/api/v1/attachments/${attachmentId}/content`
    ) {
      if (
        authorization !== `Bearer ${CAPTURE_TOKEN}` &&
        authorization !== `Bearer ${ADMIN_TOKEN}`
      ) {
        json(response, 401, { error: { code: 'UNAUTHENTICATED' } });
        return;
      }
      response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': String(uploadedBytes.length),
      });
      response.end(uploadedBytes);
      return;
    }

    json(response, 404, {
      error: {
        code: 'TEST_ROUTE_NOT_FOUND',
        method: request.method,
        path: requestUrl.pathname,
      },
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert(address && typeof address === 'object');

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    privacyRequests,
    detailVersions,
    captureEvents,
    getForcedCurrentConflictCount: () => forcedCurrentConflictCount,
    getItemState: () => ({ itemVersion, title, deleted, privacyLevel }),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function runVerifier(server, envOverrides = {}) {
  return execFileAsync(process.execPath, [verifierPath], {
    env: {
      ...process.env,
      WORKER_BASE_URL: server.baseUrl,
      CAPTURE_TOKEN,
      ADMIN_TOKEN,
      ...envOverrides,
    },
    timeout: 20_000,
    maxBuffer: 2 * 1024 * 1024,
  });
}

async function runVerifierWithoutServer(envOverrides = {}) {
  return execFileAsync(process.execPath, [verifierPath], {
    env: {
      ...process.env,
      CAPTURE_TOKEN,
      ADMIN_TOKEN,
      ...envOverrides,
    },
    timeout: 5_000,
    maxBuffer: 1024 * 1024,
  });
}

function findStage(result, name) {
  return result.stage_summary.stages.find((stage) => stage.name === name);
}

test('release verifier reports staged BG-04 success without hiding known unavailable capabilities', async () => {
  const server = await createVerifierServer();
  try {
    const { stdout, stderr } = await runVerifier(server);
    assert.match(stderr, /"event":"release_smoke.target"/);
    assert.match(stderr, /"target_mode":"local"/);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.stage_summary.overall, 'passed');
    assert.equal(result.stage_summary.counts.failed, 0);
    assert.ok(result.stage_summary.counts.passed >= 20);
    assert.ok(result.stage_summary.counts.unavailable >= 4);

    assert.equal(result.exact_replay_status, 200);
    assert.equal(result.exact_replay, true);
    assert.equal(result.duplicate_of, result.primary_item_id);
    assert.equal(result.stale_version_conflict, 'VERSION_CONFLICT');
    assert.equal(result.policy_version, POLICY_VERSION);
    assert.deepEqual(result.policy_fallback_providers, ['gemini']);
    assert.equal(
      result.provider_adapter_execution,
      'not_verified_by_policy_stage',
    );

    assert.equal(result.attachment_fixture.purpose, 'byte-round-trip-only');
    assert.equal(result.attachment_fixture.parsing_proof, false);
    assert.equal(
      result.parseable_pdf_fixture.purpose,
      'future-extraction-acceptance',
    );
    assert.equal(result.parseable_pdf_fixture.extraction_verified, false);
    assert.match(
      result.parseable_pdf_fixture.known_phrase,
      /RecollectFlow BG-04 parseable fixture/,
    );
    assert.equal(result.default_smoke_permanent_purge, false);

    assert.equal(
      findStage(result, 'browser-cookie-attachment-download').status,
      'unavailable',
    );
    assert.equal(
      findStage(result, 'provider-adapter-execution').status,
      'unavailable',
    );
    assert.equal(
      findStage(result, 'parseable-pdf-extraction-acceptance').status,
      'unavailable',
    );
    assert.equal(
      findStage(result, 'json-export-includes-run-item').status,
      'passed',
    );

    assert.deepEqual(
      server.privacyRequests.map((request) => request.edit_version),
      [1, 1, 4, 7, 10],
    );
    assert.deepEqual(
      server.privacyRequests.map((request) => request.privacy_level),
      ['public', 'unknown', 'personal', 'personal', 'sensitive'],
    );
    assert.equal(server.captureEvents.length, 2);
    assert.ok(server.detailVersions.includes(4));
    assert.ok(server.detailVersions.includes(13));

    const state = server.getItemState();
    assert.equal(state.itemVersion, 16);
    assert.equal(state.deleted, false);
    assert.match(state.title, /^BG-04 release smoke /);
  } finally {
    await server.close();
  }
});

test('release verifier rejects a malformed authoritative edit version before privacy mutation and emits stage evidence', async () => {
  const server = await createVerifierServer({ malformedInitialVersion: true });
  try {
    await assert.rejects(runVerifier(server), (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stderr,
        /Item detail edit_version must be a positive integer/,
      );
      assert.match(error.stderr, /RELEASE_SMOKE_SUMMARY/);
      assert.match(error.stderr, /capture-provenance-and-source/);
      assert.doesNotMatch(error.stderr, new RegExp(CAPTURE_TOKEN));
      assert.doesNotMatch(error.stderr, new RegExp(ADMIN_TOKEN));
      return true;
    });
    assert.equal(server.privacyRequests.length, 0);
  } finally {
    await server.close();
  }
});

test('release verifier stops on an unexpected current-version conflict without retrying and preserves prior stage evidence', async () => {
  const server = await createVerifierServer({
    forceCurrentConflictPrivacyLevel: 'personal',
  });
  try {
    await assert.rejects(runVerifier(server), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /privacy-personal-without-consent/);
      assert.match(error.stderr, /expected 200, got 409/);
      assert.match(error.stderr, /VERSION_CONFLICT/);
      assert.match(error.stderr, /RELEASE_SMOKE_SUMMARY/);
      assert.match(error.stderr, /"name":"health","status":"passed"/);
      return true;
    });

    const personalRequests = server.privacyRequests.filter(
      (request) => request.privacy_level === 'personal',
    );
    assert.equal(personalRequests.length, 1);
    assert.equal(server.getForcedCurrentConflictCount(), 1);
    assert.equal(
      server.privacyRequests.some(
        (request) => request.privacy_level === 'sensitive',
      ),
      false,
    );
  } finally {
    await server.close();
  }
});

test('release verifier requires explicit opt-in before any remote target request', async () => {
  await assert.rejects(
    runVerifierWithoutServer({
      WORKER_BASE_URL: 'https://example.invalid',
      ALLOW_REMOTE_SMOKE: '',
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /ALLOW_REMOTE_SMOKE=true/);
      return true;
    },
  );
});

test('release verifier redacts credentials from failed-response diagnostics and stage summaries', async () => {
  const server = await createVerifierServer({ healthFailureEchoSecrets: true });
  try {
    await assert.rejects(runVerifier(server), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /INJECTED_FAILURE/);
      assert.match(error.stderr, /\[REDACTED\]/);
      assert.doesNotMatch(error.stderr, new RegExp(CAPTURE_TOKEN));
      assert.doesNotMatch(error.stderr, new RegExp(ADMIN_TOKEN));
      assert.match(error.stderr, /RELEASE_SMOKE_SUMMARY/);
      return true;
    });
  } finally {
    await server.close();
  }
});
