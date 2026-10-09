import type { SourceAcquisitionStatus } from './source-fetcher.types';

/** UI-safe recovery advice. Never interpolate a URL, server body, or exception. */
export interface SourceRecoveryAdvice {
  message: string;
  nextAction: 'retry' | 'supply_text' | 'none';
}

const ADVICE: Record<SourceAcquisitionStatus, SourceRecoveryAdvice> = {
  acquired_text: { message: 'Page text was saved.', nextAction: 'none' },
  metadata_only: {
    message:
      'Only the page metadata was available. Add text or a screenshot for more context.',
    nextAction: 'supply_text',
  },
  unavailable: {
    message:
      'This page is no longer available. The original bookmark is saved. Add your own text or a screenshot.',
    nextAction: 'supply_text',
  },
  destination_blocked: {
    message:
      'This address is blocked by the safe-fetch policy. The bookmark is saved.',
    nextAction: 'none',
  },
  policy_blocked: {
    message:
      'Automatic page fetching is disabled for this privacy level. You can add your own text.',
    nextAction: 'supply_text',
  },
  login_required: {
    message:
      'This page requires access RecollectFlow cannot use. Add text or a screenshot instead. Never share website passwords.',
    nextAction: 'supply_text',
  },
  timeout: {
    message: 'The website took too long to respond. You can retry.',
    nextAction: 'retry',
  },
  network_error: {
    message: 'The website could not be reached. You can retry.',
    nextAction: 'retry',
  },
  rate_limited: {
    message: 'The website temporarily limited requests. Retry later.',
    nextAction: 'retry',
  },
  server_error: {
    message: 'The website reported a temporary problem. You can retry.',
    nextAction: 'retry',
  },
  unsupported_content: {
    message:
      'This file format cannot be read from a URL. Add text or upload a supported file.',
    nextAction: 'supply_text',
  },
  too_large: {
    message:
      'The page exceeds the safe fetch size limit. Add a shorter excerpt.',
    nextAction: 'supply_text',
  },
  redirect_limit: {
    message: 'The page redirected too many times. Add text instead.',
    nextAction: 'supply_text',
  },
  empty: {
    message: 'No readable page text was found. Add an excerpt or screenshot.',
    nextAction: 'supply_text',
  },
  parse_failed: {
    message: 'The page could not be read. Add text instead.',
    nextAction: 'supply_text',
  },
};

export function sourceRecoveryAdvice(
  status: SourceAcquisitionStatus,
): SourceRecoveryAdvice {
  return ADVICE[status];
}

export function canManuallyRetrySource(
  status: SourceAcquisitionStatus | null,
): boolean {
  // Null denotes a pre-BG-10 URL that has never been fetched.
  return status === null || ADVICE[status].nextAction === 'retry';
}
