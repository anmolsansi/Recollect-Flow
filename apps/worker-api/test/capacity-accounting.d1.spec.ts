import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { AiCapacityService } from '../src/jobs/ai/capacity.service';

async function resetCapacityState(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ai_capacity_reservations'),
    env.DB.prepare('DELETE FROM ai_capacity_windows'),
    env.DB.prepare('DELETE FROM ai_circuit_breakers'),
  ]);
}

describe('OPE-227 capacity accounting idempotence', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetCapacityState);

  it('does not double-consume quota when success reconciliation is repeated', async () => {
    const capacity = new AiCapacityService(env as unknown as Env, env.DB);
    const now = new Date('2026-08-09T21:00:00.000Z');
    const admission = await capacity.admit(
      'openrouter',
      'enrich',
      'openrouter/free',
      'idempotent reconciliation',
      2,
      now,
    );

    await capacity.completeSuccess(
      admission,
      { requests: 1, inputUnits: 10, outputUnits: 5 },
      now,
    );
    await capacity.completeSuccess(
      admission,
      { requests: 1, inputUnits: 10, outputUnits: 5 },
      now,
    );

    const minute = await env.DB.prepare(
      `SELECT request_reserved, request_consumed
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'`,
    ).first<{ request_reserved: number; request_consumed: number }>();
    expect(minute).toEqual({ request_reserved: 0, request_consumed: 1 });
  });

  it('repeated release leaves reservation capacity at zero', async () => {
    const capacity = new AiCapacityService(env as unknown as Env, env.DB);
    const now = new Date('2026-08-09T21:15:00.000Z');
    const admission = await capacity.admit(
      'openrouter',
      'vision_extract',
      'openrouter/free',
      'idempotent release',
      1,
      now,
    );

    expect(await capacity.release(admission.reservation.id, now)).toBe(true);
    expect(await capacity.release(admission.reservation.id, now)).toBe(false);

    const minute = await env.DB.prepare(
      `SELECT request_reserved, request_consumed
       FROM ai_capacity_windows
       WHERE provider = 'openrouter' AND window_kind = 'minute'`,
    ).first<{ request_reserved: number; request_consumed: number }>();
    expect(minute).toEqual({ request_reserved: 0, request_consumed: 0 });
  });
});
