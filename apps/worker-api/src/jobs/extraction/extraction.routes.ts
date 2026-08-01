import { Hono } from 'hono';
import { requireLocalWorkerToken } from '../../shared/auth';
import { AppError } from '../../shared/errors';
import type { AppContext } from '../../env';
import { PdfExtractor } from './pdf.extractor';
import { VisionExtractor } from './vision.extractor';
import { extractionResultSchema } from './extraction.schema';
import type { PrivacyLevel } from '../../policy/policy.service';

export function extractionRoutes() {
  const router = new Hono<AppContext>();

  router.post('/pdf', requireLocalWorkerToken, async (context) => {
    const body = await context.req.parseBody();
    const file = body['file'];
    if (!(file instanceof File)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'A file upload named "file" is required.',
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const extractor = new PdfExtractor();
    const result = await extractor.extract({
      attachmentId: 'test-attachment',
      itemId: 'test-item',
      contentType: file.type || 'application/pdf',
      fileBuffer,
      privacyLevel: 'strict' as PrivacyLevel,
    });

    const parsedResult = extractionResultSchema.parse(result);

    return context.json({
      data: parsedResult,
      meta: { request_id: context.get('requestId') },
    });
  });

  router.post('/vision', requireLocalWorkerToken, async (context) => {
    const body = await context.req.parseBody();
    const file = body['file'];
    if (!(file instanceof File)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'A file upload named "file" is required.',
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const extractor = new VisionExtractor(context.env);
    const result = await extractor.extract({
      attachmentId: 'test-attachment',
      itemId: 'test-item',
      contentType: file.type || 'image/jpeg',
      fileBuffer,
      privacyLevel: 'strict' as PrivacyLevel,
    });

    const parsedResult = extractionResultSchema.parse(result);

    return context.json({
      data: parsedResult,
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
