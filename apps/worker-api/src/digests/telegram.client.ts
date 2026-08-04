export type TelegramFailureDisposition = 'retry' | 'terminal' | 'unknown';

export class TelegramDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly disposition: TelegramFailureDisposition,
    public readonly retryAt?: Date,
  ) {
    super(code);
  }
}

const DEFINITE_PRE_SEND_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ERR_INVALID_URL',
]);

function definitePreSendFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const direct = 'code' in error ? String(error.code) : '';
  const cause =
    'cause' in error && error.cause && typeof error.cause === 'object'
      ? error.cause
      : null;
  const caused = cause && 'code' in cause ? String(cause.code) : '';
  return (
    DEFINITE_PRE_SEND_CODES.has(direct) || DEFINITE_PRE_SEND_CODES.has(caused)
  );
}

interface TelegramResponse {
  ok?: boolean;
  result?: { message_id?: number | string };
  error_code?: number;
  parameters?: { retry_after?: number };
}

function retryDate(
  response: TelegramResponse | null,
  header: string | null,
  now: Date,
): Date {
  const bodySeconds = response?.parameters?.retry_after;
  if (typeof bodySeconds === 'number' && bodySeconds > 0) {
    return new Date(now.getTime() + bodySeconds * 1_000);
  }
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(now.getTime() + seconds * 1_000);
    }
    const date = new Date(header);
    if (Number.isFinite(date.getTime()) && date > now) return date;
  }
  return new Date(now.getTime() + 60_000);
}

function classifyStatus(
  status: number,
  body: TelegramResponse | null,
  retryAfterHeader: string | null,
  now: Date,
): TelegramDeliveryError {
  const errorCode = body?.error_code ?? status;
  if (status === 429 || errorCode === 429) {
    return new TelegramDeliveryError(
      'TELEGRAM_RATE_LIMITED',
      'retry',
      retryDate(body, retryAfterHeader, now),
    );
  }
  if ([401, 403].includes(status) || [401, 403].includes(errorCode)) {
    return new TelegramDeliveryError('TELEGRAM_AUTH_FAILED', 'terminal');
  }
  if (status >= 500 || errorCode >= 500) {
    return new TelegramDeliveryError('TELEGRAM_PROVIDER_UNAVAILABLE', 'retry');
  }
  return new TelegramDeliveryError('TELEGRAM_REQUEST_REJECTED', 'terminal');
}

export interface TelegramClientOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}

export class TelegramClient {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly token: string | undefined,
    private readonly chatId: string | undefined,
    options: TelegramClientOptions = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.now = options.now ?? (() => new Date());
  }

  async sendMessage(text: string): Promise<string> {
    if (!this.token?.trim() || !this.chatId?.trim()) {
      throw new TelegramDeliveryError(
        'TELEGRAM_CONFIGURATION_MISSING',
        'terminal',
      );
    }
    if (!text.trim()) {
      throw new TelegramDeliveryError('TELEGRAM_EMPTY_MESSAGE', 'terminal');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            disable_web_page_preview: true,
          }),
        },
      );
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        throw new TelegramDeliveryError(
          'TELEGRAM_TIMEOUT_AMBIGUOUS',
          'unknown',
        );
      }
      if (definitePreSendFailure(error)) {
        throw new TelegramDeliveryError('TELEGRAM_NETWORK_ERROR', 'retry');
      }
      throw new TelegramDeliveryError('TELEGRAM_NETWORK_AMBIGUOUS', 'unknown');
    } finally {
      clearTimeout(timeout);
    }

    const rawBody = await response.text();
    let body: TelegramResponse | null = null;
    try {
      body = JSON.parse(rawBody) as TelegramResponse;
    } catch {
      if (response.ok) {
        throw new TelegramDeliveryError(
          'TELEGRAM_RESPONSE_AMBIGUOUS',
          'unknown',
        );
      }
    }

    if (!response.ok || body?.ok !== true) {
      throw classifyStatus(
        response.status,
        body,
        response.headers.get('Retry-After'),
        this.now(),
      );
    }

    const messageId = body.result?.message_id;
    if (typeof messageId !== 'number' && typeof messageId !== 'string') {
      throw new TelegramDeliveryError('TELEGRAM_RESPONSE_AMBIGUOUS', 'unknown');
    }
    return String(messageId);
  }
}
