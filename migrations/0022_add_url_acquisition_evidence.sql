-- OPE-330 / BG-10: durable URL source evidence and lexical projection.
-- Source evidence stays separate from owner-supplied raw_text and generated fields.

ALTER TABLE items ADD COLUMN source_revision INTEGER NOT NULL DEFAULT 1
  CHECK (source_revision >= 1);

CREATE TABLE url_acquisitions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  job_id TEXT NOT NULL UNIQUE,
  source_revision INTEGER NOT NULL CHECK (source_revision >= 1),
  source_url_snapshot TEXT NOT NULL
    CHECK (length(source_url_snapshot) BETWEEN 1 AND 2048),
  privacy_level_snapshot TEXT NOT NULL
    CHECK (privacy_level_snapshot IN ('unknown', 'public', 'personal', 'sensitive')),
  status TEXT NOT NULL CHECK (status IN (
    'acquired_text', 'metadata_only', 'unavailable', 'destination_blocked',
    'policy_blocked', 'login_required', 'timeout', 'network_error',
    'rate_limited', 'server_error', 'unsupported_content', 'too_large',
    'redirect_limit', 'empty', 'parse_failed'
  )),
  coverage TEXT NOT NULL CHECK (coverage IN (
    'url_only', 'metadata_only', 'supplied_text', 'acquired_text'
  )),
  fetched_final_url TEXT
    CHECK (fetched_final_url IS NULL OR length(fetched_final_url) <= 8192),
  http_status INTEGER CHECK (
    http_status IS NULL OR (http_status >= 100 AND http_status <= 599)
  ),
  content_type TEXT
    CHECK (content_type IS NULL OR length(content_type) <= 255),
  response_bytes INTEGER CHECK (
    response_bytes IS NULL OR (response_bytes >= 0 AND response_bytes <= 2097152)
  ),
  redirect_count INTEGER NOT NULL DEFAULT 0
    CHECK (redirect_count BETWEEN 0 AND 5),
  attempt_count INTEGER NOT NULL CHECK (attempt_count BETWEEN 1 AND 3),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  network_io_skipped_by_policy INTEGER NOT NULL
    CHECK (network_io_skipped_by_policy IN (0, 1)),
  source_title TEXT
    CHECK (source_title IS NULL OR length(source_title) <= 2000),
  source_description TEXT
    CHECK (source_description IS NULL OR length(source_description) <= 8000),
  source_site_name TEXT
    CHECK (source_site_name IS NULL OR length(source_site_name) <= 1000),
  source_canonical_hint_url TEXT
    CHECK (source_canonical_hint_url IS NULL OR length(source_canonical_hint_url) <= 8192),
  acquired_text TEXT
    CHECK (acquired_text IS NULL OR length(acquired_text) <= 250000),
  acquired_text_hash TEXT
    CHECK (acquired_text_hash IS NULL OR length(acquired_text_hash) = 64),
  extracted_characters INTEGER CHECK (
    extracted_characters IS NULL OR
    (extracted_characters >= 0 AND extracted_characters <= 250000)
  ),
  error_code TEXT CHECK (error_code IS NULL OR length(error_code) <= 80),
  retryable INTEGER NOT NULL DEFAULT 0 CHECK (retryable IN (0, 1)),
  parser_name TEXT NOT NULL CHECK (length(parser_name) BETWEEN 1 AND 100),
  parser_version TEXT NOT NULL CHECK (length(parser_version) BETWEEN 1 AND 100),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_url_acquisitions_item_current
  ON url_acquisitions(item_id, source_revision, privacy_level_snapshot, completed_at DESC, id DESC);
CREATE INDEX idx_url_acquisitions_status
  ON url_acquisitions(status, completed_at DESC);

-- Evidence rows are observations. A later acquisition creates another row.
CREATE TRIGGER url_acquisitions_immutable
BEFORE UPDATE ON url_acquisitions
BEGIN
  SELECT RAISE(ABORT, 'URL_ACQUISITION_IMMUTABLE');
END;

-- If a future source edit changes the submitted URL, advance the source generation.
CREATE TRIGGER items_source_revision_au
AFTER UPDATE OF source_url ON items
WHEN OLD.source_url IS NOT NEW.source_url
BEGIN
  UPDATE items
  SET source_revision = source_revision + 1
  WHERE id = NEW.id;
END;

-- Rebuild the lexical projection with a dedicated source_text field. Fetched text
-- is projected, never copied into items.raw_text.
DROP TRIGGER IF EXISTS items_search_fts_ai;
DROP TRIGGER IF EXISTS items_search_fts_au;
DROP TRIGGER IF EXISTS items_search_fts_ad;

CREATE VIRTUAL TABLE item_search_fts_bg10 USING fts5(
  item_id UNINDEXED,
  title,
  raw_text,
  user_note,
  summary,
  topics,
  project,
  people,
  companies,
  source_text,
  tokenize='unicode61 remove_diacritics 1',
  prefix='2 3 4 5'
);

