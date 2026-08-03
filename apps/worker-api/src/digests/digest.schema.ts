import { z } from 'zod';

export const digestTypeSchema = z.enum(['daily', 'weekly']);

const topicGroupSchema = z
  .object({
    topic: z.string().max(100),
    itemIds: z.array(z.string()).max(5),
    count: z.number().int().min(1),
  })
  .strict();

const failedProcessingSchema = z
  .object({
    itemId: z.string(),
    errorCode: z
      .string()
      .regex(/^[A-Z0-9_.-]+$/)
      .max(80),
    updatedAt: z.string().datetime(),
  })
  .strict();

const dormantProjectSchema = z
  .object({
    project: z.string().max(100),
    itemIds: z.array(z.string()).max(5),
    lastActivityAt: z.string().datetime(),
  })
  .strict();

export const digestPayloadSchema = z
  .object({
    schemaVersion: z.literal('1'),
    selectorVersion: z.literal('2026-08-03.1'),
    digestType: digestTypeSchema,
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    timezone: z.literal('Asia/Kolkata'),
    eligibleItemIds: z.array(z.string()),
    topicGroups: z.array(topicGroupSchema).max(10),
    topItemIds: z.array(z.string()).max(5),
    suggestedActionItemIds: z.array(z.string()).max(10),
    failedProcessing: z.array(failedProcessingSchema).max(20),
    highValueItemIds: z.array(z.string()).max(20),
    dormantProjects: z.array(dormantProjectSchema).max(10),
    nearingArchiveItemIds: z.array(z.string()).max(20),
    contradictionStatus: z.literal('not_evaluated_no_explicit_relation'),
  })
  .strict();

export const digestGenerateSchema = z
  .object({
    digest_type: digestTypeSchema,
    scheduled_at: z.string().datetime().optional(),
  })
  .strict();

export const digestRegenerateSchema = z.object({}).strict();

export const digestReviewSchema = z
  .object({ reviewed_by: z.string().trim().min(1).max(100).default('admin') })
  .strict();

export const digestReconcileSchema = z
  .object({
    state: z.enum(['sent', 'failed']),
    telegram_message_id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === 'sent' && !value.telegram_message_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['telegram_message_id'],
        message: 'A Telegram message ID is required when reconciling as sent.',
      });
    }
  });
