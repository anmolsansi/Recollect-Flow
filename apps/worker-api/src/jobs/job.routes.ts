import { Hono } from 'hono';
import type { ZodType } from 'zod';

import type { AppContext } from '../env';
import { requireAdminToken, requireLocalWorkerToken } from '../shared/auth';
import { AppError } from '../shared/errors';
import { JobAdminService } from './job.admin.service';
import {
  jobListSchema,
  ownedJobActionSchema,
  processingResultSchema,
  workerFailureSchema,
  workerLeaseSchema,
} from './job.schema';
import { JobService } from './job.service';

function validationFields(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.map(String).join('.') || 'body',
      issue.message,
    ]),
  );
}

async function jsonBody<T>(
  context: Parameters<ZodType<T>['parseAsync']>[0] extends never
    ? never
    : {
        req: { json(): Promise<unknown> };
      },
  schema: ZodType<T>,
): Promise<T> {
  const body = await context.req.json().catch(() => {
    throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Validation failed.',
      validationFields(parsed.error),
    );
  }
  return parsed.data;
}

export function jobRoutes() {
  const router = new Hono<AppContext>();

  router.get('/jobs', requireAdminToken, async (context) => {
    const parsed = jobListSchema.safeParse(context.req.query());
    if (!parsed.success) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Validation failed.',
        validationFields(parsed.error),
      );
    }
    const service = new JobAdminService(context.env.DB);
    const filter = {
      status: parsed.data.status,
      jobType: parsed.data.type,
      itemId: parsed.data.item_id,
      limit: parsed.data.limit,
    };
    const jobs =
      parsed.data.kind === 'sync'
        ? await service.listSyncAttempts(filter)
        : await service.listProcessingJobs(filter);
    return context.json({
      data: { kind: parsed.data.kind, jobs },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.post('/jobs/:id/retry', requireAdminToken, async (context) => {
    const kind = context.req.query('kind') ?? 'processing';
    if (kind !== 'processing' && kind !== 'sync') {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'kind must be processing or sync.',
      );
    }
    const service = new JobAdminService(context.env.DB);
    const actorId = `request:${context.get('requestId')}`;
    const retried =
      kind === 'sync'
        ? await service.manuallyRetrySyncAttempt(
            context.req.param('id'),
            actorId,
          )
        : await service.manuallyRetryProcessingJob(
            context.req.param('id'),
            actorId,
          );
    if (!retried) {
      throw new AppError(
        409,
        'JOB_NOT_LEASABLE',
        'The failed job is not eligible for retry.',
      );
    }
    return context.json({
      data: { job_id: context.req.param('id'), kind, status: 'pending' },
      meta: { request_id: context.get('requestId') },
    });
  });

  router.post(
    '/items/:id/notion/recreate',
    requireAdminToken,
    async (context) => {
      const service = new JobAdminService(context.env.DB);
      const approved = await service.approveNotionRecreation(
        context.req.param('id'),
        `request:${context.get('requestId')}`,
      );
      if (!approved) {
        throw new AppError(
          409,
          'OWNER_APPROVAL_REQUIRED',
          'The item has no confirmed missing Notion projection.',
        );
      }
      return context.json({
        data: {
          item_id: context.req.param('id'),
          notion_recreation: 'approved',
          sync_status: 'pending',
        },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  router.post(
    '/worker/jobs/lease',
    requireLocalWorkerToken,
    async (context) => {
      const input = await jsonBody(context, workerLeaseSchema);
      const jobs = await new JobService(context.env.DB).leaseProcessingJobs(
        input.job_type,
        input.owner_id,
        input.ttl_minutes ?? 10,
        input.limit ?? 10,
      );
      return context.json({
        data: { jobs },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  router.post(
    '/worker/jobs/:id/heartbeat',
    requireLocalWorkerToken,
    async (context) => {
      const input = await jsonBody(context, ownedJobActionSchema);
      const updated = await new JobService(
        context.env.DB,
      ).heartbeatProcessingJob(
        context.req.param('id'),
        input.owner_id,
        input.ttl_minutes ?? 10,
      );
      if (!updated) {
        throw new AppError(
          409,
          'JOB_NOT_LEASABLE',
          'The active lease is missing, expired, or owned by another worker.',
        );
      }
      return context.json({
        data: { job_id: context.req.param('id'), heartbeat: 'accepted' },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  router.post(
    '/worker/jobs/:id/release',
    requireLocalWorkerToken,
    async (context) => {
      const input = await jsonBody(context, ownedJobActionSchema);
      const released = await new JobService(
        context.env.DB,
      ).releaseProcessingJob(context.req.param('id'), input.owner_id);
      if (!released) {
        throw new AppError(
          409,
          'JOB_NOT_LEASABLE',
          'The active lease is missing, expired, or owned by another worker.',
        );
      }
      return context.json({
        data: { job_id: context.req.param('id'), status: 'pending' },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  router.post(
    '/worker/jobs/:id/fail',
    requireLocalWorkerToken,
    async (context) => {
      const input = await jsonBody(context, workerFailureSchema);
      const now = new Date();
      const retryAt =
        input.retry_after_seconds === undefined
          ? undefined
          : new Date(now.getTime() + input.retry_after_seconds * 1000);
      const failed = await new JobService(context.env.DB).failProcessingJob(
        context.req.param('id'),
        input.owner_id,
        input.error_code,
        input.retryable,
        5,
        now,
        retryAt,
      );
      if (!failed) {
        throw new AppError(
          409,
          'JOB_NOT_LEASABLE',
          'The active lease is missing, expired, or owned by another worker.',
        );
      }
      return context.json({
        data: {
          job_id: context.req.param('id'),
          status: input.retryable ? 'retry_wait' : 'failed',
          retryable: input.retryable,
          retry_after_seconds: input.retry_after_seconds ?? null,
        },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  router.post(
    '/worker/jobs/:id/result',
    requireLocalWorkerToken,
    async (context) => {
      const input = await jsonBody(context, processingResultSchema);
      const outcome = await new JobService(
        context.env.DB,
      ).submitProcessingResult(context.req.param('id'), input.owner_id, {
        submissionId: input.submission_id,
        inputHash: input.input_hash,
        resultVersion: input.result_version,
        result: input.result,
      });
      if (!outcome.accepted) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'The result does not match the active job lease or prior submission.',
        );
      }
      return context.json({
        data: {
          job_id: context.req.param('id'),
          status: 'complete',
          replayed: outcome.replayed,
        },
        meta: { request_id: context.get('requestId') },
      });
    },
  );

  return router;
}
