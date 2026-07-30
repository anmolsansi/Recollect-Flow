import { JobService } from './job.service';
import { EnrichService } from './enrich.service';
import type { Env } from '../env';

export async function processEnrichJobs(env: Env): Promise<void> {
  const db = env.DB;
  const jobService = new JobService(db);
  const enrichService = new EnrichService(env, db);
  const ownerId = crypto.randomUUID();

  // Lease up to 10 enrich jobs
  const jobs = await jobService.leaseProcessingJobs('enrich', ownerId, 5, 10);

  for (const job of jobs) {
    await enrichService.processEnrichmentJob(job, ownerId);
  }
}
