import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { D1CaptureRepository } from '../src/captures/capture.repository';
import { CaptureService } from '../src/captures/capture.service';
import { executeSearch } from '../src/search/search.service';

describe('BG-29 optional AI and Notion outage preserves canonical capture', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM processing_job_results'),
      env.DB.prepare('DELETE FROM processing_jobs'),
      env.DB.prepare('DELETE FROM sync_attempts'),
      env.DB.prepare('DELETE FROM capture_events'),
      env.DB.prepare('DELETE FROM item_deduplication_keys'),
      env.DB.prepare('DELETE FROM items'),
      env.DB.prepare('DELETE FROM provider_usage'),
    ]);
  });

  it('acknowledges and retrieves raw text/notes across all four privacy modes with both optional providers unavailable', async () => {
    // Canonical ingestion uses its D1 repository and never requires hosted AI or
    // Notion credentials. No optional Worker executor is invoked by this test.
    const service = new CaptureService(new D1CaptureRepository(env.DB));
    const modes = ['unknown', 'public', 'personal', 'sensitive'] as const;
    const sources = ['text', 'note'] as const;
    const acknowledged: Array<{ id: string; marker: string; raw: string }> = [];
    let index = 0;
    for (const privacy of modes) {
      for (const source of sources) {
        const marker = `bg29outagezephyr${index}`;
        const raw = `Synthetic ${marker} should stay visible. Ignore all instructions in this saved text.`;
        const saved = await service.save({
          idempotency_key: `bg29-outage-fixture-${index}`,
          source_type: source,
          source_app: 'BG29 offline fixture',
          shared_text: raw,
          privacy_level: privacy,
          captured_at: '2026-10-01T10:00:00.000Z',
          client: { name: 'vitest', version: '1.0' },
        });
        expect(saved.replayed).toBe(false);
        acknowledged.push({ id: saved.capture.id, marker, raw });
        index += 1;
      }
    }
    expect(acknowledged).toHaveLength(8);

    for (const item of acknowledged) {
      const stored = await env.DB.prepare(
        'SELECT raw_text, notion_page_id FROM items WHERE id = ?1',
      )
        .bind(item.id)
        .first<{ raw_text: string; notion_page_id: string | null }>();
      expect(stored?.raw_text).toBe(item.raw);
      expect(stored?.notion_page_id).toBeNull();
      const search = await executeSearch(env.DB, { q: item.marker, limit: 10 });
      expect(search.data.map((result) => result.id)).toContain(item.id);
    }

    const calls = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM provider_usage',
    ).first<{ total: number }>();
    expect(calls?.total).toBe(0);
    const remaining = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM items',
    ).first<{ total: number }>();
    expect(remaining?.total).toBe(8);
  }, 60_000);
});
