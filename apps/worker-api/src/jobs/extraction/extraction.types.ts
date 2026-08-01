import type { ExtractionResultInput } from './extraction.schema';
import type {
  AiProvider,
  CredentialSource,
  PrivacyLevel,
} from '../../policy/policy.service';

export type ExtractorName = 'unpdf' | 'vision-model' | 'none';

export interface ExtractionInput {
  attachmentId: string;
  itemId: string;
  contentType: string;
  fileBuffer: ArrayBuffer;
  routing: ExtractionRoutingContext;
}

export interface ExtractionRoutingContext {
  privacyLevel: PrivacyLevel;
  requestedProvider: AiProvider;
  credentialSource: CredentialSource;
  hostedProcessingConsent: boolean;
  zeroDataRetentionEnforced: boolean;
  dataCollectionDenied: boolean;
}

export interface AttachmentExtractionInput {
  attachmentId: string;
  objectKey: string;
  itemId: string;
  declaredContentType: string;
  detectedContentType: string | null;
  sizeBytes: number;
  contentHash: string | null;
  routing: ExtractionRoutingContext;
}

export interface AttachmentExtractionResult extends ExtractionResultInput {
  attachmentId: string;
}

export interface ExtractionResult extends ExtractionResultInput {
  extractorName: ExtractorName;
  extractorVersion: string;
}

export interface Extractor {
  name: ExtractorName;
  version: string;
  supports(contentType: string): boolean;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
