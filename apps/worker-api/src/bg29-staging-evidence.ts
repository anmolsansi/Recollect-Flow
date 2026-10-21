/**
 * BG-29.078 staging-only evidence. Explicitly provision this schema in the
 * isolated staging D1; NEVER add it to the production migration chain.
 *
 * Sweep IDs are local correlation IDs, NOT authenticated Cloudflare event IDs.
 * Snapshots from manual/local scheduling cannot satisfy real-hour AC-09.
 */
export async function provisionBg29StagingEvidenceSchema(
  db: D1Database,
): Promise<void> {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS bg29_evidence_sweeps (id TEXT PRIMARY KEY, cron TEXT NOT NULL, scheduled_at TEXT NOT NULL, observed_at TEXT NOT NULL)',
    )
    .run();
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS bg29_evidence_stages (id INTEGER PRIMARY KEY AUTOINCREMENT, sweep_id TEXT NOT NULL, stage TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT NOT NULL, outcome TEXT NOT NULL)',
    )
    .run();
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS bg29_evidence_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, sweep_id TEXT NOT NULL, phase TEXT NOT NULL, recorded_at TEXT NOT NULL, original_count INTEGER NOT NULL, oldest_eligible_at TEXT, oldest_age_ms INTEGER, status_matrix_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL)',
    )
    .run();
}

interface QueueCount {
  type: string;
  status: string;
  total: number;
}

interface QueueClock {
  status: string;
  available_at: string | null;
  lease_expires_at: string | null;
}

interface IdRow {
  id: string;
}

async function ids(db: D1Database, sql: string): Promise<string[]> {
  const rows = await db.prepare(sql).all<IdRow>();
  return rows.results.map((row) => row.id).sort();
}

