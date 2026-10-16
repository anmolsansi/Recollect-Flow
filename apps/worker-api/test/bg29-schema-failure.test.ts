import { describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { AiProviderRegistry } from '../src/jobs/ai/ai-provider.registry';
import { MockAiAdapter } from '../src/jobs/ai/mock-ai.adapter';
import type { ExtractResult } from '../src/jobs/ai/ai.interface';

function registryWithInvalidResult(value: unknown): AiProviderRegistry {
  const registry = new AiProviderRegistry({
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    MOCK_AI_ENABLED: 'true',
  } as Env);
  class InvalidProvider extends MockAiAdapter {
    override async extractData(text: string) {
      const valid = await super.extractData(text);
      return { ...valid, result: value as ExtractResult };
    }
  }
  registry.register(new InvalidProvider('openrouter'));
  return registry;
}

describe('BG-29 malformed AI output failure contract', () => {
  for (const [name, result] of [
    ['non-object response', '<script>secret response</script>'],
    ['missing mandatory fields', { title: 'synthetic' }],
    ['incorrect importance', {
      summary: 'synthetic', topics: [], people: [], companies: [],
      importance: 101, whyItMatters: 'bounded',
    }],
    ['unexpected extra fields', {
      summary: 'synthetic', topics: [], people: [], companies: [],
      importance: 5, whyItMatters: 'bounded',
      providerLeak: 'TOP_SECRET_FAKE_PAYLOAD',
    }],
  ] as const) {
    it(`rejects ${name} without copying untrusted fields to error metadata`, async () => {
      const rejection = registryWithInvalidResult(result).extractData(
        'synthetic test',
        'public',
      );
      await expect(rejection).rejects.toMatchObject({
        errorCode: 'AI_SCHEMA_INVALID',
        provider: 'openrouter',
      });
      await expect(rejection).rejects.not.toThrow(/TOP_SECRET_FAKE_PAYLOAD|script>/);
    });
  }

  it('preserves already-valid mock adapter behavior', async () => {
    const registry = new AiProviderRegistry({
      AI_PROVIDER_DEFAULT: 'openrouter',
      AI_PROVIDERS_ENABLED: 'openrouter',
      AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
      MOCK_AI_ENABLED: 'true',
    } as Env);
    const outcome = await registry.extractData('ordinary synthetic source', 'public');
    expect(outcome.result.summary).toBe('Mock summary');
    expect(outcome.result.importance).toBe(5);
  });
});
