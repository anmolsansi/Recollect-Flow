-- OPE-225: Rebuild item_search_fts index
-- Use this script to recover from index drift or corruption.
-- Local rehearsal:
-- npx wrangler d1 execute recollect-flow-prod --local --file=scripts/rebuild-item-search-index.sql
-- Production requires a backup and explicit approval:
-- npx wrangler d1 execute recollect-flow-prod --remote --file=scripts/rebuild-item-search-index.sql

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

COMMIT;

-- Wrangler prints the final statement from a SQL file, so keep every health
-- signal in this one result row. All drift counts must be zero and all three
-- population counts must match.
SELECT
  (SELECT COUNT(*) FROM items WHERE deleted_at IS NULL) AS canonical_items,
  (SELECT COUNT(*) FROM item_search_fts) AS indexed_rows,
  (SELECT COUNT(DISTINCT item_id) FROM item_search_fts) AS distinct_indexed_items,
  (
    SELECT COUNT(*)
    FROM items i
    WHERE i.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM item_search_fts f WHERE f.rowid = i.rowid
      )
  ) AS missing_from_fts,
  (
    SELECT COUNT(*)
    FROM item_search_fts f
    LEFT JOIN items i ON i.rowid = f.rowid
    WHERE i.rowid IS NULL OR i.deleted_at IS NOT NULL
  ) AS orphaned_or_deleted_in_fts,
  (
    SELECT COUNT(*)
    FROM (
      SELECT item_id
      FROM item_search_fts
      GROUP BY item_id
      HAVING COUNT(*) > 1
    )
  ) AS duplicate_item_ids;
