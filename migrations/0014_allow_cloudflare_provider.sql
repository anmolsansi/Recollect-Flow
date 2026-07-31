-- OPE-222: allow Cloudflare provider eligibility without losing durable job data.

PRAGMA defer_foreign_keys = true;

-- processing_job_results references processing_jobs with ON DELETE RESTRICT.
-- Preserve it explicitly while the parent table is rebuilt.
CREATE TABLE processing_job_results_policy_20260731 (
  job_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  result_version TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO processing_job_results_policy_20260731 (
  job_id, submission_id, input_hash, result_version, result_json, created_at
)
SELECT
  job_id, submission_id, input_hash, result_version, result_json, created_at
FROM processing_job_results;

DROP TABLE processing_job_results;

CREATE TABLE processing_jobs_policy_20260731 (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  privacy_level_snapshot TEXT NOT NULL DEFAULT 'unknown'
    CHECK (privacy_level_snapshot IN ('unknown', 'public', 'personal', 'sensitive')),
  provider_eligibility TEXT NOT NULL DEFAULT 'none'
    CHECK (provider_eligibility IN ('cloudflare', 'gemini', 'ollama', 'openrouter', 'none')),
  policy_version TEXT NOT NULL DEFAULT '2026-07-31.2',
  credential_source TEXT NOT NULL DEFAULT 'none'
    CHECK (credential_source IN ('app_managed', 'user_provided', 'none')),
  hosted_processing_consent INTEGER NOT NULL DEFAULT 0
    CHECK (hosted_processing_consent IN (0, 1)),
  zero_data_retention_required INTEGER NOT NULL DEFAULT 0
    CHECK (zero_data_retention_required IN (0, 1)),
  data_collection_denied INTEGER NOT NULL DEFAULT 0
    CHECK (data_collection_denied IN (0, 1)),
  lease_owner TEXT,
  lease_expires_at TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  input_hash TEXT,
  result_version TEXT,
  heartbeat_at TEXT,
  completed_at TEXT,
  manual_retry_count INTEGER NOT NULL DEFAULT 0
    CHECK (manual_retry_count >= 0 AND manual_retry_count <= 3)
);

INSERT INTO processing_jobs_policy_20260731 (
  id, item_id, job_type, status, attempts, available_at, last_error_code,
  created_at, updated_at, privacy_level_snapshot, provider_eligibility,
  policy_version, credential_source, hosted_processing_consent,
  zero_data_retention_required, data_collection_denied,
  lease_owner, lease_expires_at, priority, input_hash, result_version,
  heartbeat_at, completed_at, manual_retry_count
)
SELECT
  id, item_id, job_type, status, attempts, available_at, last_error_code,
  created_at, updated_at, privacy_level_snapshot,
  CASE provider_eligibility
    WHEN 'workers_ai' THEN 'cloudflare'
    ELSE provider_eligibility
  END,
  policy_version, credential_source, hosted_processing_consent,
  zero_data_retention_required, data_collection_denied,
  lease_owner, lease_expires_at, priority, input_hash, result_version,
  heartbeat_at, completed_at, manual_retry_count
FROM processing_jobs;

DROP TABLE processing_jobs;
ALTER TABLE processing_jobs_policy_20260731 RENAME TO processing_jobs;

CREATE TABLE processing_job_results (
  job_id TEXT PRIMARY KEY REFERENCES processing_jobs(id) ON DELETE RESTRICT,
  submission_id TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  result_version TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO processing_job_results (
  job_id, submission_id, input_hash, result_version, result_json, created_at
)
SELECT
  job_id, submission_id, input_hash, result_version, result_json, created_at
FROM processing_job_results_policy_20260731;

DROP TABLE processing_job_results_policy_20260731;

CREATE INDEX idx_processing_jobs_ready
  ON processing_jobs(status, available_at);
CREATE INDEX idx_processing_jobs_item_id
  ON processing_jobs(item_id);
CREATE INDEX idx_processing_jobs_lease
  ON processing_jobs(status, lease_expires_at);
CREATE UNIQUE INDEX idx_processing_jobs_active_unique
  ON processing_jobs(item_id, job_type)
  WHERE status IN ('pending', 'processing');
CREATE INDEX idx_processing_jobs_lease_ready
  ON processing_jobs(
    job_type, status, available_at, lease_expires_at, priority DESC
  );
