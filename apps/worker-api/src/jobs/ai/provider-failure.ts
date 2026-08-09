import { AppError } from '../../shared/errors';

const NON_BREAKER_CODES = new Set([
  'QUOTA_PAUSED',
  'NO_ELIGIBLE_PROVIDER',
  'PROVIDER_CONFIG_ERROR',
  'POLICY_DENIED',
  'INVALID_INPUT',
  'VALIDATION_ERROR',
  'ZERO_COST_GUARD_REJECTED',
]);

const BREAKER_CODES = new Set([
  'PROVIDER_HTTP_ERROR',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'AI_BAD_RESPONSE',
  'AI_REQUEST_FAILED',
  'JSON_PARSE_ERROR',
  'SCHEMA_VALIDATION_ERROR',
]);

export function stableProviderErrorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error && typeof error === 'object' && 'errorCode' in error) {
    const raw = String((error as { errorCode?: unknown }).errorCode ?? '');
    const normalized = raw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_.-]/g, '_')
      .slice(0, 80);
    if (normalized) return normalized;
  }
  return 'AI_REQUEST_FAILED';
}

export function isCircuitBreakerFailure(error: unknown): boolean {
  const code = stableProviderErrorCode(error);
  if (NON_BREAKER_CODES.has(code)) return false;
  if (BREAKER_CODES.has(code)) return true;

  if (error instanceof AppError) {
    return error.status >= 500;
  }
  return true;
}
