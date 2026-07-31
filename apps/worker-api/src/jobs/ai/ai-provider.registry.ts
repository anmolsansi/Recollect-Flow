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
  CredentialSource,
} from '../../policy/policy.service';
import { MockAiAdapter } from './mock-ai.adapter';
import { OpenRouterAdapter } from './openrouter.adapter';

const POLICY_PROVIDERS = ['openrouter', 'gemini', 'cloudflare'] as const;
type ConfiguredProvider = (typeof POLICY_PROVIDERS)[number];
type ProviderImplementation = 'openrouter' | 'cloudflare' | 'mock';

export interface AiRoutingContext {
  privacyLevel: PrivacyLevel;
  requestedProvider?: PolicyAiProvider;
  credentialSource?: CredentialSource;
  hostedProcessingConsent?: boolean;
  zeroDataRetentionEnforced?: boolean;
  dataCollectionDenied?: boolean;
}

function providerConfigError(message: string): never {
  throw new AppError(500, 'PROVIDER_CONFIG_ERROR', message);
}

function parseImplementations(value: string | undefined) {
  if (!value) return new Map<ConfiguredProvider, ProviderImplementation>();

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return providerConfigError(
      'AI_PROVIDER_IMPLEMENTATIONS must be valid JSON',
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return providerConfigError('AI_PROVIDER_IMPLEMENTATIONS must be an object');
  }

  const aliases: Record<string, ProviderImplementation> = {
    openrouter: 'openrouter',
    OpenRouterAdapter: 'openrouter',
    cloudflare: 'cloudflare',
    WorkersAiAdapter: 'cloudflare',
    mock: 'mock',
    MockAiAdapter: 'mock',
  };
  const result = new Map<ConfiguredProvider, ProviderImplementation>();
  for (const [provider, rawImplementation] of Object.entries(parsed)) {
    if (!POLICY_PROVIDERS.includes(provider as ConfiguredProvider)) {
      return providerConfigError(`Unsupported AI provider: ${provider}`);
    }
    if (typeof rawImplementation !== 'string' || !aliases[rawImplementation]) {
      return providerConfigError(
        `Unsupported implementation for AI provider ${provider}`,
      );
    }
    result.set(provider as ConfiguredProvider, aliases[rawImplementation]!);
  }
  return result;
}

function parseEnabledProviders(
  value: string | undefined,
): ConfiguredProvider[] {
  if (!value) return [];
  const providers = [
    ...new Set(value.split(',').map((entry) => entry.trim())),
  ].filter(Boolean);
  for (const provider of providers) {
    if (!POLICY_PROVIDERS.includes(provider as ConfiguredProvider)) {
      return providerConfigError(
        `Unsupported enabled AI provider: ${provider}`,
      );
    }
  }
  return providers as ConfiguredProvider[];
}

export class AiProviderRegistry {
  private providers = new Map<string, AiProvider>();
  private policyService: PolicyService;

  constructor(private readonly env: Env) {
    this.policyService = new PolicyService();

    const implementations = parseImplementations(
      this.env.AI_PROVIDER_IMPLEMENTATIONS,
    );
    let enabledProviders = parseEnabledProviders(this.env.AI_PROVIDERS_ENABLED);
    if (this.env.MOCK_AI_ENABLED === 'true' && enabledProviders.length === 0) {
      enabledProviders = [...POLICY_PROVIDERS];
    }

    for (const provider of enabledProviders) {
      const implementation =
        implementations.get(provider) ??
        (this.env.MOCK_AI_ENABLED === 'true' ? 'mock' : provider);
      if (implementation === 'mock') {
        if (this.env.MOCK_AI_ENABLED !== 'true') {
          providerConfigError('Mock AI adapters require MOCK_AI_ENABLED=true');
        }
        this.register(new MockAiAdapter(provider));
      } else if (implementation === 'cloudflare') {
        const adapter = new WorkersAiAdapter(env);
        adapter.name = provider;
        this.register(adapter);
      } else if (implementation === 'openrouter') {
        if (!this.env.OPENROUTER_API_KEY) continue;
        const adapter = new OpenRouterAdapter(env);
        adapter.name = provider;
        this.register(adapter);
      } else {
        providerConfigError(`No implementation configured for ${provider}`);
      }
    }
  }

  register(provider: AiProvider) {
    this.providers.set(provider.name, provider);
  }

  private getProviderForPolicy(
    routing: PrivacyLevel | AiRoutingContext,
    modality: Modality = 'text',
  ): AiProviderConfig | null {
    const availableProviders: PolicyAiProvider[] = [];

    // Derive available providers from registry
    for (const name of this.providers.keys()) {
      if (['openrouter', 'gemini', 'cloudflare'].includes(name)) {
        availableProviders.push(name as PolicyAiProvider);
      }
    }

    const context =
      typeof routing === 'string' ? { privacyLevel: routing } : routing;
    const requestedProvider =
      context.requestedProvider ??
      (this.env.AI_PROVIDER_DEFAULT as PolicyAiProvider | undefined);

    const decision = this.policyService.route({
      ...context,
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
    routing: PrivacyLevel | AiRoutingContext,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    const config = this.getProviderForPolicy(routing);
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
