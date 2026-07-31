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

    if (this.env.MOCK_AI_ENABLED === 'true') {
      this.register(new MockAiAdapter('openrouter'));
      this.register(new MockAiAdapter('gemini'));
      this.register(new MockAiAdapter('cloudflare'));
    } else {
      this.register(new WorkersAiAdapter(env));
      this.register(new OpenRouterAdapter(env));
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

    if (
      this.env.AI_PROVIDER_CLOUDFLARE_ENABLED === 'true' ||
      this.env.MOCK_AI_ENABLED === 'true'
    ) {
      availableProviders.push('cloudflare');
    }
    if (this.env.OPENROUTER_API_KEY || this.env.MOCK_AI_ENABLED === 'true') {
      availableProviders.push('openrouter');
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
