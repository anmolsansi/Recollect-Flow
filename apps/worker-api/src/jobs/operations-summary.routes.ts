import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { OperationsSummaryService } from './operations-summary.service';

export function operationsSummaryRoutes() {
  const router = new Hono<AppContext>();

  router.get('/operations/summary', requireAdminToken, async (context) => {
    const data = await new OperationsSummaryService(context.env.DB).status();
    context.header('Cache-Control', 'private, no-store');
    return context.json({
      data,
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
