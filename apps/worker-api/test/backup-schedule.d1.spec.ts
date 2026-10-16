import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  backupPeriodKey,
  createWeeklyHostedBackup,
} from '../src/recovery/backup-schedule';

describe('BG-28 verified weekly hosted-backup scheduler', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM scheduled_backup_periods'),
      env.DB.prepare('DELETE FROM backup_artifacts'),
    ]);
    const objects = await env.ATTACHMENTS.list({ prefix: 'backups/v1/' });
    if (objects.objects.length) {
      await env.ATTACHMENTS.delete(objects.objects.map((entry) => entry.key));
    }
  });

  it('uses the UTC Monday period boundary', () => {
    expect(backupPeriodKey(new Date('2026-10-19T02:15:00.000Z'))).toBe(
      '2026-10-19',
    );
    expect(backupPeriodKey(new Date('2026-10-25T23:00:00.000Z'))).toBe(
      '2026-10-19',
    );
    expect(backupPeriodKey(new Date('2026-10-26T00:00:00.000Z'))).toBe(
      '2026-10-26',
    );
  });

  it('creates exactly one fully verified backup for a replayed weekly slot', async () => {
    const at = new Date('2026-10-19T02:15:00.000Z');
    const first = await createWeeklyHostedBackup(env.DB, env.ATTACHMENTS, at);
    expect(first).toBe('complete');
    expect(
      await createWeeklyHostedBackup(env.DB, env.ATTACHMENTS, at),
    ).toBe('already_claimed');

    const artifacts = await env.DB.prepare(
      'SELECT state, sha256, size_bytes, verified_at FROM backup_artifacts',
    ).all<{
      state: string;
      sha256: string;
      size_bytes: number;
      verified_at: string;
    }>();
    expect(artifacts.results).toHaveLength(1);
    expect(artifacts.results[0]?.state).toBe('complete');
    expect(artifacts.results[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifacts.results[0]?.size_bytes).toBeGreaterThan(0);
    expect(artifacts.results[0]?.verified_at).toBe(at.toISOString());
  });

  it('records failed weekly creation without counting it as a verified backup', async () => {
    const failBucket = {
      put: async () => {
        throw new Error('SYNTHETIC_BUCKET_ERROR');
      },
      delete: async () => undefined,
    } as unknown as R2Bucket;
    const at = new Date('2026-10-26T02:15:00.000Z');
    await expect(
      createWeeklyHostedBackup(env.DB, failBucket, at),
    ).rejects.toThrow('SYNTHETIC_BUCKET_ERROR');
    const period = await env.DB.prepare(
      "SELECT state, failure_code FROM scheduled_backup_periods WHERE period_key = '2026-10-26'",
    ).first<{ state: string; failure_code: string }>();
    expect(period).toEqual({
      state: 'failed',
      failure_code: 'SYNTHETIC_BUCKET_ERROR',
    });
    expect(
      await createWeeklyHostedBackup(env.DB, env.ATTACHMENTS, at),
    ).toBe('already_claimed');
    const complete = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM backup_artifacts WHERE state = 'complete'",
    ).first<{ total: number }>();
    expect(complete?.total).toBe(0);
  });
});
