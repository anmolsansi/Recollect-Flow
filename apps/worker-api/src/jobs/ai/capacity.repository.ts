import {
  AI_CAPACITY_POLICY_VERSION,
  type CapacityOperation,
  type CapacityProvider,
  type CapacityReservation,
  type CapacityWindowPolicy,
  type CapacityWindowSnapshot,
  type CircuitBreakerSnapshot,
} from './capacity.types';
import { quotaWindowBoundary } from './capacity.window';

interface CapacityWindowRow {
  provider: CapacityProvider;
  scope_key: string;
  window_kind: CapacityWindowSnapshot['windowKind'];
  window_start: string;
  window_end: string;
  request_limit: number | null;
  input_unit_limit: number | null;
  output_unit_limit: number | null;
  provider_unit_limit: number | null;
  request_reserved: number;
  input_units_reserved: number;
  output_units_reserved: number;
  provider_units_reserved: number;
  request_consumed: number;
  input_units_consumed: number;
  output_units_consumed: number;
  provider_units_consumed: number;
}

interface CircuitBreakerRow {
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

function capacityWindowSnapshot(row: CapacityWindowRow): CapacityWindowSnapshot {
  return {
    provider: row.provider,
    scopeKey: row.scope_key,
    windowKind: row.window_kind,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    requestLimit: row.request_limit,
    inputUnitLimit: row.input_unit_limit,
    outputUnitLimit: row.output_unit_limit,
    providerUnitLimit: row.provider_unit_limit,
    requestReserved: row.request_reserved,
    inputUnitsReserved: row.input_units_reserved,
    outputUnitsReserved: row.output_units_reserved,
    providerUnitsReserved: row.provider_units_reserved,
    requestConsumed: row.request_consumed,
    inputUnitsConsumed: row.input_units_consumed,
    outputUnitsConsumed: row.output_units_consumed,
    providerUnitsConsumed: row.provider_units_consumed,
  };
}

function breakerSnapshot(row: CircuitBreakerRow): CircuitBreakerSnapshot {
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

export class AiCapacityRepository {
  constructor(private readonly db: D1Database) {}

  async ensureWindows(
    policies: readonly CapacityWindowPolicy[],
    now: Date,
  ): Promise<CapacityWindowSnapshot[]> {
    if (policies.length === 0) return [];
    const nowIso = now.toISOString();
    await this.db.batch(
      policies.map((policy) => {
        const boundary = quotaWindowBoundary(policy, now);
        return this.db
          .prepare(
            `INSERT INTO ai_capacity_windows (
               provider, scope_key, window_kind, window_start, window_end,
               request_limit, input_unit_limit, output_unit_limit,
               provider_unit_limit, policy_version, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
             ON CONFLICT(provider, scope_key, window_kind, window_start)
             DO UPDATE SET
               window_end = excluded.window_end,
               request_limit = excluded.request_limit,
               input_unit_limit = excluded.input_unit_limit,
               output_unit_limit = excluded.output_unit_limit,
               provider_unit_limit = excluded.provider_unit_limit,
               policy_version = excluded.policy_version,
               updated_at = excluded.updated_at`,
          )
          .bind(
            policy.provider,
            policy.scopeKey,
            policy.windowKind,
            boundary.start,
            boundary.end,
            policy.limit.requests ?? null,
            policy.limit.inputUnits ?? null,
            policy.limit.outputUnits ?? null,
            policy.limit.providerUnits ?? null,
            AI_CAPACITY_POLICY_VERSION,
            nowIso,
          );
      }),
    );

    const snapshots: CapacityWindowSnapshot[] = [];
    for (const policy of policies) {
      const boundary = quotaWindowBoundary(policy, now);
      const row = await this.db
        .prepare(
          `SELECT provider, scope_key, window_kind, window_start, window_end,
                  request_limit, input_unit_limit, output_unit_limit,
                  provider_unit_limit, request_reserved, input_units_reserved,
                  output_units_reserved, provider_units_reserved,
                  request_consumed, input_units_consumed, output_units_consumed,
                  provider_units_consumed
           FROM ai_capacity_windows
           WHERE provider = ?1 AND scope_key = ?2 AND window_kind = ?3
             AND window_start = ?4`,
        )
        .bind(
          policy.provider,
          policy.scopeKey,
          policy.windowKind,
          boundary.start,
        )
        .first<CapacityWindowRow>();
      if (row) snapshots.push(capacityWindowSnapshot(row));
    }
    return snapshots;
  }

  async listActiveWindows(
    now: Date = new Date(),
  ): Promise<CapacityWindowSnapshot[]> {
    const result = await this.db
      .prepare(
        `SELECT provider, scope_key, window_kind, window_start, window_end,
                request_limit, input_unit_limit, output_unit_limit, provider_unit_limit,
                request_reserved, input_units_reserved, output_units_reserved,
                provider_units_reserved, request_consumed, input_units_consumed,
                output_units_consumed, provider_units_consumed
         FROM ai_capacity_windows
         WHERE window_end > ?1
         ORDER BY provider, scope_key, window_end`,
      )
      .bind(now.toISOString())
      .all<CapacityWindowRow>();
    return (result.results ?? []).map(capacityWindowSnapshot);
  }

  async listCircuitBreakers(): Promise<CircuitBreakerSnapshot[]> {
    const result = await this.db
      .prepare(
        `SELECT provider, operation, state, consecutive_failures, next_probe_at,
                probe_lease_owner, probe_lease_expires_at, last_success_at,
                last_failure_at, last_error_code
         FROM ai_circuit_breakers
         ORDER BY provider, operation`,
      )
      .all<CircuitBreakerRow>();
    return (result.results ?? []).map(breakerSnapshot);
  }

  async getCircuitBreaker(
    provider: CapacityProvider,
    operation: CapacityOperation,
  ): Promise<CircuitBreakerSnapshot | null> {
    const row = await this.db
      .prepare(
        `SELECT provider, operation, state, consecutive_failures, next_probe_at,
                probe_lease_owner, probe_lease_expires_at, last_success_at,
                last_failure_at, last_error_code
         FROM ai_circuit_breakers
         WHERE provider = ?1 AND operation = ?2`,
      )
      .bind(provider, operation)
      .first<CircuitBreakerRow>();
    return row ? breakerSnapshot(row) : null;
  }

  async createReservationIntent(
    reservation: CapacityReservation,
    now: Date,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_capacity_reservations (
           id, provider, operation, model, scope_key, request_units,
           estimated_input_units, estimated_output_units, estimated_provider_units,
           capacity_applied, state, window_keys_json, expires_at, created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 'active', ?10, ?11, ?12, ?12)`,
      )
      .bind(
        reservation.id,
        reservation.provider,
        reservation.operation,
        reservation.model,
        reservation.scopeKey,
        reservation.estimate.requests,
        reservation.estimate.inputUnits,
        reservation.estimate.outputUnits,
        reservation.estimate.providerUnits,
        JSON.stringify(reservation.windowKeys),
        reservation.expiresAt,
        now.toISOString(),
      )
      .run();
  }

  policyVersion(): string {
    return AI_CAPACITY_POLICY_VERSION;
  }
}
