import { applyD1Migrations, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { JobService } from '../src/jobs/job.service';

describe('BG-10 URL evidence migration rehearsal', () => {
  it('adds URL evidence storage and FTS source text without changing populated canonical data', async () => {
    const database = (
      env as unknown as {
        OPE228_MIGRATION_DB: D1Database;
      }
    ).OPE228_MIGRATION_DB;
    const migrations = env.TEST_MIGRATIONS!;
    await applyD1Migrations(database, migrations.slice(0, -1));

    const now = new Date('2026-08-10T07:00:00.000Z');
    await database
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, captured_at, created_at, updated_at,
           raw_text, user_note, summary
         ) VALUES (
           'ope228-migration-item', 'ope228-migration-key', 'text', 'test',
           'public', 'pending', ?1, ?1, ?1,
           'preserve recovery source', 'preserve owner reason', 'preserve summary'
         )`,
      )
      .bind(now.toISOString())
      .run();
    expect(
      await new JobService(database).enqueueProcessingJob(
        'ope228-migration-item',
        'enrich',
        'ope228-migration-input',
        now,
      ),
    ).toBe(true);

    await applyD1Migrations(database, migrations.slice(-1));

    const item = await database
      .prepare(
        `SELECT id, raw_text, user_note, summary, privacy_level, source_revision
         FROM items WHERE id = 'ope228-migration-item'`,
      )
      .first<{
        id: string;
        raw_text: string;
        user_note: string;
        summary: string;
        privacy_level: string;
        source_revision: number;
      }>();
    expect(item).toEqual({
      id: 'ope228-migration-item',
      raw_text: 'preserve recovery source',
      user_note: 'preserve owner reason',
      summary: 'preserve summary',
      privacy_level: 'public',
      source_revision: 1,
    });

    const job = await database
      .prepare(
        `SELECT status FROM processing_jobs
         WHERE item_id = 'ope228-migration-item' AND job_type = 'enrich'`,
      )
      .first<{ status: string }>();
    expect(job?.status).toBe('pending');

    for (const table of [
      'backup_artifacts',
      'purge_workflows',
      'purge_steps',
      'purge_receipts',
      'restore_runs',
      'integrity_runs',
      'integrity_findings',
      'url_acquisitions',
    ]) {
      const row = await database
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1`,
        )
        .bind(table)
        .first<{ name: string }>();
      expect(row?.name).toBe(table);
    }

    const ftsColumns = await database
      .prepare('PRAGMA table_info(item_search_fts)')
      .all<{ name: string }>();
    expect(ftsColumns.results.map((column) => column.name)).toContain(
      'source_text',
    );

    const foreignKeyIssues = await database
      .prepare('PRAGMA foreign_key_check')
      .all();
    expect(foreignKeyIssues.results).toHaveLength(0);
  });
});
