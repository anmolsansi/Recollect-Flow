import { provisionBg29StagingNotionSchema } from '../src/sync/bg29-staging-durable-notion';
import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBg29StagingScheduler } from '../src/bg29-staging-scheduler';
import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import { BG29_STAGING_URLS } from '../src/jobs/extraction/bg29-staging-source';
import { seedBg29TwentyFour } from './fixtures/bg29-24-capture-seed';
import { bg29PdfSha256 } from './fixtures/bg29-synthetic-pdf';

function isolatedBindings(): Cloudflare.Env {
  return {
    DB: env.DB,
    ATTACHMENTS: env.ATTACHMENTS,
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    DIGEST_AI_ENABLED: 'false',
    HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
    WEB_INBOX_BASE_URL: 'https://invalid.test',
  } as unknown as Cloudflare.Env;
}

async function reset() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM bg29_mock_notion_requests'),
    env.DB.prepare('DELETE FROM bg29_mock_notion_pages'),
    env.DB.prepare('DELETE FROM bg29_mock_failure_injections'),
  ]);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM url_acquisitions'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  for (let n = 1; n <= 12; n++) {
    await env.ATTACHMENTS.delete(
      `bg29-078/file-${String(n).padStart(2, '0')}/original.pdf`,
    );
  }
}

describe('BG-29.078 isolated real worker stages with 24 repeat-safe originals', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    await provisionBg29StagingNotionSchema(env.DB);
  });
  beforeEach(reset);

  it('re-seeds all 12 URLs and 12 PDF bytes without duplicate jobs or original changes', async () => {
    const first = await seedBg29TwentyFour(env.DB, env.ATTACHMENTS);
    const again = await seedBg29TwentyFour(env.DB, env.ATTACHMENTS);
    expect(again).toEqual(first);
    expect(first.filter((row) => row.type === 'url')).toHaveLength(12);
    expect(first.filter((row) => row.type === 'file')).toHaveLength(12);
    for (const [table, expected] of [
      ['items', 24],
      ['attachments', 12],
      ['processing_jobs', 24],
      ['sync_attempts', 24],
    ] as const) {
      const result = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM ${table}`,
      ).first<{ total: number }>();
      expect(result?.total).toBe(expected);
    }
    expect(
      first.filter((row) => row.type === 'url').map((row) => row.source),
    ).toEqual([...BG29_STAGING_URLS]);
    for (const original of first.filter((row) => row.type === 'file')) {
      const object = await env.ATTACHMENTS.get(original.source);
      expect(await bg29PdfSha256(await object!.arrayBuffer())).toBe(
        original.sha256,
      );
    }
  }, 120_000);

  it('runs actual scheduled acquisition, R2 extraction, mock enrichment and Notion logic with no live egress', async () => {
    const originalManifest = await seedBg29TwentyFour(env.DB, env.ATTACHMENTS);
    const bindings = isolatedBindings();
    const scheduler = createBg29StagingScheduler(bindings);
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('BG29_LIVE_NETWORK_FORBIDDEN'));
    const snapshots: Array<{
      sweep: number;
      remaining: number;
      oldestMinutes: number | null;
    }> = [];
    try {
      for (let sweep = 1; sweep <= 8; sweep++) {
        const pending: Promise<unknown>[] = [];
        await scheduler.scheduled(
          {
            cron: BACKGROUND_CRON,
            scheduledTime: Date.now(),
          } as ScheduledController,
          bindings,
          {
            waitUntil: (promise: Promise<unknown>) => {
              pending.push(promise);
            },
          } as ExecutionContext,
        );
        expect(pending).toHaveLength(8);
        const outcomes = await Promise.allSettled(pending);
        expect(
          outcomes.filter((outcome) => outcome.status === 'rejected'),
        ).toEqual([]);

        const queues = await env.DB.prepare(
          `SELECT
           (SELECT COUNT(*) FROM processing_jobs WHERE status IN ('pending', 'processing', 'failed')) +
           (SELECT COUNT(*) FROM sync_attempts WHERE status IN ('pending', 'processing', 'failed')) AS total,
           (SELECT MIN(created_at) FROM processing_jobs WHERE status='pending') AS oldest`,
        ).first<{ total: number; oldest: string | null }>();
        snapshots.push({
          sweep,
          remaining: queues?.total ?? -1,
          oldestMinutes: queues?.oldest
            ? (Date.now() - Date.parse(queues.oldest)) / 60000
            : null,
        });
        if (queues?.total === 0) break;
      }
      const count = async (table: string, predicate: string) =>
        (
          await env.DB.prepare(
            `SELECT COUNT(*) AS total FROM ${table} WHERE ${predicate}`,
          ).first<{ total: number }>()
        )?.total;
      expect(
        await count(
          'items',
          "source_app = 'BG29-078 sealed fixtures' AND deleted_at IS NULL",
        ),
      ).toBe(24);
      expect(await count('url_acquisitions', "status = 'acquired_text'")).toBe(
        12,
      );
      expect(
        await count(
          'extraction_records',
          "completeness = 'complete' AND extractor_name='unpdf'",
        ),
      ).toBe(12);
      expect(
        await count(
          'processing_jobs',
          "status = 'failed' OR status='pending' OR status='processing'",
        ),
      ).toBe(0);
      expect(
        await count(
          'sync_attempts',
          "status = 'failed' OR status='pending' OR status='processing'",
        ),
      ).toBe(0);
      expect(await count('items', 'notion_page_id IS NOT NULL')).toBe(24);
      expect(await scheduler.notionPages()).toHaveLength(24);
      for (const original of originalManifest.filter(
        (entry) => entry.type === 'file',
      )) {
        const object = await env.ATTACHMENTS.get(original.source);
        expect(await bg29PdfSha256(await object!.arrayBuffer())).toBe(
          original.sha256,
        );
      }
      expect(network).not.toHaveBeenCalled();
      console.log(
        JSON.stringify({
          event: 'bg29_offline_actual_worker_pipeline',
          hosted: false,
          clock: 'logical-stage-sweeps-no-real-hour-claim',
          originals: 24,
          sweeps: snapshots,
          real_pdf_extraction: true,
          real_url_worker: true,
          mock_ai: true,
          mock_notion: true,
        }),
      );
    } finally {
      network.mockRestore();
    }
  }, 120_000);
});
