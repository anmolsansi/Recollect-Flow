import { getDocumentProxy } from 'unpdf';
import type {
  Extractor,
  ExtractionInput,
  ExtractionResult,
} from './extraction.types';

export class PdfExtractor implements Extractor {
  name = 'unpdf' as const;
  version = '1.0';

  supports(contentType: string): boolean {
    return contentType === 'application/pdf';
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    try {
      const doc = await getDocumentProxy(new Uint8Array(input.fileBuffer));
      try {
        const numPages = doc.numPages;

        if (numPages === 0) {
          return {
            extractorName: this.name,
            extractorVersion: this.version,
            confidence: 0,
            completeness: 'empty',
            coverage: '0 pages',
            errorCode: 'PDF_EMPTY',
          };
        }

        const extractedTextParts: string[] = [];
        let pagesProcessed = 0;
        let extractedCharacters = 0;
        let textTruncated = false;

        // Limit to 50 pages to prevent memory exhaustion in Cloudflare Workers
        const limit = Math.min(numPages, 50);
        const maxExtractedCharacters = 250_000;

        for (let i = 1; i <= limit; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');

          const normalized = pageText.replace(/\s+/g, ' ').trim();
          if (normalized) {
            const separatorLength = extractedTextParts.length > 0 ? 2 : 0;
            const remaining =
              maxExtractedCharacters - extractedCharacters - separatorLength;
            if (remaining <= 0) {
              textTruncated = true;
              break;
            }
            const accepted = normalized.slice(0, remaining);
            extractedTextParts.push(accepted);
            extractedCharacters += accepted.length + separatorLength;
            if (accepted.length < normalized.length) {
              textTruncated = true;
            }
          }
          pagesProcessed++;
          if (textTruncated) break;
        }

        const extractedText = extractedTextParts.join('\n\n').trim();

        if (!extractedText) {
          return {
            extractorName: this.name,
            extractorVersion: this.version,
            confidence: 0,
            pageCount: numPages,
            completeness: 'empty',
            coverage: `pages 1-${pagesProcessed} of ${numPages}`,
            errorCode: 'PDF_EMPTY',
          };
        }

        const partial = limit < numPages || textTruncated;
        return {
          extractorName: this.name,
          extractorVersion: this.version,
          extractedText,
          confidence: 1,
          pageCount: numPages,
          completeness: partial ? 'partial' : 'complete',
          coverage: partial
            ? `pages 1-${pagesProcessed} of ${numPages}${textTruncated ? '; text truncated at 250000 characters' : ''}`
            : 'full',
        };
      } finally {
        await doc.cleanup();
      }
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (
        (error instanceof Error && error.name === 'PasswordException') ||
        errMessage.includes('PasswordException')
      ) {
        return {
          extractorName: this.name,
          extractorVersion: this.version,
          completeness: 'unsupported',
          coverage: 'none',
          errorCode: 'PDF_ENCRYPTED',
        };
      }
      return {
        extractorName: this.name,
        extractorVersion: this.version,
        completeness: 'failed',
        coverage: 'none',
        errorCode: 'PDF_CORRUPT',
      };
    }
  }
}
