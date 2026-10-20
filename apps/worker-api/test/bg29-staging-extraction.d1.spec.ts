import { provisionBg29StagingNotionSchema } from '../src/sync/bg29-staging-durable-notion';
import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBg29StagingScheduler } from '../src/bg29-staging-scheduler';
import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import {
  createBg29PdfFixture,
  bg29PdfSentinel,
  bg29PdfSha256,
} from './fixtures/bg29-synthetic-pdf';

function fixtureBindings(): Cloudflare.Env {
  return {
    DB: env.DB,
    ATTACHMENTS: env.ATTACHMENTS,
    MAX_ATTACHMENT_BYTES: '25000000',
    UPLOAD_TTL_SECONDS: '3600',
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    DIGEST_AI_ENABLED: 'false',
    HOSTED_BACKUP_AUTOCREATE_ENABLED: 'false',
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
  for (let i = 1; i <= 12; i++) {
    await env.ATTACHMENTS.delete(
      `bg29-078/file-${String(i).padStart(2, '0')}/original.pdf`,
    );
  }
}

async function seedFiles() {
  const originals = new Map<string, string>();
  const now = new Date(Date.now() - 60_000).toISOString();
  for (let i = 1; i <= 12; i++) {
    const n = String(i).padStart(2, '0');
    const id = `bg29-078-file-${n}`;
    const key = `bg29-078/file-${n}/original.pdf`;
    const pdf = createBg29PdfFixture(i);
    const hash = await bg29PdfSha256(pdf);
    originals.set(key, hash);
    await env.ATTACHMENTS.put(key, pdf, {
      httpMetadata: { contentType: 'application/pdf' },
    });
    await env.DB.prepare(
      `INSERT INTO items
       (id, idempotency_key, source_type, source_app, privacy_level,
        processing_status, captured_at, created_at, updated_at)
       VALUES (?1, ?2, 'file', 'BG29 staged file', 'public', 'pending', ?3, ?3, ?3)`,
    )
      .bind(id, `bg29-staging-idempotency-${n}`, now)
      .run();
    await env.DB.prepare(
      `INSERT INTO attachments
       (id, item_id, object_key, size_bytes, content_hash,
        declared_content_type, detected_content_type, file_name, status,
        expires_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'application/pdf', 'application/pdf',
        'synthetic.pdf', 'linked', ?6, ?7, ?7)`,
    )
      .bind(
        `bg29-staging-attachment-${n}`,
        id,
        key,
        pdf.byteLength,
        hash,
        new Date(Date.now() + 86_400_000).toISOString(),
        now,
      )
      .run();
    await env.DB.prepare(
      `INSERT INTO processing_jobs
       (id, item_id, job_type, status, attempts, available_at,
        created_at, updated_at, input_hash, privacy_level_snapshot,
        provider_eligibility, policy_version, credential_source,
        hosted_processing_consent, zero_data_retention_required,
        data_collection_denied)
       VALUES (?1, ?2, 'extract', 'pending', 0, ?3, ?3, ?3,
         ?4, 'public', 'openrouter', 'BG29-staging', 'none', 0, 0, 1)`,
    )
      .bind(`bg29-staging-extract-${n}`, id, now, hash)
      .run();
  }
  return originals;
}

async function scheduledSweep(
  schedule: ReturnType<typeof createBg29StagingScheduler>,
  bindings: Cloudflare.Env,
) {
  const work: Promise<unknown>[] = [];
  const context = {
    waitUntil: (promise: Promise<unknown>) => {
      work.push(promise);
    },
  } as unknown as ExecutionContext;
  await schedule.scheduled(
    { cron: BACKGROUND_CRON, scheduledTime: Date.now() } as ScheduledController,
    bindings,
    context,
  );
  expect(work).toHaveLength(8);
  const results = await Promise.allSettled(work);
  expect(results.filter((result) => result.status === 'rejected')).toEqual([]);
}

describe('BG-29.078 genuine extraction inside isolated staging scheduler', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
    await provisionBg29StagingNotionSchema(env.DB);
  });
  beforeEach(reset);

  it('preserves all 12 original hashes while the real PDF worker drains its batches', async () => {
    const originals = await seedFiles();
    const bindings = fixtureBindings();
    const scheduler = createBg29StagingScheduler(bindings);
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('UNAUTHORIZED_NETWORK'));
    try {
      for (let sweep = 0; sweep < 3; sweep++)
        await scheduledSweep(scheduler, bindings);
      const extracted = await env.DB.prepare(
        `SELECT item_id, extracted_text, completeness, extractor_name
         FROM extraction_records ORDER BY item_id`,
      ).all<{
        item_id: string;
        extracted_text: string | null;
        completeness: string;
        extractor_name: string;
      }>();
      expect(extracted.results).toHaveLength(12);
      extracted.results.forEach((record, index) => {
        expect(record.item_id).toBe(
          `bg29-078-file-${String(index + 1).padStart(2, '0')}`,
        );
        expect(record.extracted_text).toContain(bg29PdfSentinel(index + 1));
        expect(record.completeness).toBe('complete');
        expect(record.extractor_name).toBe('unpdf');
      });
      const jobs = await env.DB.prepare(
        `SELECT status, COUNT(*) AS total FROM processing_jobs
         WHERE job_type = 'extract' GROUP BY status`,
      ).all<{ status: string; total: number }>();
      expect(jobs.results).toEqual([{ status: 'complete', total: 12 }]);
      const originalCount = await env.DB.prepare(
        `SELECT COUNT(*) AS total FROM items WHERE source_app = 'BG29 staged file'
         AND deleted_at IS NULL AND raw_text IS NULL`,
      ).first<{ total: number }>();
      expect(originalCount?.total).toBe(12);
      for (const [key, expected] of originals) {
        const object = await env.ATTACHMENTS.get(key);
        expect(await bg29PdfSha256(await object!.arrayBuffer())).toBe(expected);
      }
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  }, 120_000);

  it('blocks any extraction job that points outside the exact staged PDF directory', async () => {
    await seedFiles();
    await env.DB.prepare(
      `UPDATE attachments SET object_key = 'user-upload/file.pdf'
       WHERE item_id = 'bg29-078-file-01'`,
    ).run();
    const bindings = fixtureBindings();
    const scheduler = createBg29StagingScheduler(bindings);
    const work: Promise<unknown>[] = [];
    await scheduler.scheduled(
      {
        cron: BACKGROUND_CRON,
        scheduledTime: Date.now(),
      } as ScheduledController,
      bindings,
      {
        waitUntil: (promise: Promise<unknown>) => {
          work.push(promise);
        },
      } as ExecutionContext,
    );
    const outcomes = await Promise.allSettled(work);
    expect(
      outcomes.some(
        (result) =>
          result.status === 'rejected' &&
          String(result.reason).includes('unapproved R2 PDF source'),
      ),
    ).toBe(true);
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM extraction_records',
    ).first<{ total: number }>();
    expect(count?.total).toBe(0);
  }, 120_000);
});
