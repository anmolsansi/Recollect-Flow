import { createApp } from './app';
import type { Env } from './env';
import { servePublicAsset, type StaticAssets } from './assets/asset-router';
import { D1AttachmentRepository } from './attachments/attachment.repository';
import { cleanupExpiredAttachments } from './attachments/attachment.service';
import { createScheduledHandler } from './scheduled-handler';

export { scheduledWork } from './scheduled-handler';
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

/**
 * The public Worker entry point is permanently wired to the existing
 * production services. Staging creates a separate scheduler instance via
 * createScheduledHandler; it never patches this instance or global services.
 */
export const handleScheduled = createScheduledHandler({
  cleanupAttachments: (env) =>
    cleanupExpiredAttachments(
      new D1AttachmentRepository(env.DB),
      env.ATTACHMENTS,
    ),
  cleanupCapacity: (env) => cleanupExpiredCapacityReservations(env),
  cleanupBackups: (env) =>
    cleanupExpiredHostedBackups(env.DB, env.ATTACHMENTS),
  purgeWorkflows: (env) => processPurgeWorkflows(env),
  extractFiles: (env) => processExtractionJobs(env),
  acquireUrls: (env) => processSourceAcquisitionJobs(env),
  enrichItems: (env) => processEnrichJobs(env),
  syncNotion: (env) =>
    processNotionSyncJobs(
      env.DB,
      env.NOTION_ACCESS_TOKEN,
      env.NOTION_DATABASE_ID,
    ),
  digest: (env, kind, at) => processScheduledDigest(env, kind, at),
  weeklyBackup: (env, at) =>
    createWeeklyHostedBackup(env.DB, env.ATTACHMENTS, at),
});

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
