import { createApp } from './app';
import { D1AttachmentRepository } from './attachments/attachment.repository';
import { cleanupExpiredAttachments } from './attachments/attachment.service';
import {
  scheduledWorkForCron,
  type ScheduledWork,
} from './digests/digest-schedule';
import { processScheduledDigest } from './digests/digest.worker';
import { cleanupExpiredCapacityReservations } from './jobs/ai/capacity.worker';
import { processEnrichJobs } from './jobs/enrich.worker';
import { processExtractionJobs } from './jobs/extraction/extraction.worker';
import { cleanupExpiredHostedBackups } from './recovery/backup-cleanup';
import { processPurgeWorkflows } from './recovery/purge.worker';
import { processNotionSyncJobs } from './sync/sync.worker';

const app = createApp();

export function scheduledWork(cron: string): ScheduledWork {
  return scheduledWorkForCron(cron);
}

export async function handleScheduled(
  controller: ScheduledController,
  env: Cloudflare.Env,
  context: ExecutionContext,
): Promise<void> {
  const work = scheduledWorkForCron(controller.cron);
  if (work === 'background') {
    context.waitUntil(
      cleanupExpiredAttachments(
        new D1AttachmentRepository(env.DB),
        env.ATTACHMENTS,
      ),
    );
    context.waitUntil(cleanupExpiredCapacityReservations(env));
    context.waitUntil(cleanupExpiredHostedBackups(env.DB, env.ATTACHMENTS));
    context.waitUntil(processPurgeWorkflows(env));
    context.waitUntil(processExtractionJobs(env));
    context.waitUntil(processEnrichJobs(env));
    context.waitUntil(
      processNotionSyncJobs(
        env.DB,
        env.NOTION_ACCESS_TOKEN,
        env.NOTION_DATABASE_ID,
      ),
    );
    return;
  }
  if (work === 'daily' || work === 'weekly') {
    context.waitUntil(
      processScheduledDigest(env, work, new Date(controller.scheduledTime)),
    );
    return;
  }
  console.warn(
    JSON.stringify({
      event: 'scheduled_cron_unrecognized',
      cron: controller.cron,
      scheduled_time: controller.scheduledTime,
    }),
  );
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
