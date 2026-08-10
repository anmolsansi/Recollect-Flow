import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PurgeRepository } from '../src/recovery/purge.repository';
import { PurgeService } from '../src/recovery/purge.service';

const ITEM_ID = 'ope228-purge-confirmation-item';

async function reset(softDeleted = true): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const now = '2026-08-10T00:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, lifecycle_status, edit_version, deleted_at,
       captured_at, created_at, updated_at
     ) VALUES (?1, 'ope228-purge-confirmation-key', 'text', 'test', 'public',
               'complete', ?2, 3, ?3, ?4, ?4, ?4)`,
  )
    .bind(
      ITEM_ID,
      softDeleted ? 'Deleted' : 'Inbox',
      softDeleted ? now : null,
      now,
    )
    .run();
}

describe('OPE-228 purge confirmation contract', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(() => reset(true));

  it('requires the canonical item to be soft deleted first', async () => {
    await reset(false);
    await expect(
      new PurgeService(env.DB).requestPurge(ITEM_ID, 3),
    ).rejects.toMatchObject({ code: 'PURGE_REQUIRES_SOFT_DELETE' });
  });

  it('binds a separate confirmation phrase to the item version and workflow', async () => {
    const now = new Date('2026-08-10T00:00:00.000Z');
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(ITEM_ID, 3, now);

    expect(request.confirmationPhrase).toBe(
      `PURGE ${ITEM_ID} ${request.workflowId}`,
    );
    expect(request.confirmationExpiresAt).toBe('2026-08-10T00:15:00.000Z');

    await service.confirmPurge(
      request.workflowId,
      request.confirmationPhrase,
      new Date('2026-08-10T00:01:00.000Z'),
    );
    expect(
      (await new PurgeRepository(env.DB).findWorkflow(request.workflowId))
        ?.state,
    ).toBe('queued');
  });

  it('rejects a mismatched phrase without queueing destructive work', async () => {
    const now = new Date('2026-08-10T00:00:00.000Z');
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(ITEM_ID, 3, now);

    await expect(
      service.confirmPurge(
        request.workflowId,
        'PURGE something-else',
        new Date('2026-08-10T00:01:00.000Z'),
      ),
    ).rejects.toMatchObject({ code: 'PURGE_CONFIRMATION_MISMATCH' });
    expect(
      (await new PurgeRepository(env.DB).findWorkflow(request.workflowId))
        ?.state,
    ).toBe('confirmation_pending');
  });

  it('expires a confirmation instead of accepting a delayed replay', async () => {
    const now = new Date('2026-08-10T00:00:00.000Z');
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(ITEM_ID, 3, now);

    await expect(
      service.confirmPurge(
        request.workflowId,
        request.confirmationPhrase,
        new Date('2026-08-10T00:15:00.001Z'),
      ),
    ).rejects.toMatchObject({ code: 'PURGE_CONFIRMATION_EXPIRED' });
    expect(
      (await new PurgeRepository(env.DB).findWorkflow(request.workflowId))
        ?.state,
    ).toBe('cancelled');
  });

  it('rejects confirmation when the item version changed after the request', async () => {
    const now = new Date('2026-08-10T00:00:00.000Z');
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(ITEM_ID, 3, now);
    await env.DB.prepare('UPDATE items SET edit_version = 4 WHERE id = ?1')
      .bind(ITEM_ID)
      .run();

    await expect(
      service.confirmPurge(
        request.workflowId,
        request.confirmationPhrase,
        new Date('2026-08-10T00:01:00.000Z'),
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
});
