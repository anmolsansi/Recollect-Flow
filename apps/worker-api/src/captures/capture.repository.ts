import type { RouteDecision } from '../policy/policy.service';
import { AppError } from '../shared/errors';
import type { CaptureInput } from './capture.schema';

export interface StoredCapture {
  id: string;
  eventId: string;
  idempotencyKey: string;
  duplicateOf: string | null;
  privacyLevel: CaptureInput['privacy_level'];
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
}

export interface NewCapture extends CaptureInput {
  id: string;
  eventId: string;
  canonicalUrl: string | null;
  contentHash: string | null;
  duplicateOf: string | null;
  createdAt: string;
}

export interface CaptureRepository {
  findByIdempotencyKey(key: string): Promise<StoredCapture | null>;
  findCanonicalDuplicate(
    sourceUrl: string | null,
    canonicalUrl: string | null,
    contentHash: string | null,
  ): Promise<StoredCapture | null>;
  create(capture: NewCapture): Promise<StoredCapture>;
  scheduleProcessing(
    capture: StoredCapture,
    at: string,
    decision: RouteDecision,
  ): Promise<void>;
}

interface CaptureRow {
  id: string;
  event_id: string;
  idempotency_key: string;
  duplicate_of: string | null;
  privacy_level: CaptureInput['privacy_level'];
  processing_status: StoredCapture['processingStatus'];
}

interface AttachmentLinkRow {
  id: string;
  status: string;
  item_id: string | null;
  expires_at: string;
}

function toStoredCapture(row: CaptureRow): StoredCapture {
  return {
    id: row.id,
    eventId: row.event_id,
    idempotencyKey: row.idempotency_key,
    duplicateOf: row.duplicate_of,
    privacyLevel: row.privacy_level,
    processingStatus: row.processing_status,
  };
}

function deduplicationKeys(
  sourceUrl: string | null,
  canonicalUrl: string | null,
  contentHash: string | null,
): string[] {
  return [
    sourceUrl ? `source:${sourceUrl}` : null,
    canonicalUrl ? `canonical:${canonicalUrl}` : null,
    contentHash ? `content:${contentHash}` : null,
  ].filter((key): key is string => key !== null);
}

export class D1CaptureRepository implements CaptureRepository {
  constructor(private readonly database: D1Database) {}

  async findByIdempotencyKey(key: string): Promise<StoredCapture | null> {
    const row = await this.database
      .prepare(
        `SELECT i.id, e.id AS event_id, e.idempotency_key, e.duplicate_of,
                i.privacy_level, i.processing_status
         FROM capture_events e
         INNER JOIN items i ON i.id = e.item_id
         WHERE e.idempotency_key = ?1`,
      )
      .bind(key)
      .first<CaptureRow>();
    return row ? toStoredCapture(row) : null;
  }

  async findCanonicalDuplicate(
    sourceUrl: string | null,
    canonicalUrl: string | null,
    contentHash: string | null,
  ): Promise<StoredCapture | null> {
    const keys = deduplicationKeys(sourceUrl, canonicalUrl, contentHash);
    if (keys.length === 0) return null;

    const row = await this.database
      .prepare(
        `SELECT i.id, e.id AS event_id, e.idempotency_key,
                i.id AS duplicate_of, i.privacy_level, i.processing_status
         FROM item_deduplication_keys k
         INNER JOIN items i ON i.id = k.item_id
         INNER JOIN capture_events e ON e.item_id = i.id AND e.duplicate_of IS NULL
         WHERE k.deduplication_key IN (?1, ?2, ?3)
         ORDER BY i.created_at ASC
         LIMIT 1`,
      )
      .bind(keys[0] ?? null, keys[1] ?? null, keys[2] ?? null)
      .first<CaptureRow>();

    return row ? toStoredCapture(row) : null;
  }

  private async requireLinkableAttachment(
    attachmentId: string | undefined,
    now: string,
  ): Promise<void> {
    if (!attachmentId) return;

    const attachment = await this.database
      .prepare(
        'SELECT id, status, item_id, expires_at FROM attachments WHERE id = ?1',
      )
      .bind(attachmentId)
      .first<AttachmentLinkRow>();

    if (!attachment) {
      throw new AppError(404, 'NOT_FOUND', 'Attachment not found.');
    }
    if (attachment.status !== 'finalized' || attachment.item_id) {
      throw new AppError(
        409,
        'CONFLICT',
        'Attachment must be finalized and unlinked before capture.',
      );
    }
    if (attachment.expires_at <= now) {
      throw new AppError(409, 'UPLOAD_EXPIRED', 'Attachment upload expired.');
    }
  }

  async create(capture: NewCapture): Promise<StoredCapture> {
    await this.requireLinkableAttachment(
      capture.attachment_id,
      capture.createdAt,
    );

    const itemId = capture.duplicateOf ?? capture.id;
    const keys = deduplicationKeys(
      capture.url ?? null,
      capture.canonicalUrl,
      capture.contentHash,
    );
    const statements: D1PreparedStatement[] = [];

    if (!capture.duplicateOf) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO items (
              id, idempotency_key, source_type, source_app, source_url,
              canonical_url, raw_text, user_note, quick_category, privacy_level,
              content_hash, captured_at, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)`,
          )
          .bind(
            capture.id,
            capture.idempotency_key,
            capture.source_type,
            capture.source_app,
            capture.url ?? null,
            capture.canonicalUrl,
            capture.shared_text ?? null,
            capture.user_reason ?? null,
            capture.quick_category ?? null,
            capture.privacy_level,
            capture.contentHash,
            capture.captured_at,
            capture.createdAt,
          ),
      );
    }

    statements.push(
      this.database
        .prepare(
          `INSERT INTO capture_events (
            id, item_id, idempotency_key, duplicate_of, source_type, source_app,
            source_url, raw_text, user_note, quick_category, privacy_level,
            attachment_id, captured_at, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
        )
        .bind(
          capture.eventId,
          itemId,
          capture.idempotency_key,
          capture.duplicateOf,
          capture.source_type,
          capture.source_app,
          capture.url ?? null,
          capture.shared_text ?? null,
          capture.user_reason ?? null,
          capture.quick_category ?? null,
          capture.privacy_level,
          capture.attachment_id ?? null,
          capture.captured_at,
          capture.createdAt,
        ),
    );

    for (const key of keys) {
      statements.push(
        this.database
          .prepare(
            `${capture.duplicateOf ? 'INSERT OR IGNORE' : 'INSERT'} INTO item_deduplication_keys (
              deduplication_key, item_id, created_at
            ) VALUES (?1, ?2, ?3)`,
          )
          .bind(key, itemId, capture.createdAt),
      );
    }

    await this.database.batch(statements);

    return {
      id: itemId,
      eventId: capture.eventId,
      idempotencyKey: capture.idempotency_key,
      duplicateOf: capture.duplicateOf,
      privacyLevel: capture.privacy_level,
      processingStatus: 'pending',
    };
  }

  async scheduleProcessing(
    capture: StoredCapture,
    at: string,
    decision: RouteDecision,
  ): Promise<void> {
    const statements = [
      this.database
        .prepare(
          `INSERT INTO audit_events (
            id, item_id, event_type, actor_type, details_json, created_at
          ) VALUES (?1, ?2, 'capture.saved', 'client', ?3, ?4)`,
        )
        .bind(
          crypto.randomUUID(),
          capture.id,
          JSON.stringify({ capture_event_id: capture.eventId }),
          at,
        ),
    ];

    if (!capture.duplicateOf) {
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
            capture.id,
            at,
            capture.privacyLevel,
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
