import type { Env } from '../../env';
import { processEnrichJobs } from '../enrich.worker';
import { AiProviderRegistry } from './ai-provider.registry';
import { MockAiAdapter } from './mock-ai.adapter';

/**
 * MC-04 uses the existing production EnrichService/worker and registered
 * MockAiAdapter. No substitute enrichment result is written directly.
 *
 * This allowlist is deliberately the same 12 URL + 12 file identities as the
 * MC-03 Notion mock; the separate stages are joined in later roadmap steps.
 */
export const BG29_STAGING_AI_CAPTURE_IDS = Object.freeze([
  ...Array.from(
    { length: 12 },
    (_, i) => `bg29-078-url-${String(i + 1).padStart(2, '0')}`,
  ),
  ...Array.from(
    { length: 12 },
    (_, i) => `bg29-078-file-${String(i + 1).padStart(2, '0')}`,
  ),
]);

const MOCK_PROVIDER_NAMES = ['openrouter', 'cloudflare', 'gemini'] as const;

/**
 * Only the caller's isolated D1 is carried into this environment. Do not
 * spread a real Cloudflare.Env: that could accidentally include tokens,
 * Workers AI bindings, live provider implementations or other resources.
 */
export function createBg29StagingEnrichmentHarness(db: D1Database) {
  const isolatedEnv = Object.freeze({
    DB: db,
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDERS_ENABLED: MOCK_PROVIDER_NAMES.join(','),
    AI_PROVIDER_IMPLEMENTATIONS: JSON.stringify({
      openrouter: 'mock',
      cloudflare: 'mock',
      gemini: 'mock',
    }),
  }) as unknown as Env;

  // Fail closed if a future registry change makes any allowed provider real.
  // Production routing/policy and the EnrichService remain unchanged.
  const registry = new AiProviderRegistry(isolatedEnv);
  for (const name of MOCK_PROVIDER_NAMES) {
    if (!(registry.getAdapter(name) instanceof MockAiAdapter)) {
      throw new Error('BG29_STAGING_AI_PROVIDER_NOT_MOCK');
    }
  }

  return Object.freeze({
    safetyProfile: () => ({
      bindings: Object.keys(isolatedEnv).sort(),
      providers: [...MOCK_PROVIDER_NAMES],
      mockOnly: true as const,
    }),
    run: (): Promise<void> => processEnrichJobs(isolatedEnv),
  });
}
