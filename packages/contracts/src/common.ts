import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    request_id: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** One category vocabulary for Worker validation and Web capture controls. */
export const captureCategorySchema = z.enum([
  'learn',
  'build',
  'try',
  'buy',
  'visit',
  'share_later',
  'project_idea',
  'reference',
]);
