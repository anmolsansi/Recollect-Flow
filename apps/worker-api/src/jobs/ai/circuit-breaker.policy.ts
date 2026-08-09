export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
export const CIRCUIT_BREAKER_BASE_COOLDOWN_MS = 5 * 60_000;
export const CIRCUIT_BREAKER_MAX_COOLDOWN_MS = 60 * 60_000;
export const CIRCUIT_BREAKER_PROBE_LEASE_MS = 60_000;

export function circuitOpenUntil(consecutiveFailures: number, now: Date): Date {
  const failuresBeyondThreshold = Math.max(
    0,
    consecutiveFailures - CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  );
  const cooldown = Math.min(
    CIRCUIT_BREAKER_BASE_COOLDOWN_MS * 2 ** failuresBeyondThreshold,
    CIRCUIT_BREAKER_MAX_COOLDOWN_MS,
  );
  return new Date(now.getTime() + cooldown);
}
