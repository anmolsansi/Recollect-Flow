CREATE TABLE extraction_records (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  attachment_id TEXT NOT NULL UNIQUE REFERENCES attachments(id) ON DELETE RESTRICT,
  extractor_name TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  extracted_text TEXT,
  image_description TEXT,
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  page_count INTEGER,
  completeness TEXT NOT NULL CHECK (completeness IN ('complete', 'partial', 'empty', 'unsupported', 'failed')),
  coverage TEXT,
  provider_name TEXT,
  model_name TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_extraction_records_item_id ON extraction_records(item_id);