INSERT INTO item_search_fts_bg10(
  rowid, item_id, title, raw_text, user_note, summary, topics, project,
  people, companies, source_text
) SELECT
  i.rowid,
  i.id,
  i.title,
  i.raw_text,
  i.user_note,
  i.summary,
  CASE WHEN json_valid(i.topics_json)
    THEN (SELECT group_concat(value, ' ') FROM json_each(i.topics_json))
    ELSE '' END,
  i.project,
  CASE WHEN json_valid(i.people)
    THEN (SELECT group_concat(value, ' ') FROM json_each(i.people))
    ELSE '' END,
  CASE WHEN json_valid(i.companies)
    THEN (SELECT group_concat(value, ' ') FROM json_each(i.companies))
    ELSE '' END,
  (
    SELECT ua.acquired_text
    FROM url_acquisitions ua
    WHERE ua.item_id = i.id
      AND ua.source_revision = i.source_revision
      AND ua.privacy_level_snapshot = i.privacy_level
    ORDER BY ua.completed_at DESC, ua.id DESC
    LIMIT 1
  )
FROM items i
WHERE i.deleted_at IS NULL;

DROP TABLE item_search_fts;
ALTER TABLE item_search_fts_bg10 RENAME TO item_search_fts;

CREATE TRIGGER items_search_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project,
    people, companies, source_text
  ) SELECT
    NEW.rowid,
    NEW.id,
    NEW.title,
    NEW.raw_text,
    NEW.user_note,
    NEW.summary,
    CASE WHEN json_valid(NEW.topics_json)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.topics_json))
      ELSE '' END,
    NEW.project,
    CASE WHEN json_valid(NEW.people)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.people))
      ELSE '' END,
    CASE WHEN json_valid(NEW.companies)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.companies))
      ELSE '' END,
    (
      SELECT ua.acquired_text
      FROM url_acquisitions ua
      WHERE ua.item_id = NEW.id
        AND ua.source_revision = NEW.source_revision
        AND ua.privacy_level_snapshot = NEW.privacy_level
      ORDER BY ua.completed_at DESC, ua.id DESC
      LIMIT 1
    )
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER items_search_fts_au
AFTER UPDATE OF title, raw_text, user_note, summary, topics_json, project,
                people, companies, deleted_at, privacy_level, source_revision
ON items BEGIN
  DELETE FROM item_search_fts WHERE rowid = OLD.rowid;
  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project,
    people, companies, source_text
  ) SELECT
    NEW.rowid,
    NEW.id,
    NEW.title,
    NEW.raw_text,
    NEW.user_note,
    NEW.summary,
    CASE WHEN json_valid(NEW.topics_json)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.topics_json))
      ELSE '' END,
    NEW.project,
    CASE WHEN json_valid(NEW.people)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.people))
      ELSE '' END,
    CASE WHEN json_valid(NEW.companies)
      THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.companies))
      ELSE '' END,
    (
      SELECT ua.acquired_text
      FROM url_acquisitions ua
      WHERE ua.item_id = NEW.id
        AND ua.source_revision = NEW.source_revision
        AND ua.privacy_level_snapshot = NEW.privacy_level
      ORDER BY ua.completed_at DESC, ua.id DESC
      LIMIT 1
    )
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER items_search_fts_ad AFTER DELETE ON items BEGIN
  DELETE FROM item_search_fts WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER url_acquisitions_search_fts_ai
AFTER INSERT ON url_acquisitions BEGIN
  DELETE FROM item_search_fts
  WHERE rowid = (SELECT rowid FROM items WHERE id = NEW.item_id);

  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project,
    people, companies, source_text
  )
  SELECT
    i.rowid,
    i.id,
    i.title,
    i.raw_text,
    i.user_note,
    i.summary,
    CASE WHEN json_valid(i.topics_json)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.topics_json))
      ELSE '' END,
    i.project,
    CASE WHEN json_valid(i.people)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.people))
      ELSE '' END,
    CASE WHEN json_valid(i.companies)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.companies))
      ELSE '' END,
    (
      SELECT ua.acquired_text
      FROM url_acquisitions ua
      WHERE ua.item_id = i.id
        AND ua.source_revision = i.source_revision
        AND ua.privacy_level_snapshot = i.privacy_level
      ORDER BY ua.completed_at DESC, ua.id DESC
      LIMIT 1
    )
  FROM items i
  WHERE i.id = NEW.item_id AND i.deleted_at IS NULL;
END;

CREATE TRIGGER url_acquisitions_search_fts_ad
AFTER DELETE ON url_acquisitions BEGIN
  DELETE FROM item_search_fts
  WHERE rowid = (SELECT rowid FROM items WHERE id = OLD.item_id);

  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project,
    people, companies, source_text
  )
  SELECT
    i.rowid,
    i.id,
    i.title,
    i.raw_text,
    i.user_note,
    i.summary,
    CASE WHEN json_valid(i.topics_json)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.topics_json))
      ELSE '' END,
    i.project,
    CASE WHEN json_valid(i.people)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.people))
      ELSE '' END,
    CASE WHEN json_valid(i.companies)
      THEN (SELECT group_concat(value, ' ') FROM json_each(i.companies))
      ELSE '' END,
    (
      SELECT ua.acquired_text
      FROM url_acquisitions ua
      WHERE ua.item_id = i.id
        AND ua.source_revision = i.source_revision
        AND ua.privacy_level_snapshot = i.privacy_level
      ORDER BY ua.completed_at DESC, ua.id DESC
      LIMIT 1
    )
  FROM items i
  WHERE i.id = OLD.item_id AND i.deleted_at IS NULL;
END;
