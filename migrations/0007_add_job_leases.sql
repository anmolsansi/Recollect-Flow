-- Migration number: 0007 	 2026-07-29T17:08:15.000Z

-- Add lease tracking to processing_jobs
ALTER TABLE processing_jobs ADD COLUMN lease_owner TEXT;
ALTER TABLE processing_jobs ADD COLUMN lease_expires_at TEXT;

CREATE INDEX idx_processing_jobs_lease ON processing_jobs(status, lease_expires_at);

-- Add lease tracking to sync_attempts
ALTER TABLE sync_attempts ADD COLUMN lease_owner TEXT;
ALTER TABLE sync_attempts ADD COLUMN lease_expires_at TEXT;

CREATE INDEX idx_sync_attempts_lease ON sync_attempts(status, lease_expires_at);
