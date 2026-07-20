-- OPE-218: conservative cross-key duplicate detection and capture-event history.
-- Existing items are retained and backfilled as their first capture event.

CREATE TABLE item_deduplication_keys (
  deduplication_key TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_item_deduplication_keys_item_id
  ON item_deduplication_keys(item_id);

CREATE TABLE capture_events (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  duplicate_of TEXT REFERENCES items(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_app TEXT NOT NULL,
  source_url TEXT,
  raw_text TEXT,
  user_note TEXT,
  quick_category TEXT,
  privacy_level TEXT NOT NULL CHECK (privacy_level IN ('unknown', 'public', 'personal', 'sensitive')),
  attachment_id TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_capture_events_item_id
  ON capture_events(item_id, created_at);

CREATE INDEX idx_capture_events_duplicate_of
  ON capture_events(duplicate_of);

INSERT INTO capture_events (
  id, item_id, idempotency_key, duplicate_of, source_type, source_app,
  source_url, raw_text, user_note, quick_category, privacy_level,
  attachment_id, captured_at, created_at
)
SELECT
  'backfill-' || id, id, idempotency_key, NULL, source_type, source_app,
  source_url, raw_text, user_note, quick_category, privacy_level,
  NULL, captured_at, created_at
FROM items;

INSERT OR IGNORE INTO item_deduplication_keys (deduplication_key, item_id, created_at)
SELECT 'source:' || source_url, id, created_at
FROM items
WHERE source_url IS NOT NULL
ORDER BY created_at ASC;

INSERT OR IGNORE INTO item_deduplication_keys (deduplication_key, item_id, created_at)
SELECT 'canonical:' || canonical_url, id, created_at
FROM items
WHERE canonical_url IS NOT NULL
ORDER BY created_at ASC;

INSERT OR IGNORE INTO item_deduplication_keys (deduplication_key, item_id, created_at)
SELECT 'content:' || content_hash, id, created_at
FROM items
WHERE content_hash IS NOT NULL
ORDER BY created_at ASC;
