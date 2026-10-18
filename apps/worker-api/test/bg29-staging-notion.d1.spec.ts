import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BG29_NOTION_CAPTURE_IDS,
  createBg29StagingNotionHarness,
} from '../src/sync/bg29-staging-notion';

const T0 = new Date('2026-10-18T02:17:37.889Z');

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function seed(id: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO items (
      id, idempotency_key, source_type, source_app, privacy_level,
      processing_status, lifecycle_status, captured_at, created_at, updated_at,
      raw_text
    ) VALUES (?1, ?2, 'text', 'BG29 staged mock', 'public',
      'pending', 'Inbox', ?3, ?3, ?3, 'immutable original synthetic body')`,
  )
    .bind(id, `key-${id}`, T0.toISOString())
    .run();
  await env.DB.prepare(
    `INSERT INTO sync_attempts (
      id, item_id, destination, status, attempts, available_at, created_at,
      updated_at
    ) VALUES (?1, ?2, 'notion', 'pending', 0, ?3, ?3, ?3)`,
  )
    .bind(`sync-${id}`, id, T0.toISOString())
    .run();
}

describe('BG-29.078 MC-03 real D1 Notion sync worker with offline mock HTTP', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });
  beforeEach(reset);

  it('honors one 429 retry-after, creates two pages, then updates their post-enrichment projection without duplicates', async () => {
    const first = BG29_NOTION_CAPTURE_IDS[0]!;
    const second = BG29_NOTION_CAPTURE_IDS[1]!;
    await seed(first);
    await seed(second);

    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('LIVE_NOTION_NETWORK_ATTEMPT');
      });
    try {
      const mock = createBg29StagingNotionHarness({ rateLimitOnceFor: first });
      let now = new Date(T0.getTime() + 1_000);
      const options = { now: () => new Date(now), batchSize: 2 };
      await mock.run(env.DB, options);

      const firstAttempt = await env.DB.prepare(
        `SELECT status, attempts, last_error_code, retry_after_at, available_at
         FROM sync_attempts WHERE item_id = ?1 ORDER BY created_at LIMIT 1`,
      )
        .bind(first)
        .first<{
          status: string;
          attempts: number;
          last_error_code: string;
          retry_after_at: string;
          available_at: string;
        }>();
      expect(firstAttempt).toMatchObject({
        status: 'pending',
        attempts: 1,
        last_error_code: 'NOTION_RATE_LIMITED',
      });
      expect(firstAttempt?.available_at).toBe(
        new Date(now.getTime() + 5_000).toISOString(),
      );
      expect(firstAttempt?.retry_after_at).toBe(firstAttempt?.available_at);
      expect(mock.pages()).toHaveLength(1);
      expect(mock.pages()[0]?.captureId).toBe(second);

      // Not eligible before Retry-After, despite another Worker sweep.
      now = new Date(now.getTime() + 4_000);
      await mock.run(env.DB, options);
      expect(mock.pages()).toHaveLength(1);

      now = new Date(now.getTime() + 2_000);
      await mock.run(env.DB, options);
      expect(mock.pages()).toHaveLength(2);

      const originalBefore = await env.DB.prepare(
        `SELECT id, raw_text FROM items WHERE id IN (?1, ?2) ORDER BY id`,
      )
        .bind(first, second)
        .all<{ id: string; raw_text: string }>();
      expect(originalBefore.results).toHaveLength(2);
      expect(
        originalBefore.results.every(
          (item) => item.raw_text === 'immutable original synthetic body',
        ),
      ).toBe(true);

      // The actual D1 update triggers a fresh independently queued Notion
      // projection; worker sends PATCH of machine fields, not a fake success.
      now = new Date(now.getTime() + 1_000);
      await env.DB.prepare(
        `UPDATE items SET summary = 'post-enrichment synthetic summary',
         updated_at = ?1 WHERE id IN (?2, ?3)`,
      )
        .bind(now.toISOString(), first, second)
        .run();

      await mock.run(env.DB, options);
      const projections = await env.DB.prepare(
        `SELECT id, notion_page_id, projection_version, projection_hash,
                notion_last_synced_at, raw_text
         FROM items WHERE id IN (?1, ?2) ORDER BY id`,
      )
        .bind(first, second)
        .all<{
          id: string;
          notion_page_id: string;
          projection_version: number;
          projection_hash: string;
          notion_last_synced_at: string;
          raw_text: string;
        }>();
      expect(projections.results).toHaveLength(2);
      for (const row of projections.results) {
        expect(row.notion_page_id).toBe(`bg29-mock-page-${row.id}`);
        expect(row.projection_version).toBeGreaterThanOrEqual(2);
        expect(row.projection_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(row.notion_last_synced_at).toBe(now.toISOString());
        expect(row.raw_text).toBe('immutable original synthetic body');
      }
      expect(
        mock.pages().map((page) => [page.createCount, page.updateCount]),
      ).toEqual([
        [1, 1],
        [1, 1],
      ]);
      expect(mock.requests().filter((r) => r.method === 'PATCH')).toHaveLength(
        2,
      );

      const queue = await env.DB.prepare(
        `SELECT status, COUNT(*) AS count FROM sync_attempts
         WHERE item_id IN (?1, ?2) GROUP BY status`,
      )
        .bind(first, second)
        .all<{ status: string; count: number }>();
      expect(queue.results).toEqual([{ status: 'complete', count: 4 }]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('cannot project a real external Notion page ID through the staging worker', async () => {
    const id = BG29_NOTION_CAPTURE_IDS[2]!;
    await seed(id);
    await env.DB.prepare(
      `UPDATE items SET notion_page_id = 'real-user-page-id'
       WHERE id = ?1`,
    )
      .bind(id)
      .run();
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('LIVE_NOTION_NETWORK_ATTEMPT');
      });
    try {
      const mock = createBg29StagingNotionHarness();
      await mock.run(env.DB, { now: () => new Date(T0.getTime() + 1_000) });
      const attempt = await env.DB.prepare(
        `SELECT status, attempts, last_error_code FROM sync_attempts
         WHERE item_id = ?1`,
      )
        .bind(id)
        .first<{ status: string; attempts: number; last_error_code: string }>();
      expect(attempt).toMatchObject({
        status: 'pending',
        attempts: 1,
        last_error_code: 'NOTION_NETWORK_ERROR',
      });
      expect(mock.pages()).toHaveLength(0);
      expect(mock.requests()).toHaveLength(0);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
