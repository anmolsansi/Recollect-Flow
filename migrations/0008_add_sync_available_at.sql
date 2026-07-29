-- OPE-246: add a non-null availability timestamp without losing existing rows.

PRAGMA defer_foreign_keys = true;

CREATE TABLE sync_attempts_available_20260729 (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  destination TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  last_error_code TEXT,
  lease_owner TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO sync_attempts_available_20260729 (
  id, item_id, destination, status, attempts, available_at, last_error_code,
  lease_owner, lease_expires_at, created_at, updated_at
)
SELECT
  id, item_id, destination, status, attempts, created_at, last_error_code,
  lease_owner,
  CASE
    WHEN status = 'processing' AND lease_expires_at IS NULL THEN updated_at
    ELSE lease_expires_at
  END,
  created_at, updated_at
FROM sync_attempts;

DROP TABLE sync_attempts;
ALTER TABLE sync_attempts_available_20260729 RENAME TO sync_attempts;

CREATE INDEX idx_sync_attempts_item_id ON sync_attempts(item_id);
CREATE INDEX idx_sync_attempts_lease
  ON sync_attempts(status, lease_expires_at);
CREATE INDEX idx_sync_attempts_ready
  ON sync_attempts(status, available_at);

UPDATE processing_jobs
SET lease_expires_at = updated_at
WHERE lease_expires_at IS NULL AND status = 'processing';
