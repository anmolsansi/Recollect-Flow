import { Hono } from 'hono';

import type { CaptureRepository } from './captures/capture.repository';
import { D1CaptureRepository } from './captures/capture.repository';
import { captureRoutes } from './captures/capture.routes';
import type { AppContext, Env } from './env';
import { errorResponse } from './shared/errors';

export function createApp(repositoryFactory?: (env: Env) => CaptureRepository) {
  const app = new Hono<AppContext>();

  app.use('*', async (context, next) => {
    context.set(
      'requestId',
      context.req.header('X-Request-Id') ?? crypto.randomUUID(),
    );
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
