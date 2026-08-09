export const AI_CAPACITY_POLICY_VERSION = '2026-08-09.1';

export type CapacityProvider = 'openrouter' | 'cloudflare' | 'gemini';
export type CapacityOperation = 'enrich' | 'vision_extract' | 'digest';
export type CapacityWindowKind = 'minute' | 'hour' | 'day' | 'custom';
export type CapacityReservationState =
  | 'active'
  | 'reconciled'
  | 'released'
  | 'expired';
export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CapacityLimit {
  requests?: number;
  inputUnits?: number;
  outputUnits?: number;
}

export interface CapacityWindowPolicy {
  provider: CapacityProvider;
  scopeKey: string;
  windowKind: CapacityWindowKind;
  durationMs: number;
  limit: CapacityLimit;
}

export interface ProviderCapacityPolicy {
  provider: CapacityProvider;
  operation: CapacityOperation;
  freeModels: readonly string[];
  allowFreeRouter?: boolean;
  windows: readonly CapacityWindowPolicy[];
}

export interface CapacityEstimate {
  requests: number;
  inputUnits: number;
  outputUnits: number;
}

export interface CapacityReservation {
  id: string;
  provider: CapacityProvider;
  operation: CapacityOperation;
  model: string;
  scopeKey: string;
  estimate: CapacityEstimate;
  windowKeys: string[];
  expiresAt: string;
}

export interface CapacityWindowSnapshot {
  provider: CapacityProvider;
  scopeKey: string;
  windowKind: CapacityWindowKind;
  windowStart: string;
  windowEnd: string;
  requestLimit: number | null;
  inputUnitLimit: number | null;
  outputUnitLimit: number | null;
  requestReserved: number;
  inputUnitsReserved: number;
  outputUnitsReserved: number;
  requestConsumed: number;
  inputUnitsConsumed: number;
  outputUnitsConsumed: number;
}

export interface CircuitBreakerSnapshot {
  provider: CapacityProvider;
  operation: CapacityOperation;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  nextProbeAt: string | null;
  probeLeaseOwner: string | null;
  probeLeaseExpiresAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorCode: string | null;
}

export interface CapacityAdmissionRequest {
  provider: CapacityProvider;
  operation: CapacityOperation;
  model: string;
  estimate: CapacityEstimate;
  now?: Date;
}

export interface CapacityAdmissionResult {
  reservation: CapacityReservation;
  windows: CapacityWindowSnapshot[];
}

export interface CapacityDeferral {
  code: 'QUOTA_PAUSED' | 'PROVIDER_UNAVAILABLE';
  availableAt: string;
  provider: CapacityProvider;
  operation: CapacityOperation;
}
