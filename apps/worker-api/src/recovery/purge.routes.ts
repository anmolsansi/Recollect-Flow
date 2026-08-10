import { Hono } from 'hono';
import { z } from 'zod';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { PurgeRepository } from './purge.repository';
import { PurgeService } from './purge.service';
import { processPurgeWorkflow } from './purge.worker';

const requestSchema = z
  .object({ edit_version: z.number().int().nonnegative() })
  .strict();
const confirmSchema = z
  .object({ confirmation: z.string().min(1).max(500) })
  .strict();

export function purgeRoutes() {
  const router = new Hono<AppContext>();

  router.post(
    '/items/:id/purge-request',
    requireAdminToken,
    async (context) => {
      const parsed = requestSchema.safeParse(
        await context.req.json().catch(() => ({})),
      );
      if (!parsed.success) {
        throw new AppError(422, 'VALIDATION_ERROR', 'Invalid purge request.');
      }
      const request = await new PurgeService(context.env.DB).requestPurge(
        context.req.param('id'),
        parsed.data.edit_version,
      );
      return context.json(
        {
          data: {
            purge_workflow_id: request.workflowId,
            item_id: request.itemId,
            state: 'confirmation_pending',
            confirmation: request.confirmationPhrase,
            confirmation_expires_at: request.confirmationExpiresAt,
          },
          meta: { request_id: context.get('requestId') },
        },
        201,
      );
    },
  );

  router.post('/purges/:id/confirm', requireAdminToken, async (context) => {
    const parsed = confirmSchema.safeParse(
      await context.req.json().catch(() => ({})),
    );
    if (!parsed.success) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Invalid purge confirmation.',
      );
    }
    await new PurgeService(context.env.DB).confirmPurge(
      context.req.param('id'),
      parsed.data.confirmation,
    );
    return context.json({
      data: { purge_workflow_id: context.req.param('id'), state: 'queued' },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.post('/purges/:id/run', requireAdminToken, async (context) => {
    const repository = new PurgeRepository(context.env.DB);
    const before = await repository.findWorkflow(context.req.param('id'));
    if (!before)
      throw new AppError(404, 'NOT_FOUND', 'Purge workflow not found.');
    if (!['queued', 'processing', 'partial'].includes(before.state)) {
      throw new AppError(
        409,
        'PURGE_NOT_RUNNABLE',
        'The purge workflow is not queued or retryable.',
      );
    }
    await processPurgeWorkflow(context.env, before.id);
    const workflow = await repository.findWorkflow(before.id);
    const steps = await repository.listSteps(before.id);
    return context.json({
      data: { workflow, steps },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.get('/purges/:id', requireAdminToken, async (context) => {
    const repository = new PurgeRepository(context.env.DB);
    const workflow = await repository.findWorkflow(context.req.param('id'));
    if (!workflow)
      throw new AppError(404, 'NOT_FOUND', 'Purge workflow not found.');
    const steps = await repository.listSteps(workflow.id);
    return context.json({
      data: { workflow, steps },
      meta: { request_id: context.get('requestId') },
    });
  });

  return router;
}
