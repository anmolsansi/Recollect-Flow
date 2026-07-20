export type AttachmentStatus =
  'pending' | 'uploaded' | 'finalized' | 'linked' | 'orphaned' | 'deleted';

export interface StoredAttachment {
  id: string;
  itemId: string | null;
  r2Key: string;
  status: AttachmentStatus;
  fileName: string;
  declaredContentType: string;
  detectedContentType: string | null;
  sizeBytes: number;
  contentHash: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewAttachment {
  id: string;
  r2Key: string;
  fileName: string;
  declaredContentType: string;
  sizeBytes: number;
  contentHash?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AttachmentUsage {
  status: AttachmentStatus;
  objectCount: number;
  bytes: number;
}

export interface AttachmentRepository {
  create(attachment: NewAttachment): Promise<StoredAttachment>;
  findById(id: string): Promise<StoredAttachment | null>;
  findByItemId(itemId: string): Promise<StoredAttachment[]>;
  markUploaded(
    id: string,
    hash: string,
    detectedType: string,
    at: string,
  ): Promise<void>;
  markFinalized(id: string, at: string): Promise<void>;
  findExpiredOrphans(now: string, limit: number): Promise<StoredAttachment[]>;
  markOrphaned(id: string, at: string): Promise<void>;
  markDeleted(id: string, at: string): Promise<void>;
  usage(): Promise<AttachmentUsage[]>;
}

interface AttachmentRow {
  id: string;
  item_id: string | null;
  object_key: string;
  status: AttachmentStatus;
  file_name: string;
  declared_content_type: string;
  detected_content_type: string | null;
  size_bytes: number;
  content_hash: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface UsageRow {
  status: AttachmentStatus;
  object_count: number;
  bytes: number;
}

function toStoredAttachment(row: AttachmentRow): StoredAttachment {
  return {
    id: row.id,
    itemId: row.item_id,
    r2Key: row.object_key,
    status: row.status,
    fileName: row.file_name,
    declaredContentType: row.declared_content_type,
    detectedContentType: row.detected_content_type,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class D1AttachmentRepository implements AttachmentRepository {
  constructor(private readonly database: D1Database) {}

  async create(attachment: NewAttachment): Promise<StoredAttachment> {
    await this.database
      .prepare(
        `INSERT INTO attachments (
          id, item_id, object_key, status, file_name, declared_content_type,
          detected_content_type, size_bytes, content_hash, expires_at,
          created_at, updated_at
        ) VALUES (?1, NULL, ?2, 'pending', ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?8)`,
      )
      .bind(
        attachment.id,
        attachment.r2Key,
        attachment.fileName,
        attachment.declaredContentType,
        attachment.sizeBytes,
        attachment.contentHash ?? null,
        attachment.expiresAt,
        attachment.createdAt,
      )
      .run();

    return {
      id: attachment.id,
      itemId: null,
      r2Key: attachment.r2Key,
      status: 'pending',
      fileName: attachment.fileName,
      declaredContentType: attachment.declaredContentType,
      detectedContentType: null,
      sizeBytes: attachment.sizeBytes,
      contentHash: attachment.contentHash ?? null,
      expiresAt: attachment.expiresAt,
      createdAt: attachment.createdAt,
      updatedAt: attachment.createdAt,
    };
  }

  async findById(id: string): Promise<StoredAttachment | null> {
    const row = await this.database
      .prepare(
        `SELECT id, item_id, object_key, status, file_name,
                declared_content_type, detected_content_type, size_bytes,
                content_hash, expires_at, created_at, updated_at
         FROM attachments WHERE id = ?1`,
      )
      .bind(id)
      .first<AttachmentRow>();
    return row ? toStoredAttachment(row) : null;
  }

  async findByItemId(itemId: string): Promise<StoredAttachment[]> {
    const result = await this.database
      .prepare(
        `SELECT id, item_id, object_key, status, file_name,
                declared_content_type, detected_content_type, size_bytes,
                content_hash, expires_at, created_at, updated_at
         FROM attachments
         WHERE item_id = ?1 AND status != 'deleted'
         ORDER BY created_at ASC`,
      )
      .bind(itemId)
      .all<AttachmentRow>();
    return result.results.map(toStoredAttachment);
  }

  async markUploaded(
    id: string,
    hash: string,
    detectedType: string,
    at: string,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE attachments
         SET status = 'uploaded', content_hash = ?1, detected_content_type = ?2,
             uploaded_at = ?3, updated_at = ?3
         WHERE id = ?4 AND status = 'pending'`,
      )
      .bind(hash, detectedType, at, id)
      .run();
  }

  async markFinalized(id: string, at: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE attachments
         SET status = 'finalized', finalized_at = COALESCE(finalized_at, ?1),
             updated_at = ?1
         WHERE id = ?2 AND status IN ('uploaded', 'finalized')`,
      )
      .bind(at, id)
      .run();
  }

  async findExpiredOrphans(
    now: string,
    limit: number,
  ): Promise<StoredAttachment[]> {
    const result = await this.database
      .prepare(
        `SELECT id, item_id, object_key, status, file_name,
                declared_content_type, detected_content_type, size_bytes,
                content_hash, expires_at, created_at, updated_at
         FROM attachments
         WHERE item_id IS NULL
           AND status IN ('pending', 'uploaded', 'finalized')
           AND expires_at <= ?1
         ORDER BY expires_at ASC
         LIMIT ?2`,
      )
      .bind(now, limit)
      .all<AttachmentRow>();
    return result.results.map(toStoredAttachment);
  }

  async markOrphaned(id: string, at: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE attachments
         SET status = 'orphaned', deleted_at = ?1, updated_at = ?1
         WHERE id = ?2 AND item_id IS NULL
           AND status IN ('pending', 'uploaded', 'finalized', 'orphaned')`,
      )
      .bind(at, id)
      .run();
  }

  async markDeleted(id: string, at: string): Promise<void> {
    await this.database
      .prepare(
        `UPDATE attachments
         SET status = 'deleted', deleted_at = COALESCE(deleted_at, ?1),
             updated_at = ?1
         WHERE id = ?2 AND status != 'deleted'`,
      )
      .bind(at, id)
      .run();
  }

  async usage(): Promise<AttachmentUsage[]> {
    const result = await this.database
      .prepare(
        `SELECT status, COUNT(*) AS object_count,
                COALESCE(SUM(size_bytes), 0) AS bytes
         FROM attachments
         WHERE status NOT IN ('orphaned', 'deleted')
         GROUP BY status
         ORDER BY status`,
      )
      .all<UsageRow>();
    return result.results.map((row) => ({
      status: row.status,
      objectCount: row.object_count,
      bytes: row.bytes,
    }));
  }
}
