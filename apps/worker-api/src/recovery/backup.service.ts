import { sha256 } from '../captures/hash';
import { AppError } from '../shared/errors';
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

  async readHostedBackup(id: string): Promise<{
    artifact: BackupArtifactRecord;
    content: string;
  }> {
    const artifact = await this.repository.find(id);
    if (!artifact) {
      throw new AppError(404, 'NOT_FOUND', 'Hosted backup not found.');
    }
    if (
      artifact.state !== 'complete' ||
      new Date(artifact.expiresAt).getTime() <= this.now().getTime()
    ) {
      throw new AppError(
        409,
        'BACKUP_NOT_AVAILABLE',
        'The hosted backup is not a verified unexpired artifact.',
      );
    }
    if (!artifact.sha256 || artifact.sizeBytes === null) {
      throw new AppError(
        409,
        'BACKUP_VERIFICATION_INCOMPLETE',
        'The hosted backup has incomplete verification metadata.',
      );
    }

    const stored = await this.bucket.get(artifact.objectKey);
    if (!stored) {
      throw new AppError(
        503,
        'BACKUP_OBJECT_MISSING',
        'The verified hosted backup object is missing.',
      );
    }
    const content = await stored.text();
    const digest = await sha256(content);
    if (
      digest !== artifact.sha256 ||
      encodedSize(content) !== artifact.sizeBytes ||
      (stored.customMetadata?.sha256 && stored.customMetadata.sha256 !== digest)
    ) {
      throw new AppError(
        503,
        'BACKUP_VERIFICATION_MISMATCH',
        'The hosted backup failed retrieval-time verification.',
      );
    }
    return { artifact, content };
  }

  async listHostedBackups(limit = 50): Promise<BackupArtifactRecord[]> {
    return this.repository.list(limit);
  }
}
