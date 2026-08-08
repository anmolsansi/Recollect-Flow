import { AppError } from '../shared/errors';
import type { PrivacyChangeInput } from './policy.schema';
import type { RouteDecision } from './policy.service';

interface ItemRow {
  id: string;
  edit_version: number;
}

export interface PolicyRepository {
  changePrivacy(
    itemId: string,
    input: PrivacyChangeInput,
    decision: RouteDecision,
    now: string,
  ): Promise<number>;
}

export class D1PolicyRepository implements PolicyRepository {
  constructor(private readonly database: D1Database) {}

  async changePrivacy(
    itemId: string,
    input: PrivacyChangeInput,
    decision: RouteDecision,
    now: string,
  ): Promise<number> {
    const item = await this.database
      .prepare(
        'SELECT id, edit_version FROM items WHERE id = ?1 AND deleted_at IS NULL',
      )
      .bind(itemId)
      .first<ItemRow>();
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');
    if (item.edit_version !== input.edit_version) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Item version conflict.');
    }

    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `UPDATE items
           SET privacy_level = ?1,
               title = CASE WHEN EXISTS (
                 SELECT 1 FROM item_field_overrides
                 WHERE item_id = ?4 AND field_name = 'title'
               ) THEN title ELSE NULL END,
               summary = CASE WHEN EXISTS (
                 SELECT 1 FROM item_field_overrides
                 WHERE item_id = ?4 AND field_name = 'summary'
               ) THEN summary ELSE NULL END,
               suggested_action = CASE WHEN EXISTS (
                 SELECT 1 FROM item_field_overrides
                 WHERE item_id = ?4 AND field_name = 'suggested_action'
               ) THEN suggested_action ELSE NULL END,
               processing_status = ?2,
               updated_at = ?3, edit_version = edit_version + 1
           WHERE id = ?4 AND edit_version = ?5 AND deleted_at IS NULL
           RETURNING edit_version`,
        )
        .bind(
          input.privacy_level,
          input.derived_data_action === 'reprocess' ? 'pending' : 'complete',
          now,
          itemId,
          input.edit_version,
        ),
      this.database
        .prepare('DELETE FROM processing_jobs WHERE item_id = ?1')
        .bind(itemId),
      this.database
        .prepare(
          `INSERT INTO audit_events (
             id, item_id, event_type, actor_type, details_json, created_at
           )
           SELECT ?1, ?2, 'privacy.changed', 'admin', ?3, ?4
           FROM items WHERE id = ?2 AND updated_at = ?4`,
        )
        .bind(
          crypto.randomUUID(),
          itemId,
          JSON.stringify({
            privacy_level: input.privacy_level,
            derived_data_action: input.derived_data_action,
            requested_provider: input.ai_provider ?? null,
            fallback_providers: decision.fallbackProviders,
            credential_source: decision.credentialSource,
            hosted_processing_consent: decision.hostedProcessingConsent,
            zero_data_retention_required: decision.zeroDataRetentionRequired,
            data_collection_denied: decision.dataCollectionDenied,
            policy_version: decision.policyVersion,
            prior_version: input.edit_version,
            new_version: input.edit_version + 1,
          }),
          now,
        ),
    ];

    if (input.derived_data_action === 'reprocess') {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO processing_jobs (
               id, item_id, job_type, status, available_at, created_at, updated_at,
               privacy_level_snapshot, provider_eligibility, policy_version,
               credential_source, hosted_processing_consent,
               zero_data_retention_required, data_collection_denied
             )
             SELECT ?1, ?2, 'enrich', 'pending', ?3, ?3, ?3, ?4, ?5, ?6,
                    ?7, ?8, ?9, ?10
             FROM items WHERE id = ?2 AND updated_at = ?3`,
          )
          .bind(
            crypto.randomUUID(),
            itemId,
            now,
            input.privacy_level,
            decision.provider,
            decision.policyVersion,
            decision.credentialSource,
            decision.hostedProcessingConsent ? 1 : 0,
            decision.zeroDataRetentionRequired ? 1 : 0,
            decision.dataCollectionDenied ? 1 : 0,
          ),
      );
    }

    const results = await this.database.batch<{ edit_version: number }>(
      statements,
    );
    const editVersion = results[0]?.results[0]?.edit_version;
    if (typeof editVersion !== 'number') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Item version conflict.');
    }
    return editVersion;
  }
}
