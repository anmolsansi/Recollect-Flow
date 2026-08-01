import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { executeSearch } from '../src/search/search.service';
import { encodeCursor, generateFingerprint } from '../src/search/cursor';
import { AppError } from '../src/shared/errors';

// Helper to get text from snippet segments
function getSnippetText(snippet: any) {
  return snippet.segments.map((s: any) => s.text).join('');
}

function hasHighlight(snippet: any) {
  return snippet.segments.some((s: any) => s.highlighted);
}

describe('OPE-225 FTS5 search integration', () => {
  beforeAll(async () => {
    // We assume migrations are applied by the test setup
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('compiles full-text queries and paginates using stable keysets', async () => {
    // 1. Insert test data
    const baseDate = new Date('2026-08-01T12:00:00Z').getTime();

    // We will insert 3 items with the word "multimodal"
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title, raw_text, summary
      ) VALUES 
      ('search-item-1', 'sk1', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Multimodal test 1', 'Content for multimodal test', 'Summary 1'),
      ('search-item-2', 'sk2', 'url', 'web', 'public', 'complete', ?2, ?2, ?2, 'Multimodal test 2', 'Different content with multimodal word again', 'Summary 2'),
      ('search-item-3', 'sk3', 'text', 'web', 'public', 'complete', ?3, ?3, ?3, 'No title', 'This also has multimodal right here', 'Summary 3')
    `,
    )
      .bind(
        new Date(baseDate).toISOString(),
        new Date(baseDate + 1000).toISOString(),
        new Date(baseDate + 2000).toISOString(),
      )
      .run();

    const page1 = await executeSearch(env.DB, {
      q: 'multimodal',
      limit: 2,
    });

    expect(page1.data).toHaveLength(2);
    expect(page1.meta.count).toBe(2);
    expect(page1.meta.next_cursor).toBeTruthy();

    const page2 = await executeSearch(env.DB, {
      q: 'multimodal',
      limit: 2,
      cursor: page1.meta.next_cursor!,
    });

    expect(page2.data).toHaveLength(1);
    expect(page2.meta.next_cursor).toBeUndefined();

    const ids = [
      ...page1.data.map((d) => d.id),
      ...page2.data.map((d) => d.id),
    ];
    expect(ids).toContain('search-item-1');
    expect(ids).toContain('search-item-2');
    expect(ids).toContain('search-item-3');
  });

  it('supports empty queries acting purely as metadata filters', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, project, title
      ) VALUES (
        'filter-item-1', 'fk1', 'image', 'web', 'public', 'complete',
        ?1, ?1, ?1, 'OPE-225', 'Filter only test'
      )
    `,
    )
      .bind(now)
      .run();

    const res = await executeSearch(env.DB, {
      project: 'OPE-225',
      limit: 10,
    });

    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.id).toBe('filter-item-1');
    expect(res.data[0]?.snippet).toBeDefined();
    expect(hasHighlight(res.data[0]?.snippet)).toBe(false);
    expect(getSnippetText(res.data[0]?.snippet)).toContain('Filter only test');
  });

  it('safely handles punctuation and builds prefix searches', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES (
        'punct-item-1', 'pk1', 'url', 'web', 'public', 'complete',
        ?1, ?1, ?1, 'Learning Node.js and C++ today!'
      )
    `,
    )
      .bind(now)
      .run();

    const res = await executeSearch(env.DB, {
      q: 'Node.j',
      limit: 10,
    });

    expect(res.data.length).toBeGreaterThanOrEqual(1);
    const item = res.data.find((d) => d.id === 'punct-item-1');
    expect(item).toBeDefined();

    expect(hasHighlight(item!.snippet)).toBe(true);
    expect(getSnippetText(item!.snippet)).toContain('Node');
  });

  it('respects soft deletes via triggers', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES (
        'del-item-1', 'dk1', 'url', 'web', 'public', 'complete',
        ?1, ?1, ?1, 'Soft delete test content'
      )
    `,
    )
      .bind(now)
      .run();

    let res = await executeSearch(env.DB, { q: 'Soft delete test', limit: 25 });
    expect(res.data.map((d) => d.id)).toContain('del-item-1');

    await env.DB.prepare(
      `UPDATE items SET deleted_at = ?1 WHERE id = 'del-item-1'`,
    )
      .bind(now)
      .run();

    res = await executeSearch(env.DB, { q: 'Soft delete test', limit: 25 });
    expect(res.data.map((d) => d.id)).not.toContain('del-item-1');
  });

  it('rejects malformed cursors, invalid JSON, wrong versions, and query mismatches', async () => {
    await expect(executeSearch(env.DB, { q: 'test', cursor: 'not-base64-!@#' }))
      .rejects.toThrowError(AppError);

    const invalidJson = Buffer.from('{"v":').toString('base64url');
    await expect(executeSearch(env.DB, { q: 'test', cursor: invalidJson }))
      .rejects.toThrowError(AppError);

    const wrongVersion = Buffer.from(JSON.stringify({ v: 2, t: '2026', i: '1', f: '123' })).toString('base64url');
    await expect(executeSearch(env.DB, { q: 'test', cursor: wrongVersion }))
      .rejects.toThrowError(AppError);

    const validFingerprint = await generateFingerprint({ q: 'test' }, ['test']);
    const wrongMode = encodeCursor({ v: 1, mode: 'filter', t: '2026', i: '1', f: validFingerprint, c: '2026' });
    await expect(executeSearch(env.DB, { q: 'test', cursor: wrongMode }))
      .rejects.toThrowError(AppError);

    const mismatchQuery = encodeCursor({ v: 1, mode: 'keyword', r: 0, t: '2026', i: '1', f: 'wrongfingerprint', c: '2026' });
    await expect(executeSearch(env.DB, { q: 'test', cursor: mismatchQuery }))
      .rejects.toThrowError(AppError);
  });

  it('resolves multiple items with identical rank and timestamps deterministically by id', async () => {
    const identicalTime = '2025-08-02T12:00:00.000Z';
    
    // Insert identical items
    await env.DB.prepare(`
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('same-item-a', 'ik1', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test'),
      ('same-item-b', 'ik2', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test'),
      ('same-item-c', 'ik3', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test')
    `).bind(identicalTime).run();

    const page1 = await executeSearch(env.DB, { q: 'Deterministic order', limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.next_cursor).toBeTruthy();
    
    // Due to same rank & time, order is by id ASC -> 'same-item-a', 'same-item-b'
    expect(page1.data[0].id).toBe('same-item-a');
    expect(page1.data[1].id).toBe('same-item-b');

    const page2 = await executeSearch(env.DB, { q: 'Deterministic order', limit: 2, cursor: page1.meta.next_cursor! });
    expect(page2.data).toHaveLength(1);
    expect(page2.data[0].id).toBe('same-item-c');
  });

  it('keeps original traversal intact when a newer item is inserted between pages', async () => {
    const time1 = new Date(Date.now() - 10000).toISOString();
    const time2 = new Date(Date.now() - 20000).toISOString();
    
    await env.DB.prepare(`
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('stable-item-1', 'sk11', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Stable traversal test'),
      ('stable-item-2', 'sk22', 'url', 'web', 'public', 'complete', ?2, ?2, ?2, 'Stable traversal test')
    `).bind(time1, time2).run();

    const page1 = await executeSearch(env.DB, { q: 'Stable traversal', limit: 1 });
    expect(page1.data[0].id).toBe('stable-item-1');
    const cursor = page1.meta.next_cursor!;

    // Insert a newer item after page1 was fetched
    const newerTime = new Date(Date.now() + 10000).toISOString();
    await env.DB.prepare(`
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('stable-item-new', 'sknew', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Stable traversal test')
    `).bind(newerTime).run();

    // Fetch page2
    const page2 = await executeSearch(env.DB, { q: 'Stable traversal', limit: 10, cursor });
    
    // We should NOT see 'stable-item-new' because its captured_at is newer than our cutoff (which is implicitly set at page1 creation time via cursor.c)
    // Or if rank is involved, cutoff prevents fetching newer records that jumped ahead.
    const ids = page2.data.map(d => d.id);
    expect(ids).toContain('stable-item-2');
    expect(ids).not.toContain('stable-item-new');
  });
});
