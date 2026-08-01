-- OPE-225: Rebuild item_search_fts index
-- Use this script to recover from index drift or corruption.
-- Execute via wrangler:
-- npx wrangler d1 execute recollect-flow-prod --file=scripts/rebuild-item-search-index.sql

BEGIN TRANSACTION;

DELETE FROM item_search_fts;

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

-- Verify the rebuild (these should return 0 rows or match appropriately)

-- 1. Canonical rows missing from FTS
-- SELECT id FROM items WHERE deleted_at IS NULL AND rowid NOT IN (SELECT rowid FROM item_search_fts);

-- 2. Indexed rows missing from canonical items
-- SELECT rowid, item_id FROM item_search_fts WHERE rowid NOT IN (SELECT rowid FROM items);

-- 3. Indexed soft-deleted items
-- SELECT f.rowid, f.item_id FROM item_search_fts f JOIN items i ON f.rowid = i.rowid WHERE i.deleted_at IS NOT NULL;

-- 4. Duplicate indexed IDs
-- SELECT item_id, COUNT(*) as c FROM item_search_fts GROUP BY item_id HAVING c > 1;

-- 5. Canonical versus indexed counts (these 3 counts should be identical)
-- SELECT COUNT(*) as items_count FROM items WHERE deleted_at IS NULL;
-- SELECT COUNT(*) as fts_count FROM item_search_fts;
-- SELECT COUNT(DISTINCT item_id) as distinct_fts_items FROM item_search_fts;

COMMIT;
