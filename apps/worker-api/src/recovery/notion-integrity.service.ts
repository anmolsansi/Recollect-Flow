const NOTION_API_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_TIMEOUT_MS = 10_000;

export type NotionProjectionState = 'present' | 'missing';

export class NotionIntegrityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'NotionIntegrityError';
  }
}

export class NotionIntegrityService {
  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async pageState(pageId: string): Promise<NotionProjectionState> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(
        `${NOTION_API_BASE_URL}/pages/${pageId}`,
        {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Notion-Version': NOTION_VERSION,
          },
        },
      );
      if (response.ok) return 'present';
      if (response.status === 404) return 'missing';
      if (response.status === 429 || response.status === 529) {
        throw new NotionIntegrityError('NOTION_INTEGRITY_RATE_LIMITED');
      }
      if (response.status >= 500) {
        throw new NotionIntegrityError('NOTION_INTEGRITY_UNAVAILABLE');
      }
      throw new NotionIntegrityError('NOTION_INTEGRITY_REJECTED');
    } catch (error) {
      if (error instanceof NotionIntegrityError) throw error;
      if (controller.signal.aborted) {
        throw new NotionIntegrityError('NOTION_INTEGRITY_TIMEOUT');
      }
      throw new NotionIntegrityError('NOTION_INTEGRITY_NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }
}
