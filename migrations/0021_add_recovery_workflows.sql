-- OPE-228: durable backup, purge, restore, and integrity workflow state.

CREATE TABLE backup_artifacts (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('creating', 'verifying', 'complete', 'failed', 'expired')),
  schema_version TEXT NOT NULL,
  sha256 TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  created_at TEXT NOT NULL,
  verified_at TEXT,
  expires_at TEXT NOT NULL,
  expired_at TEXT,
  failure_code TEXT
);

CREATE INDEX idx_backup_artifacts_retention
  ON backup_artifacts(state, expires_at);
CREATE INDEX idx_backup_artifacts_created
  ON backup_artifacts(created_at DESC);

CREATE TABLE purge_workflows (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('confirmation_pending', 'queued', 'processing', 'partial', 'complete', 'cancelled')),
  confirmation_digest TEXT NOT NULL,
  confirmation_expires_at TEXT NOT NULL,
  requested_edit_version INTEGER NOT NULL CHECK (requested_edit_version >= 0),
  confirmed_at TEXT,
  completed_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_purge_workflows_one_active_per_item
  ON purge_workflows(item_id)
  WHERE state IN ('confirmation_pending', 'queued', 'processing', 'partial');
CREATE INDEX idx_purge_workflows_state_updated
  ON purge_workflows(state, updated_at);

CREATE TABLE purge_steps (
  id TEXT PRIMARY KEY,
  purge_workflow_id TEXT NOT NULL REFERENCES purge_workflows(id) ON DELETE RESTRICT,
  step_kind TEXT NOT NULL CHECK (step_kind IN ('freeze_jobs', 'delete_r2_attachments', 'archive_notion_projection', 'delete_d1_item_data', 'finalize_receipt')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'complete', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (purge_workflow_id, step_kind)
);

CREATE INDEX idx_purge_steps_workflow_state
  ON purge_steps(purge_workflow_id, state, step_kind);

CREATE TABLE purge_receipts (
  item_id TEXT PRIMARY KEY,
  purge_workflow_id TEXT NOT NULL UNIQUE REFERENCES purge_workflows(id) ON DELETE RESTRICT,
  receipt_version TEXT NOT NULL,
  purged_at TEXT NOT NULL,
  backup_retention_until TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_purge_receipts_purged_at
  ON purge_receipts(purged_at DESC);

CREATE TABLE restore_runs (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('validating', 'restoring', 'verifying', 'complete', 'failed')),
  schema_version TEXT NOT NULL,
  dry_run INTEGER NOT NULL DEFAULT 0 CHECK (dry_run IN (0, 1)),
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  restored_count INTEGER NOT NULL DEFAULT 0 CHECK (restored_count >= 0),
  skipped_purged_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_purged_count >= 0),
  last_error_code TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX idx_restore_runs_started
  ON restore_runs(started_at DESC);

CREATE TABLE integrity_runs (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('running', 'complete', 'failed')),
  finding_count INTEGER NOT NULL DEFAULT 0 CHECK (finding_count >= 0),
  last_error_code TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX idx_integrity_runs_started
  ON integrity_runs(started_at DESC);

CREATE TABLE integrity_findings (
  id TEXT PRIMARY KEY,
  integrity_run_id TEXT NOT NULL REFERENCES integrity_runs(id) ON DELETE RESTRICT,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  item_id TEXT,
  attachment_id TEXT,
  external_ref TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_integrity_findings_run
  ON integrity_findings(integrity_run_id, severity, finding_type);
