import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { ExportService } from '../src/recovery/export.service';
import { PurgeService } from '../src/recovery/purge.service';
import { processPurgeWorkflow } from '../src/recovery/purge.worker';
import { RestoreService } from '../src/recovery/restore.service';

const ITEM_ID = 'ope228-prepurge-backup-item';

async function clearCanonicalAndRecovery(keepReceiptObjects = false): Promise<void> {
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
  if (!keepReceiptObjects) {
    const objects = await env.ATTACHMENTS.list({ prefix: 'purge-receipts/v1/' });
    if (objects.objects.length) {
      await env.ATTACHMENTS.delete(objects.objects.map((object) => object.key));
    }
  }
}

describe('OPE-228 purge-aware restore', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await clearCanonicalAndRecovery(false);
    const now = '2026-08-10T04:00:00.000Z';
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, lifecycle_status, edit_version,
         captured_at, created_at, updated_at, raw_text
       ) VALUES (?1, 'ope228-prepurge-key', 'text', 'test', 'public',
                 'complete', 'Inbox', 1, ?2, ?2, ?2,
                 'this content must not come back after purge')`,
    )
      .bind(ITEM_ID, now)
      .run();
  });

  it('applies a newer R2 purge receipt before inserting old backup items', async () => {
    const oldExport = await new ExportService(
      env.DB,
      () => new Date('2026-08-10T04:01:00.000Z'),
    ).buildJson();

    await env.DB.prepare(
      `UPDATE items
       SET lifecycle_status = 'Deleted', deleted_at = ?1, edit_version = 2,
           updated_at = ?1
       WHERE id = ?2`,
    )
      .bind('2026-08-10T04:02:00.000Z', ITEM_ID)
      .run();
    const purge = new PurgeService(env.DB);
    const request = await purge.requestPurge(
      ITEM_ID,
      2,
      new Date('2026-08-10T04:02:00.000Z'),
    );
    await purge.confirmPurge(
      request.workflowId,
      request.confirmationPhrase,
      new Date('2026-08-10T04:03:00.000Z'),
    );
    await processPurgeWorkflow(env as unknown as Env, request.workflowId, {
      now: () => new Date('2026-08-10T04:04:00.000Z'),
    });

    expect(
      await env.ATTACHMENTS.get(
        `purge-receipts/v1/${encodeURIComponent(ITEM_ID)}.json`,
      ),
    ).not.toBeNull();

    await clearCanonicalAndRecovery(true);
    const result = await new RestoreService(
      env.DB,
      env.ATTACHMENTS,
      () => new Date('2026-08-10T04:10:00.000Z'),
    ).restore(oldExport);

    expect(result.run).toMatchObject({
      state: 'complete',
      restoredCount: 0,
      skippedPurgedCount: 1,
    });
    expect(result.skippedPurgedItemIds).toEqual([ITEM_ID]);
    expect(
      await env.DB.prepare('SELECT id FROM items WHERE id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).toBeNull();
    expect(
      await env.DB.prepare('SELECT item_id FROM purge_receipts WHERE item_id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).not.toBeNull();
  });
});
