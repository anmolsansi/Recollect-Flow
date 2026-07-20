import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type {
  CaptureRepository,
  NewCapture,
  StoredCapture,
} from '../src/captures/capture.repository';
import type { Env } from '../src/env';

class MemoryCaptureRepository implements CaptureRepository {
  readonly events = new Map<string, StoredCapture>();
  readonly eventInputs = new Map<string, NewCapture>();
  readonly items = new Map<string, StoredCapture>();
  readonly sourceUrls = new Map<string, StoredCapture>();
  readonly canonicalUrls = new Map<string, StoredCapture>();
  readonly contentHashes = new Map<string, StoredCapture>();

  scheduled = 0;
  failCreate = false;
  failSchedule = false;

  async findByIdempotencyKey(key: string) {
    return this.events.get(key) ?? null;
  }

  async findCanonicalDuplicate(
    sourceUrl: string | null,
    canonicalUrl: string | null,
    contentHash: string | null,
  ) {
    return (
      (sourceUrl ? this.sourceUrls.get(sourceUrl) : null) ??
      (canonicalUrl ? this.canonicalUrls.get(canonicalUrl) : null) ??
      (contentHash ? this.contentHashes.get(contentHash) : null) ??
      null
    );
  }

  async create(capture: NewCapture) {
    if (this.failCreate) throw new Error('database unavailable');

    const itemId = capture.duplicateOf ?? capture.id;
    const stored: StoredCapture = {
      id: itemId,
      eventId: capture.eventId,
      idempotencyKey: capture.idempotency_key,
      duplicateOf: capture.duplicateOf,
      privacyLevel: capture.privacy_level,
      processingStatus: 'pending',
    };
    this.events.set(capture.idempotency_key, stored);
    this.eventInputs.set(capture.idempotency_key, capture);

    if (!capture.duplicateOf) {
      this.items.set(itemId, stored);
      if (capture.url) this.sourceUrls.set(capture.url, stored);
      if (capture.canonicalUrl) {
        this.canonicalUrls.set(capture.canonicalUrl, stored);
      }
      if (capture.contentHash)
        this.contentHashes.set(capture.contentHash, stored);
    }
    return stored;
  }

  async scheduleProcessing(capture: StoredCapture) {
    if (this.failSchedule) throw new Error('queue unavailable');
    if (!capture.duplicateOf) this.scheduled += 1;
  }
}

const env = {
  DB: {} as D1Database,
  ATTACHMENTS: {} as R2Bucket,
  AI: {} as Ai,
  NOTION_DATABASE_ID: '3a21b726-4ada-80a3-bfe1-ef808e3c293f',
  MAX_ATTACHMENT_BYTES: '25000000',
  UPLOAD_TTL_SECONDS: '3600',
  CAPTURE_TOKEN: 'capture-secret',
  ADMIN_TOKEN: 'admin-secret',
  NOTION_ACCESS_TOKEN: 'notion-secret',
  TELEGRAM_BOT_TOKEN: 'telegram-secret',
  TELEGRAM_CHAT_ID: 'private-chat-id',
} satisfies Env;

const validCapture = {
  idempotency_key: 'capture-20260718-0001',
  source_type: 'url',
  source_app: 'ios-shortcut',
  url: 'https://example.com/article?utm_source=test',
  captured_at: '2026-07-18T12:00:00.000Z',
  client: { name: 'shortcut', version: '1.0' },
};

