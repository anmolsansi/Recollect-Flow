-- OPE-222: Add AI enrichment fields
ALTER TABLE items ADD COLUMN people TEXT; -- JSON array
ALTER TABLE items ADD COLUMN companies TEXT; -- JSON array
ALTER TABLE items ADD COLUMN why_it_matters TEXT;

-- Manual field overrides for provenance
CREATE TABLE item_field_overrides (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  field_name TEXT NOT NULL,
  override_value TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, field_name)
);

CREATE INDEX idx_item_field_overrides_item_id ON item_field_overrides(item_id);

-- Update provider_usage for robust observability
ALTER TABLE provider_usage ADD COLUMN model TEXT;
ALTER TABLE provider_usage ADD COLUMN latency_ms INTEGER;
ALTER TABLE provider_usage ADD COLUMN status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed'));
ALTER TABLE provider_usage ADD COLUMN error_code TEXT;
