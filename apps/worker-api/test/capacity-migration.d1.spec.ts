import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { JobService } from '../src/jobs/job.service';

describe('OPE-227 migration rehearsal', () => {
  it('upgrades a populated pre-0020 database without changing canonical data', async () => {
    const database = env.OPE227_MIGRATION_DB!;
    const migrations = env.TEST_MIGRATIONS!;
    await applyD1Migrations(database, migrations.slice(0, -1));

    const now = new Date('2026-08-09T20:30:00.000Z');
    await database
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, captured_at, created_at, updated_at, raw_text
         ) VALUES (
           'ope227-migration-item', 'ope227-migration-key', 'text', 'test',
           'public', 'pending', ?1, ?1, ?1, 'preserve me'
         )`,
      )
      .bind(now.toISOString())
      .run();
    const jobId = await new JobService(database).enqueueProcessingJob(
      'ope227-migration-item',
      'enrich',
      'ope227-migration-input',
      now,
    );

    await applyD1Migrations(database, migrations.slice(-1));

    const item = await database
      .prepare(
        `SELECT id, raw_text, privacy_level
         FROM items WHERE id = 'ope227-migration-item'`,
      )
      .first<{ id: string; raw_text: string; privacy_level: string }>();
    expect(item).toEqual({
      id: 'ope227-migration-item',
      raw_text: 'preserve me',
      privacy_level: 'public',
    });

    const job = await database
      .prepare('SELECT id, status FROM processing_jobs WHERE id = ?1')
      .bind(jobId)
      .first<{ id: string; status: string }>();
    expect(job).toEqual({ id: jobId, status: 'pending' });

    for (const table of [
      'ai_capacity_windows',
      'ai_capacity_reservations',
      'ai_circuit_breakers',
    ]) {
      const row = await database
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1`,
        )
        .bind(table)
        .first<{ name: string }>();
      expect(row?.name).toBe(table);
    }

    const foreignKeyIssues = await database
      .prepare('PRAGMA foreign_key_check')
      .all();
    expect(foreignKeyIssues.results).toHaveLength(0);
  });
});
