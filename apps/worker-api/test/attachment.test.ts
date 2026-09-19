import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type {
  AttachmentRepository,
  AttachmentStatus,
  AttachmentUsage,
  NewAttachment,
  StoredAttachment,
} from '../src/attachments/attachment.repository';
import {
  cleanupExpiredAttachments,
  deleteItemAttachments,
} from '../src/attachments/attachment.service';
import type { CaptureRepository } from '../src/captures/capture.repository';
import type { Env } from '../src/env';

class MemoryAttachmentRepository implements AttachmentRepository {
  readonly attachments = new Map<string, StoredAttachment>();

  async create(input: NewAttachment): Promise<StoredAttachment> {
    const stored: StoredAttachment = {
      id: input.id,
      itemId: null,
      r2Key: input.r2Key,
      status: 'pending',
      fileName: input.fileName,
      declaredContentType: input.declaredContentType,
      detectedContentType: null,
      sizeBytes: input.sizeBytes,
      contentHash: input.contentHash ?? null,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    this.attachments.set(stored.id, stored);
    return stored;
  }

  async findById(id: string) {
    return this.attachments.get(id) ?? null;
  }

  async findByItemId(itemId: string) {
    return [...this.attachments.values()].filter(
      (attachment) =>
        attachment.itemId === itemId && attachment.status !== 'deleted',
    );
  }

  async markUploaded(
    id: string,
    hash: string,
    detectedType: string,
    at: string,
  ) {
    const attachment = this.attachments.get(id);
    if (!attachment) return;
    Object.assign(attachment, {
      status: 'uploaded' as AttachmentStatus,
      contentHash: hash,
      detectedContentType: detectedType,
      updatedAt: at,
    });
  }

  async markFinalized(id: string, at: string) {
    const attachment = this.attachments.get(id);
    if (!attachment) return;
    Object.assign(attachment, {
      status: 'finalized' as AttachmentStatus,
      updatedAt: at,
    });
  }

  async findExpiredOrphans(now: string, limit: number) {
    return [...this.attachments.values()]
      .filter(
        (attachment) =>
          !attachment.itemId &&
          ['pending', 'uploaded', 'finalized'].includes(attachment.status) &&
          attachment.expiresAt <= now,
      )
      .slice(0, limit);
  }

  async markOrphaned(id: string, at: string) {
    const attachment = this.attachments.get(id);
    if (!attachment) return;
    Object.assign(attachment, {
      status: 'orphaned' as AttachmentStatus,
      updatedAt: at,
    });
  }

  async markDeleted(id: string, at: string) {
    const attachment = this.attachments.get(id);
    if (!attachment) return;
    Object.assign(attachment, {
      status: 'deleted' as AttachmentStatus,
      updatedAt: at,
    });
  }

  async usage(): Promise<AttachmentUsage[]> {
    return [...this.attachments.values()]
      .filter(
        (attachment) => !['orphaned', 'deleted'].includes(attachment.status),
      )
      .map((attachment) => ({
        status: attachment.status,
        objectCount: 1,
        bytes: attachment.sizeBytes,
      }));
  }
}

interface MemoryObject {
  bytes: ArrayBuffer;
  contentType: string;
  customMetadata: Record<string, string>;
}

function memoryBucket() {
  const objects = new Map<string, MemoryObject>();
  return {
    objects,
    bucket: {
      async put(key: string, bytes: ArrayBuffer, options: R2PutOptions) {
        const contentType =
          options.httpMetadata instanceof Headers
            ? (options.httpMetadata.get('Content-Type') ?? '')
            : (options.httpMetadata?.contentType ?? '');
        objects.set(key, {
          bytes,
          contentType,
          customMetadata: options.customMetadata ?? {},
        });
        return { key };
      },
      async head(key: string) {
        const object = objects.get(key);
        if (!object) return null;
        return {
          key,
          size: object.bytes.byteLength,
          httpMetadata: { contentType: object.contentType },
          customMetadata: object.customMetadata,
        };
      },
      async get(key: string) {
        const object = objects.get(key);
        if (!object) return null;
        return {
          key,
          size: object.bytes.byteLength,
          httpEtag: '"test-etag"',
          body: new Blob([object.bytes]).stream(),
        };
      },
      async delete(key: string) {
        objects.delete(key);
      },
    } as unknown as R2Bucket,
  };
}

function testEnv(bucket: R2Bucket): Env {
  return {
    DB: {} as D1Database,
    ATTACHMENTS: bucket,
    AI: {} as Ai,
    NOTION_DATABASE_ID: '3a21b726-4ada-80a3-bfe1-ef808e3c293f',
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
    CAPTURE_TOKEN: 'capture-secret',
    ADMIN_TOKEN: 'admin-secret',
    LOCAL_WORKER_TOKEN: 'local-worker-secret',
    NOTION_ACCESS_TOKEN: 'notion-secret',
    TELEGRAM_BOT_TOKEN: 'telegram-secret',
    TELEGRAM_CHAT_ID: 'private-chat-id',
  };
}

const unusedCaptureRepository = () => ({}) as CaptureRepository;

async function initialize(
  app: ReturnType<typeof createApp>,
  env: Env,
  body: Record<string, unknown>,
) {
  const response = await app.request(
    '/api/v1/uploads/init',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer capture-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    env,
  );
  return {
    response,
    body: await response.json<{ data: { attachment_id: string } }>(),
  };
}

async function createFinalizedAttachment(
  app: ReturnType<typeof createApp>,
  env: Env,
  fixture: {
    filename: string;
    mimeType: string;
    sourceType: 'file' | 'image';
    bytes: ArrayBuffer;
  },
) {
  const initialized = await initialize(app, env, {
    filename: fixture.filename,
    mime_type: fixture.mimeType,
    size_bytes: fixture.bytes.byteLength,
    source_type: fixture.sourceType,
  });
  expect(initialized.response.status).toBe(201);
  const id = initialized.body.data.attachment_id;

  const upload = await app.request(
    `/api/v1/uploads/${id}/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer capture-secret',
        'Content-Type': fixture.mimeType,
        'Content-Length': String(fixture.bytes.byteLength),
      },
      body: fixture.bytes,
    },
    env,
  );
  expect(upload.status).toBe(200);

  const finalized = await app.request(
    `/api/v1/uploads/${id}/finalize`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer capture-secret',
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
    env,
  );
  expect(finalized.status).toBe(200);

  return { id, bytes: fixture.bytes };
}

async function createFinalizedPdf(app: ReturnType<typeof createApp>, env: Env) {
  return createFinalizedAttachment(app, env, {
    filename: 'read-auth.pdf',
    mimeType: 'application/pdf',
    sourceType: 'file',
    bytes: new TextEncoder().encode('%PDF-1.7\nread-auth-fixture').buffer,
  });
}

async function createAdminSessionCookie(
  app: ReturnType<typeof createApp>,
  env: Env,
): Promise<string> {
  const login = await app.request(
    '/api/v1/admin/session',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'admin-secret' }),
    },
    env,
  );
  expect(login.status).toBe(200);
  const setCookie = login.headers.get('Set-Cookie');
  expect(setCookie).toBeTruthy();
  return setCookie!.split(';', 1)[0]!;
}

describe('private attachment lifecycle', () => {
  it('uploads, finalizes, and downloads an authorized PDF', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const bytes = new TextEncoder().encode('%PDF-1.7\nexample').buffer;

    const initialized = await initialize(app, env, {
      filename: 'example.pdf',
      mime_type: 'application/pdf',
      size_bytes: bytes.byteLength,
      source_type: 'file',
    });
    expect(initialized.response.status).toBe(201);
    const id = initialized.body.data.attachment_id;

    const upload = await app.request(
      `/api/v1/uploads/${id}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer capture-secret',
          'Content-Type': 'application/pdf',
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes,
      },
      env,
    );
    expect(upload.status).toBe(200);

