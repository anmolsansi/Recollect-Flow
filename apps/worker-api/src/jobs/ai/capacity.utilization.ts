import type { CapacityWindowSnapshot } from './capacity.types';

export type CapacityWarningLevel =
  'normal' | 'warning_70' | 'warning_90' | 'hard';

export interface CapacityDimensionUsage {
  dimension: 'requests' | 'input_units' | 'output_units' | 'provider_units';
  limit: number;
  used: number;
  remaining: number;
  ratio: number;
}

function usage(
  dimension: CapacityDimensionUsage['dimension'],
  limit: number | null,
  consumed: number,
  reserved: number,
): CapacityDimensionUsage | null {
  if (limit === null) return null;
  const used = consumed + reserved;
  return {
    dimension,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    ratio: limit > 0 ? used / limit : 1,
  };
}

export function capacityDimensions(
  window: CapacityWindowSnapshot,
): CapacityDimensionUsage[] {
  return [
    usage(
      'requests',
      window.requestLimit,
      window.requestConsumed,
      window.requestReserved,
    ),
    usage(
      'input_units',
      window.inputUnitLimit,
      window.inputUnitsConsumed,
      window.inputUnitsReserved,
    ),
    usage(
      'output_units',
      window.outputUnitLimit,
      window.outputUnitsConsumed,
      window.outputUnitsReserved,
    ),
    usage(
      'provider_units',
      window.providerUnitLimit,
      window.providerUnitsConsumed,
      window.providerUnitsReserved,
    ),
  ].filter((entry): entry is CapacityDimensionUsage => entry !== null);
}

export function capacityWarningLevel(
  window: CapacityWindowSnapshot,
): CapacityWarningLevel {
  const ratio = Math.max(
    0,
    ...capacityDimensions(window).map((entry) => entry.ratio),
  );
  if (ratio >= 1) return 'hard';
  if (ratio >= 0.9) return 'warning_90';
  if (ratio >= 0.7) return 'warning_70';
  return 'normal';
}
