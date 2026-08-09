import { describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import type {
  AiEnrichmentResult,
  AiProviderConfig,
  ExtractResult,
} from '../src/jobs/ai/ai.interface';
import { AiProviderRegistry } from '../src/jobs/ai/ai-provider.registry';
import { MockAiAdapter } from '../src/jobs/ai/mock-ai.adapter';
import { AppError } from '../src/shared/errors';

function fallbackEnv(): Env {
  return {
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter,gemini,cloudflare',
    AI_PROVIDER_IMPLEMENTATIONS:
      '{"openrouter":"mock","gemini":"mock","cloudflare":"mock"}',
  } as Env;
}

class FailingOpenRouterAdapter extends MockAiAdapter {
  constructor() {
    super('openrouter');
  }

  override async extractData(
    _text: string,
    _config?: AiProviderConfig,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    throw Object.assign(
      new AppError(503, 'PROVIDER_HTTP_ERROR', 'Synthetic provider outage'),
      {
        provider: 'openrouter',
        model: 'openrouter/free',
        requestCount: 1,
        inputUnits: 10,
        outputUnits: 0,
      },
    );
  }
}

describe('OPE-227 policy-approved fallback routing', () => {
  it('uses only the explicit Public fallback order from PolicyService', () => {
    const registry = new AiProviderRegistry(fallbackEnv());
    expect(registry.getProviderPlan('public')).toEqual([
      { provider: 'openrouter' },
      { provider: 'gemini' },
    ]);
  });

  it('does not invent hosted fallbacks for Personal content', () => {
    const registry = new AiProviderRegistry(fallbackEnv());
    expect(
      registry.getProviderPlan({
        privacyLevel: 'personal',
        requestedProvider: 'openrouter',
        credentialSource: 'app_managed',
        hostedProcessingConsent: true,
        zeroDataRetentionEnforced: true,
        dataCollectionDenied: true,
      }),
    ).toEqual([{ provider: 'openrouter' }]);
  });

  it('keeps Sensitive content on the no-hosted-provider path', () => {
    const registry = new AiProviderRegistry(fallbackEnv());
    expect(registry.getProviderPlan('sensitive')).toEqual([]);
  });

  it('falls back after an eligible Public provider outage', async () => {
    const registry = new AiProviderRegistry(fallbackEnv());
    registry.register(new FailingOpenRouterAdapter());

    const result = await registry.extractData('normal public content', 'public');
    expect(result.provider).toBe('gemini');
    expect(result.result.summary).toBe('Mock summary');
  });
});