    const finalized = await app.request(
      `/api/v1/uploads/${id}/finalize`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer capture-secret',
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
      env,
    );
    expect(finalized.status).toBe(200);
    expect(repository.attachments.get(id)?.status).toBe('finalized');

    const anonymous = await app.request(
      `/api/v1/attachments/${id}/content`,
      {},
      env,
    );
    expect(anonymous.status).toBe(401);

    const download = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Authorization: 'Bearer capture-secret' } },
      env,
    );
    expect(download.status).toBe(200);
    expect(await download.arrayBuffer()).toEqual(bytes);
  });

  it('rejects wrong-size and wrong-signature uploads without storing bytes', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const bytes = new TextEncoder().encode('not a jpeg').buffer;

    const wrongSize = await initialize(app, env, {
      filename: 'example.pdf',
      mime_type: 'application/pdf',
      size_bytes: bytes.byteLength + 1,
      source_type: 'file',
    });
    const wrongSizeResponse = await app.request(
      `/api/v1/uploads/${wrongSize.body.data.attachment_id}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer capture-secret',
          'Content-Type': 'application/pdf',
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes,
      },
      env,
    );
    expect(wrongSizeResponse.status).toBe(422);

    const wrongSignature = await initialize(app, env, {
      filename: 'example.jpg',
      mime_type: 'image/jpeg',
      size_bytes: bytes.byteLength,
      source_type: 'image',
    });
    const wrongSignatureResponse = await app.request(
      `/api/v1/uploads/${wrongSignature.body.data.attachment_id}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer capture-secret',
          'Content-Type': 'image/jpeg',
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes,
      },
      env,
    );
    expect(wrongSignatureResponse.status).toBe(422);
    expect(r2.objects).toHaveLength(0);
  });

  it('rejects expired uploads', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const bytes = new TextEncoder().encode('%PDF-1.7').buffer;
    const initialized = await initialize(app, env, {
      filename: 'expired.pdf',
      mime_type: 'application/pdf',
      size_bytes: bytes.byteLength,
      source_type: 'file',
    });
    const attachment = repository.attachments.get(
      initialized.body.data.attachment_id,
    );
    if (!attachment) throw new Error('fixture not created');
    attachment.expiresAt = '2000-01-01T00:00:00.000Z';

    const response = await app.request(
      `/api/v1/uploads/${attachment.id}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer capture-secret',
          'Content-Type': 'application/pdf',
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes,
      },
      env,
    );
    expect(response.status).toBe(409);
  });

  it('cleans expired orphans idempotently', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const attachment = await repository.create({
      id: crypto.randomUUID(),
      r2Key: 'private/orphan',
      fileName: 'orphan.pdf',
      declaredContentType: 'application/pdf',
      sizeBytes: 5,
      expiresAt: '2000-01-01T00:00:00.000Z',
      createdAt: '1999-01-01T00:00:00.000Z',
    });

    expect(
      await cleanupExpiredAttachments(
        repository,
        r2.bucket,
        '2026-07-20T00:00:00.000Z',
      ),
    ).toBe(1);
    expect(repository.attachments.get(attachment.id)?.status).toBe('orphaned');
    expect(
      await cleanupExpiredAttachments(
        repository,
        r2.bucket,
        '2026-07-20T00:00:00.000Z',
      ),
    ).toBe(0);
  });

  it('provides an idempotent item-deletion hook for linked bytes', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const attachment = await repository.create({
      id: crypto.randomUUID(),
      r2Key: 'private/linked',
      fileName: 'linked.pdf',
      declaredContentType: 'application/pdf',
      sizeBytes: 5,
      expiresAt: '9999-01-01T00:00:00.000Z',
      createdAt: '2026-07-20T00:00:00.000Z',
    });
    attachment.itemId = '00000000-0000-0000-0000-000000000001';
    attachment.status = 'linked';

    expect(
      await deleteItemAttachments(
        repository,
        r2.bucket,
        '00000000-0000-0000-0000-000000000001',
      ),
    ).toBe(1);
    expect(repository.attachments.get(attachment.id)?.status).toBe('deleted');
    expect(
      await deleteItemAttachments(
        repository,
        r2.bucket,
        '00000000-0000-0000-0000-000000000001',
      ),
    ).toBe(0);
  });

  it('allows an admin bearer to read finalized attachment bytes', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id, bytes } = await createFinalizedPdf(app, env);

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Authorization: 'Bearer admin-secret' } },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.arrayBuffer()).toEqual(bytes);
  });

  it('allows a valid signed admin session cookie to read attachment bytes', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id, bytes } = await createFinalizedPdf(app, env);
    const cookie = await createAdminSessionCookie(app, env);

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Cookie: cookie } },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="read-auth.pdf"',
    );
    expect(await response.arrayBuffer()).toEqual(bytes);
  });

  it('returns exact PNG bytes through a signed admin session', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x42, 0x47, 0x30, 0x37,
    ]).buffer;
    const { id } = await createFinalizedAttachment(app, env, {
      filename: 'browser-proof.png',
      mimeType: 'image/png',
      sourceType: 'image',
      bytes,
    });
    const cookie = await createAdminSessionCookie(app, env);

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Cookie: cookie } },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(await response.arrayBuffer()).toEqual(bytes);
  });

  it('returns exact generic text bytes through a signed admin session', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const bytes = new TextEncoder().encode('BG-07 generic browser download proof').buffer;
    const { id } = await createFinalizedAttachment(app, env, {
      filename: 'browser-proof.txt',
      mimeType: 'text/plain',
      sourceType: 'file',
      bytes,
    });
    const cookie = await createAdminSessionCookie(app, env);

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Cookie: cookie } },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(await response.arrayBuffer()).toEqual(bytes);
  });

  it('rejects invalid and local-worker bearer credentials for attachment reads', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id } = await createFinalizedPdf(app, env);

    for (const authorization of [
      'Bearer wrong-secret',
      'Bearer local-worker-secret',
    ]) {
      const response = await app.request(
        `/api/v1/attachments/${id}/content`,
        { headers: { Authorization: authorization } },
        env,
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED' },
      });
    }
  });

  it('rejects a tampered admin session cookie for attachment reads', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id } = await createFinalizedPdf(app, env);
    const cookie = await createAdminSessionCookie(app, env);
    const tamperedCookie = `${cookie}x`;

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Cookie: tamperedCookie } },
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects the cleared browser session after logout', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id } = await createFinalizedPdf(app, env);
    const cookie = await createAdminSessionCookie(app, env);

    const logout = await app.request(
      '/api/v1/admin/session',
      {
        method: 'DELETE',
        headers: { Cookie: cookie },
      },
      env,
    );
    expect(logout.status).toBe(200);
    const clearedSetCookie = logout.headers.get('Set-Cookie');
    expect(clearedSetCookie).toBeTruthy();
    const clearedCookie = clearedSetCookie!.split(';', 1)[0]!;

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Cookie: clearedCookie } },
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('treats permitted attachment-read credentials as alternatives', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id, bytes } = await createFinalizedPdf(app, env);
    const cookie = await createAdminSessionCookie(app, env);

    const validCookieWithWrongScopeBearer = await app.request(
      `/api/v1/attachments/${id}/content`,
      {
        headers: {
          Authorization: 'Bearer local-worker-secret',
          Cookie: cookie,
        },
      },
      env,
    );
    expect(validCookieWithWrongScopeBearer.status).toBe(200);
    expect(await validCookieWithWrongScopeBearer.arrayBuffer()).toEqual(bytes);

    const validBearerWithTamperedCookie = await app.request(
      `/api/v1/attachments/${id}/content`,
      {
        headers: {
          Authorization: 'Bearer capture-secret',
          Cookie: `${cookie}x`,
        },
      },
      env,
    );
    expect(validBearerWithTamperedCookie.status).toBe(200);
    expect(await validBearerWithTamperedCookie.arrayBuffer()).toEqual(bytes);
  });

  it('does not broaden admin-cookie access to attachment writes or deletion', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id } = await createFinalizedPdf(app, env);
    const cookie = await createAdminSessionCookie(app, env);

    const cookieUploadInit = await app.request(
      '/api/v1/uploads/init',
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: 'cookie-only.pdf',
          mime_type: 'application/pdf',
          size_bytes: 8,
          source_type: 'file',
        }),
      },
      env,
    );
    expect(cookieUploadInit.status).toBe(401);

    const captureDelete = await app.request(
      `/api/v1/attachments/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer capture-secret' },
      },
      env,
    );
    expect(captureDelete.status).toBe(403);

    const cookieDelete = await app.request(
      `/api/v1/attachments/${id}`,
      {
        method: 'DELETE',
        headers: { Cookie: cookie },
      },
      env,
    );
    expect(cookieDelete.status).toBe(401);

    const adminDelete = await app.request(
      `/api/v1/attachments/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin-secret' },
      },
      env,
    );
    expect(adminDelete.status).toBe(204);
    expect(repository.attachments.get(id)?.status).toBe('deleted');
  });

  it('keeps unavailable attachment bytes hidden after successful authentication', async () => {
    const repository = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const env = testEnv(r2.bucket);
    const app = createApp(unusedCaptureRepository, () => repository);
    const { id } = await createFinalizedPdf(app, env);
    r2.objects.clear();

    const response = await app.request(
      `/api/v1/attachments/${id}/content`,
      { headers: { Authorization: 'Bearer admin-secret' } },
      env,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
