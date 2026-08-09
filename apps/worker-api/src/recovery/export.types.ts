import type { PurgeReceiptRecord } from './recovery.types';

export type PortableRecord = Record<string, unknown>;

export interface PortableItemExport {
  item: PortableRecord;
  captureEvents: PortableRecord[];
  attachments: PortableRecord[];
  extractions: PortableRecord[];
  processingJobs: PortableRecord[];
  processingJobResults: PortableRecord[];
  syncAttempts: PortableRecord[];
  providerUsage: PortableRecord[];
  fieldOverrides: PortableRecord[];
  feedbackEvents: PortableRecord[];
  auditEvents: PortableRecord[];
  deduplicationKeys: PortableRecord[];
}

export interface PortableExportEnvelope {
  format: 'recollectflow-portable-export';
  schemaVersion: string;
  generatedAt: string;
  itemCount: number;
  items: PortableItemExport[];
  purgeReceipts: PurgeReceiptRecord[];
  disclosures: {
    attachmentBytesIncluded: false;
    credentialsIncluded: false;
    ownerControlledCopiesOutsideRemoteDeletion: true;
  };
}
