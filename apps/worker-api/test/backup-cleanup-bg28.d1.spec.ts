import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { cleanupExpiredHostedBackups } from '../src/recovery/backup-cleanup';

const EXPIRED = 'backups/v1/bg28-expired.json';
const RETAINED = 'backups/v1/bg28-retained.json';
const NOW = new Date('2026-10-16T00:00:00.000Z');

async function seedBackup(id: string, key: string, expiresAt: string) {
  await env.DB.prepare(
    `INSERT INTO backup_artifacts
      (id, object_key, state, schema_version, created_at,
       expires_at, verified_at, sha256, size_bytes)
     VALUES (?1, ?2, 'complete', '2026-09-19.1', ?3, ?4, ?3,
             ?5, 2)`,
  )
    .bind(id, key, '2026-09-01T00:00:00.000Z', expiresAt, '0'.repeat(64))
    .run();
  await env.ATTACHMENTS.put(key, '{}');
}

describe('BG-28 hosted backup retention and failure isolation', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.prepare(
      "DELETE FROM backup_artifacts WHERE id IN ('bg28-expired', 'bg28-retained')",
    ).run();
    await env.ATTACHMENTS.delete([EXPIRED, RETAINED]);
    await seedBackup('bg28-expired', EXPIRED, '2026-10-01T00:00:00.000Z');
    await seedBackup('bg28-retained', RETAINED, '2026-11-01T00:00:00.000Z');
  });

  it('expires only eligible objects and keeps verified unexpired bytes', async () => {
    expect(
      await cleanupExpiredHostedBackups(env.DB, env.ATTACHMENTS, NOW),
    ).toBe(1);
    expect(await env.ATTACHMENTS.get(EXPIRED)).toBeNull();
    expect(await env.ATTACHMENTS.get(RETAINED)).not.toBeNull();
    const rows = await env.DB.prepare(
      "SELECT id, state FROM backup_artifacts WHERE id IN ('bg28-expired', 'bg28-retained') ORDER BY id",
    ).all<{ id: string; state: string }>();
    expect(rows.results).toEqual([
      { id: 'bg28-expired', state: 'expired' },
      { id: 'bg28-retained', state: 'complete' },
    ]);
  });

  it('keeps failed deletions retryable without marking content expired', async () => {
    const failingBucket = {
      delete: async () => {
        throw new Error('synthetic cleanup outage');
      },
    } as unknown as R2Bucket;
    expect(await cleanupExpiredHostedBackups(env.DB, failingBucket, NOW)).toBe(
      0,
    );
    const row = await env.DB.prepare(
      "SELECT state FROM backup_artifacts WHERE id = 'bg28-expired'",
    ).first<{ state: string }>();
    expect(row?.state).toBe('complete');
    expect(await env.ATTACHMENTS.get(EXPIRED)).not.toBeNull();
    expect(await env.ATTACHMENTS.get(RETAINED)).not.toBeNull();
  });
});
