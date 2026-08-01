import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type {
  Extractor,
  ExtractionInput,
  ExtractionResult,
} from './extraction.types';

export class PdfExtractor implements Extractor {
  name = 'pdfjs-dist' as const;
  version = '1.0';

  supports(contentType: string): boolean {
    return contentType === 'application/pdf';
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjsLib.getDocument({
        data: input.fileBuffer,
        useWorkerFetch: false,
        useSystemFonts: true,
        standardFontDataUrl: undefined,
      });

      const doc = await loadingTask.promise;
      const numPages = doc.numPages;

      if (numPages === 0) {
        return {
          extractorName: this.name,
          extractorVersion: this.version,
          completeness: 'empty',
          coverage: '0 pages',
          errorCode: 'PDF_EMPTY',
        };
      }

      const extractedTextParts: string[] = [];
      let pagesProcessed = 0;

      // Limit to 50 pages to prevent memory exhaustion in Cloudflare Workers
      const limit = Math.min(numPages, 50);

      for (let i = 1; i <= limit; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .filter((item): item is TextItem => 'str' in item)
          .map((item) => item.str)
          .join(' ');

        // Normalize whitespace
        const normalized = pageText.replace(/\s+/g, ' ').trim();
        if (normalized) {
          extractedTextParts.push(normalized);
        }
        pagesProcessed++;
      }

      const extractedText = extractedTextParts.join('\n\n').trim();

      if (!extractedText) {
        return {
          extractorName: this.name,
          extractorVersion: this.version,
          pageCount: numPages,
          completeness: 'empty',
          coverage: `pages 1-${pagesProcessed} of ${numPages}`,
          errorCode: 'PDF_EMPTY',
        };
      }

      return {
        extractorName: this.name,
        extractorVersion: this.version,
        extractedText,
        pageCount: numPages,
        completeness: limit < numPages ? 'partial' : 'complete',
        coverage: limit < numPages ? `pages 1-${limit} of ${numPages}` : 'full',
      };
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (errMessage.includes('PasswordException')) {
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
