import type { Env } from '../env';
import { JobService, type JobRecord } from './job.service';
import { AiProviderRegistry } from './ai/ai-provider.registry';
import { AppError } from '../shared/errors';
import type {
  AiProvider as PolicyAiProvider,
  CredentialSource,
  PrivacyLevel,
} from '../policy/policy.service';

interface EnrichmentRoutingRow {
  provider_eligibility: PolicyAiProvider | 'workers_ai';
  credential_source: CredentialSource;
  hosted_processing_consent: number;
  zero_data_retention_required: number;
  data_collection_denied: number;
}

function normalizeProvider(
  provider: EnrichmentRoutingRow['provider_eligibility'],
): PolicyAiProvider {
  return provider === 'workers_ai' ? 'cloudflare' : provider;
}

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
    const routingRow = await this.db
      .prepare(
        `SELECT provider_eligibility, credential_source,
                hosted_processing_consent, zero_data_retention_required,
                data_collection_denied
         FROM processing_jobs
         WHERE id = ?1 AND item_id = ?2 AND status = 'processing'
           AND lease_owner = ?3`,
      )
      .bind(job.id, job.itemId, ownerId)
      .first<EnrichmentRoutingRow>();
    if (!routingRow) return false;

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

    const extractionRows = await this.db
      .prepare(
        `SELECT extracted_text, image_description
         FROM extraction_records
         WHERE item_id = ?1 AND completeness IN ('complete', 'partial')`,
      )
      .bind(job.itemId)
      .all<{
        extracted_text: string | null;
        image_description: string | null;
      }>();

    const extractions = (extractionRows.results || [])
      .flatMap((r) => [r.extracted_text, r.image_description])
      .filter(Boolean);

    const textToEnrich = [
      itemRow.title,
      itemRow.user_note,
      itemRow.raw_text,
      ...extractions,
    ]
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
      const enrichmentResult = await this.aiRegistry.extractData(textToEnrich, {
        privacyLevel: itemRow.privacy_level,
        requestedProvider: normalizeProvider(routingRow.provider_eligibility),
        credentialSource: routingRow.credential_source,
        hostedProcessingConsent: routingRow.hosted_processing_consent === 1,
        zeroDataRetentionEnforced:
          routingRow.zero_data_retention_required === 1,
        dataCollectionDenied: routingRow.data_collection_denied === 1,
      });

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

      // Build dynamic update query respecting overrides
      const updateFields: string[] = ['updated_at = ?1'];
      const updateValues: unknown[] = [now];
      let paramIndex = 2;

      const addField = (field: string, value: unknown, useCoalesce = false) => {
        if (!overrides.has(field)) {
          if (useCoalesce) {
            updateFields.push(`${field} = COALESCE(${field}, ?${paramIndex})`);
          } else {
            updateFields.push(`${field} = ?${paramIndex}`);
          }
          updateValues.push(value);
          paramIndex++;
        }
      };

      addField('title', extracted.title ?? null, true);
      addField('summary', extracted.summary ?? null);
      addField('topics_json', JSON.stringify(extracted.topics ?? []));
      addField('people', JSON.stringify(extracted.people ?? []));
      addField('companies', JSON.stringify(extracted.companies ?? []));
      addField('project', extracted.project ?? null);
      addField('importance', extracted.importance ?? null);
      addField('why_it_matters', extracted.whyItMatters ?? null);
      addField('suggested_action', extracted.suggestedAction ?? null);
      updateFields.push(`processing_status = 'complete'`);

      const baseWhere = `id = ?${paramIndex++} AND deleted_at IS NULL AND privacy_level = ?${paramIndex++} AND EXISTS (SELECT 1 FROM processing_jobs WHERE id = ?${paramIndex++} AND lease_owner = ?${paramIndex++} AND status = 'processing')`;
      updateValues.push(job.itemId, itemRow.privacy_level, job.id, ownerId);

      const updateItemsQuery = `UPDATE items SET ${updateFields.join(', ')} WHERE ${baseWhere}`;

      // Update in a transaction
      const statements = [
        this.db.prepare(updateItemsQuery).bind(...updateValues),
        this.db
          .prepare(
            `INSERT INTO provider_usage (
             id, item_id, provider, model, operation, latency_ms,
             input_units, output_units, status, created_at
           ) SELECT ?1, ?2, ?3, ?4, 'enrich', ?5, ?6, ?7, 'success', ?8
             FROM items WHERE id = ?9 AND deleted_at IS NULL AND privacy_level = ?10
             AND EXISTS (SELECT 1 FROM processing_jobs WHERE id = ?11 AND lease_owner = ?12 AND status = 'processing')`,
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
            job.id,
            ownerId,
          ),
        this.db
          .prepare(
            `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           ) SELECT ?1, ?2, 'enrichment_completed', 'system', ?3, ?4
             FROM items WHERE id = ?5 AND deleted_at IS NULL AND privacy_level = ?6
             AND EXISTS (SELECT 1 FROM processing_jobs WHERE id = ?7 AND lease_owner = ?8 AND status = 'processing')`,
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
            job.id,
            ownerId,
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

      if (error && typeof error === 'object' && 'provider' in error) {
        const providerError = error as {
          provider?: string;
          model?: string;
          latencyMs?: number;
          errorCode?: string;
        };
        const provider = String(providerError.provider || 'unknown');
        const model = String(providerError.model || 'unknown');
        const latencyMs = Number(providerError.latencyMs || 0);

        const rawErrorCode = providerError.errorCode;
        if (rawErrorCode) {
          errorCode = String(rawErrorCode)
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