export function createBg29StagingEvidenceLedger(db: D1Database) {
  return Object.freeze({
    async start(cron: string, scheduledTime: number): Promise<string> {
      if (!Number.isFinite(scheduledTime))
        throw new Error('BG29_EVIDENCE_BAD_SCHEDULE_TIME');
      try {
        await db.prepare('SELECT id FROM bg29_evidence_sweeps LIMIT 1').first();
        await db.prepare('SELECT id FROM bg29_evidence_stages LIMIT 1').first();
        await db
          .prepare('SELECT id FROM bg29_evidence_snapshots LIMIT 1')
          .first();
      } catch {
        throw new Error('BG29_STAGING_EVIDENCE_SCHEMA_REQUIRED');
      }
      const id = crypto.randomUUID();
      await db
        .prepare(
          'INSERT INTO bg29_evidence_sweeps (id, cron, scheduled_at, observed_at) VALUES (?1, ?2, ?3, ?4)',
        )
        .bind(
          id,
          cron,
          new Date(scheduledTime).toISOString(),
          new Date().toISOString(),
        )
        .run();
      return id;
    },

    async stage(
      sweepId: string,
      name: string,
      startedAt: Date,
      outcome: 'fulfilled' | 'rejected',
    ): Promise<void> {
      if (!['extract', 'acquire_url', 'enrich', 'notion'].includes(name))
        throw new Error('BG29_EVIDENCE_UNKNOWN_STAGE');
      await db
        .prepare(
          'INSERT INTO bg29_evidence_stages (sweep_id, stage, started_at, finished_at, outcome) VALUES (?1, ?2, ?3, ?4, ?5)',
        )
        .bind(
          sweepId,
          name,
          startedAt.toISOString(),
          new Date().toISOString(),
          outcome,
        )
        .run();
    },

    async snapshot(sweepId: string, phase: 'before' | 'after'): Promise<void> {
      const now = new Date();
      const queues = await db
        .prepare(
          "SELECT job_type AS type, status, COUNT(*) AS total FROM processing_jobs WHERE item_id LIKE 'bg29-078-%' GROUP BY job_type, status",
        )
        .all<QueueCount>();
      const sync = await db
        .prepare(
          "SELECT destination AS type, status, COUNT(*) AS total FROM sync_attempts WHERE item_id LIKE 'bg29-078-%' GROUP BY destination, status",
        )
        .all<QueueCount>();
      // Explicit retry-eligible counts are a subset of pending work, not
      // additional jobs. Record them separately so a simple pending count
      // cannot conceal a failing backoff/recovery scenario.
      const processingRetries = await db
        .prepare(
          "SELECT job_type AS type, COUNT(*) AS total FROM processing_jobs WHERE item_id LIKE 'bg29-078-%' AND status = 'pending' AND attempts > 0 AND available_at <= ?1 GROUP BY job_type",
        )
        .bind(now.toISOString())
        .all<{ type: string; total: number }>();
      const notionRetries = await db
        .prepare(
          "SELECT destination AS type, COUNT(*) AS total FROM sync_attempts WHERE item_id LIKE 'bg29-078-%' AND status = 'pending' AND attempts > 0 AND available_at <= ?1 GROUP BY destination",
        )
        .bind(now.toISOString())
        .all<{ type: string; total: number }>();
      const retryEligible = [
        ...processingRetries.results,
        ...notionRetries.results,
      ].map((row) => ({ ...row, status: 'retry_eligible' }));
      const jobs = await db
        .prepare(
          "SELECT status, available_at, lease_expires_at FROM processing_jobs WHERE item_id LIKE 'bg29-078-%'",
        )
        .all<QueueClock>();
      const syncJobs = await db
        .prepare(
          "SELECT status, available_at, lease_expires_at FROM sync_attempts WHERE item_id LIKE 'bg29-078-%'",
        )
        .all<QueueClock>();

      // Pending work is eligible only after available_at; expired leases
      // count as eligible work. Never count future retry windows as overdue.
      const eligible = [...jobs.results, ...syncJobs.results]
        .map((row) =>
          row.status === 'pending'
            ? row.available_at
            : row.status === 'processing'
              ? row.lease_expires_at
              : null,
        )
        .filter(
          (value): value is string =>
            value !== null &&
            Number.isFinite(Date.parse(value)) &&
            Date.parse(value) <= now.getTime(),
        )
        .sort();
      const oldest = eligible[0] ?? null;
      const sourceIds = await ids(
        db,
        "SELECT id FROM items WHERE source_app = 'BG29-078 sealed fixtures' AND deleted_at IS NULL",
      );
      const evidenceIds = {
        originals: sourceIds,
        urlAcquisitions: await ids(
          db,
          "SELECT id FROM url_acquisitions WHERE item_id LIKE 'bg29-078-%'",
        ),
        extractionRecords: await ids(
          db,
          "SELECT id FROM extraction_records WHERE item_id LIKE 'bg29-078-%'",
        ),
        enrichmentResults: await ids(
          db,
          "SELECT DISTINCT item.id AS id FROM items AS item JOIN processing_jobs AS job ON job.item_id = item.id AND job.job_type = 'enrich' AND job.status = 'complete' JOIN provider_usage AS usage ON usage.item_id = item.id AND usage.operation = 'enrich' AND usage.status = 'success' WHERE item.id LIKE 'bg29-078-%' AND item.summary IS NOT NULL",
        ),
        notionProjections: await ids(
          db,
          "SELECT capture_id AS id FROM bg29_mock_notion_pages WHERE capture_id LIKE 'bg29-078-%'",
        ),
      };
      await db
        .prepare(
          'INSERT INTO bg29_evidence_snapshots (sweep_id, phase, recorded_at, original_count, oldest_eligible_at, oldest_age_ms, status_matrix_json, evidence_ids_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
        )
        .bind(
          sweepId,
          phase,
          now.toISOString(),
          sourceIds.length,
          oldest,
          oldest === null ? null : now.getTime() - Date.parse(oldest),
          JSON.stringify([
            ...queues.results,
            ...sync.results,
            ...retryEligible,
          ]),
          JSON.stringify(evidenceIds),
        )
        .run();
    },
  });
}
