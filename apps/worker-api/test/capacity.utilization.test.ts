import { describe, expect, it } from 'vitest';

import type { CapacityWindowSnapshot } from '../src/jobs/ai/capacity.types';
import {
  capacityDimensions,
  capacityWarningLevel,
} from '../src/jobs/ai/capacity.utilization';

function windowAt(requestConsumed: number): CapacityWindowSnapshot {
  return {
    provider: 'openrouter',
    scopeKey: 'free-model-account-pool',
    windowKind: 'day',
    windowStart: '2026-08-09T00:00:00.000Z',
    windowEnd: '2026-08-10T00:00:00.000Z',
    requestLimit: 100,
    inputUnitLimit: null,
    outputUnitLimit: null,
    providerUnitLimit: null,
    requestReserved: 0,
    inputUnitsReserved: 0,
    outputUnitsReserved: 0,
    providerUnitsReserved: 0,
    requestConsumed,
    inputUnitsConsumed: 0,
    outputUnitsConsumed: 0,
    providerUnitsConsumed: 0,
  };
}

describe('OPE-227 capacity utilization', () => {
  it('stays normal below seventy percent', () => {
    expect(capacityWarningLevel(windowAt(69))).toBe('normal');
  });

  it('raises the seventy-percent warning at the boundary', () => {
    expect(capacityWarningLevel(windowAt(70))).toBe('warning_70');
  });

  it('raises the ninety-percent warning at the boundary', () => {
    expect(capacityWarningLevel(windowAt(90))).toBe('warning_90');
  });

  it('marks the hard threshold when the quota is fully consumed', () => {
    expect(capacityWarningLevel(windowAt(100))).toBe('hard');
  });

  it('includes active reservations in warning calculations', () => {
    const window = windowAt(65);
    window.requestReserved = 5;
    expect(capacityWarningLevel(window)).toBe('warning_70');
  });

  it('omits dimensions that have no published limit', () => {
    expect(capacityDimensions(windowAt(10))).toEqual([
      {
        dimension: 'requests',
        limit: 100,
        used: 10,
        remaining: 90,
        ratio: 0.1,
      },
    ]);
  });
});
