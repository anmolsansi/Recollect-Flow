import { describe, expect, it, vi } from 'vitest';

import { NotionIntegrityService } from '../src/recovery/notion-integrity.service';
import { NotionPurgeService } from '../src/recovery/notion-purge.service';

describe('first release without Notion credentials', () => {
  it.each([undefined, '', '   '])(
    'rejects integrity and purge calls without making a request (%s)',
    async (token) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        new NotionIntegrityService(token, fetcher).pageState('page-id'),
      ).rejects.toMatchObject({ code: 'NOTION_NOT_CONFIGURED' });
      await expect(
        new NotionPurgeService(token, fetcher).archivePage('page-id'),
      ).rejects.toMatchObject({
        code: 'NOTION_NOT_CONFIGURED',
        retryable: false,
      });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
