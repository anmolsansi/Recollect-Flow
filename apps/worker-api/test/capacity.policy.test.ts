import { describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import {
  assertZeroCostModel,
  getProviderCapacityPolicy,
} from '../src/jobs/ai/capacity.policy';

function testEnv(overrides: Partial<Env> = {}): Env {
  return overrides as Env;
}

describe('OPE-227 capacity policy', () => {
  it('models OpenRouter standard free quota as shared 20 RPM and 50 RPD', () => {
    const policy = getProviderCapacityPolicy(
      testEnv(),
      'openrouter',
      'enrich',
      'openrouter/free',
    );

    expect(policy?.windows).toHaveLength(2);
    expect(policy?.windows[0]?.limit.requests).toBe(20);
    expect(policy?.windows[1]?.limit.requests).toBe(50);
    expect(
      policy?.windows.every((window) => window.limit.inputUnits == null),
    ).toBe(true);
    expect(
      policy?.windows.every((window) => window.limit.outputUnits == null),
    ).toBe(true);
  });

  it('uses 1000 RPD only for explicitly qualified OpenRouter accounts', () => {
    const policy = getProviderCapacityPolicy(
      testEnv({ OPENROUTER_FREE_ACCOUNT_TIER: 'qualified' }),
      'openrouter',
      'enrich',
      'openrouter/free',
    );
    expect(policy?.windows[1]?.limit.requests).toBe(1_000);
  });

  it('fails closed for non-free OpenRouter model identifiers', () => {
    expect(assertZeroCostModel('openrouter', 'openai/gpt-5')).toBe(false);
    expect(
      getProviderCapacityPolicy(
        testEnv(),
        'openrouter',
        'enrich',
        'openai/gpt-5',
      ),
    ).toBeNull();
  });

  it('accepts explicit free OpenRouter variants', () => {
    expect(assertZeroCostModel('openrouter', 'example/model:free')).toBe(true);
  });

  it('clamps Cloudflare daily neuron guard to the free allocation', () => {
    const policy = getProviderCapacityPolicy(
      testEnv({ CLOUDFLARE_AI_FREE_DAILY_NEURONS: '999999' }),
      'cloudflare',
      'enrich',
      '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    );
    expect(policy?.windows[1]?.limit.providerUnits).toBe(10_000);
  });

  it('allows operators to choose a stricter Cloudflare daily cap', () => {
    const policy = getProviderCapacityPolicy(
      testEnv({ CLOUDFLARE_AI_FREE_DAILY_NEURONS: '7500' }),
      'cloudflare',
      'enrich',
      '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    );
    expect(policy?.windows[1]?.limit.providerUnits).toBe(7_500);
  });

  it('rejects Cloudflare models without an approved neuron-rate contract', () => {
    expect(assertZeroCostModel('cloudflare', '@cf/unknown/model')).toBe(false);
    expect(assertZeroCostModel('cloudflare', '@cf/moonshotai/kimi-k2.6')).toBe(
      false,
    );
  });

  it('keeps Gemini fail-closed until its free-tier execution contract exists', () => {
    expect(assertZeroCostModel('gemini', 'gemini-free')).toBe(false);
  });
});
