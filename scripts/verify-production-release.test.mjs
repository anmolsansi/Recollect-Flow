/* global Buffer, URL, process */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
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

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function createVerifierServer({
  malformedInitialVersion = false,
  forceCurrentConflictPrivacyLevel = null,
} = {}) {
  let urlCaptureCount = 0;
  let itemVersion = 1;
  let privacyLevel = 'unknown';
  let sourceUrl = null;
  let canonicalUrl = null;
  const rawText = 'BG-03 synthetic source evidence';
  let uploadedBytes = Buffer.alloc(0);
  const privacyRequests = [];
  const detailVersions = [];
  let forcedCurrentConflictCount = 0;

  const itemId = 'release-item';
  const attachmentId = 'release-attachment';

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
      json(response, 200, { data: { status: 'ok' } });
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
        json(response, 201, { data: { capture_id: 'file-item' } });
        return;
      }

      urlCaptureCount += 1;
      if (urlCaptureCount === 1) {
        sourceUrl = body.url;
        canonicalUrl = body.url
          .replace(/([?&])utm_source=[^&]+&?/, '$1')
          .replace(/[?&]$/, '');
        json(response, 201, {
          data: { capture_id: itemId, duplicate_of: null },
        });
        return;
      }

      json(response, 201, {
        data: { capture_id: itemId, duplicate_of: itemId },
      });
      return;
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname === `/api/v1/items/${itemId}`
    ) {
      const version =
        malformedInitialVersion && detailVersions.length === 0
          ? 0
          : itemVersion;
      detailVersions.push(version);
      json(response, 200, {
        data: {
          item: {
            id: itemId,
            edit_version: version,
            privacy_level: privacyLevel,
            source_url: sourceUrl,
            canonical_url: canonicalUrl,
            raw_text: rawText,
          },
        },
      });
      return;
    }

    if (
      request.method === 'PATCH' &&
      requestUrl.pathname === `/api/v1/items/${itemId}/privacy`
    ) {
      privacyRequests.push(body);
      const requestedVersion = body?.edit_version;

      if (!Number.isInteger(requestedVersion) || requestedVersion < 1) {
        json(response, 422, {
          error: {
            code: 'VALIDATION_FAILED',
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
          policy_version: '2026-07-21.1',
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
      json(response, 200, { data: { uploaded: true } });
      return;
    }

    if (
      request.method === 'POST' &&
      requestUrl.pathname === `/api/v1/uploads/${attachmentId}/finalize`
    ) {
      json(response, 200, { data: { attachment_id: attachmentId } });
      return;
    }

    if (
      request.method === 'GET' &&
      requestUrl.pathname === `/api/v1/attachments/${attachmentId}/content`
    ) {
      if (authorization !== `Bearer ${CAPTURE_TOKEN}`) {
        json(response, 401, { error: { code: 'UNAUTHENTICATED' } });
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/pdf' });
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
    getForcedCurrentConflictCount: () => forcedCurrentConflictCount,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function runVerifier(server) {
  return execFileAsync(process.execPath, [verifierPath], {
    env: {
      ...process.env,
      WORKER_BASE_URL: server.baseUrl,
      CAPTURE_TOKEN,
      ADMIN_TOKEN,
    },
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
}

test('release verifier carries authoritative versions across the full privacy sequence', async () => {
  const server = await createVerifierServer();
  try {
    const { stdout, stderr } = await runVerifier(server);
    assert.equal(stderr, '');

    const result = JSON.parse(stdout.trim());
    assert.equal(result.stale_version_conflict, 'VERSION_CONFLICT');
    assert.equal(result.authorized_download, 200);
    assert.equal(result.anonymous_download, 401);

    assert.deepEqual(
      server.privacyRequests.map((request) => request.edit_version),
      [1, 1, 4, 7, 10],
    );
    assert.deepEqual(
      server.privacyRequests.map((request) => request.privacy_level),
      ['public', 'unknown', 'personal', 'personal', 'sensitive'],
    );
    assert.equal(server.privacyRequests[1].edit_version, 1);
    assert.equal(server.privacyRequests[2].edit_version, 4);
    assert.ok(server.detailVersions.includes(4));
    assert.ok(server.detailVersions.includes(13));
  } finally {
    await server.close();
  }
});

test('release verifier rejects a malformed authoritative edit version before mutation', async () => {
  const server = await createVerifierServer({ malformedInitialVersion: true });
  try {
    await assert.rejects(runVerifier(server), (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stderr,
        /Item detail edit_version must be a positive integer/,
      );
      assert.doesNotMatch(error.stderr, new RegExp(CAPTURE_TOKEN));
      assert.doesNotMatch(error.stderr, new RegExp(ADMIN_TOKEN));
      return true;
    });
    assert.equal(server.privacyRequests.length, 0);
  } finally {
    await server.close();
  }
});

test('release verifier stops on an unexpected current-version conflict without retrying', async () => {
  const server = await createVerifierServer({
    forceCurrentConflictPrivacyLevel: 'personal',
  });
  try {
    await assert.rejects(runVerifier(server), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /privacy-personal-without-consent/);
      assert.match(error.stderr, /expected 200, got 409/);
      assert.match(error.stderr, /VERSION_CONFLICT/);
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
