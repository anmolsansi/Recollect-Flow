import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBg29StagingNotionHarness } from '../src/sync/bg29-staging-notion';
import { provisionBg29StagingNotionSchema } from '../src/sync/bg29-staging-durable-notion';

const ID = 'bg29-078-url-01';
const T0 = new Date('2026-10-18T02:17:37.889Z');

describe('BG-29 Notion projection changed while active sync is processing', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    await provisionBg29StagingNotionSchema(env.DB);
  });
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM bg29_mock_notion_requests'),
      env.DB.prepare('DELETE FROM bg29_mock_notion_pages'),
      env.DB.prepare('DELETE FROM bg29_mock_failure_injections'),
      env.DB.prepare('DELETE FROM audit_events'),
      env.DB.prepare('DELETE FROM sync_attempts'),
      env.DB.prepare('DELETE FROM processing_jobs'),
      env.DB.prepare('DELETE FROM capture_events'),
      env.DB.prepare('DELETE FROM item_deduplication_keys'),
      env.DB.prepare('DELETE FROM items'),
    ]);
  });

  it('requeues a newer version without overwriting a stale projection hash or duplicating pages', async () => {
    await env.DB.prepare(
      "INSERT INTO items (id, idempotency_key, source_type, source_app, privacy_level, processing_status, lifecycle_status, captured_at, created_at, updated_at, raw_text) VALUES (?1, 'bg29-inflight-test', 'url', 'BG29 race', 'public', 'pending', 'Inbox', ?2, ?2, ?2, 'immutable original')",
    )
      .bind(ID, T0.toISOString())
      .run();
    await env.DB.prepare(
      "INSERT INTO sync_attempts (id, item_id, destination, status, attempts, available_at, created_at, updated_at) VALUES ('bg29-inflight-first', ?1, 'notion', 'pending', 0, ?2, ?2, ?2)",
    )
      .bind(ID, T0.toISOString())
      .run();

    const mock = createBg29StagingNotionHarness({ db: env.DB });
    let injected = false;
    const fetcher: typeof fetch = async (input, init) => {
      if (
        !injected &&
        typeof input === 'string' &&
        input === 'https://api.notion.com/v1/pages' &&
        init?.method === 'POST'
      ) {
        injected = true;
        await env.DB.prepare(
          "UPDATE items SET summary = 'enriched after sync began', updated_at = ?1 WHERE id = ?2",
        )
          .bind(new Date(T0.getTime() + 500).toISOString(), ID)
          .run();
      }
      return mock.fetcher(input, init);
    };
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('BG29_UNAUTHORIZED_EXTERNAL_CALL'));
    try {
      // Real worker emits version 1 while the update trigger advances D1 to 2.
      const { processNotionSyncJobs } = await import('../src/sync/sync.worker');
      await processNotionSyncJobs(
        env.DB,
        'bg29-078-offline-only-token',
        'bg29-078-offline-database',
        {
          fetcher,
          now: () => new Date(T0.getTime() + 1_000),
          batchSize: 1,
        },
      );
      expect(injected).toBe(true);
      const afterFirst = await env.DB.prepare(
        'SELECT projection_version, projection_hash, notion_page_id, raw_text FROM items WHERE id = ?1',
      )
        .bind(ID)
        .first<{
          projection_version: number;
          projection_hash: string | null;
          notion_page_id: string;
          raw_text: string;
        }>();
      expect(afterFirst).toMatchObject({
        projection_version: 2,
        projection_hash: null,
        notion_page_id: `bg29-mock-page-${ID}`,
        raw_text: 'immutable original',
      });
      const active = await env.DB.prepare(
        'SELECT status, COUNT(*) AS total FROM sync_attempts WHERE item_id = ?1 GROUP BY status ORDER BY status',
      )
        .bind(ID)
        .all<{ status: string; total: number }>();
      expect(active.results).toEqual([
        { status: 'complete', total: 1 },
        { status: 'pending', total: 1 },
      ]);
      const freshMock = createBg29StagingNotionHarness({ db: env.DB });
      await freshMock.run(env.DB, {
        now: () => new Date(T0.getTime() + 2_000),
        batchSize: 1,
      });
      const updated = await env.DB.prepare(
        'SELECT projection_version, projection_hash, raw_text FROM items WHERE id = ?1',
      )
        .bind(ID)
        .first<{
          projection_version: number;
          projection_hash: string;
          raw_text: string;
        }>();
      const durable = await freshMock.pagesAsync();
      expect(durable).toHaveLength(1);
      expect(durable[0]).toMatchObject({
        captureId: ID,
        createCount: 1,
        updateCount: 1,
        projectionVersion: updated?.projection_version,
        projectionHash: updated?.projection_hash,
      });
      expect(updated?.raw_text).toBe('immutable original');
      const queue = await env.DB.prepare(
        'SELECT status, COUNT(*) AS total FROM sync_attempts WHERE item_id = ?1 GROUP BY status',
      )
        .bind(ID)
        .all<{ status: string; total: number }>();
      expect(queue.results).toEqual([{ status: 'complete', total: 2 }]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  }, 120_000);
});
