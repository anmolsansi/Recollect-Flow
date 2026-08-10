import { z } from 'zod';

const portableRecordSchema = z.record(z.string(), z.unknown());
const purgeReceiptSchema = z
  .object({
    itemId: z.string().min(1),
    purgeRequestId: z.string().min(1),
    purgedAt: z.string().datetime({ offset: true }),
    receiptVersion: z.string().min(1),
    backupRetentionUntil: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

const portableItemSchema = z
  .object({
    item: portableRecordSchema,
    captureEvents: z.array(portableRecordSchema),
    attachments: z.array(portableRecordSchema),
    extractions: z.array(portableRecordSchema),
    processingJobs: z.array(portableRecordSchema),
    processingJobResults: z.array(portableRecordSchema),
    syncAttempts: z.array(portableRecordSchema),
    providerUsage: z.array(portableRecordSchema),
    fieldOverrides: z.array(portableRecordSchema),
    feedbackEvents: z.array(portableRecordSchema),
    auditEvents: z.array(portableRecordSchema),
    deduplicationKeys: z.array(portableRecordSchema),
  })
  .strict();

export const portableRestoreEnvelopeSchema = z
  .object({
    format: z.literal('recollectflow-portable-export'),
    schemaVersion: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    itemCount: z.number().int().nonnegative(),
    items: z.array(portableItemSchema),
    purgeReceipts: z.array(purgeReceiptSchema),
    disclosures: z
      .object({
        attachmentBytesIncluded: z.literal(false),
        credentialsIncluded: z.literal(false),
        ownerControlledCopiesOutsideRemoteDeletion: z.literal(true),
      })
      .strict(),
  })
  .strict()
  .superRefine((envelope, context) => {
    if (envelope.itemCount !== envelope.items.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itemCount'],
        message: 'itemCount must equal the number of exported items.',
      });
    }
    const ids = new Set<string>();
    for (const [index, entry] of envelope.items.entries()) {
      const id = entry.item.id;
      if (typeof id !== 'string' || !id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'item', 'id'],
          message: 'Every portable item requires a string id.',
        });
        continue;
      }
      if (ids.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'item', 'id'],
          message: 'Portable item ids must be unique.',
        });
      }
      ids.add(id);
    }
  });

export type PortableRestoreEnvelope = z.infer<
  typeof portableRestoreEnvelopeSchema
>;
