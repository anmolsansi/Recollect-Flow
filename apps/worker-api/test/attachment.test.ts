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
    attachment.itemId = 'item-1';
    attachment.status = 'linked';

    expect(await deleteItemAttachments(repository, r2.bucket, 'item-1')).toBe(
      1,
    );
    expect(repository.attachments.get(attachment.id)?.status).toBe('deleted');
    expect(await deleteItemAttachments(repository, r2.bucket, 'item-1')).toBe(
      0,
    );
  });
});
