import { describe, expect, it, vi } from 'vitest';

import { stagingFetch, stagingScheduled } from '../src/bg29-staging-entry';
import { BACKGROUND_CRON } from '../src/digests/digest-schedule';

function bindings(): Cloudflare.Env {
  return {
    DB: { sentinel: 'isolated staging only' },
    ATTACHMENTS: { sentinel: 'uncreated R2 binding only' },
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    DIGEST_AI_ENABLED: 'false',
    HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
    WEB_INBOX_BASE_URL: 'https://invalid.test',
  } as unknown as Cloudflare.Env;
}

describe('BG-29.078 isolated staging Worker entry', () => {
  it('does not serve production HTTP routes, assets or any fixture download', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    try {
      for (const route of ['/', '/api/items', '/api/attachments', '/capture']) {
        const response = stagingFetch(
          new Request(`https://bg29-staging.invalid${route}`),
          bindings(),
        );
        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
      }
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('fails closed for an unexpected provider credential before HTTP handling', () => {
    expect(() =>
      stagingFetch(new Request('https://bg29-staging.invalid/'), {
        ...bindings(),
        NOTION_ACCESS_TOKEN: 'should-fail',
      } as Cloudflare.Env),
    ).toThrow('BG29_STAGING_EGRESS_DENIED');
  });

  it('rejects unapproved Cron before scheduling work or making network calls', async () => {
    const waitUntil = vi.fn();
    const outbound = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(
        stagingScheduled(
          {
            cron: '0 0 * * *',
            scheduledTime: Date.now(),
          } as ScheduledController,
          bindings(),
          { waitUntil } as unknown as ExecutionContext,
        ),
      ).rejects.toThrow('BG29_STAGING_EGRESS_DENIED');
      expect(waitUntil).not.toHaveBeenCalled();
      expect(outbound).not.toHaveBeenCalled();
      expect(BACKGROUND_CRON).toBe('17 * * * *');
    } finally {
      outbound.mockRestore();
    }
  });
});
