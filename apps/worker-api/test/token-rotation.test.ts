import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { credentialSchedule, SESSION_LIFETIME_MS } from '../src/shared/auth';

const T0 = Date.parse('2026-10-14T20:00:00Z');
const bindings = {
  CAPTURE_TOKEN: 'dummy-capture-old-secret',
  ADMIN_TOKEN: 'dummy-admin-old-secret',
  LOCAL_WORKER_TOKEN: 'dummy-worker-old-secret',
} as Env;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bounded credential schedules', () => {
  it('keeps one current key for legacy deployment configuration', () => {
    const schedule = credentialSchedule(bindings, 'CAPTURE', T0);
    expect(schedule.keys).toEqual([
      { id: 'current', secret: bindings.CAPTURE_TOKEN, eligible: true },
    ]);
    expect(schedule.issuance?.id).toBe('current');
    expect(SESSION_LIFETIME_MS).toBe(86_400_000);
  });
});
