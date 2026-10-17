import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/env';
import { EnrichService } from '../src/jobs/enrich.service';
import { JobService } from '../src/jobs/job.service';
import { SourceAcquisitionService } from '../src/jobs/extraction/source-acquisition.service';
import { processNotionSyncJobs } from '../src/sync/sync.worker';
import { OperationsSummaryService } from '../src/jobs/operations-summary.service';

const URL_ITEMS = 12;
const FILE_ITEMS = 12;
const BATCH_SIZE = 10;
const ONE_HOUR_MS = 3_600_000;

describe('BG-29 actual D1 queue handoffs under synthetic hourly cadence', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
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
  });

  it('records arrival-to-final-sync delay across acquisition/extraction, enrichment and sync queues', async () => {
    const zero = new Date(Date.now() + 2_000);
    const initial = zero.toISOString();
    const jobs = new JobService(env.DB);
    const mockEnv = {
      ...(env as unknown as Record<string, unknown>),
      MOCK_AI_ENABLED: 'true',
      AI_PROVIDER_DEFAULT: 'openrouter',
      AI_PROVIDERS_ENABLED: 'openrouter',
      AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    } as Env;
    const phaseMs = { acquisition: 0, extraction: 0, enrichment: 0, sync: 0 };
    const accepted = new Set<string>();

    for (let n = 0; n < URL_ITEMS + FILE_ITEMS; n += 1) {
      const isUrl = n < URL_ITEMS;
      const id = `bg29-pipeline-item-${n}`;
      await env.DB.prepare(
        `INSERT INTO items (
          id, idempotency_key, source_type, source_app, source_url,
          privacy_level, processing_status, captured_at, created_at, updated_at
        ) VALUES (?1, ?2, ?3, 'BG29 isolated queue', ?4, 'public',
          'pending', ?5, ?5, ?5)`,
      ).bind(
        id, `bg29-pipeline-idempotency-${n}`,
        isUrl ? 'url' : 'file',
        isUrl ? `https://example.com/bg29-fixture-${n}` : null,
        initial,
      ).run();
      if (!isUrl) {
        await env.DB.prepare(
          `INSERT INTO attachments (
            id, item_id, object_key, size_bytes, declared_content_type,
            file_name, status, expires_at, created_at, updated_at
          ) VALUES (?1, ?2, ?3, 128, 'application/pdf', 'fixture.pdf',
            'linked', ?4, ?5, ?5)`,
        ).bind(
          `bg29-attachment-${n}`, id, `bg29-fixture-${n}`,
          new Date(zero.getTime() + 86_400_000).toISOString(), initial,
        ).run();
      }
      await env.DB.prepare(
        `INSERT INTO processing_jobs (
          id, item_id, job_type, status, attempts, available_at,
          created_at, updated_at, input_hash, privacy_level_snapshot,
          provider_eligibility, policy_version, credential_source,
          hosted_processing_consent, zero_data_retention_required,
          data_collection_denied
        ) VALUES (?1, ?2, ?3, 'pending', 0, ?4, ?4, ?4,
          ?5, 'public', 'openrouter', 'BG29', 'app_managed', 0, 0, 1)`,
      ).bind(
        `bg29-stage-job-${n}`, id, isUrl ? 'acquire_url' : 'extract',
        initial, isUrl ? 'url-source-v1:1' : 'fixture',
      ).run();
      accepted.add(id);
    }

    const initialState = await new OperationsSummaryService(env.DB).status(zero);
    expect(initialState.backlog.groups.filter(
      (group) => group.status === 'pending',
    ).reduce((total, group) => total + group.count, 0)).toBe(24);

    const completedPerTick: Array<{
      tick: number; acquisition: number; extraction: number;
      enrichment: number; sync: number; remaining: number;
    }> = [];
    const oldestPendingByTick: Array<number | null> = [];
    let lastSyncHour = -1;
    const localStarted = performance.now();

    for (let tick = 0; tick < 9; tick += 1) {
      const at = new Date(zero.getTime() + tick * ONE_HOUR_MS);
      const owner = `bg29-hour-${tick}`;

      const acquire = await jobs.leaseProcessingJobs(
        'acquire_url', owner + '-url', 5, BATCH_SIZE, at,
      );
      const acquisitionStart = performance.now();
      const fetcher = vi.fn(async () => ({
        status: 'acquired_text' as const,
        coverage: 'acquired_text' as const,
        retryable: false,
        fetchedFinalUrl: 'https://example.com/bg29-final',
        httpStatus: 200,
        contentType: 'text/html',
        responseBytes: 140,
        redirectCount: 0,
        acquiredText: 'Synthetic acquisition evidence used for mocked enrichment.',
        extractedCharacters: 60,
      }));
      const sourceService = new SourceAcquisitionService(env.DB, {
        fetcher: { fetch: fetcher },
        now: () => new Date(at.getTime() + 500),
      });
      for (const job of acquire) {
        expect(await sourceService.process(job, owner + '-url')).toBe(true);
      }
      expect(fetcher).toHaveBeenCalledTimes(acquire.length);
      phaseMs.acquisition += performance.now() - acquisitionStart;

      const extraction = await jobs.leaseProcessingJobs(
        'extract', owner + '-extract', 5, BATCH_SIZE, at,
      );
      const extractionStart = performance.now();
      for (const job of extraction) {
        expect(await jobs.submitExtractionResults(
          job.id, owner + '-extract', job.itemId,
          [{
            attachmentId: job.itemId.replace('bg29-pipeline-item-', 'bg29-attachment-'),
            extractorName: 'unpdf', extractorVersion: 'BG29-injected-fixture',
            extractedText: 'Synthetic PDF extraction evidence for mocked enrichment.',
            pageCount: 1, completeness: 'complete', coverage: 'full',
          }], true, new Date(at.getTime() + 500),
        )).toBe(true);
      }
      phaseMs.extraction += performance.now() - extractionStart;

      const enrich = await jobs.leaseProcessingJobs(
        'enrich', owner + '-enrich', 5, BATCH_SIZE, at,
      );
      const enrichmentStart = performance.now();
      const enrichmentService = new EnrichService(mockEnv, env.DB);
      for (const job of enrich) {
        expect(await enrichmentService.processEnrichmentJob(
          job, owner + '-enrich',
        )).toBe(true);
        // Simulated downstream stage starts after enrichment; in the actual
        // capture flow Notion may be independently scheduled at capture time.
        await env.DB.prepare(
          `INSERT INTO sync_attempts (
            id, item_id, destination, status, attempts, available_at,
            created_at, updated_at
          ) VALUES (?1, ?2, 'notion', 'pending', 0, ?3, ?3, ?3)`,
        ).bind(
          `bg29-sync-${job.itemId}`, job.itemId,
          new Date(at.getTime() + 500).toISOString(),
        ).run();
      }
      phaseMs.enrichment += performance.now() - enrichmentStart;

      let outboundCalls = 0;
      const notionFetch = vi.fn<typeof fetch>().mockImplementation(async () => {
        outboundCalls += 1;
        if (outboundCalls % 2 === 1) {
          return new Response(JSON.stringify({ results: [] }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({
          id: `bg29-synthetic-notion-page-${tick}-${outboundCalls}`,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
      const syncStart = performance.now();
      await processNotionSyncJobs(env.DB, 'fixture-local-token', 'fixture-db', {
        now: () => new Date(at.getTime() + 1_000),
        fetcher: notionFetch, batchSize: 25,
      });
      phaseMs.sync += performance.now() - syncStart;

      const ready = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM processing_jobs
         WHERE status IN ('pending', 'processing')`,
      ).first<{ count: number }>();
      const synced = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM sync_attempts
         WHERE status = 'complete'`,
      ).first<{ count: number }>();
      const pendingSync = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM sync_attempts
         WHERE status IN ('pending', 'processing')`,
      ).first<{ count: number }>();
      const completed = await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM items
         WHERE notion_page_id IS NOT NULL`,
      ).first<{ count: number }>();
      if (completed?.count === URL_ITEMS + FILE_ITEMS && lastSyncHour < 0) {
        lastSyncHour = tick;
      }
      completedPerTick.push({
        tick, acquisition: acquire.length, extraction: extraction.length,
        enrichment: enrich.length,
        sync: (synced?.count ?? 0) -
          completedPerTick.reduce((total, t) => total + t.sync, 0),
        remaining: (ready?.count ?? 0) + (pendingSync?.count ?? 0),
      });
      const oldest = await env.DB.prepare(
        `SELECT MIN(created_at) AS oldest FROM processing_jobs
         WHERE status = 'pending'`,
      ).first<{ oldest: string | null }>();
      oldestPendingByTick.push(
        oldest?.oldest
          ? Math.max(0, at.getTime() - new Date(oldest.oldest).getTime()) / 60000
          : null,
      );
      if (completed?.count === URL_ITEMS + FILE_ITEMS && ready?.count === 0 &&
          pendingSync?.count === 0) break;
    }

    const allSynced = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM items WHERE notion_page_id IS NOT NULL`,
    ).first<{ count: number }>();
    const preserved = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM items
       WHERE source_app = 'BG29 isolated queue' AND deleted_at IS NULL`,
    ).first<{ count: number }>();
    const failures = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM processing_jobs WHERE status = 'failed'`,
    ).first<{ count: number }>();
    expect(preserved?.count).toBe(accepted.size);
    expect(allSynced?.count).toBe(accepted.size);
    expect(failures?.count).toBe(0);
    expect(lastSyncHour).toBeGreaterThan(0);

    console.log(JSON.stringify({
      event: 'bg29_multi_stage_local_drain',
      environment: 'isolated-workerd-D1-real-job-service-mocked-provider',
      item_count: accepted.size,
      url_items: URL_ITEMS, file_items: FILE_ITEMS,
      worker_processing_batch_limit: BATCH_SIZE,
      notion_sync_batch_limit: 25,
      phase_wall_ms: Object.fromEntries(
        Object.entries(phaseMs).map(([name, value]) =>
          [name, Math.round(value * 100) / 100]),
      ),
      actual_test_wall_ms: Math.round((performance.now() - localStarted) * 100) / 100,
      logical_hourly_sweeps_until_clear: lastSyncHour + 1,
      logical_elapsed_to_clear_hours: lastSyncHour,
      oldest_pending_minutes_by_sweep: oldestPendingByTick,
      sweeps: completedPerTick,
      original_count: preserved?.count, failed_processing_jobs: failures?.count,
      limitations:
        '60-minute scheduler intervals are logical, not elapsed wall time. ' +
        'Acquisition uses injected fetch, extraction uses injected text, ' +
        'AI uses mock adapter, and Notion uses mocked responses. ' +
        'Direct production D1 queue methods and chaining are exercised; ' +
        'this does not invoke the hosted cron handler or measure external-provider/real scheduling lag.',
    }));
  }, 120_000);
});
