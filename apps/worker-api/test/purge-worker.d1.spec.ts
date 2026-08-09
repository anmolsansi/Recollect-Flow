import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { PurgeRepository } from '../src/recovery/purge.repository';
import { PurgeService } from '../src/recovery/purge.service';
import { processPurgeWorkflow } from '../src/recovery/purge.worker';

const ITEM_ID = 'ope228-worker-happy-item';
const ATTACHMENT_ID = 'ope228-worker-happy-attachment';
const OBJECT_KEY = 'attachments/ope228-worker-happy-object';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM integrity_findings'),
    env.DB.prepare('DELETE FROM integrity_runs'),
    env.DB.prepare('DELETE FROM restore_runs'),
    env.DB.prepare('DELETE FROM backup_artifacts'),
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

  const now = '2026-08-10T01:00:00.000Z';
  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, lifecycle_status, edit_version, deleted_at,
           captured_at, created_at, updated_at, raw_text, user_note, summary
         ) VALUES (?1, 'ope228-worker-happy-key', 'file', 'test', 'public',
                   'complete', 'Deleted', 2, ?2, ?2, ?2, ?2,
                   'private source to purge', 'owner reason', 'derived summary')`,
      )
      .bind(ITEM_ID, now),
    env.DB
      .prepare(
        `INSERT INTO attachments (
           id, item_id, object_key, status, file_name,
           declared_content_type, size_bytes, expires_at,
           linked_at, created_at, updated_at
         ) VALUES (?1, ?2, ?3, 'linked', 'private.txt',
                   'text/plain', 16, '2026-09-10T00:00:00.000Z', ?4, ?4, ?4)`,
      )
      .bind(ATTACHMENT_ID, ITEM_ID, OBJECT_KEY, now),
  ]);
  await env.ATTACHMENTS.put(OBJECT_KEY, 'private bytes');
}

describe('OPE-228 purge worker', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('removes canonical content and R2 bytes only after explicit confirmation while retaining a receipt', async () => {
    const service = new PurgeService(env.DB);
    const requested = await service.requestPurge(
      ITEM_ID,
      2,
      new Date('2026-08-10T01:00:00.000Z'),
    );
    await service.confirmPurge(
      requested.workflowId,
      requested.confirmationPhrase,
      new Date('2026-08-10T01:01:00.000Z'),
    );

    await processPurgeWorkflow(env as unknown as Env, requested.workflowId, {
      now: () => new Date('2026-08-10T01:02:00.000Z'),
    });

    const repository = new PurgeRepository(env.DB);
    expect((await repository.findWorkflow(requested.workflowId))?.state).toBe(
      'complete',
    );
    expect(
      (await repository.listSteps(requested.workflowId)).map((step) => [
        step.kind,
        step.state,
      ]),
    ).toEqual([
      ['freeze_jobs', 'complete'],
      ['delete_r2_attachments', 'complete'],
      ['archive_notion_projection', 'skipped'],
      ['delete_d1_item_data', 'complete'],
      ['finalize_receipt', 'complete'],
    ]);

    expect(await env.ATTACHMENTS.get(OBJECT_KEY)).toBeNull();
    expect(
      await env.DB
        .prepare('SELECT id FROM attachments WHERE id = ?1')
        .bind(ATTACHMENT_ID)
        .first(),
    ).toBeNull();
    expect(
      await env.DB
        .prepare('SELECT id FROM items WHERE id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).toBeNull();
    expect(await repository.hasReceipt(ITEM_ID, requested.workflowId)).toBe(
      true,
    );

    const receipt = await env.DB
      .prepare(
        `SELECT item_id, purge_workflow_id, receipt_version, purged_at,
                backup_retention_until
         FROM purge_receipts WHERE item_id = ?1`,
      )
      .bind(ITEM_ID)
      .first<Record<string, unknown>>();
    expect(receipt).toMatchObject({
      item_id: ITEM_ID,
      purge_workflow_id: requested.workflowId,
      receipt_version: '2026-08-10.1',
      backup_retention_until: null,
    });
    expect(JSON.stringify(receipt)).not.toContain('private source to purge');
    expect(JSON.stringify(receipt)).not.toContain('owner reason');
    expect(JSON.stringify(receipt)).not.toContain('derived summary');
  });
});
