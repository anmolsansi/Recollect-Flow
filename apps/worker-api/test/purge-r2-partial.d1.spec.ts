import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { PurgeRepository } from '../src/recovery/purge.repository';
import { PurgeService } from '../src/recovery/purge.service';
import { processPurgeWorkflow } from '../src/recovery/purge.worker';

const ITEM_ID = 'ope228-partial-r2-item';
const ATTACHMENT_ID = 'ope228-partial-r2-attachment';
const OBJECT_KEY = 'attachments/ope228-partial-r2-object';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM item_feedback_events'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  await env.ATTACHMENTS.delete(OBJECT_KEY);
  const now = '2026-08-10T02:30:00.000Z';
  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, lifecycle_status, edit_version, deleted_at,
           captured_at, created_at, updated_at, raw_text
         ) VALUES (?1, 'ope228-partial-r2-key', 'file', 'test', 'public',
                   'complete', 'Deleted', 4, ?2, ?2, ?2, ?2,
                   'canonical data must remain when R2 delete fails')`,
      )
      .bind(ITEM_ID, now),
    env.DB
      .prepare(
        `INSERT INTO attachments (
           id, item_id, object_key, status, file_name,
           declared_content_type, size_bytes, expires_at,
           linked_at, created_at, updated_at
         ) VALUES (?1, ?2, ?3, 'linked', 'proof.txt',
                   'text/plain', 13, '2026-09-10T00:00:00.000Z', ?4, ?4, ?4)`,
      )
      .bind(ATTACHMENT_ID, ITEM_ID, OBJECT_KEY, now),
  ]);
  await env.ATTACHMENTS.put(OBJECT_KEY, 'private bytes');
}

describe('OPE-228 R2 partial purge recovery', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('persists a retryable partial state before canonical D1 deletion', async () => {
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(
      ITEM_ID,
      4,
      new Date('2026-08-10T02:30:00.000Z'),
    );
    await service.confirmPurge(
      request.workflowId,
      request.confirmationPhrase,
      new Date('2026-08-10T02:31:00.000Z'),
    );

    const failingBucket = {
      delete: async () => {
        throw new Error('synthetic R2 delete failure');
      },
    } as unknown as R2Bucket;
    const runtimeEnv = {
      ...(env as unknown as Record<string, unknown>),
      ATTACHMENTS: failingBucket,
    } as unknown as Env;

    await processPurgeWorkflow(runtimeEnv, request.workflowId, {
      now: () => new Date('2026-08-10T02:32:00.000Z'),
    });

    const repository = new PurgeRepository(env.DB);
    const workflow = await repository.findWorkflow(request.workflowId);
    expect(workflow?.state).toBe('partial');
    expect(workflow?.lastErrorCode).toBe('PURGE_STEP_FAILED');

    const steps = await repository.listSteps(request.workflowId);
    expect(steps.find((step) => step.kind === 'freeze_jobs')?.state).toBe(
      'complete',
    );
    expect(
      steps.find((step) => step.kind === 'delete_r2_attachments')?.state,
    ).toBe('failed');
    expect(
      steps.find((step) => step.kind === 'archive_notion_projection')?.state,
    ).toBe('pending');
    expect(steps.find((step) => step.kind === 'delete_d1_item_data')?.state).toBe(
      'pending',
    );

    expect(
      await env.DB.prepare('SELECT raw_text FROM items WHERE id = ?1')
        .bind(ITEM_ID)
        .first<{ raw_text: string }>(),
    ).toEqual({ raw_text: 'canonical data must remain when R2 delete fails' });
    expect(
      await env.DB.prepare('SELECT status FROM attachments WHERE id = ?1')
        .bind(ATTACHMENT_ID)
        .first<{ status: string }>(),
    ).toEqual({ status: 'linked' });
    expect(await repository.hasReceipt(ITEM_ID)).toBe(false);
    expect(await env.ATTACHMENTS.get(OBJECT_KEY)).not.toBeNull();
  });
});
