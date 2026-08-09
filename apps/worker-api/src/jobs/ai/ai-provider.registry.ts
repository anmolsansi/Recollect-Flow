import type { Env } from '../../env';
import type {
  AiProvider,
  AiEnrichmentResult,
  AiProviderConfig,
  SummaryResult,
  ClassificationResult,
  ExtractResult,
  ImageExtractResult,
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
  RouteDecision,
} from '../../policy/policy.service';
import { MockAiAdapter } from './mock-ai.adapter';
import { OpenRouterAdapter } from './openrouter.adapter';
import { AiCapacityService } from './capacity.service';
import type { CapacityOperation, CapacityProvider } from './capacity.types';
import { isProviderFallbackEligible } from './provider-fallback';

const POLICY_PROVIDERS = ['openrouter', 'gemini', 'cloudflare'] as const;
type ConfiguredProvider = (typeof POLICY_PROVIDERS)[number];
type ProviderImplementation = 'openrouter' | 'cloudflare' | 'mock';

const DEFAULT_MODELS: Record<'openrouter' | 'cloudflare', string> = {
  openrouter: 'openrouter/free',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
};

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

function providerCallUsage(error: unknown) {
  if (!error || typeof error !== 'object') return {};
  const source = error as {
    requestCount?: unknown;
    inputUnits?: unknown;
    outputUnits?: unknown;
  };
  return {
    requests:
      typeof source.requestCount === 'number' ? source.requestCount : undefined,
    inputUnits:
      typeof source.inputUnits === 'number' ? source.inputUnits : undefined,
    outputUnits:
      typeof source.outputUnits === 'number' ? source.outputUnits : undefined,
  };
}

export class AiProviderRegistry {
  private providers = new Map<string, AiProvider>();
  private policyService: PolicyService;
  private capacityService: AiCapacityService | null;

