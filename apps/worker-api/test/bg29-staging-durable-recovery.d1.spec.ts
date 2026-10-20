import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBg29StagingScheduler } from '../src/bg29-staging-scheduler';
import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import { BG29_STAGING_URLS } from '../src/jobs/extraction/bg29-staging-source';
import { provisionBg29StagingNotionSchema } from '../src/sync/bg29-staging-durable-notion';
import { seedBg29TwentyFour } from './fixtures/bg29-24-capture-seed';

function bindings(): Cloudflare.Env {
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

async function reset(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM bg29_mock_notion_requests'),
    env.DB.prepare('DELETE FROM bg29_mock_notion_pages'),
    env.DB.prepare('DELETE FROM bg29_mock_failure_injections'),
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

async function sweep(now: Date): Promise<void> {
  // Every call recreates the injected transports, just like a new Cron isolate.
  const instance = createBg29StagingScheduler(bindings(), {
    url503For: BG29_STAGING_URLS[0],
    notion429For: 'bg29-078-url-01',
    now: () => new Date(now),
  });
  const pending: Promise<unknown>[] = [];
  await instance.scheduled(
    { cron: BACKGROUND_CRON, scheduledTime: now.getTime() } as ScheduledController,
    bindingsWithSharedDb,
    {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    } as ExecutionContext,
  );
  expect(pending).toHaveLength(8);
  const outcomes = await Promise.allSettled(pending);
  expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toEqual([]);
}

let bindingsWithSharedDb: Cloudflare.Env;

describe('BG-29.078 durable isolated 503 / 429 / stale lease recovery', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    await provisionBg29StagingNotionSchema(env.DB);
  });
  beforeEach(async () => {
    await reset();
    bindingsWithSharedDb = bindings();
  });

  it('recovers bounded one-shot failures across independent Worker isolates and preserves originals', async () => {
    const originals = await seedBg29TwentyFour(env.DB, env.ATTACHMENTS);
    const initial = new Date(Date.now() + 2_000);
    const expired = new Date(Date.now() - 10_000).toISOString();
    const firstUrlId = 'bg29-078-url-01';
    const staleUrlId = 'bg29-078-url-02';
    const staleSyncId = 'bg29-078-url-03';

    // Simulate a previous Worker crash without bypassing JobService lease recovery.
    await env.DB.prepare(
      "UPDATE processing_jobs SET status = 'processing', lease_owner = 'dead-worker', lease_expires_at = ?1 WHERE item_id = ?2 AND job_type = 'acquire_url'"
    ).bind(expired, staleUrlId).run();
    await env.DB.prepare(
      "UPDATE sync_attempts SET status = 'processing', lease_owner = 'dead-notion-worker', lease_expires_at = ?1 WHERE item_id = ?2"
    ).bind(expired, staleSyncId).run();

    const network = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('BG29_LIVE_NETWORK_FORBIDDEN'));
    try {
      await sweep(initial);
      const urlRetry = await env.DB.prepare(
        "SELECT id, status, attempts, last_error_code, available_at FROM processing_jobs WHERE item_id = ?1 AND job_type = 'acquire_url'"
      ).bind(firstUrlId).first<{
        id: string; status: string; attempts: number; last_error_code: string;
        available_at: string;
      }>();
      expect(urlRetry).toMatchObject({
        status: 'pending', attempts: 1, last_error_code: 'SOURCE_SERVER_ERROR',
      });
      expect(Date.parse(urlRetry!.available_at)).toBeGreaterThan(initial.getTime());

      const notionRetry = await env.DB.prepare(
        "SELECT id, status, attempts, last_error_code, retry_after_at, available_at FROM sync_attempts WHERE item_id = ?1"
      ).bind(firstUrlId).first<{
        id: string; status: string; attempts: number; last_error_code: string;
        retry_after_at: string; available_at: string;
      }>();
      expect(notionRetry).toMatchObject({
        status: 'pending', attempts: 1, last_error_code: 'NOTION_RATE_LIMITED',
      });
      expect(notionRetry?.retry_after_at).toBe(notionRetry?.available_at);
      expect(notionRetry?.available_at).toBe(
        new Date(initial.getTime() + 5_000).toISOString(),
      );

      // An immediate independent Cron cannot prematurely reclaim either job.
      await sweep(new Date(initial.getTime() + 500));
      const retryBefore = await env.DB.prepare(
        "SELECT attempts FROM processing_jobs WHERE id = ?1"
      ).bind(urlRetry!.id).first<{ attempts: number }>();
      const syncBefore = await env.DB.prepare(
        "SELECT attempts FROM sync_attempts WHERE id = ?1"
      ).bind(notionRetry!.id).first<{ attempts: number }>();
      expect(retryBefore?.attempts).toBe(1);
      expect(syncBefore?.attempts).toBe(1);

      for (let i = 0; i < 8; i++) {
        await sweep(new Date(initial.getTime() + 7_000 + i * 10_000));
        const left = await env.DB.prepare(
          "SELECT (SELECT COUNT(*) FROM processing_jobs WHERE status IN ('pending','processing','failed')) + (SELECT COUNT(*) FROM sync_attempts WHERE status IN ('pending','processing','failed')) AS total"
        ).first<{ total: number }>();
        if (left?.total === 0) break;
      }

      const finalJobs = await env.DB.prepare(
        "SELECT status, attempts FROM processing_jobs WHERE item_id = ?1 AND job_type = 'acquire_url'"
      ).bind(firstUrlId).first<{ status: string; attempts: number }>();
      const finalSync = await env.DB.prepare(
        "SELECT status, attempts FROM sync_attempts WHERE id = ?1"
      ).bind(notionRetry!.id).first<{ status: string; attempts: number }>();
      expect(finalJobs).toEqual({ status: 'complete', attempts: 2 });
      expect(finalSync).toEqual({ status: 'complete', attempts: 2 });

      const claims = await env.DB.prepare(
        "SELECT fault_key FROM bg29_mock_failure_injections ORDER BY fault_key"
      ).all<{ fault_key: string }>();
      expect(claims.results.map((entry) => entry.fault_key)).toEqual([
        'notion429:bg29-078-url-01',
        `url503:${BG29_STAGING_URLS[0]}`,
      ]);
      const requests = await createBg29StagingScheduler(bindings()).notionRequests();
      expect(requests.filter((entry) => entry.status === 429)).toHaveLength(1);
      const pages = await createBg29StagingScheduler(bindings()).notionPages();
      expect(pages).toHaveLength(24);
      expect(pages.every((page) => page.createCount === 1)).toBe(true);
      expect(requests.some((entry) => entry.method === 'PATCH')).toBe(true);

      for (const id of [staleUrlId, staleSyncId]) {
        const recovery = await env.DB.prepare(
          "SELECT details_json FROM audit_events WHERE item_id = ?1 AND event_type IN ('lease_acquired', 'sync_lease_acquired')"
        ).bind(id).all<{ details_json: string }>();
        expect(recovery.results.some((entry) =>
          JSON.parse(entry.details_json).stale_recovery === true
        )).toBe(true);
      }

      const failed = await env.DB.prepare(
        "SELECT (SELECT COUNT(*) FROM processing_jobs WHERE status != 'complete') + (SELECT COUNT(*) FROM sync_attempts WHERE status != 'complete') AS total"
      ).first<{ total: number }>();
      expect(failed?.total).toBe(0);
      const originalsCount = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM items WHERE source_app='BG29-078 sealed fixtures' AND deleted_at IS NULL"
      ).first<{ count: number }>();
      expect(originalsCount?.count).toBe(24);
      expect(originals).toHaveLength(24);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  }, 120_000);
});
