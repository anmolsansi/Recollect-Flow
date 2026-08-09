import {
  CLOUDFLARE_NEURON_RATES,
  type CloudflareNeuronRate,
} from './capacity.policy';
import type {
  CapacityEstimate,
  CapacityProvider,
} from './capacity.types';

const DEFAULT_OUTPUT_TOKEN_RESERVE = 768;

export function estimateTextUnits(text: string): number {
  // The adapters already use the same conservative character heuristic. Keeping
  // admission and post-call accounting aligned avoids under-reserving by design.
  return Math.max(1, Math.ceil(text.length / 4));
}

function neuronsForTokens(
  inputUnits: number,
  outputUnits: number,
  rate: CloudflareNeuronRate,
): number {
  const input = (inputUnits * rate.inputPerMillion) / 1_000_000;
  const output = (outputUnits * rate.outputPerMillion) / 1_000_000;
  return Math.ceil(input + output);
}

export function estimateProviderUnits(
  provider: CapacityProvider,
  model: string,
  inputUnits: number,
  outputUnits: number,
): number {
  if (provider !== 'cloudflare') return 0;
  const rate = CLOUDFLARE_NEURON_RATES[model];
  if (!rate) return Number.MAX_SAFE_INTEGER;
  return neuronsForTokens(inputUnits, outputUnits, rate);
}

export function estimateCapacityForPrompt(
  provider: CapacityProvider,
  model: string,
  prompt: string,
  outputTokenReserve = DEFAULT_OUTPUT_TOKEN_RESERVE,
): CapacityEstimate {
  const inputUnits = estimateTextUnits(prompt);
  const outputUnits = Math.max(1, Math.ceil(outputTokenReserve));
  return {
    requests: 1,
    inputUnits,
    outputUnits,
    providerUnits: estimateProviderUnits(
      provider,
      model,
      inputUnits,
      outputUnits,
    ),
  };
}
