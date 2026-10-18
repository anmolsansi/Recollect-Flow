import { describe, expect, it, vi } from 'vitest';

import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import {
  assertBg29StagingBindings,
  createBg29StagingScheduler,
} from '../src/bg29-staging-scheduler';

function safeEnv(): Cloudflare.Env {
  return {
    DB: { sentinel: 'staging-d1-only' },
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    DIGEST_AI_ENABLED: 'false',
    HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
    WEB_INBOX_BASE_URL: 'https://invalid.test',
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
  } as unknown as Cloudflare.Env;
}

function control(cron = BACKGROUND_CRON): ScheduledController {
  return {
    cron,
    scheduledTime: Date.parse('2026-10-18T02:17:37.889Z'),
    noRetry: vi.fn(),
  } as unknown as ScheduledController;
}

describe('BG-29.078 Step 4 fail-closed staging scheduler', () => {
  it('only accepts exactly reviewed staging bindings and deterministic mock-only provider config', () => {
    expect(() => assertBg29StagingBindings(safeEnv())).not.toThrow();

    const threats: Array<Record<string, unknown>> = [
      { OPENROUTER_API_KEY: 'real-key' },
      { NOTION_ACCESS_TOKEN: 'real-notion-key' },
      { NOTION_DATABASE_ID: 'real-database' },
      { TELEGRAM_BOT_TOKEN: 'real-telegram-token' },
      { TELEGRAM_CHAT_ID: 'real-chat' },
      { AI: { run: vi.fn() } },
      { ASSETS: { fetch: vi.fn() } },
      { DB: undefined },
      { MOCK_AI_ENABLED: 'false' },
      { AI_PROVIDERS_ENABLED: 'cloudflare' },
      { AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"openrouter"}' },
      {
        AI_PROVIDER_IMPLEMENTATIONS:
          '{"openrouter":"mock","gemini":"cloudflare"}',
      },
      { AI_PROVIDER_IMPLEMENTATIONS: 'not-json' },
      { DIGEST_AI_ENABLED: 'true' },
      { HOSTED_BACKUP_AUTOCREATE_ENABLED: 'true' },
      { WEB_INBOX_BASE_URL: 'https://real-user.example' },
      { MAX_ATTACHMENT_BYTES: '50000000' },
      { UPLOAD_TTL_SECONDS: '0' },
    ];

    for (const threat of threats) {
      expect(
        () =>
          assertBg29StagingBindings({
            ...safeEnv(),
            ...threat,
          } as Cloudflare.Env),
        JSON.stringify(Object.keys(threat)),
      ).toThrow('BG29_STAGING_EGRESS_DENIED');
    }

    const hidden = safeEnv();
    Object.defineProperty(hidden, 'NOTION_ACCESS_TOKEN', {
      value: 'hidden-secret',
      enumerable: false,
    });
    expect(() => assertBg29StagingBindings(hidden)).toThrow(
      'BG29_STAGING_EGRESS_DENIED',
    );
    const symbolBinding = safeEnv();
    Object.defineProperty(symbolBinding, Symbol('not-reviewed'), {
      value: 'secret',
    });
    expect(() => assertBg29StagingBindings(symbolBinding)).toThrow(
      'BG29_STAGING_EGRESS_DENIED',
    );
  });

  it('rejects an unexpected Cron, swapped D1, or mutated credentials before dispatch and before network', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('LIVE_EGRESS_MUST_NOT_RUN'));
    try {
      const env = safeEnv();
      const scheduler = createBg29StagingScheduler(env);
      const waitUntil = vi.fn();
      const context = { waitUntil } as unknown as ExecutionContext;
      await expect(
        scheduler.scheduled(control('0 2 * * *'), env, context),
      ).rejects.toThrow('BG29_STAGING_EGRESS_DENIED');
      await expect(
        scheduler.scheduled(
          control(),
          { ...env, DB: {} } as Cloudflare.Env,
          context,
        ),
      ).rejects.toThrow('BG29_STAGING_EGRESS_DENIED');
      await expect(
        scheduler.scheduled(
          control(),
          { ...env, TELEGRAM_BOT_TOKEN: 'real-secret' } as Cloudflare.Env,
          context,
        ),
      ).rejects.toThrow('BG29_STAGING_EGRESS_DENIED');
      expect(waitUntil).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(scheduler.notionPages()).toEqual([]);
      expect(scheduler.notionRequests()).toEqual([]);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
