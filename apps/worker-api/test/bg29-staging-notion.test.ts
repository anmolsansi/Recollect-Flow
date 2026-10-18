import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BG29_NOTION_CAPTURE_IDS,
  BG29_NOTION_DATABASE_ID,
  createBg29StagingNotionHarness,
} from '../src/sync/bg29-staging-notion';
import {
  NotionSyncService,
  RateLimitError,
  type NotionItemPayload,
} from '../src/sync/notion-sync.service';

const ITEM_ID = BG29_NOTION_CAPTURE_IDS[0]!;

function item(overrides: Partial<NotionItemPayload> = {}): NotionItemPayload {
  return {
    id: ITEM_ID,
    title: 'Synthetic item only',
    sourceApp: 'MC03 test',
    sourceType: 'url',
    capturedAt: '2026-10-18T00:00:00.000Z',
    privacyLevel: 'public',
    lifecycleStatus: 'Inbox',
    processingStatus: 'pending',
    coverage: 'URL_ONLY',
    projectionVersion: 1,
    projectionHash: 'test-hash-1',
    syncedAt: '2026-10-18T00:01:00.000Z',
    ...overrides,
  };
}

function service(fetcher: typeof fetch): NotionSyncService {
  return new NotionSyncService(
    'bg29-078-offline-only-token',
    BG29_NOTION_DATABASE_ID,
    fetcher,
    5_000,
    0,
  );
}

describe('BG-29.078 MC-03 offline Notion transport', () => {
  afterEach(() => vi.restoreAllMocks());

  it('processes create, exact-Capture-ID adoption and post-enrichment PATCH using real projection service', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('LIVE_NOTION_NETWORK_ATTEMPT');
      });
    try {
      const mock = createBg29StagingNotionHarness();
      const notion = service(mock.fetcher);
      expect(BG29_NOTION_CAPTURE_IDS).toHaveLength(24);
      expect(new Set(BG29_NOTION_CAPTURE_IDS).size).toBe(24);

      const first = await notion.syncItem(item());
      expect(first).toEqual({
        pageId: `bg29-mock-page-${ITEM_ID}`,
        mode: 'created',
      });
      const adopt = await notion.syncItem(
        item({ projectionHash: 'test-hash-2' }),
      );
      expect(adopt).toEqual({ pageId: first.pageId, mode: 'adopted' });
      const updated = await notion.syncItem(
        item({
          notionPageId: first.pageId,
          summary: 'Deterministic post-enrichment summary',
          projectionVersion: 2,
          projectionHash: 'test-hash-3',
        }),
      );
      expect(updated).toEqual({ pageId: first.pageId, mode: 'updated' });

      expect(mock.pages()).toEqual([
        {
          captureId: ITEM_ID,
          pageId: first.pageId,
          projectionVersion: 2,
          projectionHash: 'test-hash-3',
          createCount: 1,
          updateCount: 2,
        },
      ]);
      expect(
        mock.requests().map(({ method, status }) => [method, status]),
      ).toEqual([
        ['POST', 200],
        ['POST', 200],
        ['POST', 200],
        ['PATCH', 200],
        ['PATCH', 200],
      ]);
      expect(network).not.toHaveBeenCalled();

      // Returned ledgers cannot modify the mock's internal state.
      const returned = mock.pages();
      returned[0]!.projectionHash = 'tampered';
      expect(mock.pages()[0]?.projectionHash).toBe('test-hash-3');
    } finally {
      network.mockRestore();
    }
  });

  it('returns a real RateLimitError for a one-shot 429 and then recovers', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('LIVE_NOTION_NETWORK_ATTEMPT');
      });
    try {
      const mock = createBg29StagingNotionHarness({
        rateLimitOnceFor: ITEM_ID,
      });
      const notion = service(mock.fetcher);
      await expect(notion.syncItem(item())).rejects.toMatchObject({
        code: 'NOTION_RATE_LIMITED',
        retryable: true,
        status: 429,
        retryAfterSeconds: 5,
      } satisfies Partial<RateLimitError>);
      expect(await notion.syncItem(item())).toMatchObject({ mode: 'created' });
      expect(mock.pages()).toHaveLength(1);
      expect(mock.requests().filter((x) => x.status === 429)).toHaveLength(1);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('denies live Notion endpoints, arbitrary page IDs, tokens and unknown fixture IDs without egress', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('LIVE_NOTION_NETWORK_ATTEMPT');
      });
    try {
      const mock = createBg29StagingNotionHarness();
      for (const url of [
        'https://api.notion.com/v1/users/me',
        'https://api.notion.com/v1/pages/real-notion-page-id',
        'https://api.notion.com/v1/pages?override=1',
        'https://evil.example.com/v1/pages',
      ]) {
        await expect(mock.fetcher(url, { method: 'PATCH' })).rejects.toThrow(
          'BG29_STAGING_NOTION_EGRESS_DENIED',
        );
      }
      await expect(
        mock.fetcher('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer actual-user-token',
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: '{}',
        }),
      ).rejects.toThrow('BG29_STAGING_NOTION_EGRESS_DENIED');
      expect(() =>
        createBg29StagingNotionHarness({ rateLimitOnceFor: 'real-user-item' }),
      ).toThrow('not a fixture');
      expect(mock.requests()).toEqual([]);
      expect(mock.pages()).toEqual([]);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
