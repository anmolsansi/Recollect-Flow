import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicatePagesError,
  NotFoundError,
  NotionSyncError,
  NotionSyncService,
  RateLimitError,
} from '../src/sync/notion-sync.service';
import type { NotionItemPayload } from '../src/sync/notion-sync.service';

const item: NotionItemPayload = {
  id: 'item-123',
  title: 'Test Article',
  sourceApp: 'Safari',
  sourceType: 'url',
  sourceUrl: 'https://example.com',
  capturedAt: '2026-07-30T00:00:00.000Z',
  privacyLevel: 'public',
  userNote: 'Read this later',
  summary: 'A grounded summary',
  lifecycleStatus: 'Inbox',
  processingStatus: 'complete',
  coverage: 'METADATA',
  projectionVersion: 1,
  projectionHash: 'hash-123',
  syncedAt: '2026-07-30T00:01:00.000Z',
};

function response(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('NotionSyncService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('queries by exact Capture ID before creating a page', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ results: [], has_more: false }))
      .mockResolvedValueOnce(response({ id: 'new-page-id' }));
    const result = await new NotionSyncService(
      'test-token',
      'test-db-id',
      fetcher,
    ).syncItem(item);
    expect(result).toEqual({ pageId: 'new-page-id', mode: 'created' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      'https://api.notion.com/v1/databases/test-db-id/query',
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      page_size: 2,
      filter: {
        property: 'Capture ID',
        rich_text: { equals: 'item-123' },
      },
    });
  });

  it('paces sequential requests to stay below the Notion request limit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    try {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response({ results: [], has_more: false }))
        .mockResolvedValueOnce(response({ id: 'new-page-id' }));
      const promise = new NotionSyncService(
        'test-token',
        'test-db-id',
        fetcher,
        15_000,
        350,
      ).syncItem(item);

      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(349);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(promise).resolves.toEqual({
        pageId: 'new-page-id',
        mode: 'created',
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('invokes native-compatible fetch without a service receiver', async () => {
    const fetcher = async function (
      this: unknown,
      ...args: Parameters<typeof fetch>
    ): Promise<Response> {
      expect(this).toBeUndefined();
      expect(args[0]).toBe('https://api.notion.com/v1/pages/existing-page-id');
      return response({ id: 'existing-page-id' });
    };

    await new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem({
      ...item,
      notionPageId: 'existing-page-id',
    });
  });

  it('adopts one existing Capture ID page after an ambiguous create', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ results: [{ id: 'existing-id' }] }))
      .mockResolvedValueOnce(response({ id: 'existing-id' }));
    const result = await new NotionSyncService(
      'test-token',
      'test-db-id',
      fetcher,
    ).syncItem(item);
    expect(result).toEqual({ pageId: 'existing-id', mode: 'adopted' });
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      'https://api.notion.com/v1/pages/existing-id',
    );
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe('PATCH');
  });

  it('fails closed when more than one page has the Capture ID', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ results: [{ id: 'page-1' }, { id: 'page-2' }] }),
      );
    await expect(
      new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem(item),
    ).rejects.toBeInstanceOf(DuplicatePagesError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('updates an existing page without overwriting human-owned fields', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ id: 'existing-page-id' }));
    await new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem({
      ...item,
      notionPageId: 'existing-page-id',
    });
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
      properties: Record<string, unknown>;
    };
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(body.properties).not.toHaveProperty('Name');
    expect(body.properties).not.toHaveProperty('Status');
    expect(body.properties).not.toHaveProperty('Project');
    expect(body.properties).not.toHaveProperty('Topics');
    expect(body.properties).not.toHaveProperty('Importance');
    expect(body.properties).not.toHaveProperty('Review Date');
    expect(body.properties).toHaveProperty('Summary');
    expect(body.properties).toHaveProperty('Why Saved');
  });

  it('truncates rich text by Unicode code points at 2,000 characters', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ results: [] }))
      .mockResolvedValueOnce(response({ id: 'page-id' }));
    await new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem({
      ...item,
      summary: '😀'.repeat(2_001),
    });
    const body = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)) as {
      properties: {
        Summary: { rich_text: Array<{ text: { content: string } }> };
      };
    };
    expect(
      Array.from(body.properties.Summary.rich_text[0]!.text.content),
    ).toHaveLength(2_000);
  });

  it.each([429, 529] as const)(
    'treats HTTP %s and valid Retry-After as retryable',
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response({}, status, { 'Retry-After': '5' }));
      const promise = new NotionSyncService(
        'test-token',
        'test-db-id',
        fetcher,
      ).syncItem({ ...item, notionPageId: 'page-id' });
      await expect(promise).rejects.toBeInstanceOf(RateLimitError);
      await expect(promise).rejects.toHaveProperty('retryAfterSeconds', 5);
    },
  );

  it('uses a safe default for invalid Retry-After', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({}, 429, { 'Retry-After': 'not-a-date' }),
      );
    await expect(
      new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem({
        ...item,
        notionPageId: 'page-id',
      }),
    ).rejects.toHaveProperty('retryAfterSeconds', 60);
  });

  it('reports deleted pages with a stable safe code', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({}, 404));
    await expect(
      new NotionSyncService('test-token', 'test-db-id', fetcher).syncItem({
        ...item,
        notionPageId: 'deleted-page-id',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('classifies invalid properties as terminal without response-body leakage', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ message: 'secret provider details' }, 400),
      );
    const error = await new NotionSyncService(
      'test-token',
      'test-db-id',
      fetcher,
    )
      .syncItem({ ...item, notionPageId: 'page-id' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NotionSyncError);
    expect(error).toMatchObject({
      code: 'NOTION_INVALID_PROPERTY',
      retryable: false,
    });
    expect(String(error)).not.toContain('secret provider details');
  });

  it('aborts a request after the configured timeout', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    const promise = new NotionSyncService(
      'test-token',
      'test-db-id',
      fetcher,
      100,
    ).syncItem({ ...item, notionPageId: 'page-id' });
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'NOTION_TIMEOUT',
      retryable: true,
    });
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
    vi.useRealTimers();
  });
});
