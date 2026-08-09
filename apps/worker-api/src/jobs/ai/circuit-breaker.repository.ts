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

  async recordSuccess(
    provider: CapacityProvider,
    operation: CapacityOperation,
    probeOwnerId: string | null = null,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE ai_circuit_breakers
         SET state = 'closed', consecutive_failures = 0, opened_at = NULL,
             next_probe_at = NULL, probe_lease_owner = NULL,
             probe_lease_expires_at = NULL, last_success_at = ?1,
             last_error_code = NULL, policy_version = ?2, updated_at = ?1
         WHERE provider = ?3 AND operation = ?4
           AND (
             state = 'closed'
             OR (state = 'half_open' AND probe_lease_owner = ?5
                 AND probe_lease_expires_at > ?1)
           )`,
      )
      .bind(
        nowIso,
        AI_CAPACITY_POLICY_VERSION,
        provider,
        operation,
        probeOwnerId,
      )
      .run();
    return result.meta.changes === 1;
  }

  async recordFailure(
    provider: CapacityProvider,
    operation: CapacityOperation,
    errorCode: string,
    now: Date = new Date(),
  ): Promise<CircuitBreakerSnapshot> {
    const nowIso = now.toISOString();
    const counted = await this.db
      .prepare(
        `INSERT INTO ai_circuit_breakers (
           provider, operation, state, consecutive_failures,
           last_failure_at, last_error_code, policy_version,
           created_at, updated_at
         ) VALUES (?1, ?2, 'closed', 1, ?3, ?4, ?5, ?3, ?3)
         ON CONFLICT(provider, operation) DO UPDATE SET
           consecutive_failures = ai_circuit_breakers.consecutive_failures + 1,
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
        nowIso,
        errorCode,
        AI_CAPACITY_POLICY_VERSION,
      )
      .first<BreakerRow>();
    if (!counted) throw new Error('Failed to record provider circuit failure');

    if (counted.consecutive_failures < CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      return toSnapshot(counted);
    }

    const nextProbeAt = circuitOpenUntil(
      counted.consecutive_failures,
      now,
    ).toISOString();
    const opened = await this.db
      .prepare(
        `UPDATE ai_circuit_breakers
         SET state = 'open', opened_at = COALESCE(opened_at, ?1),
             next_probe_at = ?2, probe_lease_owner = NULL,
             probe_lease_expires_at = NULL, updated_at = ?1
         WHERE provider = ?3 AND operation = ?4
           AND consecutive_failures = ?5
         RETURNING provider, operation, state, consecutive_failures, next_probe_at,
                   probe_lease_owner, probe_lease_expires_at, last_success_at,
                   last_failure_at, last_error_code`,
      )
      .bind(
        nowIso,
        nextProbeAt,
        provider,
        operation,
        counted.consecutive_failures,
      )
      .first<BreakerRow>();

    if (opened) return toSnapshot(opened);
    const latest = await this.db
      .prepare(
        `SELECT provider, operation, state, consecutive_failures, next_probe_at,
                probe_lease_owner, probe_lease_expires_at, last_success_at,
                last_failure_at, last_error_code
         FROM ai_circuit_breakers
         WHERE provider = ?1 AND operation = ?2`,
      )
      .bind(provider, operation)
      .first<BreakerRow>();
    if (!latest) throw new Error('Failed to read provider circuit failure state');
    return toSnapshot(latest);
  }
}
