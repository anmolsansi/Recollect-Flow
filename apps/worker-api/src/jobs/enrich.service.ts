import type { Env } from '../env';
import { JobService, type JobRecord } from './job.service';
import { AiProviderRegistry } from './ai/ai-provider.registry';
import { AppError } from '../shared/errors';
import type { PrivacyLevel } from '../policy/policy.service';

export class EnrichService {
  private jobService: JobService;
  private aiRegistry: AiProviderRegistry;

  constructor(
    private readonly env: Env,
    private readonly db: D1Database,
  ) {
    this.jobService = new JobService(db);
    this.aiRegistry = new AiProviderRegistry(env);
  }

  async processEnrichmentJob(
    job: JobRecord,
    ownerId: string,
  ): Promise<boolean> {
    const itemRow = await this.db
      .prepare(
        `SELECT raw_text, user_note, source_type, privacy_level, title FROM items WHERE id = ?1 AND deleted_at IS NULL`,
      )
      .bind(job.itemId)
      .first<{
        raw_text: string | null;
        user_note: string | null;
        source_type: string;
        privacy_level: PrivacyLevel;
        title: string | null;
      }>();

    if (!itemRow) {
      // Item deleted or not found
      return this.jobService.failProcessingJob(
        job.id,
        ownerId,
        'ITEM_DELETED_OR_NOT_FOUND',
        false,
      );
    }

    const textToEnrich = [itemRow.title, itemRow.user_note, itemRow.raw_text]
      .filter(Boolean)
      .join('\n\n');

    if (!textToEnrich) {
      return this.jobService.failProcessingJob(
        job.id,
        ownerId,
        'NO_CONTENT_TO_ENRICH',
        false,
      );
    }

    try {
      const enrichmentResult = await this.aiRegistry.extractData(
        textToEnrich,
        itemRow.privacy_level,
      );

      const now = new Date().toISOString();
      const extracted = enrichmentResult.result;

      // Update in a transaction
      const statements = [
        this.db
          .prepare(
            `UPDATE items SET
             title = COALESCE(title, ?1),
             summary = ?2,
             topics_json = ?3,
             people = ?4,
             companies = ?5,
             project = ?6,
             importance = ?7,
             why_it_matters = ?8,
             suggested_action = ?9,
             processing_status = 'complete',
             updated_at = ?10
           WHERE id = ?11 AND deleted_at IS NULL AND privacy_level = ?12`, // Enforce privacy unchanged
          )
          .bind(
            extracted.title || null,
            extracted.summary,
            JSON.stringify(extracted.topics),
            JSON.stringify(extracted.people),
            JSON.stringify(extracted.companies),
            extracted.project || null,
            extracted.importance,
            extracted.whyItMatters,
            extracted.suggestedAction || null,
            now,
            job.itemId,
            itemRow.privacy_level,
          ),
        this.db
          .prepare(
            `INSERT INTO provider_usage (
             id, item_id, provider, model, operation, latency_ms,
             input_units, output_units, status, created_at
           ) VALUES (?1, ?2, ?3, ?4, 'enrich', ?5, ?6, ?7, 'success', ?8)`,
          )
          .bind(
            crypto.randomUUID(),
            job.itemId,
            enrichmentResult.provider,
            enrichmentResult.model,
            enrichmentResult.latencyMs,
            enrichmentResult.inputUnits,
            enrichmentResult.outputUnits,
            now,
          ),
        this.db
          .prepare(
            `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           ) VALUES (?1, ?2, 'enrichment_completed', 'system', ?3, ?4)`,
          )
          .bind(
            crypto.randomUUID(),
            job.itemId,
            JSON.stringify({
              provider: enrichmentResult.provider,
              model: enrichmentResult.model,
              latency_ms: enrichmentResult.latencyMs,
            }),
            now,
          ),
        this.db
          .prepare(
            `UPDATE processing_jobs
           SET status = 'complete', lease_owner = NULL, lease_expires_at = NULL,
               completed_at = ?1, last_error_code = NULL, updated_at = ?1
           WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'`,
          )
          .bind(now, job.id, ownerId),
      ];

      const results = await this.db.batch(statements);

      // If the item update failed (e.g., deleted_at changed or privacy_level changed), we consider it a failure.
      if (!results[0] || results[0].meta.changes === 0) {
        return this.jobService.failProcessingJob(
          job.id,
          ownerId,
          'ITEM_STATE_CHANGED_DURING_ENRICHMENT',
          false,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof AppError && error.code === 'NO_ELIGIBLE_PROVIDER') {
        // "Add deferProcessingJob behavior for NO_ELIGIBLE_PROVIDER: Keep the job pending/deferred. Do not count it as capture failure. Do not retry rapidly. Allow a configuration/policy change or manual retry to reactivate it."
        // We do this by releasing the job and setting available_at to a very distant future or leaving it pending with a long retry wait, or actually we could create a defer method in job.service.ts
        const nowIso = new Date().toISOString();
        // Defer for 24 hours so it stays pending but doesn't immediately retry
        const deferredDate = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();
        await this.db
          .prepare(
            `UPDATE processing_jobs
           SET status = 'pending', lease_owner = NULL, lease_expires_at = NULL,
               available_at = ?1, last_error_code = 'NO_ELIGIBLE_PROVIDER', updated_at = ?2
           WHERE id = ?3 AND lease_owner = ?4`,
          )
          .bind(deferredDate, nowIso, job.id, ownerId)
          .run();

        return false;
      }

      // Record failed usage if there's provider info on the error
      if (error instanceof Object && 'provider' in error) {
        await this.db
          .prepare(
            `INSERT INTO provider_usage (
             id, item_id, provider, model, operation, latency_ms,
             input_units, output_units, status, error_code, created_at
           ) VALUES (?1, ?2, ?3, ?4, 'enrich', ?5, 0, 0, 'failed', ?6, ?7)`,
          )
          .bind(
            crypto.randomUUID(),
            job.itemId,
            (error as { provider: string }).provider,
            (error as { model: string }).model,
            (error as { latencyMs: number }).latencyMs,
            (error as { errorCode: string }).errorCode,
            new Date().toISOString(),
          )
          .run();
      }

      return this.jobService.failProcessingJob(
        job.id,
        ownerId,
        error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
        true,
      );
    }
  }
}