function post(
  app: ReturnType<typeof createApp>,
  body: unknown,
  token = 'capture-secret',
) {
  return app.request(
    '/api/v1/captures',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe('POST /api/v1/captures', () => {
  it('persists a valid capture before scheduling work', async () => {
    const repository = new MemoryCaptureRepository();
    const response = await post(
      createApp(() => repository),
      validCapture,
    );

    expect(response.status).toBe(201);
    expect(repository.items).toHaveLength(1);
    expect(repository.events).toHaveLength(1);
    expect(repository.scheduled).toBe(1);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: 'saved',
        processing_status: 'pending',
        duplicate_of: null,
        privacy_level: 'unknown',
      },
    });
  });

  it.each([
    [
      'standard website',
      'https://example.com/article?igshid=xyz',
      'https://example.com/article?utm_source=mail',
    ],
    [
      'Instagram',
      'https://instagram.com/p/demo/?igshid=first',
      'https://INSTAGRAM.com/p/demo?utm_source=share',
    ],
    [
      'YouTube',
      'https://youtu.be/demo?si=first&t=10',
      'https://YOUTU.BE/demo?t=10&si=second',
    ],
  ])(
    'reuses one item for %s canonical duplicates',
    async (_name, firstUrl, secondUrl) => {
      const repository = new MemoryCaptureRepository();
      const app = createApp(() => repository);
      const first = await post(app, { ...validCapture, url: firstUrl });
      const firstBody = await first.json<{ data: { capture_id: string } }>();
      const second = await post(app, {
        ...validCapture,
        idempotency_key: 'capture-20260718-0002',
        url: secondUrl,
        user_reason: 'A different note is preserved.',
      });

      expect(repository.items).toHaveLength(1);
      expect(repository.events).toHaveLength(2);
      expect(repository.scheduled).toBe(1);
      expect(
        repository.eventInputs.get('capture-20260718-0002')?.user_reason,
      ).toBe('A different note is preserved.');
      await expect(second.json()).resolves.toMatchObject({
        data: { duplicate_of: firstBody.data.capture_id },
      });
    },
  );

  it('detects exact text content even when source URLs differ', async () => {
    const repository = new MemoryCaptureRepository();
    const app = createApp(() => repository);
    await post(app, {
      ...validCapture,
      shared_text: 'Exact duplicate text content',
    });
    await post(app, {
      ...validCapture,
      idempotency_key: 'capture-text-002',
      url: 'https://different.example/article',
      shared_text: 'Exact duplicate text content',
    });

    expect(repository.items).toHaveLength(1);
    expect(repository.events).toHaveLength(2);
  });

  it('reuses one item for byte-exact text-only captures', async () => {
    const repository = new MemoryCaptureRepository();
    const app = createApp(() => repository);
    const textCapture = {
      idempotency_key: 'text-only-key-0001',
      source_type: 'text',
      source_app: 'ios-shortcut',
      shared_text: 'A byte-exact text capture.',
      captured_at: '2026-07-18T12:00:00.000Z',
      client: { name: 'shortcut', version: '1.0' },
    };
    await post(app, textCapture);
    await post(app, {
      ...textCapture,
      idempotency_key: 'text-only-key-0002',
      user_reason: 'Second-share note',
    });

    expect(repository.items).toHaveLength(1);
    expect(repository.events).toHaveLength(2);
  });

  it('accepts a finalized attachment reference for file captures', async () => {
    const repository = new MemoryCaptureRepository();
    const attachmentId = crypto.randomUUID();
    const response = await post(
      createApp(() => repository),
      {
        idempotency_key: 'file-capture-key-0001',
        source_type: 'file',
        source_app: 'ios-shortcut',
        attachment_id: attachmentId,
        captured_at: '2026-07-18T12:00:00.000Z',
        client: { name: 'shortcut', version: '1.0' },
      },
    );

    expect(response.status).toBe(201);
    expect(
      repository.eventInputs.get('file-capture-key-0001')?.attachment_id,
    ).toBe(attachmentId);
  });

  it('keeps near-match URLs and text as separate items', async () => {
    const repository = new MemoryCaptureRepository();
    const app = createApp(() => repository);
    await post(app, {
      ...validCapture,
      shared_text: 'Exact text',
    });
    await post(app, {
      ...validCapture,
      idempotency_key: 'capture-near-002',
      url: 'https://example.com/article?version=2',
      shared_text: 'Exact text ',
    });

    expect(repository.items).toHaveLength(2);
    expect(repository.events).toHaveLength(2);
  });

  it('returns the original event for an idempotent replay', async () => {
    const repository = new MemoryCaptureRepository();
    const app = createApp(() => repository);
    const first = await post(app, validCapture);
    const replay = await post(app, validCapture);
    const firstBody = await first.json<{ data: { capture_id: string } }>();
    const replayBody = await replay.json<{ data: { capture_id: string } }>();

    expect(replay.status).toBe(200);
    expect(replayBody.data.capture_id).toBe(firstBody.data.capture_id);
    expect(repository.items).toHaveLength(1);
    expect(repository.events).toHaveLength(1);
    expect(repository.scheduled).toBe(1);
  });

  it('rejects a missing or invalid bearer token', async () => {
    const response = await post(
      createApp(() => new MemoryCaptureRepository()),
      validCapture,
      'wrong-secret',
    );
    expect(response.status).toBe(401);
  });

  it('rejects malformed URLs', async () => {
    const response = await post(
      createApp(() => new MemoryCaptureRepository()),
      { ...validCapture, url: 'not a url' },
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR', fields: { url: expect.any(String) } },
    });
  });

  it('returns a retry-safe error when storage fails', async () => {
    const repository = new MemoryCaptureRepository();
    repository.failCreate = true;
    const response = await post(
      createApp(() => repository),
      validCapture,
    );
    expect(response.status).toBe(503);
  });

  it('keeps the raw capture when downstream scheduling fails', async () => {
    const repository = new MemoryCaptureRepository();
    repository.failSchedule = true;
    const response = await post(
      createApp(() => repository),
      validCapture,
    );
    expect(response.status).toBe(201);
    expect(repository.items).toHaveLength(1);
    expect(repository.events).toHaveLength(1);
  });
});
