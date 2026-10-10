-- BG-13: same-transaction status projection for explicitly current work only.
-- View is read-only and serves as a single SQL interpretation of the BG-12
-- precedence. Historical NULL-generation jobs are excluded. Optional sync and
-- digest records are not part of item processing state.
CREATE VIEW bg13_current_processing_stages AS
SELECT j.*
FROM processing_jobs j
JOIN items i ON i.id = j.item_id
WHERE j.processing_generation = i.processing_generation
  AND j.job_type IN ('acquire_url', 'extract', 'enrich')
  AND (j.job_type <> 'enrich' OR COALESCE(j.provider_eligibility, 'none') <> 'none')
  AND NOT EXISTS (
    SELECT 1 FROM processing_jobs newer
    WHERE newer.item_id = j.item_id
      AND newer.processing_generation = j.processing_generation
      AND newer.job_type = j.job_type
      AND (newer.created_at > j.created_at
           OR (newer.created_at = j.created_at AND newer.id > j.id))
  );

CREATE VIEW bg13_processing_snapshot AS
SELECT i.id AS item_id,
  CASE
    WHEN i.deleted_at IS NOT NULL THEN NULL
    WHEN EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      WHERE j.item_id = i.id AND j.status = 'failed'
    ) THEN 'failed'
    WHEN EXISTS (
      SELECT 1 FROM extraction_records er
      JOIN attachments a ON a.id = er.attachment_id AND a.item_id = i.id
      WHERE er.item_id = i.id
        AND er.processing_generation = i.processing_generation
        AND a.status = 'linked'
        AND er.completeness IN ('failed', 'empty', 'unsupported')
    ) THEN 'failed'
    WHEN EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      WHERE j.item_id = i.id AND j.status = 'processing'
        AND j.lease_owner IS NOT NULL
        AND j.lease_expires_at > j.updated_at
    ) THEN 'processing'
    WHEN EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      WHERE j.item_id = i.id AND j.status IN ('pending', 'processing')
    ) THEN 'pending'
    WHEN EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      JOIN attachments a ON a.item_id = i.id AND a.status = 'linked'
      LEFT JOIN extraction_records er
        ON er.attachment_id = a.id
        AND er.processing_generation = i.processing_generation
      WHERE j.item_id = i.id AND j.job_type = 'extract'
        AND j.status = 'complete'
        AND (er.id IS NULL OR er.completeness NOT IN ('complete', 'partial'))
    ) THEN 'pending'
    -- A current URL capture needs a current acquisition record before it can
    -- be considered complete, even if an optional sibling job finished.
    WHEN i.source_type = 'url' AND i.source_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM bg13_current_processing_stages j
        WHERE j.item_id = i.id AND j.job_type = 'acquire_url'
      ) THEN 'pending'
    -- Each linked file requires an extraction stage and current evidence.
    WHEN EXISTS (
      SELECT 1 FROM attachments a
      WHERE a.item_id = i.id AND a.status = 'linked'
    ) AND NOT EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      WHERE j.item_id = i.id AND j.job_type = 'extract'
    ) THEN 'pending'
    -- Downstream enrichment is required only where the current routing
    -- policy allows AI and source/attachment evidence is usable. The chained
    -- writer must create this job before completing its upstream stage.
    WHEN NOT EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j
      WHERE j.item_id = i.id AND j.job_type = 'enrich'
    ) AND (
      EXISTS (
        SELECT 1 FROM bg13_current_processing_stages j
        WHERE j.item_id = i.id AND j.job_type = 'acquire_url'
          AND j.status = 'complete'
          AND j.provider_eligibility <> 'none'
          AND TRIM(COALESCE(i.raw_text, '')) <> ''
      )
      OR EXISTS (
        SELECT 1 FROM bg13_current_processing_stages j
        JOIN extraction_records er
          ON er.item_id = i.id
          AND er.processing_generation = i.processing_generation
          AND er.completeness IN ('complete', 'partial')
          AND (TRIM(COALESCE(er.extracted_text, '')) <> ''
               OR TRIM(COALESCE(er.image_description, '')) <> '')
        WHERE j.item_id = i.id AND j.job_type = 'extract'
          AND j.status = 'complete'
          AND j.provider_eligibility <> 'none'
      )
    ) THEN 'pending'
    WHEN EXISTS (
      SELECT 1 FROM bg13_current_processing_stages j WHERE j.item_id = i.id
    ) THEN 'complete'
    -- The capture scheduler also records deliberately skipped optional AI
    -- stages with provider_eligibility = none. They do not block save-only.
    WHEN EXISTS (
      SELECT 1 FROM processing_jobs j
      WHERE j.item_id = i.id
        AND j.processing_generation = i.processing_generation
    ) THEN 'complete'
    -- Legacy rows without proven current jobs must NOT be guessed complete.
    ELSE i.processing_status
  END AS derived_status,
  EXISTS (
    SELECT 1 FROM processing_jobs j
    WHERE j.item_id = i.id
      AND j.processing_generation = i.processing_generation
  ) AS has_current_jobs
FROM items i;

-- Job INSERT/UPDATE and materialized item state are atomic in the SAME SQLite
-- statement. No side-effectful provider calls or cross-request transactions.
CREATE TRIGGER bg13_processing_job_status_au
AFTER UPDATE OF processing_generation, status, lease_owner, lease_expires_at
ON processing_jobs
BEGIN
  UPDATE items
  SET processing_status = (
    SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
  )
  WHERE id = NEW.item_id AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM bg13_processing_snapshot
      WHERE item_id = NEW.item_id AND has_current_jobs = 1
    )
    AND processing_status IS NOT (
      SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
    );
END;

-- Callers that explicitly supplied an epoch on insert also trigger reconciliation.
CREATE TRIGGER bg13_processing_job_status_ai
AFTER INSERT ON processing_jobs
WHEN NEW.processing_generation IS NOT NULL
BEGIN
  UPDATE items
  SET processing_status = (
    SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
  )
  WHERE id = NEW.item_id AND deleted_at IS NULL
    AND processing_status IS NOT (
      SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
    );
END;

CREATE TRIGGER bg13_extraction_status_au
AFTER UPDATE OF processing_generation, completeness ON extraction_records
BEGIN
  UPDATE items
  SET processing_status = (
    SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
  )
  WHERE id = NEW.item_id AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM bg13_processing_snapshot
      WHERE item_id = NEW.item_id AND has_current_jobs = 1
    )
    AND processing_status IS NOT (
      SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
    );
END;

CREATE TRIGGER bg13_extraction_status_ai
AFTER INSERT ON extraction_records
WHEN NEW.processing_generation IS NOT NULL
BEGIN
  UPDATE items
  SET processing_status = (
    SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
  )
  WHERE id = NEW.item_id AND deleted_at IS NULL
    AND processing_status IS NOT (
      SELECT derived_status FROM bg13_processing_snapshot WHERE item_id = NEW.item_id
    );
END;
