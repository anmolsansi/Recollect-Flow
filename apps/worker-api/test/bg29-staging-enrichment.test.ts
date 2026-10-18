import { describe, expect, it, vi } from 'vitest';

import {
  BG29_STAGING_AI_CAPTURE_IDS,
  createBg29StagingEnrichmentHarness,
} from '../src/jobs/ai/bg29-staging-enrichment';
import { BG29_NOTION_CAPTURE_IDS } from '../src/sync/bg29-staging-notion';

describe('BG-29.078 MC-04 mock-only AI environment', () => {
  it('has exactly 24 matching synthetic URL/file identities', () => {
    expect(BG29_STAGING_AI_CAPTURE_IDS).toHaveLength(24);
    expect(new Set(BG29_STAGING_AI_CAPTURE_IDS).size).toBe(24);
    expect(BG29_STAGING_AI_CAPTURE_IDS).toEqual(BG29_NOTION_CAPTURE_IDS);
  });

  it('only binds staging D1 and three existing MockAiAdapter providers', () => {
    const db = { sentinel: 'isolated-test-db' } as unknown as D1Database;
    const harness = createBg29StagingEnrichmentHarness(db);
    expect(harness.safetyProfile()).toEqual({
      bindings: [
        'AI_PROVIDER_IMPLEMENTATIONS',
        'AI_PROVIDERS_ENABLED',
        'DB',
        'MOCK_AI_ENABLED',
      ],
      providers: ['openrouter', 'cloudflare', 'gemini'],
      mockOnly: true,
    });

    expect(harness.safetyProfile().bindings).not.toContain('AI');
    expect(harness.safetyProfile().bindings).not.toContain(
      'OPENROUTER_API_KEY',
    );
    expect(harness.safetyProfile().bindings).not.toContain(
      'NOTION_ACCESS_TOKEN',
    );
    expect(harness.safetyProfile().bindings).not.toContain('ATTACHMENTS');
  });

  it('creating the harness never invokes fetch or a real Workers AI binding', () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        throw new Error('UNEXPECTED_PAID_OR_EXTERNAL_PROVIDER_CALL');
      });
    try {
      const db = {} as D1Database;
      const harness = createBg29StagingEnrichmentHarness(db);
      expect(harness.safetyProfile().mockOnly).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
