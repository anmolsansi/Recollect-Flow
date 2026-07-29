const NOTION_API_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const NOTION_TEXT_LIMIT = 2_000;
const NOTION_SELECT_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 350;

export interface NotionItemPayload {
  id: string;
  title?: string;
  sourceUrl?: string;
  sourceApp: string;
  sourceType: string;
  capturedAt: string;
  privacyLevel: string;
  userNote?: string;
  summary?: string;
  project?: string;
  topics?: string[];
  importance?: number;
  suggestedAction?: string;
  lifecycleStatus: string;
  processingStatus: string;
  coverage: string;
  reviewAt?: string;
  projectionVersion: number;
  projectionHash: string;
  notionPageId?: string;
  syncedAt: string;
}

export type NotionSyncMode = 'created' | 'updated' | 'adopted';

export interface NotionSyncResult {
  pageId: string;
  mode: NotionSyncMode;
}

export class NotionSyncError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = 'NotionSyncError';
  }
}

export class RateLimitError extends NotionSyncError {
  constructor(retryAfterSeconds: number, status: 429 | 529 = 429) {
    super('NOTION_RATE_LIMITED', true, status, retryAfterSeconds);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends NotionSyncError {
  constructor() {
    super('NOTION_PAGE_MISSING', false, 404);
    this.name = 'NotFoundError';
  }
}

export class DuplicatePagesError extends NotionSyncError {
  constructor() {
    super('NOTION_DUPLICATE_PAGES', false, 409);
    this.name = 'DuplicatePagesError';
  }
}

function truncateText(value: string, limit = NOTION_TEXT_LIMIT): string {
  return Array.from(value).slice(0, limit).join('');
}

function richText(value: string): Record<string, unknown> {
  return {
    rich_text: [{ type: 'text', text: { content: truncateText(value) } }],
  };
}

function title(value: string): Record<string, unknown> {
  return {
    title: [{ type: 'text', text: { content: truncateText(value) } }],
  };
}

function parseRetryAfter(value: string | null, now: Date): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }
  const date = new Date(value).getTime();
  if (Number.isFinite(date) && date > now.getTime()) {
    return Math.max(1, Math.ceil((date - now.getTime()) / 1_000));
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}

function requirePageId(value: unknown): string {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !value.id
  ) {
    throw new NotionSyncError('NOTION_INVALID_RESPONSE', true);
  }
  return value.id;
}

function boundedUrl(value: string): string {
  if (Array.from(value).length > NOTION_TEXT_LIMIT) {
    throw new NotionSyncError('NOTION_PROPERTY_LIMIT', false);
  }
  return value;
}

export class NotionSyncService {
  private nextRequestAt = 0;

  constructor(
    private readonly token: string,
    private readonly databaseId: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly minimumRequestIntervalMs: number = DEFAULT_MIN_REQUEST_INTERVAL_MS,
  ) {}

  async syncItem(item: NotionItemPayload): Promise<NotionSyncResult> {
    if (item.notionPageId) {
      await this.updatePage(
        item.notionPageId,
        this.buildMachineOwnedProperties(item),
      );
      return { pageId: item.notionPageId, mode: 'updated' };
    }

    const matches = await this.findPagesByCaptureId(item.id);
    if (matches.length > 1) throw new DuplicatePagesError();
    if (matches.length === 1) {
      const pageId = matches[0]!;
      await this.updatePage(pageId, this.buildMachineOwnedProperties(item));
      return { pageId, mode: 'adopted' };
    }

    const response = await this.request(`${NOTION_API_BASE_URL}/pages`, {
      method: 'POST',
      body: JSON.stringify({
        parent: { type: 'database_id', database_id: this.databaseId },
        properties: this.buildCreateProperties(item),
      }),
    });
    return { pageId: requirePageId(await response.json()), mode: 'created' };
  }

