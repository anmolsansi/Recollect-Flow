import { z } from 'zod';
import { timestampSchema } from './common.js';

export const searchRequestSchema = z
  .object({
    q: z
      .string()
      .max(256)
      .transform((val) => val.trim())
      .optional(),
    source: z.enum(['url', 'text', 'note', 'image', 'file']).optional(),
    project: z
      .string()
      .transform((val) => val.trim())
      .optional(),
    lifecycle_status: z
      .enum([
        'Inbox',
        'Reviewed',
        'Actioned',
        'Archived',
        'Duplicate',
        'Deleted',
      ])
      .optional(),
    privacy_level: z.enum(['Personal', 'Work', 'Public']).optional(),
    topic: z
      .string()
      .transform((val) => val.trim())
      .optional(),
    processing_status: z
      .enum(['pending', 'processing', 'complete', 'failed'])
      .optional(),
    importance_min: z.coerce.number().int().min(0).max(100).optional(),
    importance_max: z.coerce.number().int().min(0).max(100).optional(),
    captured_from: timestampSchema.optional(),
    captured_to: timestampSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().max(1024).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.importance_min !== undefined &&
      query.importance_max !== undefined &&
      query.importance_min > query.importance_max
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['importance_min'],
        message: 'importance_min cannot be greater than importance_max',
      });
    }

    if (query.captured_from && query.captured_to) {
      if (
        new Date(query.captured_from).getTime() >
        new Date(query.captured_to).getTime()
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['captured_from'],
          message: 'captured_from cannot be after captured_to',
        });
      }
    }
  });

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchSnippetSchema = z
  .object({
    segments: z
      .array(
        z
          .object({
            text: z.string().max(150),
            highlighted: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    truncated: z.boolean(),
  })
  .strict()
  .superRefine((snippet, ctx) => {
    const totalLength = snippet.segments.reduce(
      (total, segment) => total + segment.text.length,
      0,
    );

    if (totalLength > 150) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segments'],
        message: 'Snippet must not exceed 150 characters in total',
      });
    }
  });

export type SearchSnippet = z.infer<typeof searchSnippetSchema>;

export const searchItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  source_type: z.string(),
  source_app: z.string(),
  project: z.string().nullable(),
  topics: z.array(z.string()),
  importance: z.number().nullable().optional(),
  lifecycle_status: z.string(),
  processing_status: z.string(),
  privacy_level: z.string(),
  captured_at: z.string(),
  coverage: z.string().nullable().optional(),
  snippet: searchSnippetSchema.optional(),
});

export type SearchItem = z.infer<typeof searchItemSchema>;

export const searchResponseSchema = z.object({
  data: z.array(searchItemSchema),
  meta: z.object({
    request_id: z.string(),
    next_cursor: z.string().optional(),
    count: z.number(),
    duration_ms: z.number(),
  }),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
