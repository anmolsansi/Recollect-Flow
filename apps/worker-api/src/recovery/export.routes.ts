import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { ExportService } from './export.service';

export function exportRoutes() {
  const router = new Hono<AppContext>();

  router.get('/export', requireAdminToken, async (context) => {
    const format = context.req.query('format') ?? 'json';
    if (format !== 'json' && format !== 'csv') {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'format must be json or csv.',
      );
    }

    const service = new ExportService(context.env.DB);
    const stamp = new Date().toISOString().replaceAll(':', '-');
    if (format === 'csv') {
      const csv = await service.buildCsv();
      return context.body(csv, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="recollectflow-export-${stamp}.csv"`,
      });
    }

    const payload = await service.buildJson();
    return context.json(payload, 200, {
      'Content-Disposition': `attachment; filename="recollectflow-export-${stamp}.json"`,
    });
  });

  return router;
}
