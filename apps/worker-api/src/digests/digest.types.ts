import type { DigestPeriod, DigestType } from './digest-period';

export const DIGEST_SELECTOR_VERSION = '2026-08-03.1';
export const DIGEST_SCHEMA_VERSION = '1';
export const HIGH_VALUE_THRESHOLD = 70;
export const DORMANT_PROJECT_DAYS = 30;
export const ARCHIVE_RETENTION_DAYS = 90;
export const ARCHIVE_WARNING_DAYS = 7;
export const TELEGRAM_TEXT_LIMIT = 4096;

export type DigestReviewStatus = 'generated' | 'reviewed';
export type DigestDeliveryState =
  'pending' | 'leased' | 'sent' | 'failed' | 'unknown' | 'skipped';

export interface DigestTopicGroup {
  topic: string;
  itemIds: string[];
  count: number;
}

export interface DigestFailedProcessing {
  itemId: string;
  errorCode: string;
  updatedAt: string;
}

export interface DigestDormantProject {
  project: string;
  itemIds: string[];
  lastActivityAt: string;
}

export interface DigestPayload {
  schemaVersion: typeof DIGEST_SCHEMA_VERSION;
  selectorVersion: typeof DIGEST_SELECTOR_VERSION;
  digestType: DigestType;
  periodStart: string;
  periodEnd: string;
  timezone: DigestPeriod['timezone'];
  eligibleItemIds: string[];
  topicGroups: DigestTopicGroup[];
  topItemIds: string[];
  suggestedActionItemIds: string[];
  failedProcessing: DigestFailedProcessing[];
  highValueItemIds: string[];
  dormantProjects: DigestDormantProject[];
  nearingArchiveItemIds: string[];
  contradictionStatus: 'not_evaluated_no_explicit_relation';
}

export interface DigestRun {
  id: string;
  digestType: DigestType;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  selectorVersion: string;
  generationVersion: number;
  sourceSnapshotAt: string;
  canonicalPayloadJson: string;
  contentHash: string;
  deterministicText: string;
  aiText: string | null;
  generationSource: 'deterministic' | 'ai';
  aiProvider: string | null;
  aiModel: string | null;
  aiLatencyMs: number | null;
  aiInputUnits: number | null;
  aiOutputUnits: number | null;
  aiFailureCode: string | null;
  reviewStatus: DigestReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DigestDelivery {
  id: string;
  digestRunId: string;
  destination: 'telegram';
  state: DigestDeliveryState;
  attempts: number;
  availableAt: string;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  lastErrorCode: string | null;
  telegramMessageId: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DigestAuditEvent {
  id: string;
  digestRunId: string;
  eventType: string;
  actorType: string;
  detailsJson: string;
  createdAt: string;
}

export interface DigestItemRow {
  id: string;
  title: string | null;
  privacyLevel: 'unknown' | 'public' | 'personal' | 'sensitive';
  topicsJson: string;
  importance: number | null;
  project: string | null;
  suggestedAction: string | null;
  lifecycleStatus: string;
  capturedAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
