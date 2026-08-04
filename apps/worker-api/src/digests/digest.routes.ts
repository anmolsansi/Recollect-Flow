import { Hono } from 'hono';

import type { AppContext } from '../env';
import { requireAdminToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { DigestRepository } from './digest.repository';
import {
  digestGenerateSchema,
  digestReconcileSchema,
  digestRegenerateSchema,
  digestReviewSchema,
} from './digest.schema';
import { DigestService } from './digest.service';

function requestId(context: { get(key: 'requestId'): string | undefined }) {
  return context.get('requestId') || '';
}

async function jsonBody(context: {
  req: { json(): Promise<unknown> };
}): Promise<unknown> {
  return context.req.json().catch(() => {
    throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
  });
}

function validationError(message: string): never {
  throw new AppError(422, 'VALIDATION_ERROR', message);
}

export function digestRoutes() {
  const router = new Hono<AppContext>();

  router.post('/digests/generate', requireAdminToken, async (context) => {
    const parsed = digestGenerateSchema.safeParse(await jsonBody(context));
    if (!parsed.success) validationError('Invalid digest generation payload.');
    const scheduledAt = parsed.data.scheduled_at
      ? new Date(parsed.data.scheduled_at)
      : new Date();
    const generated = await new DigestService(context.env).generateAt(
      parsed.data.digest_type,
      scheduledAt,
      {
        queueDelivery: false,
        actorType: 'admin',
      },
    );
    return context.json({
      data: generated,
      meta: { request_id: requestId(context) },
    });
  });

  router.get('/digests/:id', requireAdminToken, async (context) => {
    const details = await new DigestService(context.env).getDetails(
      context.req.param('id'),
    );
    return context.json({
      data: details,
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/digests/:id/regenerate', requireAdminToken, async (context) => {
    const parsed = digestRegenerateSchema.safeParse(await jsonBody(context));
    if (!parsed.success)
      validationError('Invalid digest regeneration payload.');
    const generated = await new DigestService(context.env).regenerate(
      context.req.param('id'),
      false,
      'admin',
    );
    return context.json({
      data: generated,
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/digests/:id/review', requireAdminToken, async (context) => {
    const parsed = digestReviewSchema.safeParse(await jsonBody(context));
    if (!parsed.success) validationError('Invalid digest review payload.');
    const repository = new DigestRepository(context.env.DB);
    const run = await repository.getRun(context.req.param('id'));
    if (!run) throw new AppError(404, 'NOT_FOUND', 'Digest run not found.');
    const changed = await repository.markReviewed(
      run.id,
      parsed.data.reviewed_by,
    );
    await repository.writeAudit(run.id, 'digest_marked_reviewed', 'admin', {
      reviewed_by: parsed.data.reviewed_by,
      replayed: !changed,
    });
    return context.json({
      data: { digest_run_id: run.id, reviewed: true, replayed: !changed },
      meta: { request_id: requestId(context) },
    });
  });

  router.post('/digests/:id/deliver', requireAdminToken, async (context) => {
    const repository = new DigestRepository(context.env.DB);
    const run = await repository.getRun(context.req.param('id'));
    if (!run) throw new AppError(404, 'NOT_FOUND', 'Digest run not found.');
    if (run.reviewStatus !== 'reviewed') {
      throw new AppError(
        409,
        'DIGEST_REVIEW_REQUIRED',
        'Mark the digest reviewed before queueing an operator-approved delivery.',
      );
    }
    const rendered = await new DigestService(context.env).renderCurrent(run);
    const delivery = await repository.queueTelegramDelivery(
      run.id,
      new Date(),
      rendered.empty ? 'EMPTY_PERIOD' : undefined,
    );
    await repository.writeAudit(
      run.id,
      rendered.empty
        ? 'digest_delivery_skipped_empty'
        : 'digest_delivery_queued',
      'admin',
      { delivery_id: delivery.id, destination: 'telegram' },
    );
    return context.json({
      data: delivery,
      meta: { request_id: requestId(context) },
    });
  });

  router.post(
    '/digest-deliveries/:id/retry',
    requireAdminToken,
    async (context) => {
      const repository = new DigestRepository(context.env.DB);
      const delivery = await repository.getDelivery(context.req.param('id'));
      if (!delivery) {
        throw new AppError(404, 'NOT_FOUND', 'Digest delivery not found.');
      }
      const changed = await repository.retryFailedDelivery(delivery.id);
      if (!changed) {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Only definite failed deliveries can be retried.',
        );
      }
      await repository.writeAudit(
        delivery.digestRunId,
        'digest_delivery_manual_retry',
        'admin',
        { delivery_id: delivery.id },
      );
      return context.json({
        data: { delivery_id: delivery.id, queued: true },
        meta: { request_id: requestId(context) },
      });
    },
  );

  router.post(
    '/digest-deliveries/:id/reconcile',
    requireAdminToken,
    async (context) => {
      const parsed = digestReconcileSchema.safeParse(await jsonBody(context));
      if (!parsed.success)
        validationError('Invalid delivery reconciliation payload.');
      const repository = new DigestRepository(context.env.DB);
      const delivery = await repository.getDelivery(context.req.param('id'));
      if (!delivery) {
        throw new AppError(404, 'NOT_FOUND', 'Digest delivery not found.');
      }
      const changed = await repository.reconcileUnknownDelivery(
        delivery.id,
        parsed.data.state,
        parsed.data.telegram_message_id ?? null,
      );
      if (!changed) {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Only unknown deliveries can be reconciled.',
        );
      }
      await repository.writeAudit(
        delivery.digestRunId,
        'digest_delivery_reconciled',
        'admin',
        {
          delivery_id: delivery.id,
          state: parsed.data.state,
          telegram_message_id: parsed.data.telegram_message_id ?? null,
        },
      );
      return context.json({
        data: { delivery_id: delivery.id, state: parsed.data.state },
        meta: { request_id: requestId(context) },
      });
    },
  );

  router.post(
    '/digest-deliveries/:id/cancel',
    requireAdminToken,
    async (context) => {
      const repository = new DigestRepository(context.env.DB);
      const delivery = await repository.getDelivery(context.req.param('id'));
      if (!delivery) {
        throw new AppError(404, 'NOT_FOUND', 'Digest delivery not found.');
      }
      const changed = await repository.cancelDelivery(delivery.id);
      if (!changed) {
        throw new AppError(
          409,
          'INVALID_STATE',
          'Only pending or failed deliveries can be cancelled.',
        );
      }
      await repository.writeAudit(
        delivery.digestRunId,
        'digest_delivery_cancelled',
        'admin',
        { delivery_id: delivery.id },
      );
      return context.json({
        data: { delivery_id: delivery.id, cancelled: true },
        meta: { request_id: requestId(context) },
      });
    },
  );

  return router;
}
