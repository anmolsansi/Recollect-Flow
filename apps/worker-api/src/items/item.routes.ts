import { Hono } from 'hono';
import {
  itemDetailResponseSchema,
  itemDuplicateSchema,
  itemFeedbackSchema,
  itemResetOverridesSchema,
  itemStatusSchema,
  itemUpdateSchema,
  itemVersionActionSchema,
} from '@recollect/contracts';

import type { AppContext } from '../env';
import { JobAdminService } from '../jobs/job.admin.service';
import { searchSchema, searchResponseSchema } from '../search/search.schema';
import { executeSearch } from '../search/search.service';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';

function parseTopics(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((topic): topic is string => typeof topic === 'string')
      : [];
  } catch {
    return [];
  }
}

function requestId(context: { get(key: 'requestId'): string | undefined }) {
  return context.get('requestId') || '';
}

function validationError(message: string): never {
  throw new AppError(422, 'VALIDATION_ERROR', message);
}

async function itemVersion(
  db: D1Database,
  itemId: string,
): Promise<{ edit_version: number; deleted_at: string | null } | null> {
  return db
    .prepare('SELECT edit_version, deleted_at FROM items WHERE id = ?1')
    .bind(itemId)
    .first<{ edit_version: number; deleted_at: string | null }>();
}

async function versionFailure(
  db: D1Database,
  itemId: string,
  expectedVersion: number,
): Promise<never> {
  const current = await itemVersion(db, itemId);
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Item not found');
  if (current.edit_version !== expectedVersion) {
    throw new AppError(409, 'VERSION_CONFLICT', 'Item version conflict');
  }
  throw new AppError(409, 'INVALID_STATE', 'The item is not in a valid state');
}

