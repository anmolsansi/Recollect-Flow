import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { credentialSchedule, SESSION_LIFETIME_MS } from '../src/shared/auth';

const T0 = Date.parse('2026-10-14T20:00:00Z');
const bindings = {
  CAPTURE_TOKEN: 'dummy-capture-old-secret',
  ADMIN_TOKEN: 'dummy-admin-old-secret',
  LOCAL_WORKER_TOKEN: 'dummy-worker-old-secret',
} as Env;

function rotating(overrides = {}) {
  return {
    ...bindings,
    CAPTURE_TOKEN_ID: 'capture-old',
    CAPTURE_TOKEN_NEXT: 'dummy-capture-next-secret',
    CAPTURE_TOKEN_ROTATION: JSON.stringify({
      next_id: 'capture-next',
      activate_at: new Date(T0).toISOString(),
      expires_at: new Date(T0 + SESSION_LIFETIME_MS).toISOString(),
      actor: 'test-operator',
      ...overrides,
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bounded credential schedules', () => {
  it('defaults to 24h and rejects a window longer than 72h', () => {
    expect(
      credentialSchedule(rotating({ expires_at: undefined }), 'CAPTURE', T0)
        .rotation?.expiresAt,
    ).toBe(T0 + SESSION_LIFETIME_MS);
    expect(() =>
      credentialSchedule(
        rotating({
          expires_at: new Date(T0 + 3 * SESSION_LIFETIME_MS + 1).toISOString(),
        }),
        'CAPTURE',
        T0,
      ),
    ).toThrow('Credential configuration is invalid.');
  });
  it('keeps one current key for legacy deployment configuration', () => {
    const schedule = credentialSchedule(bindings, 'CAPTURE', T0);
    expect(schedule.keys).toEqual([
      { id: 'current', secret: bindings.CAPTURE_TOKEN, eligible: true },
    ]);
    expect(schedule.issuance?.id).toBe('current');
    expect(SESSION_LIFETIME_MS).toBe(86_400_000);
  });
  it('activates next and retires current at exact request-time boundaries', () => {
    expect(
      credentialSchedule(rotating(), 'CAPTURE', T0 - 1).keys.map(
        (k) => k.eligible,
      ),
    ).toEqual([true, false]);
    expect(
      credentialSchedule(rotating(), 'CAPTURE', T0).keys.map((k) => k.eligible),
    ).toEqual([true, true]);
    expect(
      credentialSchedule(
        rotating(),
        'CAPTURE',
        T0 + SESSION_LIFETIME_MS,
      ).keys.map((k) => k.eligible),
    ).toEqual([false, true]);
  });
});
