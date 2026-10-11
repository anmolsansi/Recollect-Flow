import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCaptureOperation } from './capture-recovery';
import {
  BROWSER_FILE_LIMIT,
  hashOriginalFile,
  prepareFileOperation,
  restartExpiredUpload,
  runFileCapture,
  validateBrowserFile,
  type UploadPolicy,
} from './file-upload';
import type { CaptureOperation } from './capture-recovery';

const id = '01234567-89ab-4cde-8f01-234567890abc';
const bytes = new TextEncoder().encode('%PDF-1.7\nfixture');
const pdf = () => new File([bytes], 'owner.pdf', { type: 'application/pdf' });
const policy: UploadPolicy = {
  max_size_bytes: 25_000_000,
  allowed_mime_types: ['application/pdf', 'image/png', 'audio/mpeg'],
};
const wrapped = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data, meta: { request_id: 'test' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const beforeExpiry = '2028-01-01T00:00:00.000Z';
const make = async () =>
  prepareFileOperation(
    pdf(),
    await hashOriginalFile(pdf()),
    'Keep source',
    'personal',
    '',
    id,
  );

afterEach(() => vi.unstubAllGlobals());

describe('BG-18 single-file admission and durable replay', () => {
  it('admits allowed PDF and rejects empty, disallowed and oversized files', () => {
    expect(validateBrowserFile(pdf(), policy)).toBeNull();
    expect(
      validateBrowserFile(
        new File(['x'], 'run.exe', { type: 'application/x-msdownload' }),
        policy,
      ),
    ).toMatch(/not supported/i);
    expect(
      validateBrowserFile(
        new File([], 'empty.pdf', { type: 'application/pdf' }),
        policy,
      ),
    ).toMatch(/nonempty/i);
    const large = new File([new Uint8Array(10)], 'owner.pdf', {
      type: 'application/pdf',
    });
    expect(
      validateBrowserFile(large, { ...policy, max_size_bytes: 5 }),
    ).toMatch(/server limit/i);
    expect(BROWSER_FILE_LIMIT).toBe(25_000_000);
  });

  it('preserves only metadata, original key, timestamp and reason across recovery', async () => {
    const operation = await make();
    const restored = parseCaptureOperation(operation);
    expect(restored?.attachment?.sha256).toBe(operation.attachment?.sha256);
    expect(restored?.payload.user_reason).toBe('Keep source');
    expect(restored?.payload.privacy_level).toBe('personal');
    expect(restored).not.toHaveProperty('file');
    expect(JSON.stringify(restored)).not.toContain('%PDF-');
    const reset = restartExpiredUpload({
      ...operation,
      attachment: {
        ...operation.attachment!,
        stage: 'initialized',
        attachmentId: id,
        expiresAt: beforeExpiry,
      },
    });
    expect(reset.payload.idempotency_key).toBe(
      operation.payload.idempotency_key,
    );
    expect(reset.payload.captured_at).toBe(operation.payload.captured_at);
    expect(reset.attachment?.stage).toBe('selected');
    expect(reset.attachment?.attachmentId).toBeUndefined();
  });

  it('uploads original bytes, finalizes, then links exactly one canonical item', async () => {
    const original = await make();
    const calls: string[] = [];
    const captures: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: string, init?: RequestInit) => {
        calls.push((init?.method || 'GET') + ' ' + request);
        if (request.endsWith('/uploads/init'))
          return wrapped(
            {
              attachment_id: id,
              upload_url: '/api/v1/uploads/' + id + '/content',
              expires_at: beforeExpiry,
            },
            201,
          );
        if (request.endsWith('/content')) {
          expect(init?.body).toBeInstanceOf(File);
          expect(init?.headers).toEqual({ 'Content-Type': 'application/pdf' });
          return wrapped({ status: 'uploaded' });
        }
        if (request.endsWith('/finalize')) {
          expect(JSON.parse(init?.body as string)).toEqual({
            checksum: original.attachment?.sha256,
          });
          return wrapped({
            status: 'finalized',
            attachment_id: id,
            checksum: original.attachment?.sha256,
          });
        }
        if (request.endsWith('/captures')) {
          captures.push(
            JSON.parse(init?.body as string) as Record<string, unknown>,
          );
          return wrapped(
            {
              capture_id: 'saved-item',
              replayed: false,
              duplicate_of: null,
              processing_status: 'pending',
            },
            201,
          );
        }
        throw new Error('Unexpected request ' + request);
      }),
    );
    let latest: CaptureOperation = original;
    const stages: string[] = [];
    const result = await runFileCapture(
      original,
      pdf(),
      async (next, stage) => {
        latest = next;
        stages.push(stage);
      },
    );
    expect(result.capture_id).toBe('saved-item');
    expect(calls).toEqual([
      'POST /api/v1/uploads/init',
      'PUT /api/v1/uploads/' + id + '/content',
      'POST /api/v1/uploads/' + id + '/finalize',
      'POST /api/v1/captures',
    ]);
    expect(stages).toContain('Uploading file');
    expect(captures).toHaveLength(1);
    expect(captures[0]).toMatchObject({
      source_type: 'file',
      attachment_id: id,
      idempotency_key: original.id,
      user_reason: 'Keep source',
      privacy_level: 'personal',
    });
    expect(parseCaptureOperation(latest)?.attachment?.stage).toBe('finalized');
  });

  it('treats audio as file capture, not unsupported audio capture source_type', async () => {
    const audio = new File(['ID3data'], 'owner.mp3', { type: 'audio/mpeg' });
    const operation = prepareFileOperation(
      audio,
      await hashOriginalFile(audio),
      '',
      'unknown',
      '',
    );
    expect(operation.payload.source_type).toBe('file');
  });

  it('replays the same reservation UUID when the initialize response is lost', async () => {
    const original = await make();
    const initBodies: Record<string, unknown>[] = [];
    let initialized = false;
    vi.stubGlobal('fetch', vi.fn(async (path: string, options?: RequestInit) => {
      if (path.endsWith('/uploads/init')) {
        initBodies.push(JSON.parse(options?.body as string));
        if (!initialized) {
          initialized = true;
          throw new TypeError('Lost initialization reply');
        }
        return wrapped({
          attachment_id: id,
          upload_url: '/api/v1/uploads/' + id + '/content',
          expires_at: beforeExpiry,
        });
      }
      if (path.endsWith('/content')) return wrapped({ status: 'uploaded' });
      if (path.endsWith('/finalize')) return wrapped({
        status: 'finalized', attachment_id: id,
        checksum: original.attachment?.sha256,
      });
      if (path.endsWith('/captures')) return wrapped({
        capture_id: 'saved', replayed: false, duplicate_of: null, processing_status: 'pending',
      });
      throw new Error('Unexpected request');
    }));
    await expect(runFileCapture(original, pdf(), async () => {})).rejects.toThrow('Lost initialization reply');
    expect((await runFileCapture(original, pdf(), async () => {})).capture_id).toBe('saved');
    expect(initBodies).toHaveLength(2);
    expect(initBodies[0]).toMatchObject({ attachment_id: id });
    expect(initBodies[1]).toEqual(initBodies[0]);
  });

  it('refuses a tampered upload target before transferring original bytes', async () => {
    const original = await make();
    const fetchMock = vi.fn(async () =>
      wrapped(
        {
          attachment_id: id,
          upload_url: 'https://untrusted.example/private',
          expires_at: beforeExpiry,
        },
        201,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      runFileCapture(original, pdf(), async () => {}),
    ).rejects.toThrow('Invalid upload reservation');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('BG-18 failure-boundary recovery', () => {
  it('checks uploaded state after ambiguous PUT without a second transfer', async () => {
    const source = await make();
    const starting: CaptureOperation = {
      ...source,
      attachment: {
        ...source.attachment!,
        stage: 'initialized',
        attachmentId: id,
        expiresAt: beforeExpiry,
      },
    };
    const paths: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        paths.push((init?.method || 'GET') + ' ' + path);
        if (path.endsWith('/status'))
          return wrapped({
            attachment_id: id,
            status: 'uploaded',
            expires_at: beforeExpiry,
            checksum: starting.attachment?.sha256,
            size_bytes: bytes.length,
            mime_type: 'application/pdf',
          });
        if (path.endsWith('/finalize'))
          return wrapped({
            attachment_id: id,
            status: 'finalized',
            checksum: starting.attachment?.sha256,
          });
        if (path.endsWith('/captures'))
          return wrapped({
            capture_id: 'stable',
            replayed: false,
            duplicate_of: null,
            processing_status: 'pending',
          });
        throw new Error('Unexpected request');
      }),
    );
    let latest = starting;
    expect(
      (
        await runFileCapture(starting, null, async (next) => {
          latest = next;
        })
      ).capture_id,
    ).toBe('stable');
    expect(paths).not.toContain('PUT /api/v1/uploads/' + id + '/content');
    expect(latest.payload.attachment_id).toBe(id);
  });

  it('replays an identical capture after response loss, avoiding a second item', async () => {
    const source = await make();
    const finalized: CaptureOperation = {
      ...source,
      attachment: {
        ...source.attachment!,
        stage: 'finalized',
        attachmentId: id,
        expiresAt: beforeExpiry,
      },
      payload: { ...source.payload, attachment_id: id },
    };
    const requested: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init?: RequestInit) => {
        if (path.endsWith('/status'))
          return wrapped({
            attachment_id: id,
            status: 'linked',
            expires_at: beforeExpiry,
            checksum: source.attachment?.sha256,
            size_bytes: bytes.length,
            mime_type: 'application/pdf',
          });
        if (path.endsWith('/captures')) {
          requested.push(JSON.parse(init?.body as string));
          return wrapped({
            capture_id: 'already-created',
            replayed: true,
            duplicate_of: null,
            processing_status: 'complete',
          });
        }
        throw new Error('Unexpected request');
      }),
    );
    const output = await runFileCapture(finalized, null, async () => {});
    expect(output).toMatchObject({
      capture_id: 'already-created',
      replayed: true,
    });
    expect(requested).toHaveLength(1);
    expect(requested[0]).toMatchObject(finalized.payload);
  });

  it('does not silently reinitialize an expired original reservation', async () => {
    const source = await make();
    const starting: CaptureOperation = {
      ...source,
      attachment: {
        ...source.attachment!,
        stage: 'initialized',
        attachmentId: id,
        expiresAt: '2020-01-01T00:00:00.000Z',
      },
    };
    const requests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        requests.push(path);
        return wrapped({
          attachment_id: id,
          status: 'pending',
          expires_at: '2020-01-01T00:00:00.000Z',
          checksum: source.attachment?.sha256,
          size_bytes: bytes.length,
          mime_type: 'application/pdf',
        });
      }),
    );
    await expect(
      runFileCapture(starting, pdf(), async () => {}),
    ).rejects.toThrow('UPLOAD_EXPIRED');
    expect(requests).toEqual(['/api/v1/uploads/' + id + '/status']);
  });

  it('rejects server checksum disagreement rather than uploading changed bytes', async () => {
    const source = await make();
    const starting: CaptureOperation = {
      ...source,
      attachment: {
        ...source.attachment!,
        stage: 'uploaded',
        attachmentId: id,
        expiresAt: beforeExpiry,
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        wrapped({
          attachment_id: id,
          status: 'uploaded',
          expires_at: beforeExpiry,
          checksum: 'f'.repeat(64),
          size_bytes: bytes.length,
          mime_type: 'application/pdf',
        }),
      ),
    );
    await expect(
      runFileCapture(starting, null, async () => {}),
    ).rejects.toThrow('does not match');
  });
});
