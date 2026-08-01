import type { SearchInput } from './search.schema';
import { decodeCursor, encodeCursor, generateFingerprint } from './cursor';
import { AppError } from '../shared/errors';

function parseTopics(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((topic): topic is string => typeof topic === 'string')
      : [];
  } catch {
    return [];
  }
}

function constrainSegments(segments: {text: string, highlighted: boolean}[], isTruncated: boolean) {
  const merged: {text: string, highlighted: boolean}[] = [];
  for (const s of segments) {
    if (s.text.length === 0) continue;
    if (merged.length > 0 && merged[merged.length - 1].highlighted === s.highlighted) {
      merged[merged.length - 1].text += s.text;
    } else {
      merged.push({ ...s });
    }
  }
  
  const finalSegments: {text: string, highlighted: boolean}[] = [];
  let remaining = 150;
  let truncated = isTruncated;
  
  for (let i = 0; i < merged.length; i++) {
    if (finalSegments.length >= 10) {
      truncated = true;
      break;
    }
    const s = merged[i];
    if (s.text.length > remaining) {
      finalSegments.push({ text: s.text.substring(0, remaining), highlighted: s.highlighted });
      truncated = true;
      break;
    }
    finalSegments.push(s);
    remaining -= s.text.length;
  }
  
  if (finalSegments.length === 0) {
    finalSegments.push({ text: '', highlighted: false });
  }
  
  return { segments: finalSegments, truncated };
}

function parseSnippet(rawText: string, startMarker: string, endMarker: string, ellipsisMarker: string) {
  let text = rawText;
  let truncated = false;
  
  if (text.includes(ellipsisMarker)) {
    truncated = true;
    text = text.replaceAll(ellipsisMarker, '...');
  }
  
  const segments: {text: string, highlighted: boolean}[] = [];
  let i = 0;
  let highlightOpen = false;
  while (i < text.length) {
    const marker = highlightOpen ? endMarker : startMarker;
    const idx = text.indexOf(marker, i);
    
    if (idx === -1) {
      if (i < text.length) {
        segments.push({ text: text.substring(i), highlighted: highlightOpen });
      }
      break;
    }
    
    if (idx > i) {
      segments.push({ text: text.substring(i, idx), highlighted: highlightOpen });
    }
    
    highlightOpen = !highlightOpen;
    i = idx + marker.length;
  }
  
  return constrainSegments(segments, truncated);
}

