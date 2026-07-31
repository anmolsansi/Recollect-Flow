import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
} from './ai.interface';
import {
  DigestSummaryResultSchema,
  DigestSummaryResultJsonSchema,
} from './ai.schema';

import { WorkersAiAdapter } from './workers-ai.adapter';
import { AppError } from '../../shared/errors';
import { PolicyService } from '../../policy/policy.service';
import type {
  PrivacyLevel,
  Modality,
  AiProvider as PolicyAiProvider,
} from '../../policy/policy.service';
import { MockAiAdapter } from './mock-ai.adapter';
import { OpenRouterAdapter } from './openrouter.adapter';

export class AiProviderRegistry {
  private providers = new Map<string, AiProvider>();
  private policyService: PolicyService;

  constructor(private readonly env: Env) {
    this.policyService = new PolicyService();

    let implementations: Record<string, string> = {};
    if (this.env.AI_PROVIDER_IMPLEMENTATIONS) {
      try {
        implementations = JSON.parse(this.env.AI_PROVIDER_IMPLEMENTATIONS);
      } catch {
        // Fallback to empty if parse fails
      }
    }

    const enabledProviders = this.env.AI_PROVIDERS_ENABLED
      ? this.env.AI_PROVIDERS_ENABLED.split(',').map((s) => s.trim())
      : [];

    // Legacy fallback for tests
    if (this.env.MOCK_AI_ENABLED === 'true') {
      this.register(new MockAiAdapter('openrouter'));
      this.register(new MockAiAdapter('gemini'));
      this.register(new MockAiAdapter('cloudflare'));
    } else {
      // Dynamic registration
      for (const provider of enabledProviders) {
        const impl = implementations[provider] || provider;
        if (impl === 'cloudflare') {
          const adapter = new WorkersAiAdapter(env);
          adapter.name = provider; // Override name
          this.register(adapter);
        } else if (impl === 'openrouter') {
          const adapter = new OpenRouterAdapter(env);
          adapter.name = provider;
          this.register(adapter);
        } else if (impl === 'mock') {
          this.register(new MockAiAdapter(provider));
        }
      }
    }
  }

  register(provider: AiProvider) {
    this.providers.set(provider.name, provider);
  }

  private getProviderForPolicy(
    privacyLevel: PrivacyLevel,
    modality: Modality = 'text',
  ): AiProviderConfig | null {
    const availableProviders: PolicyAiProvider[] = [];

    // Derive available providers from registry
    for (const name of this.providers.keys()) {
      if (['openrouter', 'gemini', 'cloudflare'].includes(name)) {
        availableProviders.push(name as PolicyAiProvider);
      }
    }

    const requestedProvider = this.env.AI_PROVIDER_DEFAULT as
      PolicyAiProvider | undefined;

    const decision = this.policyService.route({
      privacyLevel,
      modality,
      availableProviders,
      requestedProvider,
    });

    if (decision.provider === 'none') {
      return null;
    }

    return { provider: decision.provider };
  }

  getAdapter(providerName: string): AiProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        `Provider ${providerName} is not implemented or disabled`,
      );
    }
    return provider;
  }

  async summarize(
    text: string,
    privacyLevel: PrivacyLevel,
  ): Promise<AiEnrichmentResult<SummaryResult>> {
    const config = this.getProviderForPolicy(privacyLevel);
    if (!config)
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        'No eligible AI provider for this privacy level',
      );
    return this.getAdapter(config.provider).summarize(text, config);
  }

  async classify(
    text: string,
    privacyLevel: PrivacyLevel,
  ): Promise<AiEnrichmentResult<ClassificationResult>> {
    const config = this.getProviderForPolicy(privacyLevel);
    if (!config)
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        'No eligible AI provider for this privacy level',
      );
    return this.getAdapter(config.provider).classify(text, config);
  }

  async extractData(
    text: string,
    privacyLevel: PrivacyLevel,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    const config = this.getProviderForPolicy(privacyLevel);
    if (!config)
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        'No eligible AI provider for this privacy level',
      );
    return this.getAdapter(config.provider).extractData(text, config);
  }

  async generateDigestSummary(prompt: string, privacyLevel: PrivacyLevel) {
    const config = this.getProviderForPolicy(privacyLevel);
    if (!config)
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        'No eligible AI provider for this privacy level',
      );
    return this.getAdapter(config.provider).extractStructured(
      prompt,
      DigestSummaryResultSchema,
      DigestSummaryResultJsonSchema,
      config,
    );
  }
}
