/**
 * Browser-test-only Worker entrypoint.
 *
 * The actual application, authentication, D1 and source parser remain intact.
 * Only outbound public HTML is simulated through SourceFetcher's existing
 * injectable fetch seam. This file is never referenced by wrangler.toml.
 */
import { createApp } from '../apps/worker-api/src/app';
import type { Env } from '../apps/worker-api/src/env';
import { JobService } from '../apps/worker-api/src/jobs/job.service';
import { SourceFetcher } from '../apps/worker-api/src/jobs/extraction/source-fetcher';
import { SourceAcquisitionService } from '../apps/worker-api/src/jobs/extraction/source-acquisition.service';

const app = createApp();
const fixtureBody = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>RecollectFlow public page</title></head><body>
<h1>Static upstream fixture</h1><article>
<p>birch lantern quartz meadow</p>
<p>Deterministic owner-safe page text for isolated browser acceptance.</p>
</article></body></html>`;

const fetcher = new SourceFetcher({
  fetchImpl: async (request) => {
    const target = new URL(
      request instanceof Request ? request.url : String(request),
    );
    if (
      target.protocol !== 'https:' ||
      target.hostname !== 'example.com' ||
      !/^\/bg14-(fixture|unavailable)-[0-9a-f]{32}$/.test(target.pathname) ||
      target.search !== ''
    ) {
      throw new Error('BG14 fixture refused an unapproved upstream request');
    }
    if (target.pathname.startsWith('/bg14-unavailable-')) {
      return new Response('Synthetic unavailable page', {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }
    return new Response(fixtureBody, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
});

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    if (controller.cron !== '17 * * * *') {
      throw new Error('BG14 fixture rejected an unrelated scheduled event');
    }
    const jobs = new JobService(env.DB);
    const owner = crypto.randomUUID();
    const leased = await jobs.leaseProcessingJobs('acquire_url', owner, 5, 10);
    const service = new SourceAcquisitionService(env.DB, { fetcher });
    for (const job of leased) {
      const accepted = await service.process(job, owner);
      if (!accepted) {
        throw new Error('BG14 fixture source job was not accepted');
      }
    }
  },
};
