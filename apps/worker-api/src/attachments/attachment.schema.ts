import { z } from 'zod';

const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, 'Expected SHA-256 hex.');

export const AttachmentInitInputSchema = z
  .object({
    filename: z.string().min(1).max(255),
    mime_type: z.string().min(1).max(255),
    size_bytes: z.number().int().min(1),
    content_hash: sha256Schema.optional(),
    source_type: z.enum(['image', 'file', 'audio']),
  })
  .strict();

export type AttachmentInitInput = z.infer<typeof AttachmentInitInputSchema>;

export const AttachmentFinalizeInputSchema = z
  .object({ checksum: sha256Schema.optional() })
  .strict();

export type AttachmentFinalizeInput = z.infer<
  typeof AttachmentFinalizeInputSchema
>;
