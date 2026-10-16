import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { executeSearch } from '../src/search/search.service';

const CORPUS = 10_000;
const CAPTURED = '2026-10-01T12:00:00.000Z';

describe('BG-29 isolated 10,000-item D1/FTS search acceptance', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    // One synthetic-only insert per item; real FTS insert triggers run on each
    // canonical row. This is not a mock of the search index.
    for (let offset = 0; offset < CORPUS; offset += 1000) {
      const result = await env.DB.prepare(
        `WITH RECURSIVE sequence(n) AS (
           SELECT ?1 UNION ALL SELECT n + 1 FROM sequence WHERE n < ?2
         )
         INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, captured_at, created_at, updated_at, title,
           raw_text, project
         )
         SELECT 'bg29-' || printf('%06d', n),
                'bg29-key-' || printf('%06d', n),
                CASE WHEN n % 2 = 0 THEN 'text' ELSE 'note' END,
                'BG29 synthetic', CASE n % 4 WHEN 0 THEN 'public'
                  WHEN 1 THEN 'unknown' WHEN 2 THEN 'personal'
                  ELSE 'sensitive' END,
                'complete', ?3, ?3, ?3, 'Synthetic record ' || n,
                CASE WHEN n % 13 = 0
                  THEN 'bg29needle shared phrase ' || n
                  ELSE 'background synthetic content ' || n END,
                CASE WHEN n % 3 = 0 THEN 'work' ELSE 'home' END
         FROM sequence`,
      )
        .bind(offset + 1, offset + 1000, CAPTURED)
        .run();
      expect(result.success).toBe(true);
    }
  }, 120_000);

  it('exercises real FTS phrase and combined privacy/source/project filters', async () => {
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM items WHERE source_app = ?1',
    )
      .bind('BG29 synthetic')
      .first<{ total: number }>();
    expect(count?.total).toBe(CORPUS);

    const started = Date.now();
    const phrase = await executeSearch(env.DB, {
      q: 'bg29needle',
      limit: 25,
    });
    const elapsed = Date.now() - started;
    expect(phrase.data).toHaveLength(25);
    expect(phrase.meta.next_cursor).toBeTruthy();
    expect(
      phrase.data.every((item) =>
        item.snippet.segments.some((segment) =>
          segment.text.toLowerCase().includes('bg29needle'),
        ),
      ),
    ).toBe(true);

    const filtered = await executeSearch(env.DB, {
      q: 'bg29needle',
      source: 'text',
      privacy_level: 'public',
      project: 'work',
      limit: 25,
    });
    expect(filtered.data.length).toBeGreaterThan(0);
    expect(
      filtered.data.every(
        (item) =>
          item.source_type === 'text' &&
          item.privacy_level === 'public' &&
          item.project === 'work',
      ),
    ).toBe(true);

    // D1 rows_read belongs to this explicit FTS query only, not to the
    // executeSearch call (whose API currently returns only duration_ms).
    const fts = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM item_search_fts WHERE item_search_fts MATCH ?1',
    )
      .bind('"bg29needle"')
      .all<{ total: number }>();
    expect(fts.results[0]?.total).toBe(Math.floor(CORPUS / 13));
    console.log(
      JSON.stringify({
        event: 'bg29_isolated_search_scale',
        environment: 'workerd-vitest-d1',
        item_count: CORPUS,
        indexed_match_count: fts.results[0]?.total,
        phrase_query_ms: elapsed,
        phrase_service_db_ms: phrase.meta.duration_ms,
        fts_count_rows_read: fts.meta?.rows_read ?? null,
        fts_count_rows_written: fts.meta?.rows_written ?? null,
        caveat:
          'FTS count metrics exclude executeSearch query; not hosted D1 billing or 100k scale',
      }),
    );
  }, 120_000);

  it('traverses stable tied-time pagination without repeats', async () => {
    const visited = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 6; page += 1) {
      const result = await executeSearch(env.DB, {
        q: 'bg29needle',
        limit: 20,
        ...(cursor ? { cursor } : {}),
      });
      expect(result.data).toHaveLength(20);
      for (const item of result.data) {
        expect(visited.has(item.id)).toBe(false);
        visited.add(item.id);
      }
      cursor = result.meta.next_cursor;
      expect(cursor).toBeTruthy();
    }
    expect(visited.size).toBe(120);
  }, 120_000);
});
