import { JobService } from '../job.service';
import { ExtractionService } from './extraction.service';
import type { Env } from '../../env';

export async function processExtractionJobs(env: Env): Promise<void> {
  const db = env.DB;
  const jobService = new JobService(db);
  const extractionService = new ExtractionService(env, db);
  const ownerId = crypto.randomUUID();

  const jobs = await jobService.leaseProcessingJobs('extract', ownerId, 5, 10);

  for (const job of jobs) {
    try {
      const policyRow = await db
        .prepare(
          `SELECT provider_eligibility, credential_source, hosted_processing_consent,
                  zero_data_retention_required, data_collection_denied, policy_version,
                  privacy_level_snapshot
           FROM processing_jobs
           WHERE id = ?1`,
        )
        .bind(job.id)
        .first<{
          provider_eligibility: string;
          credential_source: string;
          hosted_processing_consent: number;
          zero_data_retention_required: number;
          data_collection_denied: number;
          policy_version: string;
          privacy_level_snapshot: string;
        }>();

      if (!policyRow) {
        await jobService.failProcessingJob(job.id, ownerId, 'NO_POLICY', false);
        continue;
      }

      const attachmentsRows = await db
        .prepare(
          `SELECT id as attachment_id, object_key, size_bytes, content_hash,
                  COALESCE(detected_content_type, declared_content_type) as content_type
           FROM attachments
           WHERE item_id = ?1 AND status = 'linked'
           ORDER BY created_at ASC`,
        )
        .bind(job.itemId)
        .all<{
          attachment_id: string;
          object_key: string;
          size_bytes: number;
          content_hash: string;
          content_type: string;
        }>();

      if (!attachmentsRows.results || attachmentsRows.results.length === 0) {
        await jobService.failProcessingJob(
          job.id,
          ownerId,
          'NO_ATTACHMENTS',
          false,
        );
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];
      let hasUsableText = false;

      for (const a of attachmentsRows.results) {
        const result = await extractionService.extract(
          a.attachment_id,
          a.object_key,
          job.itemId,
          a.content_type,
          a.size_bytes,
          a.content_hash,
          policyRow,
        );
        results.push(result);
        if (result.extractedText || result.imageDescription) {
          hasUsableText = true;
        }
      }

      await jobService.submitExtractionResults(
        job.id,
        ownerId,
        job.itemId,
        results,
        hasUsableText,
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'extraction.job_failed',
          job_id: job.id,
          item_id: job.itemId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await jobService.failProcessingJob(
        job.id,
        ownerId,
        'INTERNAL_ERROR',
        true,
      );
    }
  }
}
