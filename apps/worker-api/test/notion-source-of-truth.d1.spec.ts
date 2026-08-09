import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { IntegrityService } from '../src/recovery/integrity.service';

const ITEM_ID = 'ope228-notion-source-truth-item';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM integrity_findings'),
    env.DB.prepare('DELETE FROM integrity_runs'),
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const now = '2026-08-10T10:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, lifecycle_status, notion_page_id,
       captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'ope228-notion-source-key', 'text', 'test', 'public',
               'complete', 'Inbox', 'deleted-notion-page', ?2, ?2, ?2,
               'D1 remains canonical')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-228 source-of-truth deletion policy', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('reports a missing Notion projection without creating purge authority', async () => {
    const missingNotion = (async () =>
      new Response('missing', { status: 404 })) as typeof fetch;
    const result = await new IntegrityService(
      env.DB,
      env.ATTACHMENTS,
      'test-notion-token',
      {
        now: () => new Date('2026-08-10T10:05:00.000Z'),
        fetcher: missingNotion,
      },
    ).run();

    expect(result.findings.map((finding) => finding.finding_type)).toContain(
      'notion_projection_missing',
    );
    expect(
      await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM purge_workflows WHERE item_id = ?1',
      )
        .bind(ITEM_ID)
        .first<{ count: number }>(),
    ).toEqual({ count: 0 });
    expect(
      await env.DB.prepare(
        'SELECT raw_text, deleted_at FROM items WHERE id = ?1',
      )
        .bind(ITEM_ID)
        .first<{ raw_text: string; deleted_at: string | null }>(),
    ).toEqual({ raw_text: 'D1 remains canonical', deleted_at: null });
  });
});
