import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../../env';
import { requireAdminToken } from '../../shared/auth';
import { AppError } from '../../shared/errors';
import { SourceRecoveryService } from './source-recovery.service';

const revisionSchema = z.object({
  source_revision: z.number().int().min(1),
}).strict();

const backfillSchema = z.object({
  items: z.array(z.object({
    item_id: z.string().trim().min(1).max(128),
    source_revision: z.number().int().min(1),
  }).strict()).min(1).max(20),
}).strict();

async function parseBody<T extends z.ZodTypeAny>(
  context: {req:{json():Promise<unknown>}}, schema:T,
): Promise<z.infer<T>> {
  const body = await context.req.json().catch(() => {
    throw new AppError(400,'INVALID_JSON','Invalid JSON body.');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(422,'VALIDATION_ERROR','Invalid URL recovery request.');
  }
  return parsed.data;
}

export function sourceRecoveryRoutes() {
  const router = new Hono<AppContext>();
  router.post('/items/:id/source/retry',requireAdminToken,async context => {
    const input = await parseBody(context,revisionSchema);
    const result = await new SourceRecoveryService(context.env.DB).retry(
      context.req.param('id'),input.source_revision,
      `request:${context.get('requestId')}`,
    );
    return context.json({
      data: result,
      meta: { request_id: context.get('requestId') },
    });
  });

  router.get('/admin/source-reprocess/preview',requireAdminToken,async context => {
    const parsed = z.coerce.number().int().min(1).max(20)
      .safeParse(context.req.query('limit') ?? '20');
    if (!parsed.success) {
      throw new AppError(422,'VALIDATION_ERROR','limit must be 1 through 20.');
    }
    const result = await new SourceRecoveryService(context.env.DB)
      .previewLegacy(parsed.data);
    return context.json({
      data: result,
      meta: {request_id:context.get('requestId')},
    });
  });

  router.post('/admin/source-reprocess/run',requireAdminToken,async context => {
    const input = await parseBody(context,backfillSchema);
    const results = await new SourceRecoveryService(context.env.DB)
      .reprocessLegacy(input.items,`request:${context.get('requestId')}`);
    return context.json({
      data: {results},
      meta: {request_id:context.get('requestId')},
    });
  });
  return router;
}
