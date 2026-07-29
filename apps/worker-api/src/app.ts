import { Hono } from 'hono';

import type { CaptureRepository } from './captures/capture.repository';
import { D1CaptureRepository } from './captures/capture.repository';
import { captureRoutes } from './captures/capture.routes';
import { attachmentRoutes } from './attachments/attachment.routes';
import type { AttachmentRepository } from './attachments/attachment.repository';
import { policyRoutes } from './policy/policy.routes';
import type { PolicyRepository } from './policy/policy.repository';
import type { AppContext, Env } from './env';
import { errorResponse } from './shared/errors';
import { shortcutRoutes } from './shortcut/shortcut.routes';

function requestId(value: string | undefined): string {
  return value && /^[A-Za-z0-9._:-]{1,100}$/.test(value)
    ? value
    : crypto.randomUUID();
}

export function createApp(
  repositoryFactory?: (env: Env) => CaptureRepository,
  attachmentRepositoryFactory?: (env: Env) => AttachmentRepository,
  policyRepositoryFactory?: (env: Env) => PolicyRepository,
) {
  const app = new Hono<AppContext>();

  app.use('*', async (context, next) => {
    context.set('requestId', requestId(context.req.header('X-Request-Id')));
    await next();
  });

  app.get('/api/v1/health', (context) =>
    context.json({
      data: { status: 'ok' },
      meta: { request_id: context.get('requestId') },
    }),
  );

  app.route(
    '/api/v1/captures',
    captureRoutes(
      repositoryFactory ?? ((env) => new D1CaptureRepository(env.DB)),
    ),
  );

  app.route('/api/v1', attachmentRoutes(attachmentRepositoryFactory));
  app.route(
    '/api/v1',
    shortcutRoutes(
      repositoryFactory ?? ((env) => new D1CaptureRepository(env.DB)),
      attachmentRepositoryFactory,
    ),
  );
  app.route('/api/v1', policyRoutes(policyRepositoryFactory));

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'The requested route does not exist.',
        },
        meta: { request_id: context.get('requestId') },
      },
      404,
    ),
  );
  app.onError((error, context) => errorResponse(context, error));
  return app;
}
