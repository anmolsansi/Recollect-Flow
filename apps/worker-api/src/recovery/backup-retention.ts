import { HOSTED_BACKUP_RETENTION_DAYS } from './recovery.types';

const DAY_MS = 24 * 60 * 60 * 1_000;

export function hostedBackupExpiresAt(createdAt: Date): string {
  return new Date(
    createdAt.getTime() + HOSTED_BACKUP_RETENTION_DAYS * DAY_MS,
  ).toISOString();
}

export function hostedBackupObjectKey(id: string): string {
  return `backups/v1/${id}.json`;
}
