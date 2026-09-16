import { applyD1Migrations, env } from 'cloudflare:test';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { AiCapacityService } from '../src/jobs/ai/capacity.service';

interface UsageWindow {
  provider: string;
  scope_key: string;
  window_kind: string;
  window_start: string;
  window_end: string;
  dimensions: Array<{ dimension: string; used: number }>;
}

describe('OPE-227 usage API', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM ai_capacity_reservations'),
      env.DB.prepare('DELETE FROM ai_capacity_windows'),
      env.DB.prepare('DELETE FROM ai_circuit_breakers'),
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects unauthenticated and capture-scoped callers', async () => {
    const app = createApp();
    const anonymous = await app.request('/api/v1/usage', {}, env);
    expect(anonymous.status).toBe(403);

    const capture = await app.request(
      '/api/v1/usage',
      { headers: { Authorization: 'Bearer test-capture-token' } },
      env,
    );
    expect(capture.status).toBe(403);
  });

  it('returns safe quota and breaker metadata to the admin only', async () => {
    const now = new Date('2026-08-09T20:15:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const capacity = new AiCapacityService(env as unknown as Env, env.DB);
    await capacity.admit(
      'openrouter',
      'enrich',
      'openrouter/free',
      'safe usage fixture',
      1,
      now,
    );

    const response = await createApp().request(
      '/api/v1/usage',
      { headers: { Authorization: 'Bearer test-admin-token' } },
      env,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: {
        policy_version: string;
        warning_thresholds: Record<string, number>;
        windows: UsageWindow[];
        circuit_breakers: Array<{ provider: string; operation: string }>;
      };
    };
    expect(body.data.policy_version).toBe('2026-08-09.1');
    expect(body.data.warning_thresholds).toEqual({
      warning_70: 0.7,
      warning_90: 0.9,
      hard: 1,
    });
    expect(body.data.windows).toHaveLength(2);
    expect(body.data.windows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'openrouter',
          scope_key: 'free-model-account-pool',
          window_kind: 'minute',
          window_start: '2026-08-09T20:15:00.000Z',
          window_end: '2026-08-09T20:16:00.000Z',
          dimensions: expect.arrayContaining([
            expect.objectContaining({ dimension: 'requests', used: 1 }),
          ]),
        }),
        expect.objectContaining({
          provider: 'openrouter',
          scope_key: 'free-model-account-pool',
          window_kind: 'day',
          window_start: '2026-08-09T00:00:00.000Z',
          window_end: '2026-08-10T00:00:00.000Z',
          dimensions: expect.arrayContaining([
            expect.objectContaining({ dimension: 'requests', used: 1 }),
          ]),
        }),
      ]),
    );
    expect(body.data.circuit_breakers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'openrouter',
          operation: 'enrich',
        }),
      ]),
    );

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('test-admin-token');
    expect(serialized).not.toContain('safe usage fixture');
    expect(serialized).not.toContain('OPENROUTER_API_KEY');
  });

  it('expires the minute window exactly at its end while the daily window stays active', async () => {
    vi.useFakeTimers();
    const reservationTime = new Date('2026-08-09T20:15:00.000Z');
    vi.setSystemTime(reservationTime);

    const capacity = new AiCapacityService(env as unknown as Env, env.DB);
    await capacity.admit(
      'openrouter',
      'enrich',
      'openrouter/free',
      'expiry boundary fixture',
      1,
      reservationTime,
    );

    const app = createApp();
    const windowsAt = async (instant: string): Promise<UsageWindow[]> => {
      vi.setSystemTime(new Date(instant));
      const response = await app.request(
        '/api/v1/usage',
        { headers: { Authorization: 'Bearer test-admin-token' } },
        env,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: { windows: UsageWindow[] };
      };
      return body.data.windows.filter(
        (window) => window.provider === 'openrouter',
      );
    };

    const beforeExpiry = await windowsAt('2026-08-09T20:15:59.999Z');
    expect(beforeExpiry.map((window) => window.window_kind)).toEqual([
      'minute',
      'day',
    ]);

    const atExpiry = await windowsAt('2026-08-09T20:16:00.000Z');
    expect(atExpiry.map((window) => window.window_kind)).toEqual(['day']);
    expect(atExpiry[0]?.window_end).toBe('2026-08-10T00:00:00.000Z');

    const afterExpiry = await windowsAt('2026-08-09T20:16:00.001Z');
    expect(afterExpiry.map((window) => window.window_kind)).toEqual(['day']);

    const nextReservationTime = new Date('2026-08-09T20:16:00.001Z');
    await capacity.admit(
      'openrouter',
      'enrich',
      'openrouter/free',
      'next minute fixture',
      1,
      nextReservationTime,
    );

    const nextMinute = await windowsAt(nextReservationTime.toISOString());
    expect(nextMinute.map((window) => window.window_kind)).toEqual([
      'minute',
      'day',
    ]);
    expect(
      nextMinute.find((window) => window.window_kind === 'minute'),
    ).toEqual(
      expect.objectContaining({
        window_start: '2026-08-09T20:16:00.000Z',
        window_end: '2026-08-09T20:17:00.000Z',
        dimensions: expect.arrayContaining([
          expect.objectContaining({ dimension: 'requests', used: 1 }),
        ]),
      }),
    );
    expect(nextMinute.find((window) => window.window_kind === 'day')).toEqual(
      expect.objectContaining({
        window_start: '2026-08-09T00:00:00.000Z',
        window_end: '2026-08-10T00:00:00.000Z',
        dimensions: expect.arrayContaining([
          expect.objectContaining({ dimension: 'requests', used: 2 }),
        ]),
      }),
    );

    const historicalMinuteWindows = await env.DB.prepare(
      `SELECT window_start, window_end, request_reserved
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'
       ORDER BY window_start`,
    ).all<{
      window_start: string;
      window_end: string;
      request_reserved: number;
    }>();
    expect(historicalMinuteWindows.results).toEqual([
      {
        window_start: '2026-08-09T20:15:00.000Z',
        window_end: '2026-08-09T20:16:00.000Z',
        request_reserved: 1,
      },
      {
        window_start: '2026-08-09T20:16:00.000Z',
        window_end: '2026-08-09T20:17:00.000Z',
        request_reserved: 1,
      },
    ]);
  });
});
