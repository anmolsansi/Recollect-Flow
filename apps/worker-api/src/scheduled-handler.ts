import type { Env } from './env';
import {
  scheduledWorkForCron,
  type ScheduledWork,
} from './digests/digest-schedule';

/**
 * Each dependency launches one of the existing scheduled services.
 *
 * Keep all eight background jobs independent: a Promise.all or sequential
 * await would change the production scheduler's dispatch semantics.
 * A complete dependency set is mandatory, so an isolated test cannot
 * accidentally fall back to a live production provider.
 */
export interface ScheduledHandlerDependencies {
  cleanupAttachments: (env: Cloudflare.Env) => Promise<unknown>;
  cleanupCapacity: (env: Cloudflare.Env) => Promise<unknown>;
  cleanupBackups: (env: Cloudflare.Env) => Promise<unknown>;
  purgeWorkflows: (env: Cloudflare.Env) => Promise<unknown>;
  extractFiles: (env: Cloudflare.Env) => Promise<unknown>;
  acquireUrls: (env: Cloudflare.Env) => Promise<unknown>;
  enrichItems: (env: Cloudflare.Env) => Promise<unknown>;
  syncNotion: (env: Cloudflare.Env) => Promise<unknown>;
  digest: (
    env: Cloudflare.Env,
    kind: 'daily' | 'weekly',
    scheduledAt: Date,
  ) => Promise<unknown>;
  weeklyBackup: (env: Cloudflare.Env, scheduledAt: Date) => Promise<unknown>;
}

export type ScheduledHandler = (
  controller: ScheduledController,
  env: Cloudflare.Env,
  context: ExecutionContext,
) => Promise<void>;

export function scheduledWork(cron: string): ScheduledWork {
  return scheduledWorkForCron(cron);
}

/**
 * Create an isolated scheduler instance with a snapshotted dependency set.
 * The production entry point owns its own instance; creating a test/staging
 * instance cannot globally replace its dependencies.
 */
export function createScheduledHandler(
  dependencies: ScheduledHandlerDependencies,
): ScheduledHandler {
  const services = Object.freeze({ ...dependencies });

  return async (controller, env, context) => {
    const work = scheduledWorkForCron(controller.cron);
    if (work === 'background') {
      context.waitUntil(services.cleanupAttachments(env));
      context.waitUntil(services.cleanupCapacity(env));
      context.waitUntil(services.cleanupBackups(env));
      context.waitUntil(services.purgeWorkflows(env));
      context.waitUntil(services.extractFiles(env));
      context.waitUntil(services.acquireUrls(env));
      context.waitUntil(services.enrichItems(env));
      context.waitUntil(services.syncNotion(env));
      return;
    }

    if (work === 'daily' || work === 'weekly') {
      context.waitUntil(
        services.digest(env, work, new Date(controller.scheduledTime)),
      );
      // The existing weekly backup remains explicitly opt-in.
      if (
        work === 'weekly' &&
        (env as Env).HOSTED_BACKUP_AUTOCREATE_ENABLED === 'true'
      ) {
        context.waitUntil(
          services.weeklyBackup(env, new Date(controller.scheduledTime)),
        );
      }
      return;
    }

    console.warn(
      JSON.stringify({
        event: 'scheduled_cron_unrecognized',
        cron: controller.cron,
        scheduled_time: controller.scheduledTime,
      }),
    );
  };
}
