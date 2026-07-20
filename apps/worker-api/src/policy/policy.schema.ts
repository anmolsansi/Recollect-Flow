import { z } from 'zod';

export const privacyLevelSchema = z.enum([
  'unknown',
  'public',
  'personal',
  'sensitive',
]);

export const privacyChangeSchema = z
  .object({
    privacy_level: privacyLevelSchema,
    derived_data_action: z.enum(['reprocess', 'purge']),
  })
  .strict();

export type PrivacyChangeInput = z.infer<typeof privacyChangeSchema>;
