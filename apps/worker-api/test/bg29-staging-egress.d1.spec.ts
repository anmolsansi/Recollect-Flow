import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import { createBg29StagingScheduler } from '../src/bg29-staging-scheduler';

function isolatedEnv(): Cloudflare.Env {
  return {
    DB: env.DB,
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    DIGEST_AI_ENABLED: 'false',
    HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
    WEB_INBOX_BASE_URL: 'https://invalid.test',
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
  } as unknown as Cloudflare.Env;
}

function controller(): ScheduledController {
  return {
    cron: BACKGROUND_CRON,
    scheduledTime: Date.now(),
    noRetry: vi.fn(),
  } as unknown as ScheduledController;
}

async function runSweep(
  scheduler: ReturnType<typeof createBg29StagingScheduler>,
  bindings: Cloudflare.Env,
): Promise<PromiseSettledResult<unknown>[]> {
  const pending: Promise<unknown>[] = [];
  const context = {
    waitUntil: (promise: Promise<unknown>) => pending.push(promise),
  } as unknown as ExecutionContext;
  await scheduler.scheduled(controller(), bindings, context);
  expect(pending).toHaveLength(8);
  return Promise.allSettled(pending);
}

async function reset() {
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
}

async function seedUrlAndSync(): Promise<void> {
  const id = 'bg29-078-url-01';
  const at = new Date(Date.now() - 60_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO items (
      id, idempotency_key, source_type, source_app, source_url,
      privacy_level, processing_status, captured_at, created_at, updated_at
    ) VALUES (?1, ?2, 'url', 'BG29 Step4 isolated', ?3,
      'public', 'pending', ?4, ?4, ?4)`,
  )
    .bind(
      id,
      'bg29-step4-url-01-idempotency',
      'https://example.com/bg29-078/source-01',
      at,
    )
    .run();
  await env.DB.prepare(
    `INSERT INTO processing_jobs (
      id, item_id, job_type, status, attempts, available_at,
      created_at, updated_at, input_hash, privacy_level_snapshot,
      provider_eligibility, policy_version, credential_source,
      hosted_processing_consent, zero_data_retention_required,
      data_collection_denied
    ) VALUES (?1, ?2, 'acquire_url', 'pending', 0, ?3,
      ?3, ?3, 'url-source-v1:1', 'public', 'openrouter', 'BG29-step4',
      'none', 0, 0, 1)`,
  )
    .bind('bg29-step4-acquire-01', id, at)
    .run();
  await env.DB.prepare(
    `INSERT INTO sync_attempts (
       id, item_id, destination, status, attempts,
       available_at, created_at, updated_at
     ) VALUES (?1, ?2, 'notion', 'pending', 0, ?3, ?3, ?3)`,
  )
    .bind('bg29-step4-notion-01', id, at)
    .run();
}

describe('BG-29.078 Step 4 staging integration is offline-only', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });
  beforeEach(reset);

  it('uses the real URL, enrich and sync workers, deterministic mocks, and zero real fetch calls', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('UNAUTHORIZED_NETWORK_EGRESS'));
    try {
      await seedUrlAndSync();
      const bindings = isolatedEnv();
      const scheduler = createBg29StagingScheduler(bindings);

      const first = await runSweep(scheduler, bindings);
      const second = await runSweep(scheduler, bindings);
      const all = [...first, ...second];
      expect(all.filter((result) => result.status === 'rejected')).toEqual([]);

      const row = await env.DB.prepare(
        `SELECT source_url, raw_text, summary, notion_page_id
         FROM items WHERE id = 'bg29-078-url-01'`,
      ).first<{
        source_url: string;
        raw_text: string;
        summary: string;
        notion_page_id: string;
      }>();
      expect(row?.source_url).toBe('https://example.com/bg29-078/source-01');
      // URL acquisition preserves the item's original raw_text. It stores
      // the fetched source in url_acquisitions rather than overwriting it.
      expect(row?.raw_text).toBeNull();
      const acquired = await env.DB.prepare(
        `SELECT acquired_text, status FROM url_acquisitions
         WHERE item_id = 'bg29-078-url-01'`,
      ).first<{ acquired_text: string; status: string }>();
      expect(acquired?.status).toBe('acquired_text');
      expect(acquired?.acquired_text).toContain(
        'BG29_STAGING_URL_SENTINEL_01',
      );
      expect(row?.summary).toBe('Mock summary');
      expect(row?.notion_page_id).toBe('bg29-mock-page-bg29-078-url-01');

      const jobs = await env.DB.prepare(
        `SELECT job_type, status FROM processing_jobs
         WHERE item_id = 'bg29-078-url-01' ORDER BY job_type`,
      ).all<{ job_type: string; status: string }>();
      expect(jobs.results).toEqual([
        { job_type: 'acquire_url', status: 'complete' },
        { job_type: 'enrich', status: 'complete' },
      ]);
      expect(scheduler.notionPages()).toHaveLength(1);
      expect(
        scheduler
          .notionRequests()
          .some(
            (request) => request.method === 'POST' && request.status === 200,
          ),
      ).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('refuses to treat unfinished R2 PDF extraction as complete', async () => {
    const bindings = isolatedEnv();
    const scheduler = createBg29StagingScheduler(bindings);
    const at = new Date(Date.now() - 60_000).toISOString();
    await env.DB.prepare(
      `INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level,
        processing_status, captured_at, created_at, updated_at
      ) VALUES ('bg29-078-file-01', 'bg29-step4-file-01', 'file',
        'BG29 Step4 isolated', 'public', 'pending', ?1, ?1, ?1)`,
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      `INSERT INTO processing_jobs (
        id, item_id, job_type, status, attempts, available_at,
        created_at, updated_at, input_hash, privacy_level_snapshot,
        provider_eligibility, policy_version, credential_source,
        hosted_processing_consent, zero_data_retention_required,
        data_collection_denied
      ) VALUES ('bg29-step4-extract-01', 'bg29-078-file-01',
        'extract', 'pending', 0, ?1, ?1, ?1, 'fixture',
        'public', 'openrouter', 'BG29-step4', 'none', 0, 0, 1)`,
    )
      .bind(at)
      .run();

    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('UNAUTHORIZED_NETWORK_EGRESS'));
    try {
      const outcomes = await runSweep(scheduler, bindings);
      expect(
        outcomes.some(
          (result) =>
            result.status === 'rejected' &&
            String(result.reason).includes('R2 extraction not configured'),
        ),
      ).toBe(true);
      const job = await env.DB.prepare(
        `SELECT status FROM processing_jobs WHERE id='bg29-step4-extract-01'`,
      ).first<{ status: string }>();
      expect(job?.status).toBe('pending');
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
