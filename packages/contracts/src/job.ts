import { z } from 'zod';
import { timestampSchema } from './common.js';

export const jobStatusSchema = z.enum([
  'pending',
  'processing',
  'retry_wait',
  'complete',
  'failed',
]);

export const jobResponseSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  task_type: z.string(),
  status: jobStatusSchema,
  priority: z.number().int(),
  attempts: z.number().int(),
  max_attempts: z.number().int(),
  last_error: z.string().nullable().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type JobResponse = z.infer<typeof jobResponseSchema>;

export const jobListResponseSchema = z.object({
  data: z.array(jobResponseSchema),
  meta: z.object({
    request_id: z.string(),
  }),
});

export type JobListResponse = z.infer<typeof jobListResponseSchema>;
