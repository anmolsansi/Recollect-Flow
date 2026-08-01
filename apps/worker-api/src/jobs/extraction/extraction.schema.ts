import { z } from 'zod';

export const extractionStatusSchema = z.enum([
  'complete',
  'partial',
  'empty',
  'unsupported',
  'failed',
]);

export const extractionErrorSchema = z.enum([
  'FILE_TOO_LARGE',
  'PDF_CORRUPT',
  'PDF_ENCRYPTED',
  'PDF_EMPTY',
  'UNSUPPORTED_TYPE',
  'POLICY_DENIED',
  'NO_ELIGIBLE_PROVIDER',
  'PROVIDER_FAILURE',
  'ATTACHMENT_NOT_FOUND',
]);

export const extractionResultSchema = z
  .object({
    extractorName: z.string(),
    extractorVersion: z.string(),
    extractedText: z.string().max(250000).optional(),
    imageDescription: z.string().max(10000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    pageCount: z.number().int().min(0).optional(),
    completeness: extractionStatusSchema,
    coverage: z.string().max(100),
    providerName: z.string().optional(),
    modelName: z.string().optional(),
    errorCode: extractionErrorSchema.or(z.string()).optional(),
  })
  .strict();

export type ExtractionResultInput = z.infer<typeof extractionResultSchema>;
