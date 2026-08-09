import type { Env } from '../../env';
import {
  AI_CAPACITY_POLICY_VERSION,
  type CapacityOperation,
  type CapacityProvider,
  type CapacityWindowPolicy,
  type ProviderCapacityPolicy,
} from './capacity.types';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

const OPENROUTER_FREE_SCOPE = 'free-model-account-pool';
const CLOUDFLARE_FREE_SCOPE = 'workers-ai-free-allocation';

const CLOUDFLARE_PAID_REQUIRED_MODELS = new Set([
  '@cf/moonshotai/kimi-k2.6',
  '@cf/moonshotai/kimi-k2.7-code',
  '@cf/zai-org/glm-5.2',
]);

export interface CloudflareNeuronRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const CLOUDFLARE_NEURON_RATES: Readonly<
  Record<string, CloudflareNeuronRate>
> = {
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': {
    inputPerMillion: 4_119,
    outputPerMillion: 34_868,
  },
  '@cf/meta/llama-3.2-1b-instruct': {
    inputPerMillion: 2_457,
    outputPerMillion: 18_252,
  },
  '@cf/meta/llama-3.2-3b-instruct': {
    inputPerMillion: 4_625,
    outputPerMillion: 30_475,
  },
  '@cf/meta/llama-3.2-11b-vision-instruct': {
    inputPerMillion: 4_410,
    outputPerMillion: 61_493,
  },
};

function positiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function openRouterDailyLimit(env: Env): number {
  if (env.OPENROUTER_FREE_ACCOUNT_TIER === 'qualified') return 1_000;
  return 50;
}

function cloudflareDailyNeuronLimit(env: Env): number {
  const configured = positiveInteger(env.CLOUDFLARE_AI_FREE_DAILY_NEURONS);
  return Math.min(configured ?? 10_000, 10_000);
}

function requestWindow(
  provider: CapacityProvider,
  scopeKey: string,
  windowKind: 'minute' | 'day',
  durationMs: number,
  requests: number,
): CapacityWindowPolicy {
  return {
    provider,
    scopeKey,
    windowKind,
    durationMs,
    limit: { requests },
  };
}

function cloudflareDailyWindow(env: Env): CapacityWindowPolicy {
  return {
    provider: 'cloudflare',
    scopeKey: CLOUDFLARE_FREE_SCOPE,
    windowKind: 'day',
    durationMs: DAY_MS,
    limit: { providerUnits: cloudflareDailyNeuronLimit(env) },
  };
}

export function isOpenRouterFreeModel(model: string): boolean {
  return model === 'openrouter/free' || model.endsWith(':free');
}

export function isCloudflareZeroCostModel(model: string): boolean {
  return (
    !CLOUDFLARE_PAID_REQUIRED_MODELS.has(model) &&
    Object.hasOwn(CLOUDFLARE_NEURON_RATES, model)
  );
}

export function assertZeroCostModel(
  provider: CapacityProvider,
  model: string,
): boolean {
  if (provider === 'openrouter') return isOpenRouterFreeModel(model);
  if (provider === 'cloudflare') return isCloudflareZeroCostModel(model);
  return false;
}

export function getProviderCapacityPolicy(
  env: Env,
  provider: CapacityProvider,
  operation: CapacityOperation,
  model: string,
): ProviderCapacityPolicy | null {
  if (!assertZeroCostModel(provider, model)) return null;

  if (provider === 'openrouter') {
    return {
      provider,
      operation,
      freeModels: ['openrouter/free'],
      allowFreeRouter: true,
      windows: [
        requestWindow(provider, OPENROUTER_FREE_SCOPE, 'minute', MINUTE_MS, 20),
        requestWindow(
          provider,
          OPENROUTER_FREE_SCOPE,
          'day',
          DAY_MS,
          openRouterDailyLimit(env),
        ),
      ],
    };
  }

  if (provider === 'cloudflare') {
    const perMinute = operation === 'vision_extract' ? 720 : 300;
    return {
      provider,
      operation,
      freeModels: Object.keys(CLOUDFLARE_NEURON_RATES),
      windows: [
        requestWindow(
          provider,
          `${CLOUDFLARE_FREE_SCOPE}:${operation}`,
          'minute',
          MINUTE_MS,
          perMinute,
        ),
        cloudflareDailyWindow(env),
      ],
    };
  }

  return null;
}

export function capacityPolicyVersion(): string {
  return AI_CAPACITY_POLICY_VERSION;
}
