-- OPE-224: preserve historical jobs while adding the approved hosted-AI policy.

PRAGMA defer_foreign_keys = true;

CREATE TABLE processing_jobs_policy_20260721 (
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
    CHECK (provider_eligibility IN ('workers_ai', 'gemini', 'ollama', 'openrouter', 'none')),
  policy_version TEXT NOT NULL DEFAULT '2026-07-21.1',
  credential_source TEXT NOT NULL DEFAULT 'none'
    CHECK (credential_source IN ('app_managed', 'user_provided', 'none')),
  hosted_processing_consent INTEGER NOT NULL DEFAULT 0
    CHECK (hosted_processing_consent IN (0, 1)),
  zero_data_retention_required INTEGER NOT NULL DEFAULT 0
    CHECK (zero_data_retention_required IN (0, 1)),
  data_collection_denied INTEGER NOT NULL DEFAULT 0
    CHECK (data_collection_denied IN (0, 1))
);

INSERT INTO processing_jobs_policy_20260721 (
  id, item_id, job_type, status, attempts, available_at, last_error_code,
  created_at, updated_at, privacy_level_snapshot, provider_eligibility,
  policy_version
)
SELECT
  id, item_id, job_type, status, attempts, available_at, last_error_code,
  created_at, updated_at, privacy_level_snapshot, provider_eligibility,
  policy_version
FROM processing_jobs;

DROP TABLE processing_jobs;
ALTER TABLE processing_jobs_policy_20260721 RENAME TO processing_jobs;

CREATE INDEX idx_processing_jobs_ready
  ON processing_jobs(status, available_at);
CREATE INDEX idx_processing_jobs_item_id
  ON processing_jobs(item_id);
