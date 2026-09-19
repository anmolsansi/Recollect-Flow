-- OPE-225: Rebuild item_search_fts index
-- Use this script to recover from index drift or corruption.
-- Local rehearsal:
-- npx wrangler d1 execute recollect-flow-prod --local --file=scripts/rebuild-item-search-index.sql
-- Production requires a backup and explicit approval:
-- npx wrangler d1 execute recollect-flow-prod --remote --file=scripts/rebuild-item-search-index.sql

BEGIN TRANSACTION;

DELETE FROM item_search_fts;

INSERT INTO item_search_fts(
  rowid, item_id, title, raw_text, user_note, summary, topics, project, people, companies, source_text
) SELECT
  i.rowid,
  i.id,
  i.title,
  i.raw_text,
  i.user_note,
  i.summary,
  CASE WHEN json_valid(i.topics_json) THEN (SELECT group_concat(value, ' ') FROM json_each(i.topics_json)) ELSE '' END,
  i.project,
  CASE WHEN json_valid(i.people) THEN (SELECT group_concat(value, ' ') FROM json_each(i.people)) ELSE '' END,
  CASE WHEN json_valid(i.companies) THEN (SELECT group_concat(value, ' ') FROM json_each(i.companies)) ELSE '' END,
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
