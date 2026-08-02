import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/env';
import { ExtractionService } from '../src/jobs/extraction/extraction.service';
import { PdfExtractor } from '../src/jobs/extraction/pdf.extractor';
import { VisionExtractor } from '../src/jobs/extraction/vision.extractor';
import type {
  AttachmentExtractionInput,
  ExtractionRoutingContext,
} from '../src/jobs/extraction/extraction.types';

const PUBLIC_ROUTING: ExtractionRoutingContext = {
  privacyLevel: 'public',
  requestedProvider: 'openrouter',
  credentialSource: 'app_managed',
  hostedProcessingConsent: false,
  zeroDataRetentionEnforced: false,
  dataCollectionDenied: false,
};

function arrayBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function testEnv(
  bytes: ArrayBuffer,
  options: {
    maxBytes?: string;
    onRead?: () => void;
    ai?: Partial<Env>;
  } = {},
): Env {
  const object = {
    key: 'attachment-key',
    size: bytes.byteLength,
    async arrayBuffer() {
      options.onRead?.();
      return bytes;
    },
  } as R2ObjectBody;
  const bucket = {
    async get(key: string) {
      return key === object.key ? object : null;
    },
  } as R2Bucket;

  return {
    ATTACHMENTS: bucket,
    MAX_ATTACHMENT_BYTES: options.maxBytes ?? '25000000',
    ...options.ai,
  } as Env;
}

async function extractionInput(
  bytes: ArrayBuffer,
  overrides: Partial<AttachmentExtractionInput> = {},
): Promise<AttachmentExtractionInput> {
  return {
    attachmentId: 'attachment-1',
    objectKey: 'attachment-key',
    itemId: '00000000-0000-0000-0000-000000000001',
    declaredContentType: 'application/pdf',
    detectedContentType: 'application/pdf',
    sizeBytes: bytes.byteLength,
    contentHash: await sha256(bytes),
    routing: PUBLIC_ROUTING,
    ...overrides,
  };
}

function buildPdf(text: string): ArrayBuffer {
  const escaped = text
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
  const stream = text ? `BT /F1 12 Tf 72 100 Td (${escaped}) Tj ET` : 'BT ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return arrayBuffer(pdf);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OPE-223 attachment validation', () => {
  it('rejects oversized objects before reading the R2 body', async () => {
    const bytes = arrayBuffer('%PDF-1.7\noversized');
    let reads = 0;
    const service = new ExtractionService(
      testEnv(bytes, { maxBytes: '5', onRead: () => reads++ }),
    );

    const result = await service.extract(await extractionInput(bytes));

    expect(result.errorCode).toBe('FILE_TOO_LARGE');
    expect(reads).toBe(0);
  });

  it('rejects invalid signatures and declared/detected MIME mismatches', async () => {
    const bytes = arrayBuffer('not a PDF');
    const service = new ExtractionService(testEnv(bytes));

    const invalidSignature = await service.extract(
      await extractionInput(bytes),
    );
    expect(invalidSignature.errorCode).toBe('INVALID_FILE_SIGNATURE');

    const mismatch = await service.extract(
      await extractionInput(bytes, { detectedContentType: 'image/png' }),
    );
    expect(mismatch.errorCode).toBe('CONTENT_TYPE_MISMATCH');
  });

  it('rejects R2 size and checksum drift', async () => {
    const bytes = buildPdf('Integrity check');
    const service = new ExtractionService(testEnv(bytes));

    const wrongSize = await service.extract(
      await extractionInput(bytes, { sizeBytes: bytes.byteLength + 1 }),
    );
    expect(wrongSize.errorCode).toBe('WRONG_SIZE');

    const wrongChecksum = await service.extract(
      await extractionInput(bytes, { contentHash: '0'.repeat(64) }),
    );
    expect(wrongChecksum.errorCode).toBe('CHECKSUM_MISMATCH');
  });

  it('reports a corrupt PDF that has a valid PDF signature', async () => {
    const bytes = arrayBuffer('%PDF-1.7\ncorrupt body');
    const service = new ExtractionService(testEnv(bytes));

    const result = await service.extract(await extractionInput(bytes));

    expect(result.completeness).toBe('failed');
    expect(result.errorCode).toBe('PDF_CORRUPT');
  });
});

describe('OPE-223 PDF extraction', () => {
  it('normalizes embedded text and records deterministic confidence', async () => {
    const result = await new PdfExtractor().extract({
      attachmentId: 'attachment-pdf',
      itemId: 'item-pdf',
      contentType: 'application/pdf',
      fileBuffer: buildPdf('Hello   from   RecollectFlow'),
      routing: PUBLIC_ROUTING,
    });

    expect(result).toMatchObject({
      completeness: 'complete',
      extractedText: 'Hello from RecollectFlow',
      confidence: 1,
      pageCount: 1,
    });
  });

  it('records a valid PDF with no embedded text as empty', async () => {
    const result = await new PdfExtractor().extract({
      attachmentId: 'attachment-empty',
      itemId: 'item-empty',
      contentType: 'application/pdf',
      fileBuffer: buildPdf(''),
      routing: PUBLIC_ROUTING,
    });

    expect(result).toMatchObject({
      completeness: 'empty',
      errorCode: 'PDF_EMPTY',
      confidence: 0,
      pageCount: 1,
    });
  });
});

describe('OPE-223 vision extraction', () => {
  const image = arrayBuffer('\u0089PNG\r\n\u001a\nmock');

  it('records visible text, description, confidence, provider, and model', async () => {
    const extractor = new VisionExtractor(
      testEnv(image, {
        ai: {
          MOCK_AI_ENABLED: 'true',
          AI_PROVIDERS_ENABLED: 'openrouter',
          AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
        },
      }),
    );

    const result = await extractor.extract({
      attachmentId: 'attachment-image',
      itemId: 'item-image',
      contentType: 'image/png',
      fileBuffer: image,
      routing: PUBLIC_ROUTING,
    });

    expect(result).toMatchObject({
      completeness: 'complete',
      extractedText: 'Mock visible text from image',
      imageDescription: 'Mock image description',
      confidence: 0.95,
      providerName: 'openrouter',
      modelName: 'mock-vision-model',
    });
  });

  it('fails closed for sensitive images', async () => {
    const extractor = new VisionExtractor(
      testEnv(image, {
        ai: {
          MOCK_AI_ENABLED: 'true',
          AI_PROVIDERS_ENABLED: 'openrouter',
          AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
        },
      }),
    );

    const result = await extractor.extract({
      attachmentId: 'attachment-sensitive',
      itemId: 'item-sensitive',
      contentType: 'image/png',
      fileBuffer: image,
      routing: { ...PUBLIC_ROUTING, privacyLevel: 'sensitive' },
    });

    expect(result).toMatchObject({
      completeness: 'failed',
      errorCode: 'POLICY_DENIED',
    });
  });

  it('records provider failure without leaking provider response details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 503 })),
    );
    const extractor = new VisionExtractor(
      testEnv(image, {
        ai: {
          AI_PROVIDERS_ENABLED: 'openrouter',
          AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"openrouter"}',
          OPENROUTER_API_KEY: 'test-key',
        },
      }),
    );

    const result = await extractor.extract({
      attachmentId: 'attachment-provider-failure',
      itemId: 'item-provider-failure',
      contentType: 'image/png',
      fileBuffer: image,
      routing: PUBLIC_ROUTING,
    });

    expect(result).toEqual({
      extractorName: 'vision-model',
      extractorVersion: '1.0',
      completeness: 'failed',
      coverage: 'none',
      errorCode: 'PROVIDER_FAILURE',
    });
  });
});
