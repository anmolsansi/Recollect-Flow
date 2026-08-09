import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { IntegrityService } from '../src/recovery/integrity.service';

const ITEM_ID = 'ope228-integrity-item';

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM integrity_findings'),
    env.DB.prepare('DELETE FROM integrity_runs'),
    env.DB.prepare('DELETE FROM purge_steps'),
    env.DB.prepare('DELETE FROM purge_receipts'),
    env.DB.prepare('DELETE FROM purge_workflows'),
    env.DB.prepare('DELETE FROM backup_artifacts'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  await env.ATTACHMENTS.delete('attachments/ope228-missing-object');

  const now = '2026-08-10T05:00:00.000Z';
  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO items (
           id, idempotency_key, source_type, source_app, privacy_level,
           processing_status, lifecycle_status, notion_page_id,
           captured_at, created_at, updated_at, raw_text
         ) VALUES (?1, 'ope228-integrity-key', 'text', 'test', 'public',
                   'complete', 'Inbox', 'missing-notion-page', ?2, ?2, ?2,
                   'canonical content must survive integrity scan')`,
      )
      .bind(ITEM_ID, now),
    env.DB
      .prepare(
        `INSERT INTO attachments (
           id, item_id, object_key, status, file_name,
           declared_content_type, size_bytes, expires_at,
           linked_at, created_at, updated_at
         ) VALUES ('ope228-integrity-attachment', ?1,
                   'attachments/ope228-missing-object', 'linked', 'proof.txt',
                   'text/plain', 12, '2026-09-10T00:00:00.000Z', ?2, ?2, ?2)`,
      )
      .bind(ITEM_ID, now),
    env.DB
      .prepare(
        `INSERT INTO purge_workflows (
           id, item_id, state, confirmation_digest, confirmation_expires_at,
           requested_edit_version, confirmed_at, last_error_code,
           created_at, updated_at
         ) VALUES ('ope228-partial-integrity-purge', ?1, 'partial', 'digest',
                   '2026-08-10T06:00:00.000Z', 1, ?2,
                   'NOTION_PURGE_PROVIDER_UNAVAILABLE', ?2, ?2)`,
      )
      .bind(ITEM_ID, now),
    env.DB
      .prepare(
        `INSERT INTO backup_artifacts (
           id, object_key, state, schema_version, created_at, expires_at
         ) VALUES ('ope228-incomplete-backup', 'backups/v1/incomplete.json',
                   'complete', '2026-08-10.1', ?1, '2026-09-09T05:00:00.000Z')`,
      )
      .bind(now),
  ]);
}

describe('OPE-228 recovery integrity checks', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(reset);

  it('reports drift without starting deletion or changing canonical content', async () => {
    const missingNotion = (async () =>
      new Response('missing', { status: 404 })) as typeof fetch;
    const result = await new IntegrityService(
      env.DB,
      env.ATTACHMENTS,
      'test-notion-token',
      {
        now: () => new Date('2026-08-10T05:05:00.000Z'),
        fetcher: missingNotion,
      },
    ).run();

    expect(result.run?.state).toBe('complete');
    const types = result.findings.map((finding) => finding.finding_type);
    expect(types).toContain('attachment_object_missing');
    expect(types).toContain('notion_projection_missing');
    expect(types).toContain('purge_workflow_incomplete');
    expect(types).toContain('backup_verification_incomplete');

    const item = await env.DB.prepare(
      'SELECT id, raw_text, deleted_at FROM items WHERE id = ?1',
    )
      .bind(ITEM_ID)
      .first<{ id: string; raw_text: string; deleted_at: string | null }>();
    expect(item).toEqual({
      id: ITEM_ID,
      raw_text: 'canonical content must survive integrity scan',
      deleted_at: null,
    });
    expect(
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM purge_workflows
         WHERE item_id = ?1`,
      )
        .bind(ITEM_ID)
        .first<{ count: number }>(),
    ).toEqual({ count: 1 });
  });
});
