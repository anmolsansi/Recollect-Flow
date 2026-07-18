import { z } from 'zod';

const categorySchema = z.enum([
  'learn',
  'build',
  'try',
  'buy',
  'visit',
  'share_later',
  'project_idea',
  'reference',
]);

export const captureSchema = z
  .object({
    idempotency_key: z.string().min(12).max(200),
    source_type: z.enum(['url', 'text', 'note']),
    source_app: z.string().min(1).max(80),
    url: z.string().url().max(2_048).optional(),
    shared_text: z.string().max(100_000).optional(),
    user_reason: z.string().max(2_000).optional(),
    quick_category: categorySchema.optional(),
    privacy_level: z
      .enum(['unknown', 'public', 'personal', 'sensitive'])
      .default('unknown'),
    captured_at: z.string().datetime({ offset: true }),
    client: z
      .object({
        name: z.string().min(1).max(80),
        version: z.string().min(1).max(40),
      })
      .strict(),
  })
  .strict()
  .superRefine((capture, context) => {
    if (capture.source_type === 'url' && !capture.url) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'A URL is required when source_type is url.',
      });
    }
    if (
      capture.source_type !== 'url' &&
      (!capture.shared_text || capture.shared_text.trim().length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shared_text'],
        message: 'Text is required for text and note captures.',
      });
    }
  });

export type CaptureInput = z.infer<typeof captureSchema>;
