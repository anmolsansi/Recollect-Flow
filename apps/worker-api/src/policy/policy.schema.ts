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
    ai_provider: z.enum(['openrouter', 'gemini']).optional(),
    credential_source: z
      .enum(['app_managed', 'user_provided', 'none'])
      .optional(),
    hosted_processing_consent: z.boolean().optional(),
    zero_data_retention_enforced: z.boolean().optional(),
    data_collection_denied: z.boolean().optional(),
  })
  .strict();

export type PrivacyChangeInput = z.infer<typeof privacyChangeSchema>;
