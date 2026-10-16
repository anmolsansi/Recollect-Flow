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
  return { response, payload: await response.json() };
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
    expect(upload.status).toBe(200);
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
      'SELECT status, size_bytes, content_hash, r2_key FROM attachments WHERE id = ?1',
    )
      .bind(id)
      .first<{
        status: string;
        size_bytes: number;
        content_hash: string;
        r2_key: string;
      }>();
    expect(stored?.status).toBe('finalized');
    expect(stored?.size_bytes).toBe(MAX_BYTES);
    expect(stored?.content_hash).toBe(uploadResult.data.checksum);
    const object = await env.ATTACHMENTS.head(stored!.r2_key);
    expect(object?.size).toBe(MAX_BYTES);
    await env.ATTACHMENTS.delete(stored!.r2_key);
  }, 120_000);

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
      'SELECT status, r2_key FROM attachments WHERE id = ?1',
    )
      .bind(id)
      .first<{ status: string; r2_key: string }>();
    expect(pending?.status).toBe('pending');
    expect(await env.ATTACHMENTS.head(pending!.r2_key)).toBeNull();
  });
});
