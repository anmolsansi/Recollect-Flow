import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExportService } from '../src/recovery/export.service';
import { RestoreService } from '../src/recovery/restore.service';

const ITEM_ID = 'bg28-original-required';
const OBJECT_KEY = 'uploads/bg28/required-original.pdf';
const NOW = '2026-10-16T00:00:00.000Z';

async function clearCanonical() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

describe('BG-28 restore original-byte gate', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await clearCanonical();
    await env.ATTACHMENTS.delete(OBJECT_KEY);
    await env.DB.prepare(
      `INSERT INTO items
        (id, idempotency_key, source_type, source_app, privacy_level,
         processing_status, captured_at, created_at, updated_at)
       VALUES (?1, 'bg28-original-key', 'pdf', 'test', 'public',
               'complete', ?2, ?2, ?2)`,
    )
      .bind(ITEM_ID, NOW)
      .run();
    await env.DB.prepare(
      `INSERT INTO attachments
        (id, item_id, object_key, status, file_name,
         declared_content_type, size_bytes, content_hash,
         expires_at, created_at, updated_at)
       VALUES ('bg28-attachment', ?1, ?2, 'linked', 'synthetic.pdf',
               'application/pdf', 6, ?3, ?4, ?4, ?4)`,
    )
      .bind(ITEM_ID, OBJECT_KEY, '0'.repeat(64), NOW)
      .run();
  });

  it('shows missing originals in a dry run and refuses real apply without mutation', async () => {
    const exported = await new ExportService(env.DB).buildJson();
    await clearCanonical();
    const service = new RestoreService(env.DB, env.ATTACHMENTS);
    const preview = await service.restore(exported, { dryRun: true });
    expect(preview.attachmentReadiness).toEqual({
      checked: 1,
      problems: [
        {
          itemId: ITEM_ID,
          attachmentId: 'bg28-attachment',
          reason: 'missing',
        },
      ],
    });
    await expect(
      service.restore(exported, { dryRun: false }),
    ).rejects.toMatchObject({ code: 'RESTORE_ATTACHMENTS_UNAVAILABLE' });
    expect(
      await env.DB.prepare('SELECT id FROM items WHERE id = ?1')
        .bind(ITEM_ID)
        .first(),
    ).toBeNull();
  });

  it('allows restored references only when matching original byte size is present', async () => {
    const exported = await new ExportService(env.DB).buildJson();
    await clearCanonical();
    await env.ATTACHMENTS.put(OBJECT_KEY, '12345');
    const service = new RestoreService(env.DB, env.ATTACHMENTS);
    const mismatch = await service.restore(exported, { dryRun: true });
    expect(mismatch.attachmentReadiness?.problems[0]?.reason).toBe(
      'size_mismatch',
    );
    await env.ATTACHMENTS.put(OBJECT_KEY, '123456');
    const valid = await service.restore(exported, { dryRun: true });
    expect(valid.attachmentReadiness?.problems).toEqual([]);
  });
});
