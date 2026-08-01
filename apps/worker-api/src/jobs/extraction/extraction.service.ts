import type { Env } from '../../env';
import {
  normalizeContentType,
  signatureMatches,
} from '../../attachments/attachment.validation';
import type {
  AttachmentExtractionInput,
  AttachmentExtractionResult,
  Extractor,
} from './extraction.types';
import { PdfExtractor } from './pdf.extractor';
import { VisionExtractor } from './vision.extractor';
import { extractionResultSchema } from './extraction.schema';

export class ExtractionService {
  private extractors: Extractor[];

  constructor(private readonly env: Env) {
    this.extractors = [new PdfExtractor(), new VisionExtractor(env)];
  }

  async extract(
    input: AttachmentExtractionInput,
  ): Promise<AttachmentExtractionResult> {
    const { attachmentId, objectKey, itemId, sizeBytes, contentHash, routing } =
      input;
    const declaredContentType = normalizeContentType(input.declaredContentType);
    const detectedContentType = input.detectedContentType
      ? normalizeContentType(input.detectedContentType)
      : null;

    if (detectedContentType && declaredContentType !== detectedContentType) {
      return {
        attachmentId,
        extractorName: 'none',
        extractorVersion: '1.0',
        completeness: 'failed',
        coverage: 'none',
        errorCode: 'CONTENT_TYPE_MISMATCH',
      };
    }

    const contentType = detectedContentType ?? declaredContentType;
    const extractor = this.extractors.find((e) => e.supports(contentType));

    if (!extractor) {
      return {
        attachmentId,
        extractorName: 'none',
        extractorVersion: '1.0',
        completeness: 'unsupported',
        coverage: 'none',
        errorCode: 'UNSUPPORTED_TYPE',
      };
    }

    try {
      const object = await this.env.ATTACHMENTS.get(objectKey);
      if (!object) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'ATTACHMENT_NOT_FOUND',
        };
      }

      const configuredMaxBytes = Number(this.env.MAX_ATTACHMENT_BYTES);
      if (
        !Number.isSafeInteger(configuredMaxBytes) ||
        configuredMaxBytes <= 0
      ) {
        throw new Error('MAX_ATTACHMENT_BYTES must be a positive integer');
      }

      if (sizeBytes > configuredMaxBytes || object.size > configuredMaxBytes) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'FILE_TOO_LARGE',
        };
      }

      if (object.size !== sizeBytes) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'WRONG_SIZE',
        };
      }

      const fileBuffer = await object.arrayBuffer();

      if (!signatureMatches(fileBuffer, contentType)) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'INVALID_FILE_SIGNATURE',
        };
      }

      if (!contentHash) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'CHECKSUM_MISSING',
        };
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hashHex !== contentHash) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'CHECKSUM_MISMATCH',
        };
      }

      const result = await extractor.extract({
        attachmentId,
        itemId,
        contentType,
        fileBuffer,
        routing,
      });

      return {
        ...extractionResultSchema.parse(result),
        attachmentId,
      };
    } catch {
      return {
        attachmentId,
        extractorName: extractor.name,
        extractorVersion: extractor.version,
        completeness: 'failed',
        coverage: 'none',
        errorCode: 'EXTRACTION_FAILED',
      };
    }
  }
}
