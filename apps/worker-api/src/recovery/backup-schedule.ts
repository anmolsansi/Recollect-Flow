import { BackupService } from './backup.service';

/**
 * The pre-existing Monday weekly Cron is an opt-in backup trigger. Persist one
 * claim per UTC Monday to prevent overlap/replay from uploading duplicate
 * hosted JSON backups. Operators must inspect failed periods.
 */
export function backupPeriodKey(at: Date): string {
  const monday = new Date(at);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export async function createWeeklyHostedBackup(
  db: D1Database,
  bucket: R2Bucket,
  at: Date,
): Promise<'complete' | 'already_claimed'> {
  const key = backupPeriodKey(at);
  const nowIso = at.toISOString();
  const claimed = await db
    .prepare(
      `INSERT INTO scheduled_backup_periods (
         period_key, state, claimed_at
       ) VALUES (?1, 'running', ?2)
       ON CONFLICT(period_key) DO NOTHING`,
    )
    .bind(key, nowIso)
    .run();
  if (claimed.meta.changes !== 1) return 'already_claimed';

  try {
    const backup = await new BackupService(db, bucket, () => at).createHostedBackup();
    if (backup.state !== 'complete') throw new Error('BACKUP_NOT_VERIFIED');
    await db
      .prepare(
        `UPDATE scheduled_backup_periods
         SET state = 'complete', backup_id = ?1,
             finished_at = ?2, failure_code = NULL
         WHERE period_key = ?3 AND state = 'running'`,
      )
      .bind(backup.id, at.toISOString(), key)
      .run();
    return 'complete';
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z0-9_]{1,80}$/.test(error.message)
        ? error.message
        : 'BACKUP_SCHEDULE_CREATE_FAILED';
    await db
      .prepare(
        `UPDATE scheduled_backup_periods
         SET state = 'failed', finished_at = ?1, failure_code = ?2
         WHERE period_key = ?3 AND state = 'running'`,
      )
      .bind(at.toISOString(), code, key)
      .run();
    throw error;
  }
}
