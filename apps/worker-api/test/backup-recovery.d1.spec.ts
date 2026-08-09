import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { BackupService } from '../src/recovery/backup.service';

const ITEM_ID = 'ope228-backup-live-item';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM backup_artifacts'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM item_feedback_events'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const backups = await env.ATTACHMENTS.list({ prefix: 'backups/v1/' });
  if (backups.objects.length) {
    await env.ATTACHMENTS.delete(backups.objects.map((object) => object.key));
  }
  const now = '2026-08-10T06:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'ope228-backup-live-key', 'text', 'test', 'public',
               'complete', ?2, ?2, ?2, 'live data must survive backup failures')`,
  )
    .bind(ITEM_ID, now)
    .run();
}

describe('OPE-228 hosted backup workflow', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('marks a backup complete only after R2 read-back verification', async () => {
    const service = new BackupService(
      env.DB,
      env.ATTACHMENTS,
      () => new Date('2026-08-10T06:05:00.000Z'),
    );
    const backup = await service.createHostedBackup();

    expect(backup).toMatchObject({
      state: 'complete',
      schemaVersion: '2026-08-10.1',
      expiresAt: '2026-09-09T06:05:00.000Z',
      failureCode: null,
    });
    expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(backup.sizeBytes).toBeGreaterThan(0);
    const stored = await env.ATTACHMENTS.get(backup.objectKey);
    expect(stored).not.toBeNull();
    expect(stored?.customMetadata?.sha256).toBe(backup.sha256);
  });

  it('fails the backup attempt without deleting live canonical data', async () => {
    const failingBucket = {
      put: (...args: Parameters<R2Bucket['put']>) =>
        env.ATTACHMENTS.put(...args),
      get: async () => null,
      delete: (...args: Parameters<R2Bucket['delete']>) =>
        env.ATTACHMENTS.delete(...args),
    } as unknown as R2Bucket;
    const service = new BackupService(
      env.DB,
      failingBucket,
      () => new Date('2026-08-10T06:10:00.000Z'),
    );

    await expect(service.createHostedBackup()).rejects.toThrow(
      'BACKUP_READBACK_MISSING',
    );
    const item = await env.DB.prepare(
      'SELECT id, raw_text FROM items WHERE id = ?1',
    )
      .bind(ITEM_ID)
      .first<{ id: string; raw_text: string }>();
    expect(item).toEqual({
      id: ITEM_ID,
      raw_text: 'live data must survive backup failures',
    });
    const attempt = await env.DB.prepare(
      `SELECT state, failure_code FROM backup_artifacts
       ORDER BY created_at DESC LIMIT 1`,
    ).first<{ state: string; failure_code: string | null }>();
    expect(attempt).toEqual({
      state: 'failed',
      failure_code: 'BACKUP_READBACK_MISSING',
    });
  });
});
