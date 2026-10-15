import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import type { CaptureRepository } from './captures/capture.repository';
import { D1CaptureRepository } from './captures/capture.repository';
import { jobRoutes } from './jobs/job.routes';
import { sourceRecoveryRoutes } from './jobs/extraction/source-recovery.routes';
import { captureRoutes } from './captures/capture.routes';
import { attachmentRoutes } from './attachments/attachment.routes';
import type { AttachmentRepository } from './attachments/attachment.repository';
import { policyRoutes } from './policy/policy.routes';
import type { PolicyRepository } from './policy/policy.repository';
import type { AppContext, Env } from './env';
import { errorResponse } from './shared/errors';
import { shortcutRoutes } from './shortcut/shortcut.routes';
import { itemRoutes } from './items/item.routes';
import { searchRoutes } from './search/search.routes';
import { authRoutes } from './auth/auth.routes';
import { digestRoutes } from './digests/digest.routes';
import { capacityRoutes } from './jobs/ai/capacity.routes';
import { backupRoutes } from './recovery/backup.routes';
import { exportRoutes } from './recovery/export.routes';
import { integrityRoutes } from './recovery/integrity.routes';
import { purgeRoutes } from './recovery/purge.routes';
import { restoreRoutes } from './recovery/restore.routes';

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
    const id = requestId(context.req.header('X-Request-Id'));
    const startedAt = Date.now();
    context.set('requestId', id);
    try {
      await next();
    } finally {
      console.log(
        JSON.stringify({
          event: 'http_request_completed',
          request_id: id,
          method: context.req.method,
          route: context.req.routePath,
          status: context.res.status,
          duration_ms: Date.now() - startedAt,
        }),
      );
    }
  });

  // Request admission runs before JSON/multipart parsers or provider work.
  // Hono >=4.12.16 also counts chunked/unknown-length streams correctly.
  app.use('/api/*', async (context, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) {
      await next();
      return;
    }
    const pathname = new URL(context.req.url).pathname;
    const configuredAttachmentBytes = Number(context.env.MAX_ATTACHMENT_BYTES);
    const attachmentBytes =
      Number.isSafeInteger(configuredAttachmentBytes) &&
      configuredAttachmentBytes > 0
        ? Math.min(configuredAttachmentBytes, 50_000_000)
        : 25_000_000;
    const limit =
      pathname.endsWith('/content') && pathname.startsWith('/api/v1/uploads/')
        ? attachmentBytes
        : pathname === '/api/v1/shortcut/captures'
          ? attachmentBytes + 1_048_576
          : pathname === '/api/v1/restore'
            ? attachmentBytes
            : 1_048_576;
    await bodyLimit({
      maxSize: limit,
      onError: (c) =>
        c.json(
          {
            error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
            meta: { request_id: c.get('requestId') },
          },
          413,
        ),
    })(context, next);
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
  app.route('/api/v1', jobRoutes());
  app.route('/api/v1', sourceRecoveryRoutes());
  app.route('/api/v1', itemRoutes());
  app.route('/api/v1', searchRoutes());
  app.route('/api/v1', authRoutes());
  app.route('/api/v1', digestRoutes());
  app.route('/api/v1', capacityRoutes());
  app.route('/api/v1', exportRoutes());
  app.route('/api/v1', backupRoutes());
  app.route('/api/v1', purgeRoutes());
  app.route('/api/v1', restoreRoutes());
  app.route('/api/v1', integrityRoutes());

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
