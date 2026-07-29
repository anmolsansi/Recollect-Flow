import { z } from 'zod';

export const shortcutMetadataSchema = z
  .object({
    idempotency_key: z.string().min(12).max(200),
    kind_hint: z.enum(['auto', 'url', 'text', 'attachment']).default('auto'),
    user_reason: z.string().max(2_000).optional(),
    privacy_level: z
      .enum(['unknown', 'public', 'personal', 'sensitive'])
      .default('unknown'),
    client_version: z.string().min(1).max(40).default('1.1.0'),
  })
  .strict();

export type ShortcutMetadata = z.infer<typeof shortcutMetadataSchema>;
