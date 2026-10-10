import { describe, expect, it } from 'vitest';
import {
  RECOVERY_MAX_BYTES,
  RECOVERY_TTL_MS,
  ensureRecoveryBudget,
  newCaptureOperation,
  parseCaptureOperation,
} from './capture-recovery';
import { buildCapturePayload, emptyCaptureDraft } from './capture-model';

const now = Date.parse('2026-10-10T19:00:00.000Z');
function createOperation(key = '01234567-89ab-4cde-8f01-234567890abc') {
  const p = buildCapturePayload(
    { ...emptyCaptureDraft(), url: 'https://example.com' },
    key,
    new Date(now).toISOString(),
    '0.0.0',
  );
  return { ...newCaptureOperation(p), createdAt: new Date(now).toISOString() };
}

describe('BG-17 recovery record contract', () => {
  it('preserves immutable wire payload, original captured_at, privacy and key', () => {
    const operation = createOperation();
    const restored = parseCaptureOperation(operation, now + 500);
    expect(restored?.payload).toEqual(operation.payload);
    expect(restored?.id).toBe(operation.payload.idempotency_key);
    expect(restored?.stage).toBe('prepared');
  });

  it('retains retry identity across uncertain and authorization stages', () => {
    const operation = createOperation();
    for (const stage of ['uncertain', 'auth_required'] as const) {
      expect(
        parseCaptureOperation({ ...operation, stage }, now + 500)?.payload,
      ).toEqual(operation.payload);
    }
  });

  it('does not treat a second intentional capture as replay', () => {
    const original = createOperation();
    const another = createOperation('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(another.payload.url).toBe(original.payload.url);
    expect(another.id).not.toBe(original.id);
  });

  it('rejects mismatched identifiers without silently changing the payload', () => {
    const operation = createOperation();
    expect(
      parseCaptureOperation({ ...operation, id: 'different-key-123456' }, now),
    ).toBeNull();
  });

  it('expires drafts at exactly seven days, and rejects future/corrupt timestamps', () => {
    const operation = createOperation();
    expect(
      parseCaptureOperation(operation, now + RECOVERY_TTL_MS - 1),
    ).not.toBeNull();
    expect(parseCaptureOperation(operation, now + RECOVERY_TTL_MS)).toBeNull();
    expect(
      parseCaptureOperation({ ...operation, createdAt: 'nonsense' }, now),
    ).toBeNull();
    expect(
      parseCaptureOperation(
        { ...operation, createdAt: new Date(now + 120000).toISOString() },
        now,
      ),
    ).toBeNull();
  });

  it('does not restore obsolete versions or unrecognized operation stages', () => {
    const operation = createOperation();
    expect(parseCaptureOperation({ ...operation, version: 3 }, now)).toBeNull();
    expect(
      parseCaptureOperation({ ...operation, stage: 'complete' }, now),
    ).toBeNull();
  });

  it('drops unapproved stored fields such as credentials', () => {
    const operation = createOperation();
    const restored = parseCaptureOperation(
      {
        ...operation,
        token: 'NEVER_STORE',
        payload: { ...operation.payload, admin_token: 'NEVER_SEND' },
      },
      now,
    );
    expect(restored).not.toHaveProperty('token');
    expect(restored?.payload).not.toHaveProperty('admin_token');
  });

  it('rejects corrupted source and oversized payloads', () => {
    const operation = createOperation();
    expect(
      parseCaptureOperation(
        {
          ...operation,
          payload: { ...operation.payload, url: 'javascript:alert(1)' },
        },
        now,
      ),
    ).toBeNull();
    expect(
      parseCaptureOperation(
        {
          ...operation,
          payload: { ...operation.payload, url: 'x'.repeat(3000) },
        },
        now,
      ),
    ).toBeNull();
  });

  it('allows three independent pending operations and rejects a fourth', () => {
    const entries = ['a', 'b', 'c'].map((x) => createOperation(x.repeat(36)));
    expect(() =>
      ensureRecoveryBudget(entries.slice(0, 2), entries[2]!),
    ).not.toThrow();
    expect(() =>
      ensureRecoveryBudget(entries, createOperation('d'.repeat(36))),
    ).toThrow('three');
    expect(() => ensureRecoveryBudget(entries, entries[0]!)).not.toThrow();
  });

  it('rejects browser content beyond the total byte budget', () => {
    const operation = createOperation();
    const huge = {
      ...operation,
      payload: {
        ...operation.payload,
        user_reason: 'x'.repeat(RECOVERY_MAX_BYTES),
      },
    };
    expect(() => ensureRecoveryBudget([], huge)).toThrow('storage is full');
  });

  it('requires verifiable file metadata, not just an untrusted filename', () => {
    const operation = createOperation();
    expect(
      parseCaptureOperation(
        {
          ...operation,
          attachment: { name: 'x.pdf', byteLength: 9, sha256: 'bad' },
        },
        now,
      ),
    ).toBeNull();
    expect(
      parseCaptureOperation(
        {
          ...operation,
          attachment: { name: 'x.pdf', byteLength: 9, sha256: 'a'.repeat(64) },
        },
        now,
      )?.attachment?.byteLength,
    ).toBe(9);
  });
});
