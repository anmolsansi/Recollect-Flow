import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { PurgeRepository } from '../src/recovery/purge.repository';
import { PurgeService } from '../src/recovery/purge.service';
import { processPurgeWorkflow } from '../src/recovery/purge.worker';

const ITEM_ID = 'ope228-partial-notion-item';

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
  const now = '2026-08-10T02:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, lifecycle_status, edit_version, deleted_at,
       notion_page_id, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'ope228-partial-notion-key', 'text', 'test', 'public',
               'complete', 'Deleted', 7, ?2, 'notion-page-228', ?2, ?2, ?2,
               'must remain while Notion is unavailable')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-228 partial purge recovery', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('stops before D1 deletion and persists a retryable partial state', async () => {
    const service = new PurgeService(env.DB);
    const request = await service.requestPurge(
      ITEM_ID,
      7,
      new Date('2026-08-10T02:00:00.000Z'),
    );
    await service.confirmPurge(
      request.workflowId,
      request.confirmationPhrase,
      new Date('2026-08-10T02:01:00.000Z'),
    );

    const unavailableNotion = (async () =>
      new Response('unavailable', { status: 503 })) as typeof fetch;
    await processPurgeWorkflow(env as unknown as Env, request.workflowId, {
      now: () => new Date('2026-08-10T02:02:00.000Z'),
      fetcher: unavailableNotion,
    });

    const repository = new PurgeRepository(env.DB);
    const workflow = await repository.findWorkflow(request.workflowId);
    expect(workflow?.state).toBe('partial');
    expect(workflow?.lastErrorCode).toBe('NOTION_PURGE_PROVIDER_UNAVAILABLE');

    const steps = await repository.listSteps(request.workflowId);
    expect(steps.find((step) => step.kind === 'freeze_jobs')?.state).toBe(
      'complete',
    );
    expect(
      steps.find((step) => step.kind === 'delete_r2_attachments')?.state,
    ).toBe('complete');
    expect(
      steps.find((step) => step.kind === 'archive_notion_projection')?.state,
    ).toBe('failed');
    expect(
      steps.find((step) => step.kind === 'delete_d1_item_data')?.state,
    ).toBe('pending');

    const item = await env.DB.prepare(
      'SELECT id, raw_text, deleted_at FROM items WHERE id = ?1',
    )
      .bind(ITEM_ID)
      .first<{ id: string; raw_text: string; deleted_at: string | null }>();
    expect(item).toMatchObject({
      id: ITEM_ID,
      raw_text: 'must remain while Notion is unavailable',
    });
    expect(item?.deleted_at).toBeTruthy();
    expect(await repository.hasReceipt(ITEM_ID)).toBe(false);
  });
});
