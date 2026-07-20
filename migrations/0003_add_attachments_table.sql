-- OPE-249: data-preserving attachment upload lifecycle migration.

ALTER TABLE attachments RENAME TO attachments_legacy;

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploaded', 'finalized', 'linked', 'orphaned', 'deleted')),
  file_name TEXT NOT NULL,
  declared_content_type TEXT NOT NULL,
  detected_content_type TEXT,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  content_hash TEXT,
  expires_at TEXT NOT NULL,
  uploaded_at TEXT,
  finalized_at TEXT,
  linked_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO attachments (
  id, item_id, object_key, status, file_name, declared_content_type,
  detected_content_type, size_bytes, content_hash, expires_at,
  uploaded_at, finalized_at, linked_at, deleted_at, created_at, updated_at
)
SELECT
  id, item_id, object_key, 'linked', file_name, content_type,
  content_type, size_bytes, content_hash, '9999-12-31T23:59:59.999Z',
  created_at, created_at, created_at, NULL, created_at, created_at
FROM attachments_legacy;

DROP TABLE attachments_legacy;

CREATE INDEX idx_attachments_item_id ON attachments(item_id);
CREATE INDEX idx_attachments_status_expiry ON attachments(status, expires_at);

CREATE TRIGGER capture_event_attachment_must_be_linkable
BEFORE INSERT ON capture_events
WHEN NEW.attachment_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'attachment_not_linkable')
  WHERE NOT EXISTS (
    SELECT 1 FROM attachments
    WHERE id = NEW.attachment_id
      AND item_id IS NULL
      AND status = 'finalized'
      AND expires_at > NEW.created_at
  );
END;

CREATE TRIGGER capture_event_link_attachment
AFTER INSERT ON capture_events
WHEN NEW.attachment_id IS NOT NULL
BEGIN
  UPDATE attachments
  SET item_id = NEW.item_id,
      status = 'linked',
      linked_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.attachment_id;
END;
