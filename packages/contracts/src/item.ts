import { z } from 'zod';
import { timestampSchema, uuidSchema } from './common.js';

export const itemResponseSchema = z
  .object({
    id: uuidSchema,
    title: z.string().nullable(),
    source_type: z.string(),
    source_app: z.string(),
    source_url: z.string().nullable().optional(),
    canonical_url: z.string().nullable().optional(),
    raw_text: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    user_note: z.string().nullable().optional(),
    quick_category: z.string().nullable().optional(),
    project: z.string().nullable(),
    topics: z.array(z.string().max(100)).max(20).optional(),
    importance: z.number().nullable().optional(),
    lifecycle_status: z.string(),
    processing_status: z.string().optional(),
    privacy_level: z.string(),
    edit_version: z.number().int().min(1),
    captured_at: timestampSchema,
    created_at: timestampSchema.optional(),
    updated_at: timestampSchema.optional(),
    suggested_action: z.string().nullable().optional(),
    review_at: timestampSchema.nullable().optional(),
  })
  .passthrough();

export type ItemResponse = z.infer<typeof itemResponseSchema>;

export const itemUpdateSchema = z
  .object({
    edit_version: z.number().int().min(1),
    title: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    topics: z.array(z.string().max(100)).max(20).optional(),
    project: z.string().nullable().optional(),
    importance: z.number().int().min(0).max(100).nullable().optional(),
    suggested_action: z.string().nullable().optional(),
    review_at: timestampSchema.nullable().optional(),
  })
  .strict();

export type ItemUpdate = z.infer<typeof itemUpdateSchema>;

export const itemDetailResponseSchema = z.object({
  data: z.object({
    item: itemResponseSchema,
    extraction: z.any().nullable().optional(), // For older clients
    extractions: z.array(z.any()).optional(),
  }),
  meta: z.object({
    request_id: z.string(),
  }),
});

export type ItemDetailResponse = z.infer<typeof itemDetailResponseSchema>;

export const itemStatusSchema = z
  .object({
    lifecycle_status: z.enum(['Inbox', 'Reviewed', 'Actioned', 'Archived']),
  })
  .strict();

export const itemDuplicateSchema = z
  .object({
    duplicate_of: z.string().min(1),
  })
  .strict();

export const itemFeedbackSchema = z
  .object({
    idempotency_key: z.string().min(1),
    feedback_type: z.enum([
      'useful',
      'not_relevant',
      'already_used',
      'outdated',
    ]),
    source_surface: z.string().min(1),
  })
  .strict();

export const itemResetOverridesSchema = z
  .object({
    fields: z.array(
      z.enum(['title', 'summary', 'topics', 'project', 'importance']),
    ),
  })
  .strict();
