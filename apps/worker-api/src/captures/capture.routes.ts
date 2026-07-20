import { Hono } from 'hono';

import type { AppContext, Env } from '../env';
import { requireCaptureToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import type { CaptureRepository } from './capture.repository';
import { captureSchema } from './capture.schema';
import { CaptureService } from './capture.service';

export function captureRoutes(
  repositoryFactory: (env: Env) => CaptureRepository,
) {
  const router = new Hono<AppContext>();

  router.post('/', requireCaptureToken, async (context) => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'The request body must be JSON.');
    }

    const parsed = captureSchema.safeParse(body);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join('.') || 'body',
          issue.message,
        ]),
      );
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'The capture payload is invalid.',
        fields,
      );
    }

    const service = new CaptureService(repositoryFactory(context.env));
    const result = await service.save(parsed.data);
    return context.json(
      {
        data: {
          capture_id: result.capture.id,
          status: 'saved',
          processing_status: result.capture.processingStatus,
          duplicate_of: result.capture.duplicateOf,
          privacy_level: result.capture.privacyLevel,
          message: result.replayed
            ? 'Already saved.'
            : 'Saved to RecollectFlow.',
        },
        meta: { request_id: context.get('requestId') as string },
      },
      result.replayed ? 200 : 201,
    );
  });

  return router;
}
