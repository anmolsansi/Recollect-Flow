-- OPE-225: Add item_search_fts for lexical search
CREATE VIRTUAL TABLE item_search_fts USING fts5(
  item_id UNINDEXED,
  title,
  raw_text,
  user_note,
  summary,
  topics,
  project,
  people,
  companies,
  tokenize='unicode61 remove_diacritics 1',
  prefix='2 3 4 5'
);

-- Backfill existing items using rowid to keep them in sync
INSERT INTO item_search_fts(
  rowid, item_id, title, raw_text, user_note, summary, topics, project, people, companies
) SELECT
  rowid,
  id,
  title,
  raw_text,
  user_note,
  summary,
  CASE WHEN json_valid(topics_json) THEN (SELECT group_concat(value, ' ') FROM json_each(topics_json)) ELSE '' END,
  project,
  CASE WHEN json_valid(people) THEN (SELECT group_concat(value, ' ') FROM json_each(people)) ELSE '' END,
  CASE WHEN json_valid(companies) THEN (SELECT group_concat(value, ' ') FROM json_each(companies)) ELSE '' END
FROM items
WHERE deleted_at IS NULL;

-- Keep index synchronized with triggers (O(1) updates via rowid)

CREATE TRIGGER items_search_fts_ai AFTER INSERT ON items BEGIN
  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project, people, companies
  ) SELECT
    NEW.rowid,
    NEW.id,
    NEW.title,
    NEW.raw_text,
    NEW.user_note,
    NEW.summary,
    CASE WHEN json_valid(NEW.topics_json) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.topics_json)) ELSE '' END,
    NEW.project,
    CASE WHEN json_valid(NEW.people) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.people)) ELSE '' END,
    CASE WHEN json_valid(NEW.companies) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.companies)) ELSE '' END
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER items_search_fts_au AFTER UPDATE OF title, raw_text, user_note, summary, topics_json, project, people, companies, deleted_at ON items BEGIN
  DELETE FROM item_search_fts WHERE rowid = OLD.rowid;
  INSERT INTO item_search_fts(
    rowid, item_id, title, raw_text, user_note, summary, topics, project, people, companies
  ) SELECT
    NEW.rowid,
    NEW.id,
    NEW.title,
    NEW.raw_text,
    NEW.user_note,
    NEW.summary,
    CASE WHEN json_valid(NEW.topics_json) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.topics_json)) ELSE '' END,
    NEW.project,
    CASE WHEN json_valid(NEW.people) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.people)) ELSE '' END,
    CASE WHEN json_valid(NEW.companies) THEN (SELECT group_concat(value, ' ') FROM json_each(NEW.companies)) ELSE '' END
  WHERE NEW.deleted_at IS NULL;
END;

CREATE TRIGGER items_search_fts_ad AFTER DELETE ON items BEGIN
  DELETE FROM item_search_fts WHERE rowid = OLD.rowid;
END;