export async function executeSearch(db: D1Database, input: SearchInput) {
  const queryStr = input.q || '';
  const effectiveTokens = queryStr
    .normalize('NFC')
    .match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
    
  const tokens = effectiveTokens
    .slice(0, 32)
    .map(t => t.slice(0, 64));

  const isFilterOnly = tokens.length === 0;
  const currentMode = isFilterOnly ? 'filter' : 'keyword';

  const fingerprint = await generateFingerprint(input, tokens);

  let cursorData = null;
  if (input.cursor) {
    cursorData = decodeCursor(input.cursor, currentMode);
    if (!cursorData || cursorData.f !== fingerprint) {
      throw new AppError(
        400,
        'INVALID_CURSOR',
        'The cursor is invalid or incompatible with the search parameters.',
      );
    }
  }

  let ftsMatch = '';
  if (!isFilterOnly) {
    ftsMatch = tokens
      .map((t) => {
        const escaped = t.replace(/"/g, '""');
        return `"${escaped}"*`;
      })
      .join(' AND ');
  }

  const conditions = ['i.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (!isFilterOnly) {
    conditions.push('fts.item_search_fts MATCH ?');
    params.push(ftsMatch);
  }

  if (input.source) {
    conditions.push('i.source_type = ?');
    params.push(input.source);
  }

  if (input.project) {
    conditions.push('i.project = ?');
    params.push(input.project);
  }

  if (input.lifecycle_status) {
    conditions.push('i.lifecycle_status = ?');
    params.push(input.lifecycle_status);
  }

  if (input.processing_status) {
    conditions.push('i.processing_status = ?');
    params.push(input.processing_status);
  }

  if (input.importance_min !== undefined) {
    conditions.push('i.importance >= ?');
    params.push(input.importance_min);
  }

  if (input.importance_max !== undefined) {
    conditions.push('i.importance <= ?');
    params.push(input.importance_max);
  }

  if (input.captured_from) {
    conditions.push('i.captured_at >= ?');
    params.push(input.captured_from);
  }

  let cutoff = new Date().toISOString();
  if (cursorData && cursorData.c) {
    cutoff = cursorData.c;
  } else if (input.captured_to) {
    cutoff = input.captured_to;
  }
  conditions.push('i.captured_at <= ?');
  params.push(cutoff);

  if (cursorData) {
    if (!isFilterOnly && cursorData.r !== undefined) {
      conditions.push(
        `(bm25(fts.item_search_fts) > ? OR (bm25(fts.item_search_fts) = ? AND i.captured_at < ?) OR (bm25(fts.item_search_fts) = ? AND i.captured_at = ? AND i.id > ?))`,
      );
      params.push(
        cursorData.r,
        cursorData.r,
        cursorData.t,
        cursorData.r,
        cursorData.t,
        cursorData.i,
      );
    } else {
      conditions.push(
        `(i.captured_at < ? OR (i.captured_at = ? AND i.id > ?))`,
      );
      params.push(cursorData.t, cursorData.t, cursorData.i);
    }
  }

  const limit = input.limit ?? 25;
  params.push(limit + 1); 

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = !isFilterOnly
    ? 'ORDER BY bm25(fts.item_search_fts) ASC, i.captured_at DESC, i.id ASC'
    : 'ORDER BY i.captured_at DESC, i.id ASC';

  const nonce = crypto.randomUUID();
  const startMarker = `\uE000${nonce}:start\uE000`;
  const endMarker = `\uE001${nonce}:end\uE001`;
  const ellipsisMarker = `\uE002${nonce}:ellipsis\uE002`;

  const selectFts = !isFilterOnly
    ? `bm25(fts.item_search_fts) AS rank, snippet(fts.item_search_fts, -1, '${startMarker}', '${endMarker}', '${ellipsisMarker}', 64) AS fts_snippet`
    : `NULL AS rank, NULL AS fts_snippet`;

  const query = `
    SELECT 
      i.id, i.title, i.source_type, i.source_app, i.project, i.topics_json,
      i.importance, i.lifecycle_status, i.processing_status, i.privacy_level, i.captured_at, i.coverage,
      i.summary, i.user_note, i.raw_text,
      ${selectFts}
    FROM items i
    ${!isFilterOnly ? 'JOIN item_search_fts fts ON fts.item_id = i.id' : ''}
    ${whereClause}
    ${orderClause}
    LIMIT ?
  `;

  const startTime = Date.now();
  const queryResult = await db
    .prepare(query)
    .bind(...params)
    .all();
  const durationMs = Date.now() - startTime;

  if (queryResult.error) {
    throw new AppError(
      500,
      'DATABASE_ERROR',
      'A database error occurred during search.',
    );
  }

  const results = queryResult.results ?? [];

  if (results.length === 0) {
    return { data: [], meta: { count: 0, duration_ms: durationMs } };
  }

  const hasNextPage = results.length > limit;
  const pageResults = hasNextPage ? results.slice(0, limit) : results;

  let nextCursor: string | null = null;
  if (hasNextPage) {
    const last = pageResults[pageResults.length - 1] as Record<string, unknown>;
    nextCursor = encodeCursor({
      v: 1,
      mode: currentMode,
      r: last.rank as number | undefined,
      t: last.captured_at as string,
      i: last.id as string,
      f: fingerprint,
      c: cutoff,
    });
  }

  const mappedData = pageResults.map((r: Record<string, unknown>) => {
    let snippet;

    if (r.fts_snippet) {
      snippet = parseSnippet(r.fts_snippet as string, startMarker, endMarker, ellipsisMarker);
    } else {
      const fallbackText = (r.summary || r.user_note || r.title || r.raw_text || '') as string;
      snippet = constrainSegments([{text: fallbackText, highlighted: false}], false);
    }

    return {
      id: r.id,
      title: r.title,
      source_type: r.source_type,
      source_app: r.source_app,
      project: r.project,
      topics: parseTopics(r.topics_json as string | null),
      importance: r.importance,
      lifecycle_status: r.lifecycle_status,
      processing_status: r.processing_status,
      privacy_level: r.privacy_level,
      captured_at: r.captured_at,
      coverage: r.coverage,
      snippet,
    };
  });

  return {
    data: mappedData,
    meta: {
      count: pageResults.length,
      duration_ms: durationMs,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    },
  };
}
