import { describe, expect, it, vi } from 'vitest';

import {
  TelegramClient,
  TelegramDeliveryError,
} from '../src/digests/telegram.client';

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function expectTelegramError(
  promise: Promise<unknown>,
  code: string,
  disposition: string,
): Promise<TelegramDeliveryError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TelegramDeliveryError);
    const telegramError = error as TelegramDeliveryError;
    expect(telegramError.code).toBe(code);
    expect(telegramError.disposition).toBe(disposition);
    return telegramError;
  }
  throw new Error('Expected TelegramDeliveryError');
}

describe('TelegramClient', () => {
  it('stores the returned Telegram message ID without enabling Markdown', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: true, result: { message_id: 42 } }),
      );
    const client = new TelegramClient('token', 'chat', { fetcher });

    await expect(client.sendMessage('Plain text')).resolves.toBe('42');
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      chat_id: 'chat',
      text: 'Plain text',
      disable_web_page_preview: true,
    });
  });

  it('honors Telegram retry_after for 429 responses', async () => {
    const now = new Date('2026-08-03T00:00:00.000Z');
    const client = new TelegramClient('token', 'chat', {
      now: () => now,
      fetcher: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { ok: false, error_code: 429, parameters: { retry_after: 12 } },
            429,
          ),
        ),
    });
    const error = await expectTelegramError(
      client.sendMessage('test'),
      'TELEGRAM_RATE_LIMITED',
      'retry',
    );
    expect(error.retryAt?.toISOString()).toBe('2026-08-03T00:00:12.000Z');
  });

  it.each([401, 403])(
    'treats HTTP %s as terminal authentication failure',
    async (status) => {
      const client = new TelegramClient('token', 'chat', {
        fetcher: vi
          .fn()
          .mockResolvedValue(
            jsonResponse({ ok: false, error_code: status }, status),
          ),
      });
      await expectTelegramError(
        client.sendMessage('test'),
        'TELEGRAM_AUTH_FAILED',
        'terminal',
      );
    },
  );

  it('retries definite provider failures and pre-send network failures', async () => {
    const unavailable = new TelegramClient('token', 'chat', {
      fetcher: vi.fn().mockResolvedValue(jsonResponse({ ok: false }, 503)),
    });
    await expectTelegramError(
      unavailable.sendMessage('test'),
      'TELEGRAM_PROVIDER_UNAVAILABLE',
      'retry',
    );

    const network = new TelegramClient('token', 'chat', {
      fetcher: vi.fn().mockRejectedValue(
        Object.assign(new TypeError('dns unavailable'), {
          code: 'ENOTFOUND',
        }),
      ),
    });
    await expectTelegramError(
      network.sendMessage('test'),
      'TELEGRAM_NETWORK_ERROR',
      'retry',
    );
  });

  it('marks unclassified network failures as ambiguous to avoid duplicate sends', async () => {
    const client = new TelegramClient('token', 'chat', {
      fetcher: vi.fn().mockRejectedValue(new TypeError('connection reset')),
    });
    await expectTelegramError(
      client.sendMessage('test'),
      'TELEGRAM_NETWORK_AMBIGUOUS',
      'unknown',
    );
  });

  it('marks timeout and malformed successful responses as unknown', async () => {
    const timeoutFetcher = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const timeout = new TelegramClient('token', 'chat', {
      fetcher: timeoutFetcher,
      timeoutMs: 1,
    });
    await expectTelegramError(
      timeout.sendMessage('test'),
      'TELEGRAM_TIMEOUT_AMBIGUOUS',
      'unknown',
    );

    const malformed = new TelegramClient('token', 'chat', {
      fetcher: vi
        .fn()
        .mockResolvedValue(new Response('not-json', { status: 200 })),
    });
    await expectTelegramError(
      malformed.sendMessage('test'),
      'TELEGRAM_RESPONSE_AMBIGUOUS',
      'unknown',
    );
  });

  it('fails closed when Telegram configuration is missing', async () => {
    const client = new TelegramClient(undefined, '', {
      fetcher: vi.fn(),
    });
    await expectTelegramError(
      client.sendMessage('test'),
      'TELEGRAM_CONFIGURATION_MISSING',
      'terminal',
    );
  });
});
