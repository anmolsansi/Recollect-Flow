-- OPE-226: durable daily digests, weekly reviews and retry-safe delivery.

CREATE TABLE digest_runs (
  id TEXT PRIMARY KEY,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  selector_version TEXT NOT NULL,
  generation_version INTEGER NOT NULL DEFAULT 1 CHECK (generation_version >= 1),
  source_snapshot_at TEXT NOT NULL,
  canonical_payload_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  deterministic_text TEXT NOT NULL,
  ai_text TEXT,
  generation_source TEXT NOT NULL CHECK (generation_source IN ('deterministic', 'ai')),
  ai_provider TEXT,
  ai_model TEXT,
  ai_latency_ms INTEGER,
  ai_input_units INTEGER,
  ai_output_units INTEGER,
  ai_failure_code TEXT,
  review_status TEXT NOT NULL DEFAULT 'generated'
    CHECK (review_status IN ('generated', 'reviewed')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(digest_type, period_start, period_end, generation_version)
);

CREATE INDEX idx_digest_runs_period
  ON digest_runs(digest_type, period_end DESC, generation_version DESC);
CREATE INDEX idx_digest_runs_review
  ON digest_runs(review_status, created_at DESC);

CREATE TABLE digest_deliveries (
  id TEXT PRIMARY KEY,
  digest_run_id TEXT NOT NULL REFERENCES digest_runs(id) ON DELETE RESTRICT,
  destination TEXT NOT NULL CHECK (destination IN ('telegram')),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'leased', 'sent', 'failed', 'unknown', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  lease_owner TEXT,
  lease_expires_at TEXT,
  last_error_code TEXT,
  telegram_message_id TEXT,
  sent_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(digest_run_id, destination)
);

CREATE INDEX idx_digest_deliveries_ready
  ON digest_deliveries(destination, state, available_at, lease_expires_at);
CREATE INDEX idx_digest_deliveries_run
  ON digest_deliveries(digest_run_id, created_at DESC);

CREATE TABLE digest_audit_events (
  id TEXT PRIMARY KEY,
  digest_run_id TEXT NOT NULL REFERENCES digest_runs(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_digest_audit_events_run
  ON digest_audit_events(digest_run_id, created_at DESC);
