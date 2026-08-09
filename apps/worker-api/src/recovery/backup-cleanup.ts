import { BackupRepository } from './backup.repository';

export async function cleanupExpiredHostedBackups(
  db: D1Database,
  bucket: R2Bucket,
  now: Date = new Date(),
  limit = 100,
): Promise<number> {
  const repository = new BackupRepository(db);
  const expired = await repository.findExpired(now, limit);
  let completed = 0;
  for (const backup of expired) {
    try {
      await bucket.delete(backup.objectKey);
      if (await repository.markExpired(backup.id, now)) completed += 1;
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: 'backup_retention_cleanup_failed',
          backup_id: backup.id,
          error_name: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
    }
  }
  return completed;
}
