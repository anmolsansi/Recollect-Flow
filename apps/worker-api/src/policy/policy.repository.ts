import { AppError } from '../shared/errors';
import type { PrivacyChangeInput } from './policy.schema';
import type { RouteDecision } from './policy.service';

interface ItemRow {
  id: string;
}

export interface PolicyRepository {
  changePrivacy(
    itemId: string,
    input: PrivacyChangeInput,
    decision: RouteDecision,
    now: string,
  ): Promise<void>;
}

export class D1PolicyRepository implements PolicyRepository {
  constructor(private readonly database: D1Database) {}

  async changePrivacy(
    itemId: string,
    input: PrivacyChangeInput,
    decision: RouteDecision,
    now: string,
  ): Promise<void> {
    const item = await this.database
      .prepare('SELECT id FROM items WHERE id = ?1 AND deleted_at IS NULL')
      .bind(itemId)
      .first<ItemRow>();
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found.');

    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `UPDATE items
           SET privacy_level = ?1, title = NULL, notion_page_id = NULL,
               processing_status = ?2, updated_at = ?3
           WHERE id = ?4`,
        )
        .bind(
          input.privacy_level,
          input.derived_data_action === 'reprocess' ? 'pending' : 'complete',
          now,
          itemId,
        ),
      this.database
        .prepare('DELETE FROM processing_jobs WHERE item_id = ?1')
        .bind(itemId),
      this.database
        .prepare(
          `INSERT INTO audit_events (
            id, item_id, event_type, actor_type, details_json, created_at
          ) VALUES (?1, ?2, 'privacy.changed', 'admin', ?3, ?4)`,
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
            ) VALUES (
              ?1, ?2, 'enrich', 'pending', ?3, ?3, ?3, ?4, ?5, ?6,
              ?7, ?8, ?9, ?10
            )`,
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

    await this.database.batch(statements);
  }
}
