export type DigestReviewStatus = 'generated' | 'reviewed';
export type DigestDeliveryState =
  'pending' | 'leased' | 'sent' | 'failed' | 'unknown' | 'skipped';

export interface DigestSummary {
  id: string;
  digest_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  timezone: string;
  generation_version: number;
  review_status: DigestReviewStatus;
  created_at: string;
}

export interface DigestRun {
  id: string;
  digestType: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  timezone: string;
  generationVersion: number;
  reviewStatus: DigestReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface DigestDelivery {
  id: string;
  state: DigestDeliveryState;
  attempts: number;
  availableAt: string;
  leaseExpiresAt: string | null;
  lastErrorCode: string | null;
  telegramMessageId: string | null;
  sentAt: string | null;
}

export interface DigestDetails {
  run: DigestRun;
  deliveries: DigestDelivery[];
  preview: {
    text: string;
    empty: boolean;
    currentEligibleCount: number;
    items: Array<{ id: string; label: string; url: string }>;
  };
}

export interface GeneratedDigest {
  run: DigestRun;
  empty: boolean;
  replayed: boolean;
  delivery: DigestDelivery | null;
}
