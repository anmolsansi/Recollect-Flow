export interface UsageDimension {
  dimension: 'requests' | 'input_units' | 'output_units' | 'provider_units';
  limit: number;
  used: number;
  consumed: number;
  reserved: number;
  remaining: number;
  ratio: number;
}
export interface UsageWindow {
  provider: string;
  scope_key: string;
  window_kind: string;
  window_start: string;
  window_end: string;
  level: 'normal' | 'warning_70' | 'warning_90' | 'hard';
  dimensions: UsageDimension[];
}
export interface UsageSnapshot {
  policy_version: string;
  generated_at: string;
  warning_thresholds: { warning_70: number; warning_90: number; hard: number };
  windows: UsageWindow[];
  circuit_breakers: Array<{
    provider: string;
    operation: string;
    state: string;
    consecutive_failures: number;
    next_probe_at: string | null;
    last_success_at: string | null;
    last_error_code: string | null;
  }>;
  deferred_jobs: Array<{ reason: string; count: number }>;
  last_successful_provider_calls: Array<{
    provider: string;
    operation: string;
    at: string;
  }>;
}
export interface BacklogGroup {
  kind: 'processing' | 'sync';
  type: string;
  status: 'pending' | 'processing' | 'retry_wait' | 'failed';
  count: number;
  oldest_created_at: string | null;
  oldest_eligible_created_at: string | null;
  next_available_at: string | null;
  sample_error_code: string | null;
}
export interface OperationsSummary {
  generated_at: string;
  backlog: { groups: BacklogGroup[]; truncated: boolean; scope: string };
  recovery: {
    partial_purges: number;
    failed_backups: number;
    latest_verified_backup: null | {
      id: string;
      sha256: string | null;
      size_bytes: number | null;
      verified_at: string | null;
      expires_at: string;
    };
    latest_integrity: null | {
      id: string;
      state: string;
      finding_count: number;
      started_at: string;
      completed_at: string | null;
      last_error_code: string | null;
    };
    ambiguous_digests: number;
    missing_notion_projections: number;
  };
  storage: {
    source: string;
    measured_at: string;
    recorded_objects: number;
    recorded_bytes: number;
    orphaned_objects: number;
    orphaned_bytes: number;
    r2_provider_objects: number | null;
    r2_provider_bytes: number | null;
    d1_provider_rows_read: number | null;
    d1_provider_rows_written: number | null;
    d1_provider_storage_bytes: number | null;
  };
}
