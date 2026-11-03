import { BACKGROUND_CRON } from './digests/digest-schedule';
import { BG29_STAGING_URLS } from './jobs/extraction/bg29-staging-source';
import { createBg29StagingEvidenceLedger } from './bg29-staging-evidence';
import {
  assertBg29StagingBindings,
  createBg29StagingScheduler,
} from './bg29-staging-scheduler';

/**
 * Dedicated BG-29.078 staging-only entry point.
 *
 * No application routes, static assets, provider credentials or production
 * dependencies are exposed. This entry is never used by wrangler.toml.
 * The presence of this file is NOT permission to deploy it.
 */
export function stagingFetch(_request: Request, env: Cloudflare.Env): Response {
  assertBg29StagingBindings(env);
  return new Response('BG-29 staging HTTP access disabled', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function stagingScheduled(
  controller: ScheduledController,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
): Promise<void> {
  // Reject bad Cron/bindings before even writing measurement metadata.
  const scheduler = createBg29StagingScheduler(env, {
    url503For: BG29_STAGING_URLS[0],
    notion429For: 'bg29-078-url-01',
  });
  if (controller.cron !== BACKGROUND_CRON) {
    throw new Error('BG29_STAGING_EGRESS_DENIED: unapproved Cron schedule');
  }
  const ledger = createBg29StagingEvidenceLedger(env.DB);
  const sweepId = await ledger.start(controller.cron, controller.scheduledTime);
  await ledger.snapshot(sweepId, 'before');

  // Preserve the production handler's eight independent waitUntil calls.
  // Instrument only its four actual pipeline stages, not disabled cleanup.
  const names = [
    'cleanup-attachments',
    'cleanup-capacity',
    'cleanup-backups',
    'purge-workflows',
    'extract',
    'acquire_url',
    'enrich',
    'notion',
  ] as const;
  const pending: Promise<unknown>[] = [];
  let index = 0;
  const measuredContext = {
    waitUntil(promise: Promise<unknown>): void {
      const stage = names[index++];
      if (!stage) throw new Error('BG29_STAGING_UNEXPECTED_DISPATCH');
      const startedAt = new Date();
      const observed =
        index <= 4
          ? promise
          : promise.then(
              async (result) => {
                await ledger.stage(sweepId, stage, startedAt, 'fulfilled');
                return result;
              },
              async (error: unknown) => {
                await ledger.stage(sweepId, stage, startedAt, 'rejected');
                throw error;
              },
            );
      pending.push(observed);
      ctx.waitUntil(observed);
    },
  } as ExecutionContext;
  await scheduler.scheduled(controller, env, measuredContext);
  if (index !== names.length) throw new Error('BG29_STAGING_MISSING_DISPATCH');
  ctx.waitUntil(
    Promise.allSettled(pending).then(() => ledger.snapshot(sweepId, 'after')),
  );
}

export default {
  fetch: stagingFetch,
  scheduled: stagingScheduled,
};
