import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { IntegrityRepository } from './integrity.repository';
import { IntegrityService } from './integrity.service';

export function integrityRoutes() {
  const router = new Hono<AppContext>();

  router.post('/integrity-checks', requireAdminToken, async (context) => {
    const result = await new IntegrityService(
      context.env.DB,
      context.env.ATTACHMENTS,
      context.env.NOTION_ACCESS_TOKEN,
    ).run();
    return context.json(
      {
        data: result,
        meta: { request_id: context.get('requestId') },
      },
      201,
    );
  });

  router.get('/integrity-checks/:id', requireAdminToken, async (context) => {
    const result = await new IntegrityRepository(context.env.DB).get(
      context.req.param('id'),
    );
    if (!result.run) {
      throw new AppError(404, 'NOT_FOUND', 'Integrity run not found.');
    }
    return context.json({
      data: result,
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
