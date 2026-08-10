import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { RestoreService } from './restore.service';

export function restoreRoutes() {
  const router = new Hono<AppContext>();

  router.post('/restore', requireAdminToken, async (context) => {
    const dryRunRaw = context.req.query('dry_run');
    if (
      dryRunRaw !== undefined &&
      dryRunRaw !== 'true' &&
      dryRunRaw !== 'false'
    ) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'dry_run must be true or false when provided.',
      );
    }
    const payload = await context.req.json().catch(() => {
      throw new AppError(400, 'INVALID_JSON', 'Invalid restore JSON body.');
    });
    const result = await new RestoreService(
      context.env.DB,
      context.env.ATTACHMENTS,
    ).restore(payload, { dryRun: dryRunRaw === 'true' });
    return context.json({
      data: result,
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
