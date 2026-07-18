PRAGMA foreign_keys = ON;

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'text', 'note', 'image', 'file')),
  source_app TEXT NOT NULL,
  source_url TEXT,
  canonical_url TEXT,
  title TEXT,
  raw_text TEXT,
  user_note TEXT,
  quick_category TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'unknown' CHECK (privacy_level IN ('unknown', 'public', 'personal', 'sensitive')),
  content_hash TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  notion_page_id TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_items_captured_at ON items(captured_at DESC);
CREATE INDEX idx_items_processing_status ON items(processing_status);
CREATE INDEX idx_items_source_type ON items(source_type);
CREATE INDEX idx_items_canonical_url ON items(canonical_url);
CREATE INDEX idx_items_content_hash ON items(content_hash);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  content_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_attachments_item_id ON attachments(item_id);

CREATE TABLE processing_jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_processing_jobs_ready ON processing_jobs(status, available_at);
CREATE INDEX idx_processing_jobs_item_id ON processing_jobs(item_id);

CREATE TABLE sync_attempts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  destination TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_sync_attempts_item_id ON sync_attempts(item_id);

CREATE TABLE provider_usage (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_units INTEGER NOT NULL DEFAULT 0,
  output_units INTEGER NOT NULL DEFAULT 0,
  estimated_cost_micros INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX idx_audit_events_item_id ON audit_events(item_id, created_at);
