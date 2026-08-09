-- OPE-227: durable quota windows, reservations, and provider circuit breakers.

CREATE TABLE ai_capacity_windows (
  provider TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  window_kind TEXT NOT NULL CHECK (window_kind IN ('minute', 'hour', 'day', 'custom')),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  request_limit INTEGER CHECK (request_limit IS NULL OR request_limit > 0),
  input_unit_limit INTEGER CHECK (input_unit_limit IS NULL OR input_unit_limit > 0),
  output_unit_limit INTEGER CHECK (output_unit_limit IS NULL OR output_unit_limit > 0),
  request_reserved INTEGER NOT NULL DEFAULT 0 CHECK (request_reserved >= 0),
  input_units_reserved INTEGER NOT NULL DEFAULT 0 CHECK (input_units_reserved >= 0),
  output_units_reserved INTEGER NOT NULL DEFAULT 0 CHECK (output_units_reserved >= 0),
  request_consumed INTEGER NOT NULL DEFAULT 0 CHECK (request_consumed >= 0),
  input_units_consumed INTEGER NOT NULL DEFAULT 0 CHECK (input_units_consumed >= 0),
  output_units_consumed INTEGER NOT NULL DEFAULT 0 CHECK (output_units_consumed >= 0),
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, scope_key, window_kind, window_start),
  CHECK (window_end > window_start)
);

CREATE INDEX idx_ai_capacity_windows_active
  ON ai_capacity_windows(provider, scope_key, window_end, window_start);

CREATE TABLE ai_capacity_reservations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  request_units INTEGER NOT NULL DEFAULT 1 CHECK (request_units >= 0),
  estimated_input_units INTEGER NOT NULL DEFAULT 0 CHECK (estimated_input_units >= 0),
  estimated_output_units INTEGER NOT NULL DEFAULT 0 CHECK (estimated_output_units >= 0),
  actual_input_units INTEGER CHECK (actual_input_units IS NULL OR actual_input_units >= 0),
  actual_output_units INTEGER CHECK (actual_output_units IS NULL OR actual_output_units >= 0),
  state TEXT NOT NULL CHECK (state IN ('active', 'reconciled', 'released', 'expired')),
  window_keys_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  reconciled_at TEXT,
  released_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_ai_capacity_reservations_expiry
  ON ai_capacity_reservations(state, expires_at);
CREATE INDEX idx_ai_capacity_reservations_provider
  ON ai_capacity_reservations(provider, scope_key, created_at DESC);

CREATE TABLE ai_circuit_breakers (
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'closed'
    CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  opened_at TEXT,
  next_probe_at TEXT,
  probe_lease_owner TEXT,
  probe_lease_expires_at TEXT,
  last_success_at TEXT,
  last_failure_at TEXT,
  last_error_code TEXT,
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, operation)
);

CREATE INDEX idx_ai_circuit_breakers_probe
  ON ai_circuit_breakers(state, next_probe_at, probe_lease_expires_at);
