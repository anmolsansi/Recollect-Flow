import { JobService } from '../job.service';
import { ExtractionService } from './extraction.service';
import type { Env } from '../../env';
import type {
  AiProvider,
  CredentialSource,
  PrivacyLevel,
} from '../../policy/policy.service';
import type { AttachmentExtractionResult } from './extraction.types';

export async function processExtractionJobs(env: Env): Promise<void> {
  const db = env.DB;
  const jobService = new JobService(db);
  const extractionService = new ExtractionService(env);
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
          provider_eligibility: AiProvider;
          credential_source: CredentialSource;
          hosted_processing_consent: number;
          zero_data_retention_required: number;
          data_collection_denied: number;
          policy_version: string;
          privacy_level_snapshot: PrivacyLevel;
        }>();

      if (!policyRow) {
        await jobService.failProcessingJob(job.id, ownerId, 'NO_POLICY', false);
        continue;
      }

      const attachmentsRows = await db
        .prepare(
          `SELECT id as attachment_id, object_key, size_bytes, content_hash,
                  declared_content_type, detected_content_type
           FROM attachments
           WHERE item_id = ?1 AND status = 'linked'
           ORDER BY created_at ASC`,
        )
        .bind(job.itemId)
        .all<{
          attachment_id: string;
          object_key: string;
          size_bytes: number;
          content_hash: string | null;
          declared_content_type: string;
          detected_content_type: string | null;
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

      const results: AttachmentExtractionResult[] = [];
      let hasUsableText = false;

      for (const a of attachmentsRows.results) {
        const result = await extractionService.extract({
          attachmentId: a.attachment_id,
          objectKey: a.object_key,
          itemId: job.itemId,
          declaredContentType: a.declared_content_type,
          detectedContentType: a.detected_content_type,
          sizeBytes: a.size_bytes,
          contentHash: a.content_hash,
          routing: {
            privacyLevel: policyRow.privacy_level_snapshot,
            requestedProvider: policyRow.provider_eligibility,
            credentialSource: policyRow.credential_source,
            hostedProcessingConsent: policyRow.hosted_processing_consent === 1,
            zeroDataRetentionEnforced:
              policyRow.zero_data_retention_required === 1,
            dataCollectionDenied: policyRow.data_collection_denied === 1,
          },
        });
        results.push(result);
        if (result.extractedText || result.imageDescription) {
          hasUsableText = true;
        }
      }

      const submitted = await jobService.submitExtractionResults(
        job.id,
        ownerId,
        job.itemId,
        results,
        hasUsableText,
      );
      if (!submitted) {
        console.warn(
          JSON.stringify({
            event: 'extraction.result_rejected',
            job_id: job.id,
            item_id: job.itemId,
            reason: 'lease_lost_or_expired',
          }),
        );
      }
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
