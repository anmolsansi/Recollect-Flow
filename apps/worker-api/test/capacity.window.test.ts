import { describe, expect, it } from 'vitest';

import type { CapacityWindowPolicy } from '../src/jobs/ai/capacity.types';
import { quotaWindowBoundary } from '../src/jobs/ai/capacity.window';

function policy(
  windowKind: CapacityWindowPolicy['windowKind'],
  durationMs: number,
): CapacityWindowPolicy {
  return {
    provider: 'openrouter',
    scopeKey: 'free-model-account-pool',
    windowKind,
    durationMs,
    limit: { requests: 20 },
  };
}

describe('OPE-227 quota windows', () => {
  it('aligns minute windows to the UTC minute boundary', () => {
    const boundary = quotaWindowBoundary(
      policy('minute', 60_000),
      new Date('2026-08-09T23:59:42.123Z'),
    );
    expect(boundary.start).toBe('2026-08-09T23:59:00.000Z');
    expect(boundary.end).toBe('2026-08-10T00:00:00.000Z');
  });

  it('aligns daily windows to UTC midnight', () => {
    const boundary = quotaWindowBoundary(
      policy('day', 24 * 60 * 60_000),
      new Date('2026-08-09T23:59:59.999Z'),
    );
    expect(boundary.start).toBe('2026-08-09T00:00:00.000Z');
    expect(boundary.end).toBe('2026-08-10T00:00:00.000Z');
  });

  it('moves to a fresh daily key exactly at the reset boundary', () => {
    const daily = policy('day', 24 * 60 * 60_000);
    const before = quotaWindowBoundary(
      daily,
      new Date('2026-08-09T23:59:59.999Z'),
    );
    const after = quotaWindowBoundary(
      daily,
      new Date('2026-08-10T00:00:00.000Z'),
    );
    expect(after.key).not.toBe(before.key);
    expect(after.start).toBe(before.end);
  });

  it('uses deterministic epoch buckets for custom windows', () => {
    const boundary = quotaWindowBoundary(
      policy('custom', 5 * 60_000),
      new Date('2026-08-09T12:07:45.000Z'),
    );
    expect(boundary.start).toBe('2026-08-09T12:05:00.000Z');
    expect(boundary.end).toBe('2026-08-09T12:10:00.000Z');
  });
});
