export const SOURCE_FETCH_LIMITS = {
  totalDeadlineMs: 8_000,
  maxRedirects: 5,
  maxResponseBytes: 2 * 1024 * 1024,
  maxExtractedCharacters: 250_000,
  maxAutomaticTransientAttempts: 3,
} as const;

export const SOURCE_FETCH_CONTENT_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'text/plain',
]);

export type SourceAcquisitionStatus =
  | 'acquired_text'
  | 'metadata_only'
  | 'unavailable'
  | 'destination_blocked'
  | 'policy_blocked'
  | 'login_required'
  | 'timeout'
  | 'network_error'
  | 'rate_limited'
  | 'server_error'
  | 'unsupported_content'
  | 'too_large'
  | 'redirect_limit'
  | 'empty'
  | 'parse_failed';

export type SourceCoverage =
  'url_only' | 'metadata_only' | 'supplied_text' | 'acquired_text';

export type SourceFetchErrorCode =
  | 'SOURCE_FETCH_POLICY_BLOCKED'
  | 'SOURCE_DESTINATION_BLOCKED'
  | 'SOURCE_LOGIN_REQUIRED'
  | 'SOURCE_NOT_FOUND'
  | 'SOURCE_ACCESS_DENIED'
  | 'SOURCE_TIMEOUT'
  | 'SOURCE_NETWORK_ERROR'
  | 'SOURCE_RATE_LIMITED'
  | 'SOURCE_SERVER_ERROR'
  | 'SOURCE_UNSUPPORTED_CONTENT'
  | 'SOURCE_TOO_LARGE'
  | 'SOURCE_REDIRECT_LIMIT'
  | 'SOURCE_EMPTY_CONTENT'
  | 'SOURCE_PARSE_FAILED';

export interface SourceFetchMetadata {
  title?: string;
  description?: string;
  siteName?: string;
  canonicalHintUrl?: string;
}

export interface SourceFetchOutcome extends SourceFetchMetadata {
  status: SourceAcquisitionStatus;
  coverage: SourceCoverage;
  retryable: boolean;
  errorCode?: SourceFetchErrorCode;
  fetchedFinalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  responseBytes?: number;
  redirectCount: number;
  acquiredText?: string;
  extractedCharacters?: number;
}

export type SourceFetch = typeof fetch;
