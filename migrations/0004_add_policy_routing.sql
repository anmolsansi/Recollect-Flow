-- OPE-224: every processing job records the privacy and provider policy used.

ALTER TABLE processing_jobs
  ADD COLUMN privacy_level_snapshot TEXT NOT NULL DEFAULT 'unknown'
  CHECK (privacy_level_snapshot IN ('unknown', 'public', 'personal', 'sensitive'));

ALTER TABLE processing_jobs
  ADD COLUMN provider_eligibility TEXT NOT NULL DEFAULT 'none'
  CHECK (provider_eligibility IN ('workers_ai', 'gemini', 'ollama', 'none'));

ALTER TABLE processing_jobs
  ADD COLUMN policy_version TEXT NOT NULL DEFAULT '2026-07-20.1';
