import { AiCapacityRepository } from './capacity.repository';
import { AI_CAPACITY_POLICY_VERSION } from './capacity.types';
import {
  capacityDimensions,
  capacityWarningLevel,
} from './capacity.utilization';

interface DeferredRow {
  last_error_code: string;
  count: number;
}

interface ProviderSuccessRow {
  provider: string;
  operation: string;
  created_at: string;
}

export class AiCapacityStatusService {
  private readonly repository: AiCapacityRepository;

  constructor(private readonly db: D1Database) {
    this.repository = new AiCapacityRepository(db);
  }

  async status(now: Date = new Date()) {
    const [windows, breakers, deferred, lastSuccess] = await Promise.all([
      this.repository.listActiveWindows(now),
      this.repository.listCircuitBreakers(),
      this.db
        .prepare(
          `SELECT last_error_code, COUNT(*) AS count
           FROM processing_jobs
           WHERE status = 'pending' AND available_at > ?1
             AND last_error_code IN (
               'QUOTA_PAUSED', 'PROVIDER_UNAVAILABLE', 'NO_ELIGIBLE_PROVIDER'
             )
           GROUP BY last_error_code
           ORDER BY last_error_code`,
        )
        .bind(now.toISOString())
        .all<DeferredRow>(),
      this.db
        .prepare(
          `SELECT provider, operation, MAX(created_at) AS created_at
           FROM provider_usage
           WHERE status = 'success'
           GROUP BY provider, operation
           ORDER BY provider, operation`,
        )
        .all<ProviderSuccessRow>(),
    ]);

    return {
      policy_version: AI_CAPACITY_POLICY_VERSION,
      generated_at: now.toISOString(),
      warning_thresholds: {
        warning_70: 0.7,
        warning_90: 0.9,
        hard: 1,
      },
      windows: windows.map((window) => ({
        provider: window.provider,
        scope_key: window.scopeKey,
        window_kind: window.windowKind,
        window_start: window.windowStart,
        window_end: window.windowEnd,
        level: capacityWarningLevel(window),
        dimensions: capacityDimensions(window),
      })),
      circuit_breakers: breakers.map((breaker) => ({
        provider: breaker.provider,
        operation: breaker.operation,
        state: breaker.state,
        consecutive_failures: breaker.consecutiveFailures,
        next_probe_at: breaker.nextProbeAt,
        last_success_at: breaker.lastSuccessAt,
        last_failure_at: breaker.lastFailureAt,
        last_error_code: breaker.lastErrorCode,
      })),
      deferred_jobs: (deferred.results ?? []).map((row) => ({
        reason: row.last_error_code,
        count: row.count,
      })),
      last_successful_provider_calls: (lastSuccess.results ?? []).map((row) => ({
        provider: row.provider,
        operation: row.operation,
        at: row.created_at,
      })),
    };
  }
}
