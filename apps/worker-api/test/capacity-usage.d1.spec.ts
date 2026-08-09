import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { AiCapacityService } from '../src/jobs/ai/capacity.service';

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
    const capacity = new AiCapacityService(env as unknown as Env, env.DB);
    await capacity.admit(
      'openrouter',
      'enrich',
      'openrouter/free',
      'safe usage fixture',
      1,
      new Date('2026-08-09T20:15:00.000Z'),
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
        windows: Array<{
          provider: string;
          scope_key: string;
          dimensions: Array<{ dimension: string; used: number }>;
        }>;
        circuit_breakers: Array<{ provider: string; operation: string }>;
      };
    };
    expect(body.data.policy_version).toBe('2026-08-09.1');
    expect(body.data.warning_thresholds).toEqual({
      warning_70: 0.7,
      warning_90: 0.9,
      hard: 1,
    });
    expect(body.data.windows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'openrouter',
          scope_key: 'free-model-account-pool',
        }),
      ]),
    );
    expect(body.data.circuit_breakers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'openrouter', operation: 'enrich' }),
      ]),
    );

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('test-admin-token');
    expect(serialized).not.toContain('safe usage fixture');
    expect(serialized).not.toContain('OPENROUTER_API_KEY');
  });
});
