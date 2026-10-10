-- BG-13: explicit item processing epoch. Historical jobs and extraction evidence
-- deliberately remain NULL: their generation cannot be inferred from timestamps.
-- Additive only; no historic repair, requeue, production backfill, or destructive copy.
ALTER TABLE items ADD COLUMN processing_generation INTEGER NOT NULL DEFAULT 1
  CHECK (processing_generation >= 1);
ALTER TABLE processing_jobs ADD COLUMN processing_generation INTEGER;
ALTER TABLE extraction_records ADD COLUMN processing_generation INTEGER;

CREATE INDEX idx_bg13_job_generation
  ON processing_jobs(item_id, processing_generation, job_type, created_at DESC);
CREATE INDEX idx_bg13_extraction_generation
  ON extraction_records(item_id, processing_generation);

-- All existing job producers (including chained and owner retry paths) stamp a
-- new job with the CURRENT item epoch inside the same SQLite statement/transaction.
-- NULL historical rows are never silently marked current.
CREATE TRIGGER bg13_processing_job_generation_ai
AFTER INSERT ON processing_jobs
WHEN NEW.processing_generation IS NULL
BEGIN
  UPDATE processing_jobs
  SET processing_generation = (
    SELECT processing_generation FROM items WHERE id = NEW.item_id
  )
  WHERE id = NEW.id;
END;

-- Extraction evidence can be replaced after a new generation. Historical
-- evidence is deliberately untrusted until a guarded current write is accepted.
CREATE TRIGGER bg13_extraction_generation_ai
AFTER INSERT ON extraction_records
WHEN NEW.processing_generation IS NULL
BEGIN
  UPDATE extraction_records
  SET processing_generation = (
    SELECT processing_generation FROM items WHERE id = NEW.item_id
  )
  WHERE id = NEW.id;
END;

-- Source, policy, supplied text, or restore transitions invalidate prior work.
-- Owner note/title/derived-field edits do NOT start a new processing epoch.
-- The UPDATE is in the same SQLite transaction as the authoritative edit.
CREATE TRIGGER bg13_items_generation_au
AFTER UPDATE OF source_revision, privacy_level, raw_text, deleted_at ON items
WHEN OLD.source_revision IS NOT NEW.source_revision
  OR OLD.privacy_level IS NOT NEW.privacy_level
  OR OLD.raw_text IS NOT NEW.raw_text
  OR OLD.deleted_at IS NOT NEW.deleted_at
BEGIN
  UPDATE items SET
    processing_generation = OLD.processing_generation + 1,
    processing_status = CASE WHEN NEW.deleted_at IS NULL THEN 'pending'
                             ELSE NEW.processing_status END
  WHERE id = NEW.id;

  -- Unblock unique active-stage slots when policy/source/restore supersedes work.
  UPDATE processing_jobs
  SET status = 'failed',
      last_error_code = 'PROCESSING_SUPERSEDED',
      lease_owner = NULL, lease_expires_at = NULL
  WHERE item_id = NEW.id
    AND processing_generation = OLD.processing_generation
    AND status IN ('pending', 'processing');
END;
