import type {
  Bg29NotionPageRecord,
  Bg29NotionRequestRecord,
} from './bg29-staging-notion';

/**
 * These tables live ONLY in an isolated BG-29 staging D1 database.
 * Provisioning is a separate explicit operation; normal Cron runs fail closed
 * if the schema is absent. No production migration or Wrangler config changes.
 */
export async function provisionBg29StagingNotionSchema(db: D1Database): Promise<void> {
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS bg29_mock_notion_pages (capture_id TEXT PRIMARY KEY, page_id TEXT NOT NULL UNIQUE, projection_version INTEGER NOT NULL, projection_hash TEXT NOT NULL, create_count INTEGER NOT NULL, update_count INTEGER NOT NULL)"
  ).run();
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS bg29_mock_notion_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, path TEXT NOT NULL, capture_id TEXT, status INTEGER NOT NULL, projection_version INTEGER, projection_hash TEXT)"
  ).run();
  await db.prepare(
    "CREATE TABLE IF NOT EXISTS bg29_mock_failure_injections (fault_key TEXT PRIMARY KEY, consumed_at TEXT NOT NULL)"
  ).run();
}

export async function assertBg29StagingNotionSchema(db: D1Database): Promise<void> {
  try {
    await db.prepare("SELECT capture_id FROM bg29_mock_notion_pages LIMIT 1").first();
    await db.prepare("SELECT id FROM bg29_mock_notion_requests LIMIT 1").first();
    await db.prepare("SELECT fault_key FROM bg29_mock_failure_injections LIMIT 1").first();
  } catch {
    throw new Error('BG29_STAGING_DURABLE_SCHEMA_REQUIRED');
  }
}

interface PageRow {
  capture_id: string;
  page_id: string;
  projection_version: number;
  projection_hash: string;
  create_count: number;
  update_count: number;
}

interface RequestRow {
  method: string;
  path: string;
  capture_id: string | null;
  status: number;
  projection_version: number | null;
  projection_hash: string | null;
}

function page(row: PageRow): Bg29NotionPageRecord {
  return {
    captureId: row.capture_id,
    pageId: row.page_id,
    projectionVersion: row.projection_version,
    projectionHash: row.projection_hash,
    createCount: row.create_count,
    updateCount: row.update_count,
  };
}

export function createBg29DurableNotionStore(db: D1Database) {
  return Object.freeze({
    async byCaptureId(id: string): Promise<Bg29NotionPageRecord | null> {
      const row = await db.prepare(
        "SELECT * FROM bg29_mock_notion_pages WHERE capture_id = ?1"
      ).bind(id).first<PageRow>();
      return row ? page(row) : null;
    },
    async byPageId(id: string): Promise<Bg29NotionPageRecord | null> {
      const row = await db.prepare(
        "SELECT * FROM bg29_mock_notion_pages WHERE page_id = ?1"
      ).bind(id).first<PageRow>();
      return row ? page(row) : null;
    },
    async create(value: Bg29NotionPageRecord): Promise<boolean> {
      const result = await db.prepare(
        "INSERT OR IGNORE INTO bg29_mock_notion_pages (capture_id, page_id, projection_version, projection_hash, create_count, update_count) VALUES (?1, ?2, ?3, ?4, 1, 0)"
      ).bind(value.captureId, value.pageId, value.projectionVersion, value.projectionHash).run();
      return result.meta.changes === 1;
    },
    async update(value: Bg29NotionPageRecord, version: number, hash: string): Promise<boolean> {
      // A stale isolated Worker must not roll a newer mock projection back.
      const result = await db.prepare(
        "UPDATE bg29_mock_notion_pages SET projection_version = ?1, projection_hash = ?2, update_count = update_count + 1 WHERE capture_id = ?3 AND page_id = ?4 AND projection_version <= ?1"
      ).bind(version, hash, value.captureId, value.pageId).run();
      return result.meta.changes === 1;
    },
    async record(entry: Bg29NotionRequestRecord): Promise<void> {
      await db.prepare(
        "INSERT INTO bg29_mock_notion_requests (method, path, capture_id, status, projection_version, projection_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
      ).bind(entry.method, entry.path, entry.captureId, entry.status, entry.projectionVersion, entry.projectionHash).run();
    },
    async claimFaultOnce(key: string): Promise<boolean> {
      const result = await db.prepare(
        "INSERT OR IGNORE INTO bg29_mock_failure_injections (fault_key, consumed_at) VALUES (?1, ?2)"
      ).bind(key, new Date().toISOString()).run();
      return result.meta.changes === 1;
    },
    async pages(): Promise<Bg29NotionPageRecord[]> {
      const rows = await db.prepare(
        "SELECT * FROM bg29_mock_notion_pages ORDER BY capture_id"
      ).all<PageRow>();
      return rows.results.map(page);
    },
    async requests(): Promise<Bg29NotionRequestRecord[]> {
      const rows = await db.prepare(
        "SELECT method, path, capture_id, status, projection_version, projection_hash FROM bg29_mock_notion_requests ORDER BY id"
      ).all<RequestRow>();
      return rows.results.map((row) => ({
        method: row.method,
        path: row.path,
        captureId: row.capture_id,
        status: row.status,
        projectionVersion: row.projection_version,
        projectionHash: row.projection_hash,
      }));
    },
  });
}
