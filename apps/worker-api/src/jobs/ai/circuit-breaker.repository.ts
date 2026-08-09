import {
  AI_CAPACITY_POLICY_VERSION,
  type CapacityOperation,
  type CapacityProvider,
  type CircuitBreakerSnapshot,
} from './capacity.types';
import {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_PROBE_LEASE_MS,
  circuitOpenUntil,
} from './circuit-breaker.policy';

interface BreakerRow {
  provider: CapacityProvider;
  operation: CapacityOperation;
  state: CircuitBreakerSnapshot['state'];
  consecutive_failures: number;
  next_probe_at: string | null;
  probe_lease_owner: string | null;
  probe_lease_expires_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_code: string | null;
}

function toSnapshot(row: BreakerRow): CircuitBreakerSnapshot {
  return {
    provider: row.provider,
    operation: row.operation,
    state: row.state,
    consecutiveFailures: row.consecutive_failures,
    nextProbeAt: row.next_probe_at,
    probeLeaseOwner: row.probe_lease_owner,
    probeLeaseExpiresAt: row.probe_lease_expires_at,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    lastErrorCode: row.last_error_code,
  };
}

export class AiCircuitBreakerRepository {
  constructor(private readonly db: D1Database) {}

  async acquireHalfOpenProbe(
    provider: CapacityProvider,
    operation: CapacityOperation,
    ownerId: string,
    now: Date = new Date(),
  ): Promise<CircuitBreakerSnapshot | null> {
    const nowIso = now.toISOString();
    const leaseExpiresAt = new Date(
      now.getTime() + CIRCUIT_BREAKER_PROBE_LEASE_MS,
    ).toISOString();
    const row = await this.db
      .prepare(
        `UPDATE ai_circuit_breakers
         SET state = 'half_open', probe_lease_owner = ?1,
             probe_lease_expires_at = ?2, updated_at = ?3
         WHERE provider = ?4 AND operation = ?5
           AND state IN ('open', 'half_open')
           AND next_probe_at IS NOT NULL AND next_probe_at <= ?3
           AND (probe_lease_expires_at IS NULL OR probe_lease_expires_at <= ?3)
         RETURNING provider, operation, state, consecutive_failures, next_probe_at,
                   probe_lease_owner, probe_lease_expires_at, last_success_at,
                   last_failure_at, last_error_code`,
      )
      .bind(ownerId, leaseExpiresAt, nowIso, provider, operation)
      .first<BreakerRow>();
    return row ? toSnapshot(row) : null;
  }

  async recordFailure(
    provider: CapacityProvider,
    operation: CapacityOperation,
    errorCode: string,
    now: Date = new Date(),
  ): Promise<CircuitBreakerSnapshot> {
    const nowIso = now.toISOString();
    const current = await this.db
      .prepare(
        `SELECT consecutive_failures
         FROM ai_circuit_breakers
         WHERE provider = ?1 AND operation = ?2`,
      )
      .bind(provider, operation)
      .first<{ consecutive_failures: number }>();
    const nextFailures = (current?.consecutive_failures ?? 0) + 1;
    const shouldOpen = nextFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    const nextProbeAt = shouldOpen
      ? circuitOpenUntil(nextFailures, now).toISOString()
      : null;

    const row = await this.db
      .prepare(
        `INSERT INTO ai_circuit_breakers (
           provider, operation, state, consecutive_failures, opened_at,
           next_probe_at, last_failure_at, last_error_code, policy_version,
           created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?7, ?8, ?5, ?5)
         ON CONFLICT(provider, operation) DO UPDATE SET
           state = excluded.state,
           consecutive_failures = excluded.consecutive_failures,
           opened_at = CASE
             WHEN excluded.state = 'open' THEN COALESCE(ai_circuit_breakers.opened_at, excluded.opened_at)
             ELSE ai_circuit_breakers.opened_at
           END,
           next_probe_at = excluded.next_probe_at,
           probe_lease_owner = NULL,
           probe_lease_expires_at = NULL,
           last_failure_at = excluded.last_failure_at,
           last_error_code = excluded.last_error_code,
           policy_version = excluded.policy_version,
           updated_at = excluded.updated_at
         RETURNING provider, operation, state, consecutive_failures, next_probe_at,
                   probe_lease_owner, probe_lease_expires_at, last_success_at,
                   last_failure_at, last_error_code`,
      )
      .bind(
        provider,
        operation,
        shouldOpen ? 'open' : 'closed',
        nextFailures,
        nowIso,
        nextProbeAt,
        errorCode,
        AI_CAPACITY_POLICY_VERSION,
      )
      .first<BreakerRow>();
    if (!row) throw new Error('Failed to record provider circuit failure');
    return toSnapshot(row);
  }
}
