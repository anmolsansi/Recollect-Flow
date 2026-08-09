import type { Env } from '../env';
import { JobService, type JobRecord } from './job.service';
import { AiProviderRegistry } from './ai/ai-provider.registry';
import { AppError } from '../shared/errors';
import { CapacityJobService } from './capacity-job.service';
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

const CAPACITY_DEFER_CODES = new Set([
  'QUOTA_PAUSED',
  'PROVIDER_UNAVAILABLE',
  'NO_ELIGIBLE_PROVIDER',
  'ZERO_COST_GUARD_REJECTED',
]);

function normalizeProvider(
  provider: EnrichmentRoutingRow['provider_eligibility'],
): PolicyAiProvider {
  return provider === 'workers_ai' ? 'cloudflare' : provider;
}

function capacityDeferralAt(error: AppError, now: Date): Date {
  const exact = error.fields?.available_at;
  if (exact) {
    const parsed = new Date(exact);
    if (Number.isFinite(parsed.getTime()) && parsed.getTime() > now.getTime()) {
      return parsed;
    }
  }
  const delayMs =
    error.code === 'PROVIDER_UNAVAILABLE'
      ? 5 * 60_000
      : error.code === 'QUOTA_PAUSED'
        ? 60 * 60_000
        : 24 * 60 * 60_000;
  return new Date(now.getTime() + delayMs);
}

export class EnrichService {
  private jobService: JobService;
  private capacityJobService: CapacityJobService;
  private aiRegistry: AiProviderRegistry;

  constructor(
    private readonly env: Env,
    private readonly db: D1Database,
  ) {
    this.jobService = new JobService(db);
    this.capacityJobService = new CapacityJobService(db);
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

      const overridesResult = await this.db
        .prepare(
          `SELECT field_name, override_value FROM item_field_overrides WHERE item_id = ?1`,
        )
        .bind(job.itemId)
        .all<{ field_name: string; override_value: string }>();

      const overrides = new Map(
        overridesResult.results.map((r) => [r.field_name, r.override_value]),
      );

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
      if (
        error instanceof AppError &&
        CAPACITY_DEFER_CODES.has(error.code)
      ) {
        const now = new Date();
        await this.capacityJobService.deferProcessingJob(
          job.id,
          ownerId,
          error.code,
          capacityDeferralAt(error, now),
          now,
        );
        return false;
      }

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
