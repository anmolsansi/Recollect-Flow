import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { EnrichService } from '../src/jobs/enrich.service';
import { JobService } from '../src/jobs/job.service';
import { executeSearch } from '../src/search/search.service';
import { encodeCursor, generateFingerprint } from '../src/search/cursor';
import { AppError } from '../src/shared/errors';
import {
  searchResponseSchema,
  type SearchSnippet,
} from '../src/search/search.schema';

function getSnippetText(snippet: SearchSnippet): string {
  return snippet.segments.map((segment) => segment.text).join('');
}

function hasHighlight(snippet: SearchSnippet): boolean {
  return snippet.segments.some((segment) => segment.highlighted);
}

async function resetSearchDatabase(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

function adminHeaders(token = 'test-admin-token'): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

describe('OPE-225 FTS5 search integration', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetSearchDatabase);

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
    const item = res.data[0];
    expect(item?.id).toBe('filter-item-1');
    if (!item) throw new Error('Expected the filter-only item');
    expect(hasHighlight(item.snippet)).toBe(false);
    expect(getSnippetText(item.snippet)).toContain('Filter only test');
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
        ?1, ?1, ?1, 'Learning Node.js, C++, and developer''s café today! 🚀'
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

    for (const query of ['C++', "developer's", 'cafe\u0301', 'Node-js']) {
      const punctuationResult = await executeSearch(env.DB, {
        q: query,
        limit: 10,
      });
      expect(
        punctuationResult.data.map((result) => result.id),
        query,
      ).toContain('punct-item-1');
    }
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
    await expect(
      executeSearch(env.DB, {
        q: 'test',
        cursor: 'not-base64-!@#',
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);

    const invalidJson = Buffer.from('{"v":').toString('base64url');
    await expect(
      executeSearch(env.DB, { q: 'test', cursor: invalidJson, limit: 25 }),
    ).rejects.toThrowError(AppError);

    const timestamp = '2026-08-01T00:00:00.000Z';
    const wrongVersion = Buffer.from(
      JSON.stringify({
        v: 2,
        mode: 'keyword',
        r: 0,
        t: timestamp,
        i: '1',
        f: 'abcdefghijklmnop',
        c: timestamp,
      }),
    ).toString('base64url');
    await expect(
      executeSearch(env.DB, { q: 'test', cursor: wrongVersion, limit: 25 }),
    ).rejects.toThrowError(AppError);

    const validFingerprint = await generateFingerprint({ q: 'test' }, ['test']);
    const validKeywordCursor = encodeCursor({
      v: 1,
      mode: 'keyword',
      r: 0,
      t: timestamp,
      i: '1',
      f: validFingerprint,
      c: timestamp,
    });
    await expect(
      executeSearch(env.DB, {
        q: 'test',
        cursor: `${validKeywordCursor}!`,
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);

    const wrongMode = encodeCursor({
      v: 1,
      mode: 'filter',
      t: timestamp,
      i: '1',
      f: validFingerprint,
      c: timestamp,
    });
    await expect(
      executeSearch(env.DB, { q: 'test', cursor: wrongMode, limit: 25 }),
    ).rejects.toThrowError(AppError);

    const unknownProperty = Buffer.from(
      JSON.stringify({
        v: 1,
        mode: 'keyword',
        r: 0,
        t: timestamp,
        i: '1',
        f: validFingerprint,
        c: timestamp,
        unexpected: true,
      }),
    ).toString('base64url');
    await expect(
      executeSearch(env.DB, {
        q: 'test',
        cursor: unknownProperty,
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);

    const mismatchQuery = encodeCursor({
      v: 1,
      mode: 'keyword',
      r: 0,
      t: timestamp,
      i: '1',
      f: 'wrongfingerprint',
      c: timestamp,
    });
    await expect(
      executeSearch(env.DB, {
        q: 'test',
        cursor: mismatchQuery,
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);

    const missingKeywordRank = Buffer.from(
      JSON.stringify({
        v: 1,
        mode: 'keyword',
        t: timestamp,
        i: '1',
        f: validFingerprint,
        c: timestamp,
      }),
    ).toString('base64url');
    await expect(
      executeSearch(env.DB, {
        q: 'test',
        cursor: missingKeywordRank,
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);

    const filterFingerprint = await generateFingerprint({}, []);
    const unexpectedFilterRank = encodeCursor({
      v: 1,
      mode: 'filter',
      r: 0,
      t: timestamp,
      i: '1',
      f: filterFingerprint,
      c: timestamp,
    });
    await expect(
      executeSearch(env.DB, {
        cursor: unexpectedFilterRank,
        limit: 25,
      }),
    ).rejects.toThrowError(AppError);
  });

  it('resolves multiple items with identical rank and timestamps deterministically by id', async () => {
    const identicalTime = '2025-08-02T12:00:00.000Z';

    // Insert identical items
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('same-item-a', 'ik1', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test'),
      ('same-item-b', 'ik2', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test'),
      ('same-item-c', 'ik3', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Deterministic order test')
    `,
    )
      .bind(identicalTime)
      .run();

    const page1 = await executeSearch(env.DB, {
      q: 'Deterministic order',
      limit: 2,
    });
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.next_cursor).toBeTruthy();

    // Due to same rank & time, order is by id ASC -> 'same-item-a', 'same-item-b'
    expect(page1.data[0]?.id).toBe('same-item-a');
    expect(page1.data[1]?.id).toBe('same-item-b');

    const page2 = await executeSearch(env.DB, {
      q: 'Deterministic order',
      limit: 2,
      cursor: page1.meta.next_cursor!,
    });
    expect(page2.data).toHaveLength(1);
    expect(page2.data[0]?.id).toBe('same-item-c');
  });

  it('keeps original traversal intact when a newer item is inserted between pages', async () => {
    const time1 = new Date(Date.now() - 10000).toISOString();
    const time2 = new Date(Date.now() - 20000).toISOString();

    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('stable-item-1', 'sk11', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Stable traversal test'),
      ('stable-item-2', 'sk22', 'url', 'web', 'public', 'complete', ?2, ?2, ?2, 'Stable traversal test')
    `,
    )
      .bind(time1, time2)
      .run();

    const page1 = await executeSearch(env.DB, {
      q: 'Stable traversal',
      limit: 1,
    });
    expect(page1.data[0]?.id).toBe('stable-item-1');
    const cursor = page1.meta.next_cursor!;

    // Insert a newer item after page1 was fetched
    const newerTime = new Date(Date.now() + 10000).toISOString();
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level, processing_status,
        captured_at, created_at, updated_at, title
      ) VALUES 
      ('stable-item-new', 'sknew', 'url', 'web', 'public', 'complete', ?1, ?1, ?1, 'Stable traversal test')
    `,
    )
      .bind(newerTime)
      .run();

    // Fetch page2
    const page2 = await executeSearch(env.DB, {
      q: 'Stable traversal',
      limit: 10,
      cursor,
    });

    // We should NOT see 'stable-item-new' because its captured_at is newer than our cutoff (which is implicitly set at page1 creation time via cursor.c)
    // Or if rank is involved, cutoff prevents fetching newer records that jumped ahead.
    const ids = page2.data.map((d) => d.id);
    expect(ids).toContain('stable-item-2');
    expect(ids).not.toContain('stable-item-new');
  });

  it('searches every required indexed field and replaces reprocessed values', async () => {
    const now = '2026-08-01T00:00:00.000Z';
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title,
         raw_text, user_note, summary, topics_json, project, people, companies
       ) VALUES (
         'all-fields-item', 'all-fields-key', 'text', 'test', 'public',
         'complete', ?1, ?1, ?1, 'titlealpha', 'rawbravo', 'notecharlie',
         'summarydelta', '["topicecho"]', 'projectfoxtrot',
         '["persongolf"]', '["companyhotel"]'
       )`,
    )
      .bind(now)
      .run();

    for (const term of [
      'titlealpha',
      'rawbravo',
      'notecharlie',
      'summarydelta',
      'topicecho',
      'projectfoxtrot',
      'persongolf',
      'companyhotel',
    ]) {
      const result = await executeSearch(env.DB, { q: term, limit: 10 });
      expect(
        result.data.map((item) => item.id),
        term,
      ).toContain('all-fields-item');
    }

    await env.DB.prepare(
      `UPDATE items
       SET summary = 'summaryindia', topics_json = '["topicjuliet"]',
           updated_at = ?1
       WHERE id = 'all-fields-item'`,
    )
      .bind(now)
      .run();

    expect(
      (await executeSearch(env.DB, { q: 'summarydelta', limit: 10 })).data,
    ).toHaveLength(0);
    expect(
      (
        await executeSearch(env.DB, {
          q: 'summaryindia topicjuliet',
          limit: 10,
        })
      ).data.map((item) => item.id),
    ).toContain('all-fields-item');
  });

  it('applies every metadata filter with predictable AND semantics', async () => {
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, lifecycle_status, importance, project,
         captured_at, created_at, updated_at, title
       ) VALUES
         ('filter-match', 'filter-match-key', 'url', 'test', 'personal',
          'complete', 'Reviewed', 80, 'SearchProject',
          '2026-08-01T10:00:00.000Z', '2026-08-01T10:00:00.000Z',
          '2026-08-01T10:00:00.000Z', 'combinedfilterterm'),
         ('filter-miss', 'filter-miss-key', 'text', 'test', 'public',
          'pending', 'Inbox', 20, 'OtherProject',
          '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z',
          '2026-07-01T10:00:00.000Z', 'combinedfilterterm')`,
    ).run();

    const result = await executeSearch(env.DB, {
      q: 'combinedfilter',
      source: 'url',
      project: 'SearchProject',
      lifecycle_status: 'Reviewed',
      processing_status: 'complete',
      importance_min: 75,
      importance_max: 90,
      captured_from: '2026-08-01T00:00:00.000Z',
      captured_to: '2026-08-02T00:00:00.000Z',
      limit: 10,
    });

    expect(result.data.map((item) => item.id)).toEqual(['filter-match']);
  });

  it('indexes a newly captured raw item through the real capture and search routes', async () => {
    const app = createApp();
    const uniqueText = 'capturesearchterm raw item is immediately searchable';
    const captureResponse = await app.request(
      '/api/v1/captures',
      {
        method: 'POST',
        headers: {
          ...adminHeaders('test-capture-token'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: 'ope225-capture-route-0001',
          source_type: 'text',
          source_app: 'ios-shortcut',
          shared_text: uniqueText,
          privacy_level: 'public',
          captured_at: '2026-08-01T09:00:00.000Z',
          client: { name: 'shortcut', version: '1.0' },
        }),
      },
      env,
    );
    expect(captureResponse.status).toBe(201);
    const captureBody = (await captureResponse.json()) as {
      data: { capture_id: string };
    };

    const searchResponse = await app.request(
      '/api/v1/search?q=capturesearchterm',
      { headers: adminHeaders() },
      env,
    );
    expect(searchResponse.status).toBe(200);
    const searchBody = searchResponseSchema.parse(await searchResponse.json());
    expect(searchBody.data.map((item) => item.id)).toContain(
      captureBody.data.capture_id,
    );

    const [job] = await new JobService(env.DB).leaseProcessingJobs(
      'enrich',
      'ope225-search-owner',
      5,
      1,
      new Date('2026-08-02T00:00:00.000Z'),
    );
    expect(job?.itemId).toBe(captureBody.data.capture_id);
    if (!job) throw new Error('Expected the capture enrichment job');
    expect(
      await new EnrichService(env, env.DB).processEnrichmentJob(
        job,
        'ope225-search-owner',
      ),
    ).toBe(true);

    const enrichedResponse = await app.request(
      '/api/v1/search?q=Mock%20summary%20mock_topic',
      { headers: adminHeaders() },
      env,
    );
    expect(enrichedResponse.status).toBe(200);
    expect(
      searchResponseSchema
        .parse(await enrichedResponse.json())
        .data.map((item) => item.id),
    ).toContain(captureBody.data.capture_id);
  });

  it('enforces admin scope through the real route without touching AI', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title
       ) VALUES
         ('privacy-unknown', 'privacy-unknown-key', 'text', 'test', 'unknown', 'complete', ?1, ?1, ?1, 'privacyroute unknown'),
         ('privacy-public', 'privacy-public-key', 'text', 'test', 'public', 'complete', ?1, ?1, ?1, 'privacyroute public'),
         ('privacy-personal', 'privacy-personal-key', 'text', 'test', 'personal', 'complete', ?1, ?1, ?1, 'privacyroute personal'),
         ('privacy-sensitive', 'privacy-sensitive-key', 'text', 'test', 'sensitive', 'complete', ?1, ?1, ?1, 'privacyroute sensitive')`,
    )
      .bind(now)
      .run();

    const app = createApp();
    for (const headers of [
      undefined,
      adminHeaders('invalid-token'),
      adminHeaders('test-capture-token'),
      adminHeaders('test-local-worker-token'),
    ]) {
      const response = await app.request(
        '/api/v1/search?q=privacyroute',
        headers ? { headers } : {},
        env,
      );
      expect(response.status).toBe(403);
    }

    const noAiEnv = { ...env, AI: undefined as never };
    const response = await app.request(
      '/api/v1/search?q=privacyroute',
      { headers: adminHeaders() },
      noAiEnv,
    );
    expect(response.status).toBe(200);
    const payload = searchResponseSchema.parse(await response.json());
    expect(payload.data.map((item) => item.privacy_level).sort()).toEqual([
      'personal',
      'public',
      'sensitive',
      'unknown',
    ]);
  });

  it('rejects invalid route filters and returns punctuation-only queries safely', async () => {
    const app = createApp();
    for (const query of [
      'importance_min=90&importance_max=10',
      'captured_from=2026-08-02T00%3A00%3A00.000Z&captured_to=2026-08-01T00%3A00%3A00.000Z',
      'source=audio',
      'limit=101',
      `q=${'a'.repeat(257)}`,
      `cursor=${'a'.repeat(1025)}`,
      'unknown=value',
    ]) {
      const response = await app.request(
        `/api/v1/search?${query}`,
        { headers: adminHeaders() },
        env,
      );
      expect(response.status, query).toBe(422);
    }

    const punctuation = await app.request(
      '/api/v1/search?q=%21%21%21',
      { headers: adminHeaders() },
      env,
    );
    expect(punctuation.status).toBe(200);
    expect(searchResponseSchema.parse(await punctuation.json()).data).toEqual(
      [],
    );

    const emojiOnly = await app.request(
      '/api/v1/search?q=%F0%9F%9A%80',
      { headers: adminHeaders() },
      env,
    );
    expect(emojiOnly.status).toBe(200);
    expect(searchResponseSchema.parse(await emojiOnly.json()).data).toEqual([]);

    const reservedOperators = await app.request(
      '/api/v1/search?q=%22privacy%22%20OR%20NOT',
      { headers: adminHeaders() },
      env,
    );
    expect(reservedOperators.status).toBe(200);
  });

  it('handles malformed topics and returns bounded inert snippet segments', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title,
         raw_text, topics_json
       ) VALUES (
         'unsafe-snippet', 'unsafe-snippet-key', 'text', 'test', 'public',
         'complete', ?1, ?1, ?1, 'scriptmarker title',
         '<script>alert("scriptmarker")</script> & text', '{malformed'
       )`,
    )
      .bind(now)
      .run();

    const result = await executeSearch(env.DB, {
      q: 'scriptmarker',
      limit: 10,
    });
    const item = result.data[0];
    expect(item?.topics).toEqual([]);
    expect(item?.snippet.segments.length).toBeLessThanOrEqual(10);
    expect(getSnippetText(item!.snippet).length).toBeLessThanOrEqual(150);
    expect(getSnippetText(item!.snippet)).not.toMatch(/[\uE000-\uF8FF]/u);
  });

  it('removes, restores, and defensively hard-deletes indexed items', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title
       ) VALUES (
         'restore-item', 'restore-item-key', 'text', 'test', 'public',
         'complete', ?1, ?1, ?1, 'restoresearchterm'
       )`,
    )
      .bind(now)
      .run();

    await env.DB.prepare(
      `UPDATE items SET deleted_at = ?1 WHERE id = 'restore-item'`,
    )
      .bind(now)
      .run();
    expect(
      (await executeSearch(env.DB, { q: 'restoresearchterm', limit: 10 })).data,
    ).toHaveLength(0);

    await env.DB.prepare(
      `UPDATE items SET deleted_at = NULL WHERE id = 'restore-item'`,
    ).run();
    expect(
      (
        await executeSearch(env.DB, { q: 'restoresearchterm', limit: 10 })
      ).data.map((item) => item.id),
    ).toEqual(['restore-item']);

    await env.DB.prepare(`DELETE FROM items WHERE id = 'restore-item'`).run();
    const indexed = await env.DB.prepare(
      `SELECT item_id FROM item_search_fts WHERE item_search_fts MATCH 'restoresearchterm'`,
    ).first('item_id');
    expect(indexed).toBeNull();
  });

  it('traverses a large tied result set without duplicates or omissions', async () => {
    const timestamp = '2026-08-01T00:00:00.000Z';
    await env.DB.prepare(
      `WITH RECURSIVE sequence(number) AS (
         SELECT 1
         UNION ALL
         SELECT number + 1 FROM sequence WHERE number < 120
       )
       INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title
       )
       SELECT printf('bulk-%03d', number), printf('bulk-key-%03d', number),
              'text', 'test', 'public', 'complete', ?1, ?1, ?1,
              'largesearchterm'
       FROM sequence`,
    )
      .bind(timestamp)
      .run();

    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await executeSearch(env.DB, {
        q: 'largesearchterm',
        limit: 17,
        ...(cursor ? { cursor } : {}),
      });
      ids.push(...page.data.map((item) => item.id));
      cursor = page.meta.next_cursor;
    } while (cursor);

    expect(ids).toHaveLength(120);
    expect(new Set(ids).size).toBe(120);
    expect(ids[0]).toBe('bulk-001');
    expect(ids.at(-1)).toBe('bulk-120');
  });

  it('rebuilds a corrupted populated index twice without drift', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO items (
         id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at, title
       ) VALUES
         ('rebuild-a', 'rebuild-a-key', 'text', 'test', 'public', 'complete', ?1, ?1, ?1, 'rebuildterm alpha'),
         ('rebuild-b', 'rebuild-b-key', 'text', 'test', 'public', 'complete', ?1, ?1, ?1, 'rebuildterm bravo')`,
    )
      .bind(now)
      .run();

    await env.DB.prepare(
      `DELETE FROM item_search_fts
       WHERE rowid = (SELECT rowid FROM items WHERE id = 'rebuild-a')`,
    ).run();
    await env.DB.prepare(
      `INSERT INTO item_search_fts(rowid, item_id, title)
       VALUES (999999, 'orphaned-index-row', 'rebuildterm orphan')`,
    ).run();

    const rebuild = async () => {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM item_search_fts'),
        env.DB.prepare(
          `INSERT INTO item_search_fts(
             rowid, item_id, title, raw_text, user_note, summary, topics,
             project, people, companies
           )
           SELECT rowid, id, title, raw_text, user_note, summary,
             CASE WHEN json_valid(topics_json) THEN
               (SELECT group_concat(value, ' ') FROM json_each(topics_json))
             ELSE '' END,
             project,
             CASE WHEN json_valid(people) THEN
               (SELECT group_concat(value, ' ') FROM json_each(people))
             ELSE '' END,
             CASE WHEN json_valid(companies) THEN
               (SELECT group_concat(value, ' ') FROM json_each(companies))
             ELSE '' END
           FROM items WHERE deleted_at IS NULL`,
        ),
      ]);
    };

    await rebuild();
    await rebuild();

    const result = await executeSearch(env.DB, {
      q: 'rebuildterm',
      limit: 10,
    });
    expect(result.data.map((item) => item.id).sort()).toEqual([
      'rebuild-a',
      'rebuild-b',
    ]);
    const counts = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM items WHERE deleted_at IS NULL) AS canonical,
         (SELECT COUNT(*) FROM item_search_fts) AS indexed,
         (SELECT COUNT(DISTINCT item_id) FROM item_search_fts) AS distinct_indexed,
         (SELECT COUNT(*) FROM items i WHERE i.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM item_search_fts f WHERE f.rowid = i.rowid
            )) AS missing,
         (SELECT COUNT(*) FROM item_search_fts f
            LEFT JOIN items i ON i.rowid = f.rowid
            WHERE i.rowid IS NULL OR i.deleted_at IS NOT NULL) AS orphaned,
         (SELECT COUNT(*) FROM (
            SELECT item_id FROM item_search_fts
            GROUP BY item_id HAVING COUNT(*) > 1
          )) AS duplicates`,
    ).first<{
      canonical: number;
      indexed: number;
      distinct_indexed: number;
      missing: number;
      orphaned: number;
      duplicates: number;
    }>();
    expect(counts).toEqual({
      canonical: 2,
      indexed: 2,
      distinct_indexed: 2,
      missing: 0,
      orphaned: 0,
      duplicates: 0,
    });
  });
});
