import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExportService } from '../src/recovery/export.service';
import { RestoreService } from '../src/recovery/restore.service';
import { executeSearch } from '../src/search/search.service';

const ITEM_ID = 'ope228-restore-roundtrip-item';

async function clearCanonical(): Promise<void> {
  await env.DB.batch([
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
}

async function clearRecovery(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM integrity_findings'),
    env.DB.prepare('DELETE FROM integrity_runs'),
    env.DB.prepare('DELETE FROM restore_runs'),
    env.DB.prepare('DELETE FROM backup_artifacts'),
  ]);
  const receiptObjects = await env.ATTACHMENTS.list({
    prefix: 'purge-receipts/v1/',
  });
  if (receiptObjects.objects.length) {
    await env.ATTACHMENTS.delete(
      receiptObjects.objects.map((object) => object.key),
    );
  }
}

async function seedSource(): Promise<void> {
  const now = '2026-08-10T03:00:00.000Z';
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, lifecycle_status, captured_at, created_at, updated_at,
           raw_text, user_note, summary, project, topics_json, suggested_action
         ) VALUES (?1, 'ope228-roundtrip-key', 'text', 'test', 'public',
                   'complete', 'Inbox', ?2, ?2, ?2, ?3, ?4, ?5, 'Recovery',
                   '["backup","restore"]', 'Review recovery proof')`,
    ).bind(
      ITEM_ID,
      now,
      'OPE228 roundtrip zephyr searchable source',
      'owner preservation reason',
      'portable derived summary',
    ),
    env.DB.prepare(
      `INSERT INTO capture_events (
           id, item_id, idempotency_key, source_type, source_app,
           raw_text, user_note, privacy_level, captured_at, created_at
         ) VALUES ('ope228-capture-event', ?1, 'ope228-roundtrip-event-key',
                   'text', 'test', ?2, ?3, 'public', ?4, ?4)`,
    ).bind(
      ITEM_ID,
      'OPE228 roundtrip zephyr searchable source',
      'owner preservation reason',
      now,
    ),
    env.DB.prepare(
      `INSERT INTO item_deduplication_keys (
           deduplication_key, item_id, created_at
         ) VALUES ('content:ope228-roundtrip', ?1, ?2)`,
    ).bind(ITEM_ID, now),
    env.DB.prepare(
      `INSERT INTO processing_jobs (
           id, item_id, job_type, status, attempts, available_at,
           created_at, updated_at
         ) VALUES ('ope228-processing-job', ?1, 'enrich', 'complete', 1, ?2, ?2, ?2)`,
    ).bind(ITEM_ID, now),
    env.DB.prepare(
      `INSERT INTO sync_attempts (
           id, item_id, destination, status, attempts, available_at,
           created_at, updated_at
         ) VALUES ('ope228-sync-attempt', ?1, 'notion', 'complete', 1, ?2, ?2, ?2)`,
    ).bind(ITEM_ID, now),
    env.DB.prepare(
      `INSERT INTO item_field_overrides (
           id, item_id, field_name, override_value, created_at, updated_at
         ) VALUES ('ope228-override', ?1, 'summary', 'owner summary', ?2, ?2)`,
    ).bind(ITEM_ID, now),
    env.DB.prepare(
      `INSERT INTO item_feedback_events (
           id, item_id, idempotency_key, feedback_type, source_surface, created_at
         ) VALUES ('ope228-feedback', ?1, 'ope228-feedback-key', 'useful', 'test', ?2)`,
    ).bind(ITEM_ID, now),
    env.DB.prepare(
      `INSERT INTO audit_events (
           id, item_id, event_type, actor_type, details_json, created_at
         ) VALUES ('ope228-audit', ?1, 'roundtrip_seeded', 'test', '{}', ?2)`,
    ).bind(ITEM_ID, now),
  ]);
}

describe('OPE-228 portable restore round trip', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await clearCanonical();
    await clearRecovery();
    await seedSource();
  });

  it('recreates canonical fields, history and FTS usability in a clean database', async () => {
    const exported = await new ExportService(
      env.DB,
      () => new Date('2026-08-10T03:05:00.000Z'),
    ).buildJson();
    expect(exported.itemCount).toBe(1);
    expect(exported.items[0]?.captureEvents).toHaveLength(1);
    expect(exported.items[0]?.processingJobs).toHaveLength(1);
    expect(exported.items[0]?.syncAttempts).toHaveLength(1);

    await clearCanonical();
    const result = await new RestoreService(
      env.DB,
      env.ATTACHMENTS,
      () => new Date('2026-08-10T03:10:00.000Z'),
    ).restore(exported);

    expect(result.run).toMatchObject({
      state: 'complete',
      restoredCount: 1,
      skippedPurgedCount: 0,
    });

    const item = await env.DB.prepare(
      `SELECT raw_text, user_note, summary, project, topics_json
       FROM items WHERE id = ?1`,
    )
      .bind(ITEM_ID)
      .first<Record<string, unknown>>();
    expect(item).toMatchObject({
      raw_text: 'OPE228 roundtrip zephyr searchable source',
      user_note: 'owner preservation reason',
      summary: 'portable derived summary',
      project: 'Recovery',
      topics_json: '["backup","restore"]',
    });

    const search = await executeSearch(env.DB, { q: 'zephyr', limit: 10 });
    expect(search.data.map((entry) => entry.id)).toContain(ITEM_ID);

    expect(
      await env.DB.prepare('SELECT id FROM capture_events WHERE item_id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).not.toBeNull();
    expect(
      await env.DB.prepare('SELECT id FROM processing_jobs WHERE item_id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).not.toBeNull();
    expect(
      await env.DB.prepare('SELECT id FROM sync_attempts WHERE item_id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).not.toBeNull();
  });
});
