-- OPE-220/OPE-221/OPE-246: complete the V1 projection and durable-job contracts.
-- All additions are nullable or have safe defaults so existing captures remain readable.

ALTER TABLE items ADD COLUMN summary TEXT;
ALTER TABLE items ADD COLUMN project TEXT;
ALTER TABLE items ADD COLUMN topics_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE items ADD COLUMN importance INTEGER
  CHECK (importance IS NULL OR (importance >= 0 AND importance <= 100));
ALTER TABLE items ADD COLUMN suggested_action TEXT;
ALTER TABLE items ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'Inbox'
  CHECK (lifecycle_status IN ('Inbox', 'Reviewed', 'Actioned', 'Archived', 'Duplicate', 'Deleted'));
ALTER TABLE items ADD COLUMN coverage TEXT NOT NULL DEFAULT 'URL_ONLY'
  CHECK (coverage IN ('URL_ONLY', 'METADATA', 'SHARED_TEXT', 'EXTRACTED_TEXT', 'SCREENSHOT_TEXT', 'USER_TRANSCRIPT', 'FULL_USER_FILE', 'PARTIAL'));
ALTER TABLE items ADD COLUMN review_at TEXT;
ALTER TABLE items ADD COLUMN projection_version INTEGER NOT NULL DEFAULT 1
  CHECK (projection_version >= 1);
ALTER TABLE items ADD COLUMN projection_hash TEXT;
ALTER TABLE items ADD COLUMN notion_last_synced_at TEXT;
ALTER TABLE items ADD COLUMN notion_missing_at TEXT;

CREATE INDEX idx_items_lifecycle_processing
  ON items(lifecycle_status, processing_status, captured_at DESC);
CREATE INDEX idx_items_project ON items(project);
CREATE INDEX idx_items_notion_missing ON items(notion_missing_at)
  WHERE notion_missing_at IS NOT NULL;

ALTER TABLE processing_jobs ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processing_jobs ADD COLUMN input_hash TEXT;
ALTER TABLE processing_jobs ADD COLUMN result_version TEXT;
ALTER TABLE processing_jobs ADD COLUMN heartbeat_at TEXT;
ALTER TABLE processing_jobs ADD COLUMN completed_at TEXT;
ALTER TABLE processing_jobs ADD COLUMN manual_retry_count INTEGER NOT NULL DEFAULT 0
  CHECK (manual_retry_count >= 0 AND manual_retry_count <= 3);

ALTER TABLE sync_attempts ADD COLUMN payload_version TEXT NOT NULL DEFAULT '1';
ALTER TABLE sync_attempts ADD COLUMN payload_hash TEXT;
ALTER TABLE sync_attempts ADD COLUMN retry_after_at TEXT;
ALTER TABLE sync_attempts ADD COLUMN completed_at TEXT;
ALTER TABLE sync_attempts ADD COLUMN manual_retry_count INTEGER NOT NULL DEFAULT 0
  CHECK (manual_retry_count >= 0 AND manual_retry_count <= 3);

CREATE TABLE processing_job_results (
  job_id TEXT PRIMARY KEY REFERENCES processing_jobs(id) ON DELETE RESTRICT,
  submission_id TEXT NOT NULL UNIQUE,
  input_hash TEXT NOT NULL,
  result_version TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE operational_controls (
  control_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

INSERT INTO operational_controls (control_key, enabled, updated_at, updated_by)
VALUES ('optional_processing_paused', 0, '1970-01-01T00:00:00.000Z', 'migration');

INSERT INTO audit_events (
  id, item_id, event_type, actor_type, details_json, created_at
)
SELECT
  lower(hex(randomblob(16))), item_id, 'migration_duplicate_job_closed',
  'migration', json_object('job_id', id, 'job_type', job_type), updated_at
FROM (
  SELECT id, item_id, job_type, updated_at,
         row_number() OVER (
           PARTITION BY item_id, job_type ORDER BY created_at ASC, id ASC
         ) AS row_number
  FROM processing_jobs
  WHERE status IN ('pending', 'processing')
)
WHERE row_number > 1;

UPDATE processing_jobs
SET status = 'failed', last_error_code = 'MIGRATION_DUPLICATE_ACTIVE_JOB',
    lease_owner = NULL, lease_expires_at = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY item_id, job_type ORDER BY created_at ASC, id ASC
           ) AS row_number
    FROM processing_jobs
    WHERE status IN ('pending', 'processing')
  )
  WHERE row_number > 1
);

