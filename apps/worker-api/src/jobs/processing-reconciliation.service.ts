import { AppError } from '../shared/errors';

const MAX_BATCH = 20;

/**
 * BG-13: manual, bounded reconciliation. No automatic startup scan or
 * timestamp-based interpretation of historical NULL-generation jobs.
 */
export class ProcessingReconciliationService {
  constructor(private readonly db: D1Database) {}

  async preview(limit = MAX_BATCH): Promise<{
    count: number;
    candidates: Array<{
      itemId: string;
      storedStatus: string;
      derivedStatus: string;
    }>;
  }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Preview limit must be 1 through 20.',
      );
    }
    const conditions = `FROM bg13_processing_snapshot s
      JOIN items i ON i.id = s.item_id
      WHERE s.has_current_jobs = 1
        AND i.deleted_at IS NULL
        AND s.derived_status IS NOT NULL
        AND i.processing_status IS NOT s.derived_status
        AND NOT EXISTS (
          SELECT 1 FROM purge_workflows p WHERE p.item_id = i.id
            AND p.state IN ('queued', 'processing', 'partial')
        )`;
    const count = await this.db
      .prepare(`SELECT COUNT(*) AS count ${conditions}`)
      .first<{ count: number }>();
    const rows = await this.db
      .prepare(
        `SELECT i.id AS itemId, i.processing_status AS storedStatus,
                s.derived_status AS derivedStatus ${conditions}
         ORDER BY i.created_at ASC, i.id ASC LIMIT ?1`,
      )
      .bind(limit)
      .all<{
        itemId: string;
        storedStatus: string;
        derivedStatus: string;
      }>();
    return {
      count: count?.count ?? 0,
      candidates: rows.results ?? [],
    };
  }

  /** Requires reviewed identifiers. SQL recalculates at write time. */
  async reconcile(itemIds: string[]): Promise<{
    updated: number;
    skipped: number;
  }> {
    if (
      !Array.isArray(itemIds) ||
      itemIds.length < 1 ||
      itemIds.length > MAX_BATCH ||
      new Set(itemIds).size !== itemIds.length ||
      itemIds.some((id) => typeof id !== 'string' || !id.trim())
    ) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Supply 1–20 unique nonempty item IDs.',
      );
    }
    const results = await this.db.batch(
      itemIds.map((id) =>
        this.db
          .prepare(
            `UPDATE items
             SET processing_status = (
               SELECT derived_status FROM bg13_processing_snapshot
               WHERE item_id = ?1
             )
             WHERE id = ?1 AND deleted_at IS NULL
               AND EXISTS (
                 SELECT 1 FROM bg13_processing_snapshot s
                 WHERE s.item_id = ?1
                   AND s.has_current_jobs = 1
                   AND s.derived_status IS NOT NULL
                   AND s.derived_status IS NOT items.processing_status
               )
               AND NOT EXISTS (
                 SELECT 1 FROM purge_workflows p
                 WHERE p.item_id = items.id
                   AND p.state IN ('queued', 'processing', 'partial')
               )
             RETURNING id`,
          )
          .bind(id),
      ),
    );
    const updated = results.filter(
      (entry) => (entry.results?.length ?? 0) === 1,
    ).length;
    return { updated, skipped: itemIds.length - updated };
  }
}
