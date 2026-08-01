import type { Env } from '../../env';
import type { Extractor } from './extraction.types';
import { PdfExtractor } from './pdf.extractor';
import { VisionExtractor } from './vision.extractor';
import { extractionResultSchema } from './extraction.schema';

export class ExtractionService {
  private extractors: Extractor[];

  constructor(
    private readonly env: Env,
    private readonly db: D1Database,
  ) {
    this.extractors = [new PdfExtractor(), new VisionExtractor(env)];
  }

  async extract(
    attachmentId: string,
    objectKey: string,
    itemId: string,
    contentType: string,
    sizeBytes: number,
    contentHash: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    policy: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
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

      const MAX_ATTACHMENT_BYTES = 100_000_000; // 100MB max limit
      if (sizeBytes > MAX_ATTACHMENT_BYTES) {
        return {
          attachmentId,
          extractorName: extractor.name,
          extractorVersion: extractor.version,
          completeness: 'failed',
          coverage: 'none',
          errorCode: 'FILE_TOO_LARGE',
        };
      }

      const fileBuffer = await object.arrayBuffer();

      // Basic signature validation could be added here if needed
      // Checksum validation
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
        privacyLevel: policy.privacy_level_snapshot || 'unknown',
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
        errorCode: 'PROVIDER_FAILURE',
      };
    }
  }
}
