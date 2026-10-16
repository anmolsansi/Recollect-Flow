import { createApp } from './app';
import type { Env } from './env';
import { servePublicAsset, type StaticAssets } from './assets/asset-router';
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
import { processSourceAcquisitionJobs } from './jobs/extraction/source-acquisition.worker';
import { cleanupExpiredHostedBackups } from './recovery/backup-cleanup';
import { createWeeklyHostedBackup } from './recovery/backup-schedule';
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
    context.waitUntil(processSourceAcquisitionJobs(env));
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
    // Explicit opt-in only. The default Cron must not silently create backups
    // (nor claim that a JSON-only backup contains original attachment bytes).
    if (
      work === 'weekly' &&
      (env as Env).HOSTED_BACKUP_AUTOCREATE_ENABLED === 'true'
    ) {
      context.waitUntil(
        createWeeklyHostedBackup(
          env.DB,
          env.ATTACHMENTS,
          new Date(controller.scheduledTime),
        ),
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
}

/**
 * Route the API before any static fallback, regardless of Accept or navigation
 * headers. Authentication still belongs to the existing Hono API middleware.
 */
export async function handleFetch(
  request: Request,
  env: Cloudflare.Env,
  context: ExecutionContext,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const response = await app.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  const assets = (env as Cloudflare.Env & { ASSETS?: StaticAssets }).ASSETS;
  const publicResponse = await servePublicAsset(request, assets);
  if (publicResponse) return publicResponse;

  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  fetch: handleFetch,
  scheduled: handleScheduled,
};