  private async findPagesByCaptureId(captureId: string): Promise<string[]> {
    const response = await this.request(
      `${NOTION_API_BASE_URL}/databases/${this.databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 2,
          filter: {
            property: 'Capture ID',
            rich_text: { equals: captureId },
          },
        }),
      },
      'query',
    );
    const data = (await response.json()) as unknown;
    if (
      !data ||
      typeof data !== 'object' ||
      !('results' in data) ||
      !Array.isArray(data.results)
    ) {
      throw new NotionSyncError('NOTION_INVALID_RESPONSE', true);
    }
    return data.results.map(requirePageId);
  }

  private async updatePage(
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    await this.request(`${NOTION_API_BASE_URL}/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  private buildCreateProperties(
    item: NotionItemPayload,
  ): Record<string, unknown> {
    const properties = this.buildMachineOwnedProperties(item);
    properties.Name = title(
      item.title ?? item.sourceUrl ?? `Recollect item ${item.id}`,
    );
    properties.Status = { select: { name: item.lifecycleStatus } };
    if (item.project) {
      properties.Project = {
        select: { name: truncateText(item.project, NOTION_SELECT_LIMIT) },
      };
    }
    if (item.topics?.length) {
      properties.Topics = {
        multi_select: item.topics.slice(0, 100).map((topic) => ({
          name: truncateText(topic, NOTION_SELECT_LIMIT),
        })),
      };
    }
    if (item.importance !== undefined) {
      properties.Importance = { number: item.importance };
    }
    if (item.reviewAt)
      properties['Review Date'] = { date: { start: item.reviewAt } };
    return properties;
  }

  private buildMachineOwnedProperties(
    item: NotionItemPayload,
  ): Record<string, unknown> {
    const properties: Record<string, unknown> = {
      'Capture ID': richText(item.id),
      'Source App': {
        select: { name: truncateText(item.sourceApp, NOTION_SELECT_LIMIT) },
      },
      'Source Type': {
        select: { name: truncateText(item.sourceType, NOTION_SELECT_LIMIT) },
      },
      'Captured At': { date: { start: item.capturedAt } },
      Privacy: {
        select: { name: truncateText(item.privacyLevel, NOTION_SELECT_LIMIT) },
      },
      Processing: {
        select: {
          name: truncateText(item.processingStatus, NOTION_SELECT_LIMIT),
        },
      },
      Coverage: {
        select: { name: truncateText(item.coverage, NOTION_SELECT_LIMIT) },
      },
      'Projection Version': { number: item.projectionVersion },
      'Projection Hash': richText(item.projectionHash),
      'Last Synced': { date: { start: item.syncedAt } },
      Duplicate: { checkbox: item.lifecycleStatus === 'Duplicate' },
      'Source URL': { url: item.sourceUrl ? boundedUrl(item.sourceUrl) : null },
      'Why Saved': item.userNote ? richText(item.userNote) : { rich_text: [] },
      Summary: item.summary ? richText(item.summary) : { rich_text: [] },
      'Suggested Action': item.suggestedAction
        ? richText(item.suggestedAction)
        : { rich_text: [] },
    };
    return properties;
  }

  private async request(
    url: string,
    init: RequestInit,
    operation: 'page' | 'query' = 'page',
  ): Promise<Response> {
    const now = Date.now();
    const scheduledAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt =
      scheduledAt + Math.max(0, this.minimumRequestIntervalMs);
    const delayMs = scheduledAt - now;
    if (delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      const fetcher = this.fetcher;
      response = await fetcher(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        throw new NotionSyncError('NOTION_TIMEOUT', true);
      }
      console.warn(
        JSON.stringify({
          event: 'notion_request_network_error',
          error_name:
            error instanceof Error ? error.name : 'NonErrorThrownValue',
        }),
      );
      throw new NotionSyncError('NOTION_NETWORK_ERROR', true);
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok) return response;
    if (response.status === 429 || response.status === 529) {
      throw new RateLimitError(
        parseRetryAfter(response.headers.get('Retry-After'), new Date()),
        response.status,
      );
    }
    if (response.status === 404 && operation === 'page') {
      throw new NotFoundError();
    }
    if (response.status === 400) {
      throw new NotionSyncError('NOTION_INVALID_PROPERTY', false, 400);
    }
    if (response.status === 401 || response.status === 403) {
      throw new NotionSyncError('NOTION_AUTH_FAILED', false, response.status);
    }
    if (response.status === 404) {
      throw new NotionSyncError(
        'NOTION_DESTINATION_NOT_FOUND',
        false,
        response.status,
      );
    }
    throw new NotionSyncError(
      response.status >= 500
        ? 'NOTION_PROVIDER_UNAVAILABLE'
        : 'NOTION_REQUEST_REJECTED',
      response.status >= 500,
      response.status,
    );
  }
}
