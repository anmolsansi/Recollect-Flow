import { describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { AiProviderRegistry } from '../src/jobs/ai/ai-provider.registry';
import { AppError } from '../src/shared/errors';

function testEnv(overrides: Partial<Env>): Env {
  return overrides as Env;
}

describe('AiProviderRegistry configuration', () => {
  it('selects the provider requested by the durable job snapshot', async () => {
    const registry = new AiProviderRegistry(
      testEnv({
        MOCK_AI_ENABLED: 'true',
        AI_PROVIDERS_ENABLED: 'openrouter,cloudflare',
        AI_PROVIDER_IMPLEMENTATIONS:
          '{"openrouter":"mock","cloudflare":"mock"}',
        AI_PROVIDER_DEFAULT: 'openrouter',
      }),
    );

    const result = await registry.extractData('public source', {
      privacyLevel: 'public',
      requestedProvider: 'cloudflare',
      credentialSource: 'app_managed',
    });
    expect(result.provider).toBe('cloudflare');
  });

  it('accepts canonical production adapter configuration', () => {
    const registry = new AiProviderRegistry(
      testEnv({
        AI_PROVIDERS_ENABLED: 'openrouter,cloudflare',
        AI_PROVIDER_IMPLEMENTATIONS:
          '{"openrouter":"openrouter","cloudflare":"cloudflare"}',
        AI_PROVIDER_DEFAULT: 'openrouter',
        OPENROUTER_API_KEY: 'test-openrouter-key',
      }),
    );

    expect(registry.getAdapter('openrouter').name).toBe('openrouter');
    expect(registry.getAdapter('cloudflare').name).toBe('cloudflare');
  });

  it('treats OpenRouter without a secret as unavailable', async () => {
    const registry = new AiProviderRegistry(
      testEnv({
        AI_PROVIDERS_ENABLED: 'openrouter',
        AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"openrouter"}',
        AI_PROVIDER_DEFAULT: 'openrouter',
      }),
    );

    await expect(
      registry.extractData('source', { privacyLevel: 'public' }),
    ).rejects.toMatchObject({ code: 'NO_ELIGIBLE_PROVIDER' });
  });

  it('fails closed when no provider is configured', async () => {
    const registry = new AiProviderRegistry(testEnv({}));

    await expect(
      registry.extractData('source', { privacyLevel: 'public' }),
    ).rejects.toMatchObject({ code: 'NO_ELIGIBLE_PROVIDER' });
  });

  it('rejects malformed or unsupported provider mappings', () => {
    expect(
      () =>
        new AiProviderRegistry(
          testEnv({
            AI_PROVIDERS_ENABLED: 'openrouter',
            AI_PROVIDER_IMPLEMENTATIONS: '{not-json',
          }),
        ),
    ).toThrowError(AppError);
    expect(
      () =>
        new AiProviderRegistry(
          testEnv({
            AI_PROVIDERS_ENABLED: 'openrouter',
            AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"unknown"}',
          }),
        ),
    ).toThrow(/Unsupported implementation/);
  });

  it('enforces personal-content consent from the job snapshot', async () => {
    const registry = new AiProviderRegistry(
      testEnv({
        MOCK_AI_ENABLED: 'true',
        AI_PROVIDERS_ENABLED: 'openrouter',
        AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
      }),
    );

    await expect(
      registry.extractData('personal source', {
        privacyLevel: 'personal',
        requestedProvider: 'openrouter',
        credentialSource: 'app_managed',
        hostedProcessingConsent: false,
        zeroDataRetentionEnforced: true,
        dataCollectionDenied: true,
      }),
    ).rejects.toMatchObject({ code: 'NO_ELIGIBLE_PROVIDER' });

    const result = await registry.extractData('personal source', {
      privacyLevel: 'personal',
      requestedProvider: 'openrouter',
      credentialSource: 'app_managed',
      hostedProcessingConsent: true,
      zeroDataRetentionEnforced: true,
      dataCollectionDenied: true,
    });
    expect(result.provider).toBe('openrouter');
  });
});