export function itemRoutes() {
  const router = new Hono<AppContext>();

  router.get('/items', requireAdminToken, async (context) => {
    const result = searchSchema.safeParse(context.req.query());
    if (!result.success) validationError('Invalid search parameters');
    const searchResponse = await executeSearch(context.env.DB, result.data);
    return context.json(
      searchResponseSchema.parse({
        data: searchResponse.data,
        meta: { ...searchResponse.meta, request_id: requestId(context) },
      }),
    );
  });

  router.get('/items/:id', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const db = context.env.DB;
    const item = await db
      .prepare(
        `SELECT id, title, source_type, source_app, source_url, canonical_url,
                raw_text, summary, user_note, quick_category, project, topics_json,
                importance, lifecycle_status, processing_status, privacy_level,
                edit_version, captured_at, created_at, updated_at, deleted_at,
                deleted_from_lifecycle_status, duplicate_of, suggested_action,
                review_at, coverage, why_it_matters, notion_page_id,
                notion_missing_at
         FROM items WHERE id = ?1`,
      )
      .bind(itemId)
      .first<Record<string, unknown>>();
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found');

    const [
      attachments,
      extractions,
      captureEvents,
      providerUsage,
      feedback,
      audit,
      overrides,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT id, file_name, declared_content_type, detected_content_type,
                  size_bytes, content_hash, status, created_at, updated_at
           FROM attachments WHERE item_id = ?1
           ORDER BY created_at DESC LIMIT 100`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT attachment_id, extractor_name, extractor_version,
                  extracted_text, image_description, confidence, page_count,
                  completeness, coverage, provider_name, model_name, error_code,
                  updated_at
           FROM extraction_records WHERE item_id = ?1
           ORDER BY updated_at DESC LIMIT 100`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT id, duplicate_of, source_type, source_app, source_url, raw_text,
                  user_note, quick_category, privacy_level, attachment_id,
                  captured_at, created_at
           FROM capture_events WHERE item_id = ?1
           ORDER BY created_at DESC LIMIT 100`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT id, provider, model, operation, input_units, output_units,
                  estimated_cost_micros, status, error_code, created_at
           FROM provider_usage WHERE item_id = ?1
           ORDER BY created_at DESC LIMIT 100`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT id, feedback_type, source_surface, created_at
           FROM item_feedback_events WHERE item_id = ?1
           ORDER BY created_at DESC LIMIT 100`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT id, event_type, actor_type, details_json, created_at
           FROM audit_events WHERE item_id = ?1
           ORDER BY created_at DESC LIMIT 200`,
        )
        .bind(itemId)
        .all(),
      db
        .prepare(
          `SELECT field_name, override_value, created_at, updated_at
           FROM item_field_overrides WHERE item_id = ?1
           ORDER BY field_name`,
        )
        .bind(itemId)
        .all(),
    ]);

    const jobs = new JobAdminService(db);
    const [processingJobs, syncAttempts] = await Promise.all([
      jobs.listProcessingJobs({ itemId, limit: 100 }),
      jobs.listSyncAttempts({ itemId, limit: 100 }),
    ]);

    return context.json(
      itemDetailResponseSchema.parse({
        data: {
          item: {
            ...item,
            topics: parseTopics(item.topics_json as string | null),
          },
          attachments: attachments.results ?? [],
          extractions: extractions.results ?? [],
          processing_jobs: processingJobs,
          sync_attempts: syncAttempts,
          provenance: {
            capture_events: captureEvents.results ?? [],
            provider_usage: providerUsage.results ?? [],
          },
          feedback: feedback.results ?? [],
          audit_history: audit.results ?? [],
          field_overrides: overrides.results ?? [],
        },
        meta: { request_id: requestId(context) },
      }),
    );
  });

  router.patch('/items/:id', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const db = context.env.DB;
    const parsed = itemUpdateSchema.safeParse(
      await context.req.json().catch(() => ({})),
    );
    if (!parsed.success) validationError('Invalid update parameters');

    const { edit_version, ...fields } = parsed.data;
    if (Object.keys(fields).length === 0) {
      return context.json({
        data: { item_id: itemId, edit_version },
        meta: { request_id: requestId(context) },
      });
    }

    const operationTime = new Date().toISOString();
    const updates = ['edit_version = edit_version + 1', 'updated_at = ?1'];
    const values: unknown[] = [operationTime];
    let index = 2;
    for (const [key, value] of Object.entries(fields)) {
      updates.push(`${key === 'topics' ? 'topics_json' : key} = ?${index++}`);
      values.push(key === 'topics' ? JSON.stringify(value) : value);
    }
    values.push(itemId, edit_version);

    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          `UPDATE items SET ${updates.join(', ')}
         WHERE id = ?${index} AND edit_version = ?${index + 1}
           AND deleted_at IS NULL`,
        )
        .bind(...values),
    ];

    for (const [key, value] of Object.entries(fields)) {
      const fieldName = key === 'topics' ? 'topics_json' : key;
      statements.push(
        db
          .prepare(
            `INSERT INTO item_field_overrides
             (id, item_id, field_name, override_value, created_at, updated_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?5
           FROM items WHERE id = ?2 AND updated_at = ?5
           ON CONFLICT(item_id, field_name) DO UPDATE SET
             override_value = excluded.override_value,
             updated_at = excluded.updated_at`,
          )
          .bind(
            crypto.randomUUID(),
            itemId,
            fieldName,
            value === null
              ? null
              : key === 'topics'
                ? JSON.stringify(value)
                : String(value),
            operationTime,
          ),
      );
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO audit_events
           (id, item_id, event_type, actor_type, details_json, created_at)
         SELECT ?1, ?2, 'item_updated', 'admin', ?3, ?4
         FROM items WHERE id = ?2 AND updated_at = ?4`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({
            fields: Object.keys(fields),
            prior_version: edit_version,
            new_version: edit_version + 1,
          }),
          operationTime,
        ),
    );

    const results = await db.batch(statements);
    if (results[0]?.meta.changes !== 1) {
      await versionFailure(db, itemId, edit_version);
    }

    return context.json({
      data: { item_id: itemId, edit_version: edit_version + 1 },
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/items/:id/status', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const db = context.env.DB;
    const parsed = itemStatusSchema.safeParse(
      await context.req.json().catch(() => ({})),
    );
    if (!parsed.success) validationError('Invalid status payload');
    const now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          `UPDATE items SET lifecycle_status = ?1, updated_at = ?2,
                edit_version = edit_version + 1
         WHERE id = ?3 AND edit_version = ?4 AND deleted_at IS NULL
           AND lifecycle_status NOT IN ('Deleted', 'Duplicate')
           AND lifecycle_status != ?1`,
        )
        .bind(
          parsed.data.lifecycle_status,
          now,
          itemId,
          parsed.data.edit_version,
        ),
      db
        .prepare(
          `INSERT INTO audit_events
           (id, item_id, event_type, actor_type, details_json, created_at)
         SELECT ?1, ?2, 'lifecycle_changed', 'admin', ?3, ?4
         FROM items WHERE id = ?2 AND updated_at = ?4`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({ lifecycle_status: parsed.data.lifecycle_status }),
          now,
        ),
    ]);
    if (result[0]?.meta.changes !== 1) {
      await versionFailure(db, itemId, parsed.data.edit_version);
    }
    return context.json({
      data: { item_id: itemId, edit_version: parsed.data.edit_version + 1 },
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/items/:id/duplicate', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const db = context.env.DB;
    const parsed = itemDuplicateSchema.safeParse(
      await context.req.json().catch(() => ({})),
    );
    if (!parsed.success) validationError('Invalid duplicate payload');
    if (parsed.data.duplicate_of === itemId) {
      throw new AppError(
        409,
        'INVALID_DUPLICATE_TARGET',
        'An item cannot duplicate itself',
      );
    }
    const target = await db
      .prepare('SELECT id FROM items WHERE id = ?1 AND deleted_at IS NULL')
      .bind(parsed.data.duplicate_of)
      .first();
    if (!target)
      throw new AppError(404, 'NOT_FOUND', 'Duplicate target not found');

    const now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          `UPDATE items SET lifecycle_status = 'Duplicate', duplicate_of = ?1,
                updated_at = ?2, edit_version = edit_version + 1
         WHERE id = ?3 AND edit_version = ?4 AND deleted_at IS NULL`,
        )
        .bind(parsed.data.duplicate_of, now, itemId, parsed.data.edit_version),
      db
        .prepare(
          `INSERT INTO audit_events
           (id, item_id, event_type, actor_type, details_json, created_at)
         SELECT ?1, ?2, 'item_marked_duplicate', 'admin', ?3, ?4
         FROM items WHERE id = ?2 AND updated_at = ?4`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({ duplicate_of: parsed.data.duplicate_of }),
          now,
        ),
    ]);
    if (result[0]?.meta.changes !== 1) {
      await versionFailure(db, itemId, parsed.data.edit_version);
    }
    return context.json({
      data: { item_id: itemId, edit_version: parsed.data.edit_version + 1 },
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/items/:id/feedback', requireAdminToken, async (context) => {
    const itemId = context.req.param('id');
    const parsed = itemFeedbackSchema.safeParse(
      await context.req.json().catch(() => ({})),
    );
    if (!parsed.success) validationError('Invalid feedback payload');
    const now = new Date().toISOString();
    await context.env.DB.prepare(
      `INSERT OR IGNORE INTO item_feedback_events
         (id, item_id, idempotency_key, feedback_type, source_surface, created_at)
       SELECT ?1, id, ?2, ?3, ?4, ?5 FROM items WHERE id = ?6`,
    )
      .bind(
        crypto.randomUUID(),
        parsed.data.idempotency_key,
        parsed.data.feedback_type,
        parsed.data.source_surface,
        now,
        itemId,
      )
      .run();
    return context.json({
      data: { item_id: itemId, accepted: true },
      meta: { request_id: requestId(context) },
    });
  });

  for (const action of ['delete', 'restore'] as const) {
    router.post(`/items/:id/${action}`, requireAdminToken, async (context) => {
      const itemId = context.req.param('id');
      const db = context.env.DB;
      const parsed = itemVersionActionSchema.safeParse(
        await context.req.json().catch(() => ({})),
      );
      if (!parsed.success) validationError(`Invalid ${action} payload`);
      const now = new Date().toISOString();
      const deleting = action === 'delete';
      const result = await db.batch([
        db
          .prepare(
            deleting
              ? `UPDATE items SET
                 deleted_from_lifecycle_status = lifecycle_status,
                 lifecycle_status = 'Deleted', deleted_at = ?1,
                 updated_at = ?1, edit_version = edit_version + 1
               WHERE id = ?2 AND edit_version = ?3 AND deleted_at IS NULL`
              : `UPDATE items SET
                 lifecycle_status = COALESCE(deleted_from_lifecycle_status, 'Inbox'),
                 deleted_from_lifecycle_status = NULL, deleted_at = NULL,
                 updated_at = ?1, edit_version = edit_version + 1
               WHERE id = ?2 AND edit_version = ?3 AND deleted_at IS NOT NULL`,
          )
          .bind(now, itemId, parsed.data.edit_version),
        db
          .prepare(
            `INSERT INTO audit_events
             (id, item_id, event_type, actor_type, details_json, created_at)
           SELECT ?1, ?2, ?3, 'admin', '{}', ?4
           FROM items WHERE id = ?2 AND updated_at = ?4`,
          )
          .bind(
            crypto.randomUUID(),
            itemId,
            deleting ? 'item_deleted' : 'item_restored',
            now,
          ),
      ]);
      if (result[0]?.meta.changes !== 1) {
        await versionFailure(db, itemId, parsed.data.edit_version);
      }
      return context.json({
        data: { item_id: itemId, edit_version: parsed.data.edit_version + 1 },
        meta: { request_id: requestId(context) },
      });
    });
  }

  router.post(
    '/items/:id/overrides/reset',
    requireAdminToken,
    async (context) => {
      const itemId = context.req.param('id');
      const parsed = itemResetOverridesSchema.safeParse(
        await context.req.json().catch(() => ({})),
      );
      if (!parsed.success || parsed.data.fields.length === 0) {
        validationError('Invalid reset payload');
      }
      const fields = parsed.data.fields.map((field) =>
        field === 'topics' ? 'topics_json' : field,
      );
      const placeholders = fields.map(() => '?').join(',');
      await context.env.DB.prepare(
        `DELETE FROM item_field_overrides
       WHERE item_id = ? AND field_name IN (${placeholders})`,
      )
        .bind(itemId, ...fields)
        .run();
      return context.json({
        data: { item_id: itemId, reset_fields: parsed.data.fields },
        meta: { request_id: requestId(context) },
      });
    },
  );

  return router;
}
