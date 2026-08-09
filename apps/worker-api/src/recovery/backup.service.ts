import { sha256 } from '../captures/hash';
import { BackupRepository } from './backup.repository';
import {
  hostedBackupExpiresAt,
  hostedBackupObjectKey,
} from './backup-retention';
import { ExportService } from './export.service';
import type { BackupArtifactRecord } from './recovery.types';
import { PORTABLE_EXPORT_VERSION } from './recovery.types';

function encodedSize(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export class BackupService {
  private readonly repository: BackupRepository;

  constructor(
    private readonly db: D1Database,
    private readonly bucket: R2Bucket,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.repository = new BackupRepository(db);
  }

  async createHostedBackup(): Promise<BackupArtifactRecord> {
    const startedAt = this.now();
    const backupId = crypto.randomUUID();
    const objectKey = hostedBackupObjectKey(backupId);
    await this.repository.create(
      backupId,
      objectKey,
      PORTABLE_EXPORT_VERSION,
      hostedBackupExpiresAt(startedAt),
      startedAt,
    );

    try {
      const payload = await new ExportService(this.db, this.now).buildJson();
      const serialized = JSON.stringify(payload);
      const digest = await sha256(serialized);
      const sizeBytes = encodedSize(serialized);

      await this.bucket.put(objectKey, serialized, {
        httpMetadata: { contentType: 'application/json; charset=utf-8' },
        customMetadata: {
          recollectflowBackupId: backupId,
          schemaVersion: PORTABLE_EXPORT_VERSION,
          sha256: digest,
        },
      });
      const verifying = await this.repository.markVerifying(
        backupId,
        digest,
        sizeBytes,
      );
      if (!verifying) throw new Error('BACKUP_STATE_CONFLICT');

      const stored = await this.bucket.get(objectKey);
      if (!stored) throw new Error('BACKUP_READBACK_MISSING');
      const readback = await stored.text();
      const readbackDigest = await sha256(readback);
      if (readbackDigest !== digest || encodedSize(readback) !== sizeBytes) {
        throw new Error('BACKUP_VERIFICATION_MISMATCH');
      }

      const complete = await this.repository.markComplete(backupId, this.now());
      if (!complete) throw new Error('BACKUP_STATE_CONFLICT');
      return (await this.repository.find(backupId))!;
    } catch (error) {
      const code =
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : 'BACKUP_CREATE_FAILED';
      await this.repository.markFailed(backupId, code);
      try {
        await this.bucket.delete(objectKey);
      } catch {
        // A failed cleanup never changes canonical D1/R2 item state.
      }
      throw error;
    }
  }

  async listHostedBackups(limit = 50): Promise<BackupArtifactRecord[]> {
    return this.repository.list(limit);
  }
}
