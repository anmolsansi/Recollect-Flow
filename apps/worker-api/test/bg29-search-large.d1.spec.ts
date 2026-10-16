import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { executeSearch } from '../src/search/search.service';

const SIZE = 100_000;
const CAPTURED = '2026-10-01T12:00:00.000Z';

describe('BG-29 isolated 100,000-item D1 and FTS acceptance', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    // Only disposable workerd D1. No hosted account or external quota.
    // Keep batches below SQLite's recursive CTE limits and insert into the
    // canonical table so the real application FTS triggers execute.
    for (let offset = 0; offset < SIZE; offset += 1000) {
      const insert = await env.DB.prepare(
        `WITH RECURSIVE sequence(n) AS (
          SELECT ?1 UNION ALL SELECT n + 1 FROM sequence WHERE n < ?2
        )
        INSERT INTO items (
          id, idempotency_key, source_type, source_app, privacy_level,
          processing_status, captured_at, created_at, updated_at,
          title, raw_text, project
        )
        SELECT 'bg29-large-' || printf('%06d', n),
               'bg29-large-key-' || printf('%06d', n),
               CASE WHEN n % 2 = 0 THEN 'text' ELSE 'note' END,
               'BG29 synthetic large-scale',
               CASE n % 4 WHEN 0 THEN 'public' WHEN 1 THEN 'unknown'
                 WHEN 2 THEN 'personal' ELSE 'sensitive' END,
               'complete', ?3, ?3, ?3, 'Synthetic ' || n,
               CASE WHEN n % 19 = 0 THEN 'bg29largeneedle find this synthetic phrase'
                 ELSE 'background deterministic evidence' END,
               CASE WHEN n % 3 = 0 THEN 'work' ELSE 'home' END
        FROM sequence`,
      ).bind(offset + 1, offset + 1000, CAPTURED).run();
      expect(insert.success).toBe(true);
    }
  }, 180_000);

  it('measures a real indexed phrase query, mixed filters, and rows read', async () => {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM items WHERE source_app = ?1',
    ).bind('BG29 synthetic large-scale').first<{ total: number }>();
    expect(count?.total).toBe(SIZE);

    const began = Date.now();
    const search = await executeSearch(env.DB, {
      q: 'bg29largeneedle', source: 'text', privacy_level: 'public',
      project: 'work', limit: 25,
    });
    const measuredMs = Date.now() - began;
    expect(search.data.length).toBeGreaterThan(0);
    expect(search.data.every((item) =>
      item.source_type === 'text' &&
      item.privacy_level === 'public' &&
      item.project === 'work'
    )).toBe(true);

    const phraseCount = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM item_search_fts WHERE item_search_fts MATCH ?1',
    ).bind('"bg29largeneedle"').all<{ total: number }>();
    expect(phraseCount.results[0]?.total).toBe(Math.floor(SIZE / 19));
    console.log(JSON.stringify({
      event: 'bg29_large_fts_acceptance',
      environment: 'isolated-workerd-vitest-d1',
      seeded_rows: SIZE,
      source_distribution: 'half text/half note',
      privacy_distribution: 'four rotating classes',
      project_distribution: 'work every 3rd row',
      indexed_hits: phraseCount.results[0]?.total,
      combined_filter_matches_first_page: search.data.length,
      combined_query_wall_ms: measuredMs,
      combined_query_db_ms: search.meta.duration_ms,
      fts_count_rows_read: phraseCount.meta?.rows_read ?? null,
      fts_count_rows_written: phraseCount.meta?.rows_written ?? null,
      limitations: 'Local synthetic count-query rows; no hosted billing, CPU, provider latency or production device proof',
    }));
  }, 120_000);

  it('uses deterministic tied-keyset pagination without repeated results at 100k scale', async () => {
    const visited = new Set<string>();
    let cursor: string | undefined;
    for (let n = 0; n < 4; n += 1) {
      const page = await executeSearch(env.DB, {
        q: 'bg29largeneedle', limit: 25,
        ...(cursor ? { cursor } : {}),
      });
      expect(page.data).toHaveLength(25);
      for (const item of page.data) {
        expect(visited.has(item.id)).toBe(false);
        visited.add(item.id);
      }
      cursor = page.meta.next_cursor;
      expect(cursor).toBeTruthy();
    }
    expect(visited.size).toBe(100);
  }, 120_000);
});
