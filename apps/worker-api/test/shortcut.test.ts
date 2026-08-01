import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type {
  AttachmentRepository,
  AttachmentStatus,
  NewAttachment,
  StoredAttachment,
} from '../src/attachments/attachment.repository';
import type {
  CaptureRepository,
  NewCapture,
  StoredCapture,
} from '../src/captures/capture.repository';
import type { Env } from '../src/env';

class MemoryCaptureRepository implements CaptureRepository {
  readonly events = new Map<string, StoredCapture>();
  readonly inputs = new Map<string, NewCapture>();
  failCreate = false;

  async findByIdempotencyKey(key: string) {
    return this.events.get(key) ?? null;
  }

  async findCanonicalDuplicate() {
    return null;
  }

  async create(input: NewCapture) {
    if (this.failCreate) throw new Error('database unavailable');
    const stored: StoredCapture = {
      id: input.id,
      eventId: input.eventId,
      idempotencyKey: input.idempotency_key,
      requestFingerprint: input.requestFingerprint,
      duplicateOf: null,
      privacyLevel: input.privacy_level,
      processingStatus: 'pending',
      attachmentId: null,
    };
    this.events.set(input.idempotency_key, stored);
    this.inputs.set(input.idempotency_key, input);
    return stored;
  }

  async scheduleProcessing() {}
}

class MemoryAttachmentRepository implements AttachmentRepository {
  readonly attachments = new Map<string, StoredAttachment>();

  async create(input: NewAttachment) {
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
    this.attachments.set(input.id, stored);
    return stored;
  }

  async findById(id: string) {
    return this.attachments.get(id) ?? null;
  }

  async findByItemId() {
    return [];
  }

  async markUploaded(
    id: string,
    hash: string,
    detectedType: string,
    at: string,
  ) {
    Object.assign(this.attachments.get(id)!, {
      status: 'uploaded' as AttachmentStatus,
      contentHash: hash,
      detectedContentType: detectedType,
      updatedAt: at,
    });
  }

  async markFinalized(id: string, at: string) {
    Object.assign(this.attachments.get(id)!, {
      status: 'finalized' as AttachmentStatus,
      updatedAt: at,
    });
  }

  async findExpiredOrphans() {
    return [];
  }

  async markOrphaned(id: string, at: string) {
    Object.assign(this.attachments.get(id)!, {
      status: 'orphaned' as AttachmentStatus,
      updatedAt: at,
    });
  }

  async markDeleted() {}

  async usage() {
    return [];
  }
}

function memoryBucket() {
  const objects = new Map<
    string,
    {
      bytes: ArrayBuffer;
      contentType: string;
      customMetadata: Record<string, string>;
    }
  >();
  let failPut = false;
  return {
    objects,
    setFailPut(value: boolean) {
      failPut = value;
    },
    bucket: {
      async put(key: string, bytes: ArrayBuffer, options: R2PutOptions) {
        if (failPut) throw new Error('r2 unavailable');
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
        return object
          ? {
              key,
              size: object.bytes.byteLength,
              httpMetadata: { contentType: object.contentType },
              customMetadata: object.customMetadata,
            }
          : null;
      },
      async delete(key: string) {
        objects.delete(key);
      },
    } as unknown as R2Bucket,
  };
}

