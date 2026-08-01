import { Hono } from 'hono';
import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';

export function itemRoutes() {
  const router = new Hono<AppContext>();

  router.get('/items/:id', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const db = context.env.DB;

    const item = await db
      .prepare(
        `SELECT id, source_type, source_app, source_url, canonical_url,
                raw_text, user_note, quick_category, privacy_level,
                captured_at, created_at, updated_at
         FROM items
         WHERE id = ?1 AND deleted_at IS NULL`,
      )
      .bind(itemId)
      .first();

    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Item not found');
    }

    const extractionRows = await db
      .prepare(
        `SELECT attachment_id, extractor_name, extractor_version,
                extracted_text, image_description, confidence, page_count,
                completeness, coverage, provider_name, model_name, error_code,
                updated_at
         FROM extraction_records
         WHERE item_id = ?1
         ORDER BY updated_at DESC, attachment_id ASC`,
      )
      .bind(itemId)
      .all();
    const extractions = extractionRows.results ?? [];

    return context.json({
      data: {
        item,
        // Keep the singular field for existing clients while exposing every
        // attachment result to newer clients.
        extraction: extractions[0] ?? null,
        extractions,
      },
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
