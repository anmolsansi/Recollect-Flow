-- OPE-248: Support concurrency, feedback and reversible soft deletion

ALTER TABLE items ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE items ADD COLUMN deleted_from_lifecycle_status TEXT;

CREATE TABLE item_feedback_events (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('useful', 'not_relevant', 'already_used', 'outdated')),
  source_surface TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(item_id, idempotency_key)
);
