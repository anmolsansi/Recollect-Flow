import { z } from 'zod';

import { SOURCE_FETCH_LIMITS } from './source-fetcher.types';

export const sourceAcquisitionStatusSchema = z.enum([
  'acquired_text',
  'metadata_only',
  'unavailable',
  'destination_blocked',
  'policy_blocked',
  'login_required',
  'timeout',
  'network_error',
  'rate_limited',
  'server_error',
  'unsupported_content',
  'too_large',
  'redirect_limit',
  'empty',
  'parse_failed',
]);

export const sourceCoverageSchema = z.enum([
  'url_only',
  'metadata_only',
  'supplied_text',
  'acquired_text',
]);

export const sourceFetchErrorCodeSchema = z.enum([
  'SOURCE_FETCH_POLICY_BLOCKED',
  'SOURCE_DESTINATION_BLOCKED',
  'SOURCE_LOGIN_REQUIRED',
  'SOURCE_NOT_FOUND',
  'SOURCE_ACCESS_DENIED',
  'SOURCE_TIMEOUT',
  'SOURCE_NETWORK_ERROR',
  'SOURCE_RATE_LIMITED',
  'SOURCE_SERVER_ERROR',
  'SOURCE_UNSUPPORTED_CONTENT',
  'SOURCE_TOO_LARGE',
  'SOURCE_REDIRECT_LIMIT',
  'SOURCE_EMPTY_CONTENT',
  'SOURCE_PARSE_FAILED',
]);

export const sourceFetchOutcomeSchema = z
  .object({
    status: sourceAcquisitionStatusSchema,
    coverage: sourceCoverageSchema,
    retryable: z.boolean(),
    errorCode: sourceFetchErrorCodeSchema.optional(),
    fetchedFinalUrl: z.string().url().max(8_192).optional(),
    httpStatus: z.number().int().min(100).max(599).optional(),
    contentType: z.string().max(255).optional(),
    responseBytes: z
      .number()
      .int()
      .min(0)
      .max(SOURCE_FETCH_LIMITS.maxResponseBytes)
      .optional(),
    redirectCount: z
      .number()
      .int()
      .min(0)
      .max(SOURCE_FETCH_LIMITS.maxRedirects)
      .default(0),
    acquiredText: z
      .string()
      .max(SOURCE_FETCH_LIMITS.maxExtractedCharacters)
      .optional(),
    extractedCharacters: z
      .number()
      .int()
      .min(0)
      .max(SOURCE_FETCH_LIMITS.maxExtractedCharacters)
      .optional(),
    title: z.string().max(2_000).optional(),
    description: z.string().max(8_000).optional(),
    siteName: z.string().max(1_000).optional(),
    canonicalHintUrl: z.string().url().max(8_192).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'acquired_text' && !value.acquiredText?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acquiredText'],
        message: 'acquired_text requires nonblank acquiredText.',
      });
    }
    if (value.acquiredText && value.status !== 'acquired_text') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acquiredText'],
        message: 'Only acquired_text outcomes may carry acquiredText.',
      });
    }
  });

export type ValidatedSourceFetchOutcome = z.infer<
  typeof sourceFetchOutcomeSchema
>;
