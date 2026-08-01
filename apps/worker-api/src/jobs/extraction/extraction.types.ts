import type { ExtractionResultInput } from './extraction.schema';

export type ExtractorName = 'pdfjs-dist' | 'vision-model' | 'none';

export interface ExtractionInput {
  attachmentId: string;
  itemId: string;
  contentType: string;
  fileBuffer: ArrayBuffer;
  privacyLevel: string;
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
