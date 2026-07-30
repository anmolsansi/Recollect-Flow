import { z } from 'zod';

export const jobStatusSchema = z.enum([
  'pending',
  'processing',
  'retry_wait',
  'complete',
  'failed',
]);

export const jobListSchema = z
  .object({
    kind: z.enum(['processing', 'sync']).default('processing'),
    status: jobStatusSchema.optional(),
    type: z.string().trim().min(1).max(80).optional(),
    item_id: z.string().trim().min(1).max(128).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const workerLeaseSchema = z
  .object({
    job_type: z.string().trim().min(1).max(80),
    owner_id: z.string().trim().min(8).max(128),
    ttl_minutes: z.number().int().min(1).max(60).default(10),
    limit: z.number().int().min(1).max(100).default(10),
  })
  .strict();

export const ownedJobActionSchema = z
  .object({
    owner_id: z.string().trim().min(8).max(128),
    ttl_minutes: z.number().int().min(1).max(60).optional(),
  })
  .strict();

export const workerFailureSchema = z
  .object({
    owner_id: z.string().trim().min(8).max(128),
    error_code: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(
        /^[A-Z][A-Z0-9_]*$/,
        'error_code must be a stable uppercase identifier.',
      ),
    retryable: z.boolean(),
    retry_after_seconds: z.number().int().min(1).max(86_400).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.retryable && value.retry_after_seconds !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['retry_after_seconds'],
        message: 'retry_after_seconds requires retryable=true.',
      });
    }
  });

const forbiddenResultKey = /token|secret|password|authorization|api.?key/i;

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) =>
      forbiddenResultKey.test(key) || containsForbiddenKey(child),
  );
}

export const processingResultSchema = z
  .object({
    owner_id: z.string().trim().min(8).max(128),
    submission_id: z.string().uuid(),
    input_hash: z.string().trim().min(8).max(128),
    result_version: z.string().trim().min(1).max(80),
    result: z.record(z.unknown()),
  })
  .strict()
  .superRefine((value, context) => {
    const serialized = JSON.stringify(value.result);
    if (new TextEncoder().encode(serialized).byteLength > 64 * 1024) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['result'],
        message: 'Result must not exceed 64 KiB.',
      });
    }
    if (containsForbiddenKey(value.result)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['result'],
        message: 'Result contains a forbidden credential-like field.',
      });
    }
  });
