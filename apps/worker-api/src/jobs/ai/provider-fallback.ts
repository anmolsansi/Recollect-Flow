import { AppError } from '../../shared/errors';
import { isCircuitBreakerFailure } from './provider-failure';

const CAPACITY_FALLBACK_CODES = new Set([
  'QUOTA_PAUSED',
  'PROVIDER_UNAVAILABLE',
]);

export function isProviderFallbackEligible(error: unknown): boolean {
  if (error instanceof AppError && CAPACITY_FALLBACK_CODES.has(error.code)) {
    return true;
  }
  return isCircuitBreakerFailure(error);
}
