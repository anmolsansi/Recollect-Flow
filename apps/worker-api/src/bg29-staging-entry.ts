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
export function stagingFetch(
  _request: Request,
  env: Cloudflare.Env,
): Response {
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
  // Construct a fresh isolated, tokenless dependency set for each Cron run.
  // Stage 7 must add real R2 extraction before this can qualify as accepted.
  return createBg29StagingScheduler(env).scheduled(controller, env, ctx);
}

export default {
  fetch: stagingFetch,
  scheduled: stagingScheduled,
};
