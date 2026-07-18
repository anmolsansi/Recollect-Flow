import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type {
  CaptureRepository,
  NewCapture,
  StoredCapture,
} from '../src/captures/capture.repository';
import type { Env } from '../src/env';

class MemoryCaptureRepository implements CaptureRepository {
  readonly captures = new Map<string, StoredCapture>();
  scheduled = 0;
  failCreate = false;
  failSchedule = false;

  async findByIdempotencyKey(key: string) {
    return this.captures.get(key) ?? null;
  }

  async create(capture: NewCapture) {
    if (this.failCreate) throw new Error('database unavailable');
    const stored: StoredCapture = {
      id: capture.id,
      idempotencyKey: capture.idempotency_key,
      processingStatus: 'pending',
    };
    this.captures.set(capture.idempotency_key, stored);
    return stored;
  }

  async scheduleProcessing() {
    if (this.failSchedule) throw new Error('queue unavailable');
    this.scheduled += 1;
  }
}

const env = {
  DB: {} as D1Database,
  ATTACHMENTS: {} as R2Bucket,
  AI: {} as Ai,
  CAPTURE_TOKEN: 'capture-secret',
  ADMIN_TOKEN: 'admin-secret',
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
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(201);
    expect(repository.captures).toHaveLength(1);
    expect(repository.scheduled).toBe(1);
    expect(body).toMatchObject({
      data: { status: 'saved', processing_status: 'pending' },
    });
  });

  it('returns the original record for an idempotent replay', async () => {
    const repository = new MemoryCaptureRepository();
    const app = createApp(() => repository);
    const first = await post(app, validCapture);
    const replay = await post(app, validCapture);
    const firstBody = await first.json<{ data: { capture_id: string } }>();
    const replayBody = await replay.json<{ data: { capture_id: string } }>();

    expect(replay.status).toBe(200);
    expect(replayBody.data.capture_id).toBe(firstBody.data.capture_id);
    expect(repository.captures).toHaveLength(1);
    expect(repository.scheduled).toBe(1);
  });

  it('rejects a missing or invalid bearer token', async () => {
    const repository = new MemoryCaptureRepository();
    const response = await post(
      createApp(() => repository),
      validCapture,
      'wrong-secret',
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
  });

  it('returns field errors for an invalid capture', async () => {
    const repository = new MemoryCaptureRepository();
    const response = await post(
      createApp(() => repository),
      {
        ...validCapture,
        url: undefined,
      },
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
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'STORAGE_UNAVAILABLE' },
    });
  });

  it('keeps the raw capture when downstream scheduling fails', async () => {
    const repository = new MemoryCaptureRepository();
    repository.failSchedule = true;
    const response = await post(
      createApp(() => repository),
      validCapture,
    );

    expect(response.status).toBe(201);
    expect(repository.captures).toHaveLength(1);
  });
});
