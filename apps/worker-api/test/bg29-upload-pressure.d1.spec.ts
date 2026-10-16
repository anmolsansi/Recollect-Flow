import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type { Env } from '../src/env';

const MAX_BYTES = 25_000_000;
const app = createApp();
const runtime = env as unknown as Env;
const auth = { Authorization: 'Bearer test-capture-token' };

async function init(size: number, id: string) {
  const response = await app.request(
    '/api/v1/uploads/init',
    {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `bg29-${id}.pdf`,
        mime_type: 'application/pdf',
        source_type: 'file',
        size_bytes: size,
      }),
    },
    runtime,
  );
  return {
    response,
    payload: (await response.json()) as {
      data: { attachment_id: string };
      error?: { code: string };
    },
  };
}

describe('BG-29 upload limit, size and interrupted transfer acceptance', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('enforces configured 25MB reservation limit without creating an object', async () => {
    const exceeded = await init(MAX_BYTES + 1, 'oversized');
    expect(exceeded.response.status).toBe(413);
    expect(exceeded.payload).toMatchObject({
      error: { code: 'FILE_TOO_LARGE' },
    });
    const valid = await init(MAX_BYTES, 'near-limit');
    expect(valid.response.status).toBe(201);
    const id = valid.payload.data.attachment_id as string;
    const bytes = new Uint8Array(MAX_BYTES);
    bytes.set(
      new TextEncoder().encode('%PDF-1.7\nBG29 synthetic binary limit fixture'),
    );
    const startedUploadMs = Date.now();
    const upload = await app.request(
      `/api/v1/uploads/${id}/content`,
      {
        method: 'PUT',
        headers: {
          ...auth,
          'Content-Type': 'application/pdf',
          'Content-Length': String(MAX_BYTES),
        },
        body: bytes.buffer,
      },
      runtime,
    );
    const measuredUploadMs = Date.now() - startedUploadMs;
    expect(upload.status).toBe(200);
    console.log(
      JSON.stringify({
        event: 'bg29_isolated_upload_timing',
        bytes: MAX_BYTES,
        upload_ms: measuredUploadMs,
        environment: 'workerd-vitest-d1-r2',
        includes_capture_ack: false,
        includes_optional_processing: false,
        caveat:
          'Isolated workerd fixture, not physical-device or hosted Worker throughput',
      }),
    );
    const uploadResult = await upload.json<{ data: { checksum: string } }>();
    expect(uploadResult.data.checksum).toMatch(/^[a-f0-9]{64}$/);

    const final = await app.request(
      `/api/v1/uploads/${id}/finalize`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checksum: uploadResult.data.checksum }),
      },
      runtime,
    );
    expect(final.status).toBe(200);
    const stored = await env.DB.prepare(
      'SELECT status, size_bytes, content_hash, object_key FROM attachments WHERE id = ?1',
    )
      .bind(id)
      .first<{
        status: string;
        size_bytes: number;
        content_hash: string;
        object_key: string;
      }>();
    expect(stored?.status).toBe('finalized');
    expect(stored?.size_bytes).toBe(MAX_BYTES);
    expect(stored?.content_hash).toBe(uploadResult.data.checksum);
    const object = await env.ATTACHMENTS.head(stored!.object_key);
    expect(object?.size).toBe(MAX_BYTES);
    await env.ATTACHMENTS.delete(stored!.object_key);
  }, 120_000);

  it('rejects a partially received stream after client transport interruption', async () => {
    const created = await init(256, 'stream-interrupted');
    expect(created.response.status).toBe(201);
    const id = created.payload.data.attachment_id as string;
    let emitted = false;
    const partial = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!emitted) {
          controller.enqueue(
            new TextEncoder().encode('%PDF-1.7\nsynthetic partial'),
          );
          emitted = true;
        } else {
          controller.error(new Error('BG29_SYNTHETIC_NETWORK_CANCEL'));
        }
      },
    });
    const request = new Request(
      `https://inbox.example.test/api/v1/uploads/${id}/content`,
      {
        method: 'PUT',
        headers: {
          ...auth,
          'Content-Type': 'application/pdf',
          'Content-Length': '256',
        },
        body: partial,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' },
    );
    let refused = false;
    try {
      const response = await app.request(request, undefined, runtime);
      refused = response.status !== 200;
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    const retained = await env.DB.prepare(
      'SELECT status, object_key FROM attachments WHERE id = ?1',
    )
      .bind(id)
      .first<{ status: string; object_key: string }>();
    expect(retained?.status).toBe('pending');
    expect(await env.ATTACHMENTS.head(retained!.object_key)).toBeNull();
  });

  it('preserves pending-only state when the client cancels before putting bytes', async () => {
    const started = await init(100, 'canceled-before-upload');
    expect(started.response.status).toBe(201);
    const id = started.payload.data.attachment_id as string;
    // A stopped client sends no PUT: finalization must refuse to invent bytes.
    const finalize = await app.request(
      `/api/v1/uploads/${id}/finalize`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: '{}',
      },
      runtime,
    );
    expect(finalize.status).toBe(409);
    const pending = await env.DB.prepare(
      'SELECT status, object_key FROM attachments WHERE id = ?1',
    )
      .bind(id)
      .first<{ status: string; object_key: string }>();
    expect(pending?.status).toBe('pending');
    expect(await env.ATTACHMENTS.head(pending!.object_key)).toBeNull();
  });
});
