import type { CaptureInput } from './capture.schema';

export interface StoredCapture {
  id: string;
  idempotencyKey: string;
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
}

export interface NewCapture extends CaptureInput {
  id: string;
  canonicalUrl: string | null;
  createdAt: string;
}

export interface CaptureRepository {
  findByIdempotencyKey(key: string): Promise<StoredCapture | null>;
  create(capture: NewCapture): Promise<StoredCapture>;
  scheduleProcessing(capture: StoredCapture, at: string): Promise<void>;
}

interface CaptureRow {
  id: string;
  idempotency_key: string;
  processing_status: StoredCapture['processingStatus'];
}

function toStoredCapture(row: CaptureRow): StoredCapture {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    processingStatus: row.processing_status,
  };
}

export class D1CaptureRepository implements CaptureRepository {
  constructor(private readonly database: D1Database) {}

  async findByIdempotencyKey(key: string): Promise<StoredCapture | null> {
    const row = await this.database
      .prepare(
        'SELECT id, idempotency_key, processing_status FROM items WHERE idempotency_key = ?1',
      )
      .bind(key)
      .first<CaptureRow>();
    return row ? toStoredCapture(row) : null;
  }

  async create(capture: NewCapture): Promise<StoredCapture> {
    await this.database
      .prepare(
        `INSERT INTO items (
          id, idempotency_key, source_type, source_app, source_url,
          canonical_url, raw_text, user_note, quick_category, privacy_level,
          captured_at, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
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
        capture.captured_at,
        capture.createdAt,
      )
      .run();

    return {
      id: capture.id,
      idempotencyKey: capture.idempotency_key,
      processingStatus: 'pending',
    };
  }

  async scheduleProcessing(capture: StoredCapture, at: string): Promise<void> {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO processing_jobs (
            id, item_id, job_type, status, available_at, created_at, updated_at
          ) VALUES (?1, ?2, 'enrich', 'pending', ?3, ?3, ?3)`,
        )
        .bind(crypto.randomUUID(), capture.id, at),
      this.database
        .prepare(
          `INSERT INTO audit_events (
            id, item_id, event_type, actor_type, details_json, created_at
          ) VALUES (?1, ?2, 'capture.saved', 'client', '{}', ?3)`,
        )
        .bind(crypto.randomUUID(), capture.id, at),
    ]);
  }
}
