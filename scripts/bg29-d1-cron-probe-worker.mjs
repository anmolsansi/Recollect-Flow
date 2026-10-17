// BG-29 isolated D1-only Cron heartbeat. This is NOT the production scheduler.
// Never mount R2, call external providers, or mark BG-29.078 complete from this probe.
const CRON = '17 * * * *';
const TOTAL_ITEMS = 24;
const PER_TICK = 8;

export function isAllowedCron(cron) {
  return cron === CRON;
}

export async function runD1CronProbe(
  db,
  scheduledAt,
  observedAt = new Date().toISOString(),
) {
  // Tables are separate from application data, and the deterministic 24-item
  // fixture is inserted only once. No network, R2, AI or notification calls.
  await db.exec(
    "CREATE TABLE IF NOT EXISTS bg29_d1_probe_jobs (id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('pending', 'complete')), created_at TEXT NOT NULL, completed_at TEXT)",
  );
  await db.exec(
    'CREATE TABLE IF NOT EXISTS bg29_d1_probe_sweeps (id INTEGER PRIMARY KEY AUTOINCREMENT, scheduled_at TEXT NOT NULL, observed_at TEXT NOT NULL, original_count INTEGER NOT NULL, completed_count INTEGER NOT NULL, pending_count INTEGER NOT NULL)',
  );

  await db
    .prepare(
      `WITH RECURSIVE nums(n) AS (
        SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < ${TOTAL_ITEMS}
      )
      INSERT OR IGNORE INTO bg29_d1_probe_jobs (id, status, created_at)
      SELECT n, 'pending', ?1 FROM nums`,
    )
    .bind(scheduledAt)
    .run();

  await db
    .prepare(
      `UPDATE bg29_d1_probe_jobs
        SET status = 'complete', completed_at = ?1
        WHERE id IN (
          SELECT id FROM bg29_d1_probe_jobs
          WHERE status = 'pending' ORDER BY id LIMIT ${PER_TICK}
        )`,
    )
    .bind(observedAt)
    .run();

  const counts = await db
    .prepare(
      `SELECT COUNT(*) AS originals,
         SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM bg29_d1_probe_jobs`,
    )
    .first();

  if (!counts || Number(counts.originals) !== TOTAL_ITEMS)
    throw new Error('BG29 D1 probe fixture count changed unexpectedly');

  await db
    .prepare(
      `INSERT INTO bg29_d1_probe_sweeps
       (scheduled_at, observed_at, original_count, completed_count, pending_count)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      scheduledAt,
      observedAt,
      counts.originals,
      counts.completed,
      counts.pending,
    )
    .run();

  const record = {
    event: 'bg29_d1_only_hourly_probe',
    scope: 'd1_only',
    scheduled_at: scheduledAt,
    observed_at: observedAt,
    originals: counts.originals,
    completed: counts.completed,
    pending: counts.pending,
    cron: CRON,
    limitations:
      'D1-only synthetic heartbeat. Does not run real URL acquisition, R2 file extraction, AI enrichment, or Notion projection. Not BG-29.078 acceptance.',
  };
  globalThis.console.log(JSON.stringify(record));
  return record;
}

export default {
  async fetch() {
    return new globalThis.Response('Not Found', { status: 404 });
  },

  async scheduled(controller, env, ctx) {
    if (!isAllowedCron(controller.cron)) {
      globalThis.console.warn('bg29_d1_probe_unexpected_cron');
      return;
    }
    if (!env.DB) throw new Error('BG29 staging D1 binding missing');
    ctx.waitUntil(
      runD1CronProbe(env.DB, new Date(controller.scheduledTime).toISOString()),
    );
  },
};
