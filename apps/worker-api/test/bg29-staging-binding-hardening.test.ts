import { describe, expect, it, vi } from 'vitest';

import { stagingFetch } from '../src/bg29-staging-entry';
import { assertBg29StagingBindings } from '../src/bg29-staging-scheduler';
import { createBg29StagingSourceFetcher } from '../src/jobs/extraction/bg29-staging-source';

function cleanBindings(): Cloudflare.Env {
  return {
    DB: { sentinel: 'dedicated-test-D1' },
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

describe('BG-29 Step 6 inherited binding and network isolation', () => {
  it('rejects a prototype-inherited credential before using any staging binding', () => {
    const infected = { ...cleanBindings() };
    Object.setPrototypeOf(infected, { NOTION_ACCESS_TOKEN: 'real-secret' });
    expect(() => assertBg29StagingBindings(infected)).toThrow(
      'BG29_STAGING_EGRESS_DENIED',
    );
    const clean = Object.assign(Object.create(null) as Cloudflare.Env, cleanBindings());
    expect(() => assertBg29StagingBindings(clean)).not.toThrow();
  });

  it('rejects binding accessors without executing their code', () => {
    const bindings = cleanBindings();
    const secretGetter = vi.fn(() => 'secret');
    Object.defineProperty(bindings, 'DB', { get: secretGetter, enumerable: true });
    expect(() => assertBg29StagingBindings(bindings)).toThrow(
      'BG29_STAGING_EGRESS_DENIED',
    );
    expect(secretGetter).not.toHaveBeenCalled();
  });

  it('never delegates unexpected URLs or HTTP routes to real network fetch', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('UNAUTHORIZED_NETWORK'),
    );
    try {
      const fixture = createBg29StagingSourceFetcher();
      for (const source of [
        'https://example.com/bg29-078/source-01?send=1',
        'https://sub.example.com/bg29-078/source-01',
        'https://api.notion.com/v1/pages',
        'https://example.com@other.example/bg29-078/source-01',
      ]) {
        expect((await fixture.fetch(source)).status).toBe('destination_blocked');
      }
      for (const pathname of ['/api/items', '/api/notifications', '/capture']) {
        expect(stagingFetch(new Request(`https://unused.invalid${pathname}`), cleanBindings()).status).toBe(404);
      }
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
