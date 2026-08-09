import { Hono } from 'hono';

import type { AppContext } from '../../env';
import { requireAdminToken } from '../../shared/auth';
import { AiCapacityStatusService } from './capacity-status.service';

export function capacityRoutes() {
  const router = new Hono<AppContext>();

  router.get('/usage', requireAdminToken, async (context) => {
    const data = await new AiCapacityStatusService(context.env.DB).status();
    return context.json({
      data,
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