function env(bucket: R2Bucket): Env {
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

function form(values: Record<string, string | Blob>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return body;
}

function post(
  app: ReturnType<typeof createApp>,
  testEnv: Env,
  body: FormData,
  token = 'capture-secret',
) {
  return app.request(
    '/api/v1/shortcut/captures',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
    testEnv,
  );
}

describe('POST /api/v1/shortcut/captures', () => {
  it('saves and idempotently replays a URL in one request', async () => {
    const captures = new MemoryCaptureRepository();
    const attachments = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const app = createApp(
      () => captures,
      () => attachments,
    );
    const testEnv = env(r2.bucket);
    const values = {
      idempotency_key: 'shortcut-url-0000001',
      kind_hint: 'url',
      content: 'https://example.com/article',
    };

    const saved = await post(app, testEnv, form(values));
    const replayed = await post(app, testEnv, form(values));

    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({
      ok: true,
      outcome: 'saved',
      shortcut_action: 'DELETE_QUEUE',
      replayed: false,
    });
    await expect(replayed.json()).resolves.toMatchObject({
      ok: true,
      outcome: 'replayed',
      shortcut_action: 'DELETE_QUEUE',
      replayed: true,
    });
    expect(captures.events).toHaveLength(1);
  });

  it('rejects reuse of an idempotency key for different content', async () => {
    const captures = new MemoryCaptureRepository();
    const r2 = memoryBucket();
    const app = createApp(
      () => captures,
      () => new MemoryAttachmentRepository(),
    );
    const testEnv = env(r2.bucket);
    const base = {
      idempotency_key: 'shortcut-text-000001',
      kind_hint: 'text',
    };
    await post(app, testEnv, form({ ...base, content: 'first' }));
    const conflict = await post(
      app,
      testEnv,
      form({ ...base, content: 'second' }),
    );

    await expect(conflict.json()).resolves.toMatchObject({
      ok: false,
      code: 'IDEMPOTENCY_CONFLICT',
      shortcut_action: 'KEEP_FIX',
      retryable: false,
    });
  });

  it('accepts only the capture token and always returns a Shortcut envelope', async () => {
    const r2 = memoryBucket();
    const app = createApp(
      () => new MemoryCaptureRepository(),
      () => new MemoryAttachmentRepository(),
    );
    const response = await post(
      app,
      env(r2.bucket),
      form({
        idempotency_key: 'shortcut-auth-000001',
        content: 'private note',
      }),
      'admin-secret',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      outcome: 'auth_required',
      shortcut_action: 'KEEP_STOP',
    });
  });

  it('validates, stores, finalizes, and captures a PDF in one request', async () => {
    const captures = new MemoryCaptureRepository();
    const attachments = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    const app = createApp(
      () => captures,
      () => attachments,
    );
    const bytes = new TextEncoder().encode('%PDF-1.7\nshortcut');
    const response = await post(
      app,
      env(r2.bucket),
      form({
        idempotency_key: 'shortcut-file-000001',
        kind_hint: 'attachment',
        content: new File([bytes], 'receipt.pdf', {
          type: 'application/pdf',
        }),
      }),
    );
    const body = await response.json<{
      ok: boolean;
      attachment_id: string;
    }>();

    expect(body.ok).toBe(true);
    expect(attachments.attachments.get(body.attachment_id)?.status).toBe(
      'finalized',
    );
    expect(r2.objects).toHaveLength(1);
    expect(captures.inputs.get('shortcut-file-000001')?.attachment_id).toBe(
      body.attachment_id,
    );
  });

  it('rejects a mismatched file signature without writing private bytes', async () => {
    const r2 = memoryBucket();
    const response = await post(
      createApp(
        () => new MemoryCaptureRepository(),
        () => new MemoryAttachmentRepository(),
      ),
      env(r2.bucket),
      form({
        idempotency_key: 'shortcut-file-000002',
        kind_hint: 'attachment',
        content: new File(['not a pdf'], 'fake.pdf', {
          type: 'application/pdf',
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: 'WRONG_SIGNATURE',
      shortcut_action: 'KEEP_FIX',
    });
    expect(r2.objects).toHaveLength(0);
  });

  it('keeps a file queued and compensates when storage fails', async () => {
    const attachments = new MemoryAttachmentRepository();
    const r2 = memoryBucket();
    r2.setFailPut(true);
    const response = await post(
      createApp(
        () => new MemoryCaptureRepository(),
        () => attachments,
      ),
      env(r2.bucket),
      form({
        idempotency_key: 'shortcut-file-000003',
        kind_hint: 'attachment',
        content: new File(['%PDF-1.7'], 'retry.pdf', {
          type: 'application/pdf',
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      retryable: true,
      shortcut_action: 'KEEP_RETRY',
    });
    expect([...attachments.attachments.values()][0]?.status).toBe('orphaned');
    expect(r2.objects).toHaveLength(0);
  });
});
