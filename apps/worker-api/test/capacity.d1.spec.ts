import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { AiCapacityService } from '../src/jobs/ai/capacity.service';
import { AppError } from '../src/shared/errors';

const OPENROUTER_MODEL = 'openrouter/free';

async function resetCapacityState(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ai_capacity_reservations'),
    env.DB.prepare('DELETE FROM ai_capacity_windows'),
    env.DB.prepare('DELETE FROM ai_circuit_breakers'),
  ]);
}

function service(): AiCapacityService {
  return new AiCapacityService(env as unknown as Env, env.DB);
}

describe('OPE-227 D1 quota admission', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetCapacityState);

  it('allows exactly one concurrent worker to consume the final minute unit', async () => {
    const capacity = service();
    const now = new Date('2026-08-09T12:00:10.000Z');
    const existing = [];

    for (let index = 0; index < 19; index += 1) {
      existing.push(
        await capacity.admit(
          'openrouter',
          'enrich',
          OPENROUTER_MODEL,
          `request ${index}`,
          1,
          now,
        ),
      );
    }

    const contenders = await Promise.allSettled([
      capacity.admit(
        'openrouter',
        'enrich',
        OPENROUTER_MODEL,
        'worker-a',
        1,
        now,
      ),
      capacity.admit(
        'openrouter',
        'enrich',
        OPENROUTER_MODEL,
        'worker-b',
        1,
        now,
      ),
    ]);

    expect(contenders.filter((result) => result.status === 'fulfilled')).toHaveLength(
      1,
    );
    const rejected = contenders.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(AppError);
      expect((rejected.reason as AppError).code).toBe('QUOTA_PAUSED');
    }

    const minute = await env.DB.prepare(
      `SELECT request_reserved, request_consumed, request_limit
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'`,
    ).first<{
      request_reserved: number;
      request_consumed: number;
      request_limit: number;
    }>();
    expect(minute).toEqual({
      request_reserved: 20,
      request_consumed: 0,
      request_limit: 20,
    });

    for (const admission of existing) {
      await capacity.release(admission.reservation.id, now);
    }
    const winner = contenders.find((result) => result.status === 'fulfilled');
    if (winner?.status === 'fulfilled') {
      await capacity.release(winner.value.reservation.id, now);
    }
  });

  it('reconciles a two-request reservation to the actual one request used', async () => {
    const capacity = service();
    const now = new Date('2026-08-09T13:00:00.000Z');
    const admission = await capacity.admit(
      'openrouter',
      'enrich',
      OPENROUTER_MODEL,
      'single successful response',
      2,
      now,
    );

    await capacity.completeSuccess(
      admission,
      { requests: 1, inputUnits: 7, outputUnits: 4 },
      now,
    );

    const reservation = await env.DB.prepare(
      `SELECT state, request_units, actual_request_units
       FROM ai_capacity_reservations WHERE id = ?1`,
    )
      .bind(admission.reservation.id)
      .first<{
        state: string;
        request_units: number;
        actual_request_units: number;
      }>();
    expect(reservation).toEqual({
      state: 'reconciled',
      request_units: 2,
      actual_request_units: 1,
    });

    const minute = await env.DB.prepare(
      `SELECT request_reserved, request_consumed
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'`,
    ).first<{ request_reserved: number; request_consumed: number }>();
    expect(minute).toEqual({ request_reserved: 0, request_consumed: 1 });
  });

  it('returns capacity from an abandoned reservation after expiry', async () => {
    const capacity = service();
    const now = new Date('2026-08-09T14:00:00.000Z');
    const admission = await capacity.admit(
      'openrouter',
      'enrich',
      OPENROUTER_MODEL,
      'abandoned request',
      2,
      now,
    );

    expect(
      await capacity.expire(new Date('2026-08-09T14:03:00.000Z')),
    ).toBe(1);

    const reservation = await env.DB.prepare(
      `SELECT state FROM ai_capacity_reservations WHERE id = ?1`,
    )
      .bind(admission.reservation.id)
      .first<{ state: string }>();
    expect(reservation?.state).toBe('expired');

    const minute = await env.DB.prepare(
      `SELECT request_reserved
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'`,
    ).first<{ request_reserved: number }>();
    expect(minute?.request_reserved).toBe(0);
  });

  it('admits work into a fresh minute window exactly after reset', async () => {
    const capacity = service();
    const beforeReset = new Date('2026-08-09T15:00:59.999Z');

    for (let index = 0; index < 20; index += 1) {
      await capacity.admit(
        'openrouter',
        'enrich',
        OPENROUTER_MODEL,
        `minute-boundary-${index}`,
        1,
        beforeReset,
      );
    }

    await expect(
      capacity.admit(
        'openrouter',
        'enrich',
        OPENROUTER_MODEL,
        'blocked-before-reset',
        1,
        beforeReset,
      ),
    ).rejects.toMatchObject({ code: 'QUOTA_PAUSED' });

    await expect(
      capacity.admit(
        'openrouter',
        'enrich',
        OPENROUTER_MODEL,
        'allowed-after-reset',
        1,
        new Date('2026-08-09T15:01:00.000Z'),
      ),
    ).resolves.toBeTruthy();
  });
});
