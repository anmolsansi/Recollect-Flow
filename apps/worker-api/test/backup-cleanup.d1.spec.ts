import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { cleanupExpiredHostedBackups } from '../src/recovery/backup-cleanup';

const ITEM_ID = 'ope228-backup-cleanup-item';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM backup_artifacts'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  const backups = await env.ATTACHMENTS.list({ prefix: 'backups/v1/' });
  if (backups.objects.length) {
    await env.ATTACHMENTS.delete(backups.objects.map((object) => object.key));
  }

  const createdAt = '2026-07-10T09:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, privacy_level,
       processing_status, captured_at, created_at, updated_at, raw_text
     ) VALUES (?1, 'ope228-backup-cleanup-key', 'text', 'test', 'public',
               'complete', ?2, ?2, ?2, 'live canonical data')`,
  )
    .bind(ITEM_ID, createdAt)
    .run();

  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO backup_artifacts (
           id, object_key, state, schema_version, sha256, size_bytes,
           created_at, verified_at, expires_at
         ) VALUES (
           'expired-backup', 'backups/v1/expired-backup.json', 'complete',
           '2026-08-10.1', 'hash-expired', 2, ?1, ?1, ?2
         )`,
      )
      .bind(createdAt, '2026-08-09T09:00:00.000Z'),
    env.DB
      .prepare(
        `INSERT INTO backup_artifacts (
           id, object_key, state, schema_version, sha256, size_bytes,
           created_at, verified_at, expires_at
         ) VALUES (
           'future-backup', 'backups/v1/future-backup.json', 'complete',
           '2026-08-10.1', 'hash-future', 2, ?1, ?1, ?2
         )`,
      )
      .bind(createdAt, '2026-08-11T09:00:00.000Z'),
  ]);
  await env.ATTACHMENTS.put('backups/v1/expired-backup.json', '{}');
  await env.ATTACHMENTS.put('backups/v1/future-backup.json', '{}');
}

describe('OPE-228 hosted backup retention cleanup', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('removes only expired backup objects and keeps live canonical data', async () => {
    expect(
      await cleanupExpiredHostedBackups(
        env.DB,
        env.ATTACHMENTS,
        new Date('2026-08-10T09:00:00.000Z'),
      ),
    ).toBe(1);

    expect(
      await env.ATTACHMENTS.get('backups/v1/expired-backup.json'),
    ).toBeNull();
    expect(
      await env.ATTACHMENTS.get('backups/v1/future-backup.json'),
    ).not.toBeNull();

    const expired = await env.DB.prepare(
      `SELECT state, expired_at FROM backup_artifacts WHERE id = 'expired-backup'`,
    ).first<{ state: string; expired_at: string | null }>();
    expect(expired).toEqual({
      state: 'expired',
      expired_at: '2026-08-10T09:00:00.000Z',
    });
    expect(
      await env.DB.prepare(
        `SELECT state FROM backup_artifacts WHERE id = 'future-backup'`,
      ).first<{ state: string }>(),
    ).toEqual({ state: 'complete' });
    expect(
      await env.DB.prepare('SELECT raw_text FROM items WHERE id = ?1')
        .bind(ITEM_ID)
        .first<{ raw_text: string }>(),
    ).toEqual({ raw_text: 'live canonical data' });
  });
});