INSERT INTO audit_events (
  id, item_id, event_type, actor_type, details_json, created_at
)
SELECT
  lower(hex(randomblob(16))), item_id, 'migration_duplicate_sync_closed',
  'migration', json_object('sync_attempt_id', id, 'destination', destination),
  updated_at
FROM (
  SELECT id, item_id, destination, updated_at,
         row_number() OVER (
           PARTITION BY item_id, destination ORDER BY created_at ASC, id ASC
         ) AS row_number
  FROM sync_attempts
  WHERE status IN ('pending', 'processing')
)
WHERE row_number > 1;

UPDATE sync_attempts
SET status = 'failed', last_error_code = 'MIGRATION_DUPLICATE_ACTIVE_SYNC',
    lease_owner = NULL, lease_expires_at = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY item_id, destination ORDER BY created_at ASC, id ASC
           ) AS row_number
    FROM sync_attempts
    WHERE status IN ('pending', 'processing')
  )
  WHERE row_number > 1
);

INSERT INTO sync_attempts (
  id, item_id, destination, status, attempts, available_at, created_at, updated_at
)
SELECT
  lower(hex(randomblob(16))), i.id, 'notion', 'pending', 0,
  i.updated_at, i.updated_at, i.updated_at
FROM items i
WHERE i.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM sync_attempts s
    WHERE s.item_id = i.id AND s.destination = 'notion'
  );

CREATE UNIQUE INDEX idx_processing_jobs_active_unique
  ON processing_jobs(item_id, job_type)
  WHERE status IN ('pending', 'processing');

CREATE UNIQUE INDEX idx_sync_attempts_active_unique
  ON sync_attempts(item_id, destination)
  WHERE status IN ('pending', 'processing');

CREATE INDEX idx_processing_jobs_lease_ready
  ON processing_jobs(job_type, status, available_at, lease_expires_at, priority DESC);
CREATE INDEX idx_sync_attempts_lease_ready
  ON sync_attempts(destination, status, available_at, lease_expires_at);

CREATE TRIGGER item_machine_projection_changed
AFTER UPDATE OF
  source_url, source_app, source_type, captured_at, user_note, summary,
  suggested_action, privacy_level, processing_status, coverage
ON items
WHEN NEW.deleted_at IS NULL AND (
  OLD.source_url IS NOT NEW.source_url
  OR OLD.source_app IS NOT NEW.source_app
  OR OLD.source_type IS NOT NEW.source_type
  OR OLD.captured_at IS NOT NEW.captured_at
  OR OLD.user_note IS NOT NEW.user_note
  OR OLD.summary IS NOT NEW.summary
  OR OLD.suggested_action IS NOT NEW.suggested_action
  OR OLD.privacy_level IS NOT NEW.privacy_level
  OR OLD.processing_status IS NOT NEW.processing_status
  OR OLD.coverage IS NOT NEW.coverage
)
BEGIN
  UPDATE items
  SET projection_version = projection_version + 1,
      projection_hash = NULL
  WHERE id = NEW.id;

  INSERT INTO sync_attempts (
    id, item_id, destination, status, attempts, available_at, created_at, updated_at
  )
  SELECT
    lower(hex(randomblob(16))), NEW.id, 'notion', 'pending', 0,
    NEW.updated_at, NEW.updated_at, NEW.updated_at
  WHERE NOT EXISTS (
    SELECT 1 FROM sync_attempts
    WHERE item_id = NEW.id AND destination = 'notion'
      AND status IN ('pending', 'processing')
  );
END;
