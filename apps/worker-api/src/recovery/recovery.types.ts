export const PORTABLE_EXPORT_VERSION = '2026-08-10.1';
export const HOSTED_BACKUP_RETENTION_DAYS = 30;
export const PURGE_CONFIRMATION_TTL_MINUTES = 15;

export type BackupState =
  | 'creating'
  | 'verifying'
  | 'complete'
  | 'failed'
  | 'expired';

export type PurgeState =
  | 'confirmation_pending'
  | 'queued'
  | 'processing'
  | 'partial'
  | 'complete'
  | 'cancelled';

export type PurgeStepState =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'failed'
  | 'skipped';

export type PurgeStepKind =
  | 'freeze_jobs'
  | 'delete_r2_attachments'
  | 'archive_notion_projection'
  | 'delete_d1_item_data'
  | 'finalize_receipt';

export type RestoreState =
  | 'validating'
  | 'restoring'
  | 'verifying'
  | 'complete'
  | 'failed';

export type IntegrityRunState = 'running' | 'complete' | 'failed';

export interface PurgeReceiptRecord {
  itemId: string;
  purgeRequestId: string;
  purgedAt: string;
  receiptVersion: string;
  backupRetentionUntil: string | null;
}

export interface BackupArtifactRecord {
  id: string;
  objectKey: string;
  state: BackupState;
  schemaVersion: string;
  sha256: string | null;
  sizeBytes: number | null;
  createdAt: string;
  verifiedAt: string | null;
  expiresAt: string;
  failureCode: string | null;
}

export interface PurgeWorkflowRecord {
  id: string;
  itemId: string;
  state: PurgeState;
  confirmationExpiresAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}
