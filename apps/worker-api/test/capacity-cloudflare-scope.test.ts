import { describe, expect, it } from 'vitest';

import type { Env } from '../src/env';
import { getProviderCapacityPolicy } from '../src/jobs/ai/capacity.policy';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

describe('OPE-227 Cloudflare rate-limit scopes', () => {
  it('shares the text-generation minute pool across enrich and digest', () => {
    const runtimeEnv = {} as Env;
    const enrich = getProviderCapacityPolicy(
      runtimeEnv,
      'cloudflare',
      'enrich',
      MODEL,
    );
    const digest = getProviderCapacityPolicy(
      runtimeEnv,
      'cloudflare',
      'digest',
      MODEL,
    );

    expect(enrich?.windows[0]?.scopeKey).toBe(
      'workers-ai-free-allocation:text-generation',
    );
    expect(digest?.windows[0]?.scopeKey).toBe(
      'workers-ai-free-allocation:text-generation',
    );
    expect(enrich?.windows[0]?.limit.requests).toBe(300);
    expect(digest?.windows[0]?.limit.requests).toBe(300);
  });

  it('keeps image-to-text on its separate documented minute pool', () => {
    const vision = getProviderCapacityPolicy(
      {} as Env,
      'cloudflare',
      'vision_extract',
      '@cf/meta/llama-3.2-11b-vision-instruct',
    );

    expect(vision?.windows[0]?.scopeKey).toBe(
      'workers-ai-free-allocation:image-to-text',
    );
    expect(vision?.windows[0]?.limit.requests).toBe(720);
  });
});
