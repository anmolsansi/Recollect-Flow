import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
} from './ai.interface';
import { WorkersAiAdapter } from './workers-ai.adapter';
import { AppError } from '../../shared/errors';
import { PolicyService } from '../../policy/policy.service';
import type { PrivacyLevel, Modality } from '../../policy/policy.service';

export class AiProviderRegistry {
  private providers = new Map<string, AiProvider>();
  private policyService: PolicyService;

  constructor(private readonly env: Env) {
    this.policyService = new PolicyService();
    this.register(new WorkersAiAdapter(env));
  }

  register(provider: AiProvider) {
    this.providers.set(provider.name, provider);
  }

  private getProviderForPolicy(
    privacyLevel: PrivacyLevel,
    modality: Modality = 'text',
  ): AiProviderConfig | null {
    const decision = this.policyService.route({ privacyLevel, modality });
    if (decision.provider === 'none') {
      return null;
    }

    // Architect rule: Workers AI is disabled by default for now.
    // If the policy returns 'cloudflare' (if it were allowed), we check env.
    if (
      decision.provider === 'cloudflare' &&
      this.env.AI_PROVIDER_CLOUDFLARE_ENABLED !== 'true'
    ) {
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
}
