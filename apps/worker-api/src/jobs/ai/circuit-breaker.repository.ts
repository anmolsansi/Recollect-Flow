import {
  AI_CAPACITY_POLICY_VERSION,
  type CapacityOperation,
  type CapacityProvider,
  type CircuitBreakerSnapshot,
} from './capacity.types';

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

  async recordFailure(
    provider: CapacityProvider,
    operation: CapacityOperation,
    errorCode: string,
    now: Date = new Date(),
  ): Promise<CircuitBreakerSnapshot> {
    const nowIso = now.toISOString();
    const row = await this.db
      .prepare(
        `INSERT INTO ai_circuit_breakers (
           provider, operation, state, consecutive_failures,
           last_failure_at, last_error_code, policy_version, created_at, updated_at
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
    if (!row) throw new Error('Failed to record provider circuit failure');
    return toSnapshot(row);
  }
}
