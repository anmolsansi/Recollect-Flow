import type { Env } from '../../env';
import { JobService } from '../job.service';
import { SourceAcquisitionService } from './source-acquisition.service';

export async function processSourceAcquisitionJobs(env: Env): Promise<void> {
  const jobs = new JobService(env.DB);
  const service = new SourceAcquisitionService(env.DB);
  const ownerId = crypto.randomUUID();
  const leased = await jobs.leaseProcessingJobs('acquire_url', ownerId, 5, 10);

  for (const job of leased) {
    try {
      const accepted = await service.process(job, ownerId);
      if (!accepted) {
        console.warn(
          JSON.stringify({
            event: 'url_acquisition.not_completed',
            job_id: job.id,
            item_id: job.itemId,
          }),
        );
      }
    } catch {
      console.error(
        JSON.stringify({
          event: 'url_acquisition.worker_failed',
          job_id: job.id,
          item_id: job.itemId,
        }),
      );
      await jobs.failProcessingJob(
        job.id,
        ownerId,
        'SOURCE_NETWORK_ERROR',
        true,
        3,
      );
    }
  }
}
