const NOTION_API_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_TIMEOUT_MS = 15_000;

export class NotionPurgeError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'NotionPurgeError';
  }
}

export class NotionPurgeService {
  constructor(
    private readonly token: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async archivePage(pageId: string): Promise<'archived' | 'already_missing'> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(`${NOTION_API_BASE_URL}/pages/${pageId}`, {
        method: 'PATCH',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      });
    } catch {
      if (controller.signal.aborted) {
        throw new NotionPurgeError('NOTION_PURGE_TIMEOUT', true);
      }
      throw new NotionPurgeError('NOTION_PURGE_NETWORK_ERROR', true);
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) return 'archived';
    if (response.status === 404) return 'already_missing';
    if (response.status === 429 || response.status === 529) {
      throw new NotionPurgeError('NOTION_PURGE_RATE_LIMITED', true);
    }
    if (response.status >= 500) {
      throw new NotionPurgeError('NOTION_PURGE_PROVIDER_UNAVAILABLE', true);
    }
    throw new NotionPurgeError('NOTION_PURGE_REJECTED', false);
  }
}
