import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PurgeRepository } from '../src/recovery/purge.repository';

describe('OPE-228 purge step leases', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM purge_steps'),
      env.DB.prepare('DELETE FROM purge_receipts'),
      env.DB.prepare('DELETE FROM purge_workflows'),
    ]);
  });

  it('admits one healthy owner and lets a later worker reclaim only after expiry', async () => {
    const repository = new PurgeRepository(env.DB);
    const workflowId = 'ope228-purge-lease-workflow';
    const createdAt = new Date('2026-08-10T08:00:00.000Z');
    await repository.createConfirmation(
      workflowId,
      'ope228-purge-lease-item',
      1,
      'confirmation-digest',
      '2026-08-10T08:15:00.000Z',
      createdAt,
    );

    const first = await repository.claimStep(
      workflowId,
      'freeze_jobs',
      'worker-a',
      createdAt,
      5,
    );
    expect(first).toMatchObject({
      state: 'processing',
      attempts: 1,
      leaseOwner: 'worker-a',
      leaseExpiresAt: '2026-08-10T08:05:00.000Z',
    });

    await expect(
      repository.claimStep(
        workflowId,
        'freeze_jobs',
        'worker-b',
        new Date('2026-08-10T08:04:59.999Z'),
        5,
      ),
    ).resolves.toBeNull();

    const reclaimed = await repository.claimStep(
      workflowId,
      'freeze_jobs',
      'worker-b',
      new Date('2026-08-10T08:05:00.000Z'),
      5,
    );
    expect(reclaimed).toMatchObject({
      state: 'processing',
      attempts: 2,
      leaseOwner: 'worker-b',
      leaseExpiresAt: '2026-08-10T08:10:00.000Z',
    });

    expect(
      await repository.completeStep(
        workflowId,
        'freeze_jobs',
        'worker-a',
        new Date('2026-08-10T08:05:01.000Z'),
      ),
    ).toBe(false);
    expect(
      await repository.completeStep(
        workflowId,
        'freeze_jobs',
        'worker-b',
        new Date('2026-08-10T08:05:01.000Z'),
      ),
    ).toBe(true);
  });
});