  constructor(
    private readonly env: Env,
    db?: D1Database,
  ) {
    this.policyService = new PolicyService();
    const capacityDb = db ?? env.DB;
    this.capacityService = capacityDb
      ? new AiCapacityService(env, capacityDb)
      : null;

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

  private routeDecision(
    routing: PrivacyLevel | AiRoutingContext,
    modality: Modality,
  ): RouteDecision {
    const availableProviders: PolicyAiProvider[] = [];

    for (const [name, provider] of this.providers.entries()) {
      if (POLICY_PROVIDERS.includes(name as ConfiguredProvider)) {
        if (modality === 'image' && !provider.extractImage) continue;
        availableProviders.push(name as PolicyAiProvider);
      }
    }

    const context =
      typeof routing === 'string' ? { privacyLevel: routing } : routing;
    const requestedProvider =
      context.requestedProvider ??
      (this.env.AI_PROVIDER_DEFAULT as PolicyAiProvider | undefined);

    return this.policyService.route({
      ...context,
      modality,
      availableProviders,
      requestedProvider,
    });
  }

  public getProviderPlan(
    routing: PrivacyLevel | AiRoutingContext,
    modality: Modality = 'text',
  ): AiProviderConfig[] {
    const decision = this.routeDecision(routing, modality);
    if (decision.provider === 'none') return [];

    const candidates = [decision.provider, ...decision.fallbackProviders];
    return [...new Set(candidates)]
      .filter((provider): provider is ConfiguredProvider =>
        POLICY_PROVIDERS.includes(provider as ConfiguredProvider),
      )
      .filter((provider) => {
        const adapter = this.providers.get(provider);
        return Boolean(
          adapter && (modality !== 'image' || adapter.extractImage),
        );
      })
      .map((provider) => ({ provider }));
  }

  public getProviderForPolicy(
    routing: PrivacyLevel | AiRoutingContext,
    modality: Modality = 'text',
  ): AiProviderConfig | null {
    return this.getProviderPlan(routing, modality)[0] ?? null;
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

  private modelFor(provider: string): string {
    if (provider === 'openrouter' || provider === 'cloudflare') {
      return DEFAULT_MODELS[provider];
    }
    throw new AppError(
      503,
      'ZERO_COST_GUARD_REJECTED',
      'No approved zero-cost model is configured for this provider.',
    );
  }

  private async runWithCapacity<T>(
    config: AiProviderConfig,
    operation: CapacityOperation,
    capacityPrompt: string,
    requestReserve: number,
    execute: (config: AiProviderConfig) => Promise<AiEnrichmentResult<T>>,
  ): Promise<AiEnrichmentResult<T>> {
    if (this.env.MOCK_AI_ENABLED === 'true') {
      return execute(config);
    }
    if (!this.capacityService) {
      throw new AppError(
        500,
        'CAPACITY_GUARD_REQUIRED',
        'Non-mock AI execution requires the D1-backed capacity guard.',
      );
    }

    const provider = config.provider as CapacityProvider;
    const model = config.model ?? this.modelFor(provider);
    const guardedConfig = { ...config, model };
    const admission = await this.capacityService.admit(
      provider,
      operation,
      model,
      capacityPrompt,
      requestReserve,
    );

    try {
      const result = await execute(guardedConfig);
      await this.capacityService.completeSuccess(admission, {
        requests: result.requestCount ?? 1,
        inputUnits: result.inputUnits,
        outputUnits: result.outputUnits,
      });
      return result;
    } catch (error) {
      await this.capacityService.completeFailure(
        admission,
        error,
        providerCallUsage(error),
      );
      throw error;
    }
  }

  private async runProviderPlan<T>(
    plan: readonly AiProviderConfig[],
    operation: CapacityOperation,
    capacityPrompt: string,
    requestReserve: number,
    execute: (config: AiProviderConfig) => Promise<AiEnrichmentResult<T>>,
  ): Promise<AiEnrichmentResult<T>> {
    if (plan.length === 0) {
      throw new AppError(
        500,
        'NO_ELIGIBLE_PROVIDER',
        'No eligible AI provider for this privacy level',
      );
    }

    let lastError: unknown = null;
    for (let index = 0; index < plan.length; index += 1) {
      const config = plan[index]!;
      try {
        return await this.runWithCapacity(
          config,
          operation,
          capacityPrompt,
          requestReserve,
          execute,
        );
      } catch (error) {
        lastError = error;
        if (index === plan.length - 1 || !isProviderFallbackEligible(error)) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  async summarize(
    text: string,
    privacyLevel: PrivacyLevel,
  ): Promise<AiEnrichmentResult<SummaryResult>> {
    const plan = this.getProviderPlan(privacyLevel);
    const prompt = `Summarize the following text and extract key topics.\n\n${text}`;
    return this.runProviderPlan(plan, 'enrich', prompt, 2, (guarded) =>
      this.getAdapter(guarded.provider).summarize(text, guarded),
    );
  }

  async classify(
    text: string,
    privacyLevel: PrivacyLevel,
  ): Promise<AiEnrichmentResult<ClassificationResult>> {
    const plan = this.getProviderPlan(privacyLevel);
    const prompt = `Classify the following text and assign an importance score from 0 to 100.\n\n${text}`;
    return this.runProviderPlan(plan, 'enrich', prompt, 2, (guarded) =>
      this.getAdapter(guarded.provider).classify(text, guarded),
    );
  }

  async extractData(
    text: string,
    routing: PrivacyLevel | AiRoutingContext,
  ): Promise<AiEnrichmentResult<ExtractResult>> {
    const plan = this.getProviderPlan(routing);
    const prompt = `Analyze the following text and extract structured information according to the requested schema. Provide a title, summary, topics, people, companies, project suggestion, importance score (0-100), why it matters, and a suggested action.\n\n${text}`;
    return this.runProviderPlan(plan, 'enrich', prompt, 2, (guarded) =>
      this.getAdapter(guarded.provider).extractData(text, guarded),
    );
  }

  async generateDigestSummary(prompt: string, privacyLevel: PrivacyLevel) {
    const plan = this.getProviderPlan(privacyLevel);
    return this.runProviderPlan(plan, 'digest', prompt, 2, (guarded) =>
      this.getAdapter(guarded.provider).extractStructured(
        prompt,
        DigestSummaryResultSchema,
        DigestSummaryResultJsonSchema,
        guarded,
      ),
    );
  }

  async extractImage(
    dataUrl: string,
    contentType: string,
    prompt: string,
    routing: PrivacyLevel | AiRoutingContext,
  ): Promise<AiEnrichmentResult<ImageExtractResult>> {
    const plan = this.getProviderPlan(routing, 'image');
    return this.runProviderPlan(
      plan,
      'vision_extract',
      prompt,
      1,
      (guarded) => {
        const adapter = this.getAdapter(guarded.provider);
        if (!adapter.extractImage) {
          throw new AppError(
            500,
            'NO_ELIGIBLE_PROVIDER',
            'Provider does not support image extraction',
          );
        }
        return adapter.extractImage(dataUrl, contentType, prompt, guarded);
      },
    );
  }
}
