import { z } from 'zod';
import { timestampSchema } from './common.js';

export const lifecycleStatusSchema = z.enum([
  'Inbox',
  'Reviewed',
  'Actioned',
  'Archived',
  'Duplicate',
  'Deleted',
]);

export const privacyLevelSchema = z.enum([
  'unknown',
  'public',
  'personal',
  'sensitive',
]);

export const itemResponseSchema = z
  .object({
    id: z.string(),
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
    topics: z.array(z.string().max(100)).max(20).default([]),
    importance: z.number().nullable().optional(),
    lifecycle_status: lifecycleStatusSchema,
    processing_status: z.string().optional(),
    privacy_level: privacyLevelSchema,
    edit_version: z.number().int().min(1),
    captured_at: timestampSchema,
    created_at: timestampSchema.optional(),
    updated_at: timestampSchema.optional(),
    deleted_at: timestampSchema.nullable().optional(),
    deleted_from_lifecycle_status: lifecycleStatusSchema.nullable().optional(),
    duplicate_of: z.string().nullable().optional(),
    suggested_action: z.string().nullable().optional(),
    review_at: timestampSchema.nullable().optional(),
    coverage: z.string().nullable().optional(),
    why_it_matters: z.string().nullable().optional(),
    notion_page_id: z.string().nullable().optional(),
    notion_missing_at: timestampSchema.nullable().optional(),
  })
  .passthrough();

export type ItemResponse = z.infer<typeof itemResponseSchema>;

export const attachmentResponseSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  declared_content_type: z.string(),
  detected_content_type: z.string().nullable(),
  size_bytes: z.number(),
  content_hash: z.string().nullable(),
  status: z.string(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const extractionResponseSchema = z.object({
  attachment_id: z.string(),
  extractor_name: z.string(),
  extractor_version: z.string(),
  extracted_text: z.string().nullable(),
  image_description: z.string().nullable(),
  confidence: z.number().nullable(),
  page_count: z.number().nullable(),
  completeness: z.string(),
  coverage: z.string().nullable(),
  provider_name: z.string().nullable(),
  model_name: z.string().nullable(),
  error_code: z.string().nullable(),
  updated_at: timestampSchema,
});

export const processingJobResponseSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  jobType: z.string(),
  status: z.string(),
  visibleStatus: z.string(),
  attempts: z.number(),
  availableAt: timestampSchema,
  lastErrorCode: z.string().nullable(),
  leaseOwner: z.string().nullable(),
  leaseExpiresAt: timestampSchema.nullable(),
  inputHash: z.string().nullable(),
});

export const syncAttemptResponseSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  destination: z.string(),
  status: z.string(),
  visibleStatus: z.string(),
  attempts: z.number(),
  availableAt: timestampSchema,
  lastErrorCode: z.string().nullable(),
  leaseOwner: z.string().nullable(),
  leaseExpiresAt: timestampSchema.nullable(),
});

export const captureEventResponseSchema = z.object({
  id: z.string(),
  duplicate_of: z.string().nullable(),
  source_type: z.string(),
  source_app: z.string(),
  source_url: z.string().nullable(),
  raw_text: z.string().nullable(),
  user_note: z.string().nullable(),
  quick_category: z.string().nullable(),
  privacy_level: privacyLevelSchema,
  attachment_id: z.string().nullable(),
  captured_at: timestampSchema,
  created_at: timestampSchema,
});

export const providerUsageResponseSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string().nullable().optional(),
  operation: z.string(),
  input_units: z.number(),
  output_units: z.number(),
  estimated_cost_micros: z.number(),
  status: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  created_at: timestampSchema,
});

export const auditEventResponseSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  actor_type: z.string(),
  details_json: z.string(),
  created_at: timestampSchema,
});

export const feedbackEventResponseSchema = z.object({
  id: z.string(),
  feedback_type: z.string(),
  source_surface: z.string(),
  created_at: timestampSchema,
});

export const fieldOverrideResponseSchema = z.object({
  field_name: z.string(),
  override_value: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

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

export const itemDetailDataSchema = z
  .object({
    item: itemResponseSchema,
    attachments: z.array(attachmentResponseSchema),
    extractions: z.array(extractionResponseSchema),
    processing_jobs: z.array(processingJobResponseSchema),
    sync_attempts: z.array(syncAttemptResponseSchema),
    provenance: z.object({
      capture_events: z.array(captureEventResponseSchema),
      provider_usage: z.array(providerUsageResponseSchema),
    }),
    feedback: z.array(feedbackEventResponseSchema),
    audit_history: z.array(auditEventResponseSchema),
    field_overrides: z.array(fieldOverrideResponseSchema),
  })
  .transform((data) => ({
    ...data,
    extraction: data.extractions[0] ?? null,
  }));

export const itemDetailResponseSchema = z.object({
  data: itemDetailDataSchema,
  meta: z.object({ request_id: z.string() }),
});

export type ItemDetailData = z.infer<typeof itemDetailDataSchema>;
export type ItemDetailResponse = z.infer<typeof itemDetailResponseSchema>;

export const itemVersionActionSchema = z
  .object({ edit_version: z.number().int().min(1) })
  .strict();

export const itemStatusSchema = z
  .object({
    edit_version: z.number().int().min(1),
    lifecycle_status: z.enum(['Inbox', 'Reviewed', 'Actioned', 'Archived']),
  })
  .strict();

export const itemDuplicateSchema = z
  .object({
    edit_version: z.number().int().min(1),
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
