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

      // Fetch manual overrides
      const overridesResult = await this.db
        .prepare(
          `SELECT field_name, override_value FROM item_field_overrides WHERE item_id = ?1`,
        )
        .bind(job.itemId)
        .all<{ field_name: string; override_value: string }>();

      const overrides = new Map(
        overridesResult.results.map((r) => [r.field_name, r.override_value]),
      );

      // Merge extracted data with overrides
      const finalTitle = overrides.has('title')
        ? (overrides.get('title') ?? null)
        : (extracted.title ?? null);
      const finalSummary = overrides.has('summary')
        ? (overrides.get('summary') ?? null)
        : (extracted.summary ?? null);
      const finalTopics = overrides.has('topics')
        ? (overrides.get('topics') ?? null)
        : JSON.stringify(extracted.topics ?? []);
      const finalPeople = overrides.has('people')
        ? (overrides.get('people') ?? null)
        : JSON.stringify(extracted.people ?? []);
      const finalCompanies = overrides.has('companies')
        ? (overrides.get('companies') ?? null)
        : JSON.stringify(extracted.companies ?? []);
      const finalProject = overrides.has('project')
        ? (overrides.get('project') ?? null)
        : (extracted.project ?? null);
      const finalImportance = overrides.has('importance')
        ? parseInt(overrides.get('importance')!, 10)
        : (extracted.importance ?? null);
      const finalWhyItMatters = overrides.has('why_it_matters')
        ? (overrides.get('why_it_matters') ?? null)
        : (extracted.whyItMatters ?? null);
      const finalSuggestedAction = overrides.has('suggested_action')
        ? (overrides.get('suggested_action') ?? null)
        : (extracted.suggestedAction ?? null);

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
            finalTitle,
            finalSummary,
            finalTopics,
            finalPeople,
            finalCompanies,
            finalProject,
            finalImportance,
            finalWhyItMatters,
            finalSuggestedAction,
            now,
            job.itemId,
            itemRow.privacy_level,
          ),
        this.db
          .prepare(
            `INSERT INTO provider_usage (
             id, item_id, provider, model, operation, latency_ms,
             input_units, output_units, status, created_at
           ) SELECT ?1, ?2, ?3, ?4, 'enrich', ?5, ?6, ?7, 'success', ?8
             FROM items WHERE id = ?9 AND deleted_at IS NULL AND privacy_level = ?10`,
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
            job.itemId,
            itemRow.privacy_level,
          ),
        this.db
          .prepare(
            `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           ) SELECT ?1, ?2, 'enrichment_completed', 'system', ?3, ?4
             FROM items WHERE id = ?5 AND deleted_at IS NULL AND privacy_level = ?6`,
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
            job.itemId,
            itemRow.privacy_level,
          ),
        this.db
          .prepare(
            `UPDATE processing_jobs
           SET status = 'complete', lease_owner = NULL, lease_expires_at = NULL,
               completed_at = ?1, last_error_code = NULL, updated_at = ?1
           WHERE id = ?2 AND lease_owner = ?3 AND status = 'processing'
           AND EXISTS (SELECT 1 FROM items WHERE id = ?4 AND deleted_at IS NULL AND privacy_level = ?5)`,
          )
          .bind(now, job.id, ownerId, job.itemId, itemRow.privacy_level),
      ];

      const results = await this.db.batch(statements);

      // If the processing job update failed (0 changes), it means either:
      // 1. The job was stolen/cancelled
      // 2. The item was deleted or had a privacy change during enrichment.
      // In either case, the job shouldn't be completed. We still fail it.
      if (!results[3] || results[3].meta.changes === 0) {
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
      let errorCode = error instanceof AppError ? error.code : 'UNKNOWN_ERROR';

      if (error instanceof Object && 'provider' in error) {
        const provider = (error as Record<string, unknown>).provider as string;
        const model = (error as Record<string, unknown>).model as string;
        const latencyMs = (error as Record<string, unknown>)
          .latencyMs as number;

        const rawErrorCode = (error as Record<string, unknown>)
          .errorCode as string;
        if (rawErrorCode) {
          errorCode = rawErrorCode
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .substring(0, 50)
            .toUpperCase();
        }

        await this.db
          .prepare(
            `INSERT INTO provider_usage (
             id, item_id, provider, model, operation, latency_ms,
             input_units, output_units, status, error_code, created_at
           ) SELECT ?1, ?2, ?3, ?4, 'enrich', ?5, 0, 0, 'failed', ?6, ?7
             FROM items WHERE id = ?8 AND deleted_at IS NULL`,
          )
          .bind(
            crypto.randomUUID(),
            job.itemId,
            provider,
            model,
            latencyMs,
            errorCode,
            new Date().toISOString(),
            job.itemId,
          )
          .run();
      }

      return this.jobService.failProcessingJob(
        job.id,
        ownerId,
        errorCode,
        true,
      );
    }
  }
}
