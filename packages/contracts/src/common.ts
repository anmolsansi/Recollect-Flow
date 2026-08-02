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
