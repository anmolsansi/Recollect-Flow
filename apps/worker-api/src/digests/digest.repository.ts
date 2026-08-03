import type { DigestType } from './digest-period';
import type {
  DigestAuditEvent,
  DigestDelivery,
  DigestDeliveryState,
  DigestItemRow,
  DigestReviewStatus,
  DigestRun,
} from './digest.types';

interface DigestRunRow {
  id: string;
  digest_type: DigestType;
  period_start: string;
  period_end: string;
  timezone: string;
  selector_version: string;
  generation_version: number;
  source_snapshot_at: string;
  canonical_payload_json: string;
  content_hash: string;
  deterministic_text: string;
  ai_text: string | null;
  generation_source: 'deterministic' | 'ai';
  ai_provider: string | null;
  ai_model: string | null;
  ai_latency_ms: number | null;
  ai_input_units: number | null;
  ai_output_units: number | null;
  ai_failure_code: string | null;
  review_status: DigestReviewStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DigestDeliveryRow {
  id: string;
  digest_run_id: string;
  destination: 'telegram';
  state: DigestDeliveryState;
  attempts: number;
  available_at: string;
  lease_owner: string | null;
  lease_expires_at: string | null;
  last_error_code: string | null;
  telegram_message_id: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DigestAuditRow {
  id: string;
  digest_run_id: string;
  event_type: string;
  actor_type: string;
  details_json: string;
  created_at: string;
}

interface CurrentItemDatabaseRow {
  id: string;
  title: string | null;
  privacy_level: DigestItemRow['privacyLevel'];
  topics_json: string;
  importance: number | null;
  project: string | null;
  suggested_action: string | null;
  lifecycle_status: string;
  captured_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewDigestRun {
  id: string;
  digestType: DigestType;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  selectorVersion: string;
  generationVersion: number;
  sourceSnapshotAt: string;
  canonicalPayloadJson: string;
  contentHash: string;
  deterministicText: string;
  aiText: string | null;
  generationSource: 'deterministic' | 'ai';
  aiProvider: string | null;
  aiModel: string | null;
  aiLatencyMs: number | null;
  aiInputUnits: number | null;
  aiOutputUnits: number | null;
  aiFailureCode: string | null;
  createdAt: string;
}

function runFromRow(row: DigestRunRow): DigestRun {
  return {
    id: row.id,
    digestType: row.digest_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    timezone: row.timezone,
    selectorVersion: row.selector_version,
    generationVersion: row.generation_version,
    sourceSnapshotAt: row.source_snapshot_at,
    canonicalPayloadJson: row.canonical_payload_json,
    contentHash: row.content_hash,
    deterministicText: row.deterministic_text,
    aiText: row.ai_text,
    generationSource: row.generation_source,
    aiProvider: row.ai_provider,
    aiModel: row.ai_model,
    aiLatencyMs: row.ai_latency_ms,
    aiInputUnits: row.ai_input_units,
    aiOutputUnits: row.ai_output_units,
    aiFailureCode: row.ai_failure_code,
    reviewStatus: row.review_status,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deliveryFromRow(row: DigestDeliveryRow): DigestDelivery {
  return {
    id: row.id,
    digestRunId: row.digest_run_id,
    destination: row.destination,
    state: row.state,
    attempts: row.attempts,
    availableAt: row.available_at,
    leaseOwner: row.lease_owner,
    leaseExpiresAt: row.lease_expires_at,
    lastErrorCode: row.last_error_code,
    telegramMessageId: row.telegram_message_id,
    sentAt: row.sent_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function auditFromRow(row: DigestAuditRow): DigestAuditEvent {
  return {
    id: row.id,
    digestRunId: row.digest_run_id,
    eventType: row.event_type,
    actorType: row.actor_type,
    detailsJson: row.details_json,
    createdAt: row.created_at,
  };
}

function itemFromRow(row: CurrentItemDatabaseRow): DigestItemRow {
  return {
    id: row.id,
    title: row.title,
    privacyLevel: row.privacy_level,
    topicsJson: row.topics_json,
    importance: row.importance,
    project: row.project,
    suggestedAction: row.suggested_action,
    lifecycleStatus: row.lifecycle_status,
    capturedAt: row.captured_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class DigestRepository {
  constructor(private readonly db: D1Database) {}

  async nextGenerationVersion(
    digestType: DigestType,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(MAX(generation_version), 0) AS version
         FROM digest_runs
         WHERE digest_type = ?1 AND period_start = ?2 AND period_end = ?3`,
      )
      .bind(digestType, periodStart, periodEnd)
      .first<{ version: number }>();
    return (row?.version ?? 0) + 1;
  }

  async findRun(
    digestType: DigestType,
    periodStart: string,
    periodEnd: string,
    generationVersion?: number,
  ): Promise<DigestRun | null> {
    const row = generationVersion
      ? await this.db
          .prepare(
            `SELECT * FROM digest_runs
             WHERE digest_type = ?1 AND period_start = ?2 AND period_end = ?3
               AND generation_version = ?4`,
          )
          .bind(digestType, periodStart, periodEnd, generationVersion)
          .first<DigestRunRow>()
      : await this.db
          .prepare(
            `SELECT * FROM digest_runs
             WHERE digest_type = ?1 AND period_start = ?2 AND period_end = ?3
             ORDER BY generation_version DESC LIMIT 1`,
          )
          .bind(digestType, periodStart, periodEnd)
          .first<DigestRunRow>();
    return row ? runFromRow(row) : null;
  }

  async getRun(id: string): Promise<DigestRun | null> {
    const row = await this.db
      .prepare('SELECT * FROM digest_runs WHERE id = ?1')
      .bind(id)
      .first<DigestRunRow>();
    return row ? runFromRow(row) : null;
  }

  async insertRun(input: NewDigestRun): Promise<DigestRun> {
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO digest_runs (
           id, digest_type, period_start, period_end, timezone,
           selector_version, generation_version, source_snapshot_at,
           canonical_payload_json, content_hash, deterministic_text, ai_text,
           generation_source, ai_provider, ai_model, ai_latency_ms,
           ai_input_units, ai_output_units, ai_failure_code, review_status,
           created_at, updated_at
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
           ?13, ?14, ?15, ?16, ?17, ?18, ?19, 'generated', ?20, ?20
         )`,
      )
      .bind(
        input.id,
        input.digestType,
        input.periodStart,
        input.periodEnd,
        input.timezone,
        input.selectorVersion,
        input.generationVersion,
        input.sourceSnapshotAt,
        input.canonicalPayloadJson,
        input.contentHash,
        input.deterministicText,
        input.aiText,
        input.generationSource,
        input.aiProvider,
        input.aiModel,
        input.aiLatencyMs,
        input.aiInputUnits,
        input.aiOutputUnits,
        input.aiFailureCode,
        input.createdAt,
      )
      .run();

    const stored = await this.findRun(
      input.digestType,
      input.periodStart,
      input.periodEnd,
      input.generationVersion,
    );
    if (!stored) throw new Error('Digest run could not be persisted');
    return stored;
  }

  async listDeliveries(digestRunId: string): Promise<DigestDelivery[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM digest_deliveries
         WHERE digest_run_id = ?1 ORDER BY created_at DESC, id DESC`,
      )
      .bind(digestRunId)
      .all<DigestDeliveryRow>();
    return (rows.results ?? []).map(deliveryFromRow);
  }

  async listAudit(digestRunId: string): Promise<DigestAuditEvent[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM digest_audit_events
         WHERE digest_run_id = ?1 ORDER BY created_at DESC, id DESC`,
      )
      .bind(digestRunId)
      .all<DigestAuditRow>();
    return (rows.results ?? []).map(auditFromRow);
  }

  async writeAudit(
    digestRunId: string,
    eventType: string,
    actorType: string,
    details: Record<string, unknown>,
    now: Date = new Date(),
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO digest_audit_events
         (id, digest_run_id, event_type, actor_type, details_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        digestRunId,
        eventType,
        actorType,
        JSON.stringify(details),
        now.toISOString(),
      )
      .run();
  }

  async queueTelegramDelivery(
    digestRunId: string,
    now: Date = new Date(),
    skippedErrorCode?: string,
  ): Promise<DigestDelivery> {
    const nowIso = now.toISOString();
    const state: DigestDeliveryState = skippedErrorCode ? 'skipped' : 'pending';
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO digest_deliveries (
           id, digest_run_id, destination, state, attempts, available_at,
           last_error_code, completed_at, created_at, updated_at
         ) VALUES (?1, ?2, 'telegram', ?3, 0, ?4, ?5, ?6, ?4, ?4)`,
      )
      .bind(
        crypto.randomUUID(),
        digestRunId,
        state,
        nowIso,
        skippedErrorCode ?? null,
        skippedErrorCode ? nowIso : null,
      )
      .run();
    const row = await this.db
      .prepare(
        `SELECT * FROM digest_deliveries
         WHERE digest_run_id = ?1 AND destination = 'telegram'`,
      )
      .bind(digestRunId)
      .first<DigestDeliveryRow>();
    if (!row) throw new Error('Digest delivery could not be persisted');
    return deliveryFromRow(row);
  }

  async leaseTelegramDeliveries(
    ownerId: string,
    ttlMinutes = 2,
    limit = 10,
    now: Date = new Date(),
  ): Promise<DigestDelivery[]> {
    const nowIso = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + ttlMinutes * 60_000,
    ).toISOString();
    const rows = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = 'leased', lease_owner = ?1, lease_expires_at = ?2,
             attempts = attempts + 1, updated_at = ?3
         WHERE id IN (
           SELECT id FROM digest_deliveries
           WHERE destination = 'telegram'
             AND (
               (state = 'pending' AND available_at <= ?3)
               OR (state = 'leased' AND lease_expires_at IS NOT NULL
                   AND lease_expires_at <= ?3)
             )
           ORDER BY available_at ASC, created_at ASC, id ASC
           LIMIT ?4
         )
         RETURNING *`,
      )
      .bind(ownerId, expiresAt, nowIso, limit)
      .all<DigestDeliveryRow>();
    return (rows.results ?? []).map(deliveryFromRow);
  }

  async markDeliverySent(
    deliveryId: string,
    ownerId: string,
    telegramMessageId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = 'sent', telegram_message_id = ?1, sent_at = ?2,
             completed_at = ?2, lease_owner = NULL, lease_expires_at = NULL,
             last_error_code = NULL, updated_at = ?2
         WHERE id = ?3 AND state = 'leased' AND lease_owner = ?4
           AND lease_expires_at > ?2`,
      )
      .bind(telegramMessageId, nowIso, deliveryId, ownerId)
      .run();
    return result.meta.changes === 1;
  }

  async markDeliveryRetry(
    deliveryId: string,
    ownerId: string,
    errorCode: string,
    availableAt: Date,
    now: Date = new Date(),
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = 'pending', available_at = ?1, last_error_code = ?2,
             lease_owner = NULL, lease_expires_at = NULL, updated_at = ?3
         WHERE id = ?4 AND state = 'leased' AND lease_owner = ?5`,
      )
      .bind(
        availableAt.toISOString(),
        errorCode,
        now.toISOString(),
        deliveryId,
        ownerId,
      )
      .run();
    return result.meta.changes === 1;
  }

  async markDeliveryTerminal(
    deliveryId: string,
    ownerId: string,
    state: 'failed' | 'unknown' | 'skipped',
    errorCode: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = ?1, last_error_code = ?2, completed_at = ?3,
             lease_owner = NULL, lease_expires_at = NULL, updated_at = ?3
         WHERE id = ?4 AND state = 'leased' AND lease_owner = ?5`,
      )
      .bind(state, errorCode, nowIso, deliveryId, ownerId)
      .run();
    return result.meta.changes === 1;
  }

  async markReviewed(
    digestRunId: string,
    reviewedBy: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_runs
         SET review_status = 'reviewed', reviewed_at = ?1, reviewed_by = ?2,
             updated_at = ?1
         WHERE id = ?3 AND review_status = 'generated'`,
      )
      .bind(nowIso, reviewedBy, digestRunId)
      .run();
    return result.meta.changes === 1;
  }

  async retryFailedDelivery(
    deliveryId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = 'pending', available_at = ?1, completed_at = NULL,
             last_error_code = NULL, lease_owner = NULL, lease_expires_at = NULL,
             updated_at = ?1
         WHERE id = ?2 AND state = 'failed'`,
      )
      .bind(nowIso, deliveryId)
      .run();
    return result.meta.changes === 1;
  }

  async reconcileUnknownDelivery(
    deliveryId: string,
    state: 'sent' | 'failed',
    telegramMessageId: string | null,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = ?1, telegram_message_id = ?2,
             sent_at = CASE WHEN ?1 = 'sent' THEN ?3 ELSE sent_at END,
             completed_at = ?3,
             last_error_code = CASE WHEN ?1 = 'failed'
               THEN 'RECONCILED_FAILED' ELSE NULL END,
             updated_at = ?3
         WHERE id = ?4 AND state = 'unknown'`,
      )
      .bind(state, telegramMessageId, nowIso, deliveryId)
      .run();
    return result.meta.changes === 1;
  }

  async cancelDelivery(
    deliveryId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const nowIso = now.toISOString();
    const result = await this.db
      .prepare(
        `UPDATE digest_deliveries
         SET state = 'skipped', last_error_code = 'CANCELLED_BY_OPERATOR',
             completed_at = ?1, lease_owner = NULL, lease_expires_at = NULL,
             updated_at = ?1
         WHERE id = ?2 AND state IN ('pending', 'failed')`,
      )
      .bind(nowIso, deliveryId)
      .run();
    return result.meta.changes === 1;
  }

  async getDelivery(id: string): Promise<DigestDelivery | null> {
    const row = await this.db
      .prepare('SELECT * FROM digest_deliveries WHERE id = ?1')
      .bind(id)
      .first<DigestDeliveryRow>();
    return row ? deliveryFromRow(row) : null;
  }

  async loadCurrentItems(itemIds: readonly string[]): Promise<DigestItemRow[]> {
    const uniqueIds = [...new Set(itemIds)].filter(Boolean);
    if (uniqueIds.length === 0) return [];
    const items: DigestItemRow[] = [];
    for (let offset = 0; offset < uniqueIds.length; offset += 80) {
      const chunk = uniqueIds.slice(offset, offset + 80);
      const placeholders = chunk.map(() => '?').join(', ');
      const rows = await this.db
        .prepare(
          `SELECT id, title, privacy_level, topics_json, importance, project,
                  suggested_action, lifecycle_status, captured_at, updated_at, deleted_at
           FROM items WHERE id IN (${placeholders})`,
        )
        .bind(...chunk)
        .all<CurrentItemDatabaseRow>();
      items.push(...(rows.results ?? []).map(itemFromRow));
    }
    return items;
  }
}
