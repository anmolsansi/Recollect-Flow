import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import type { Env } from '../src/env';
import { EnrichService } from '../src/jobs/enrich.service';
import { JobService } from '../src/jobs/job.service';
import { OperationsSummaryService } from '../src/jobs/operations-summary.service';
import { executeSearch } from '../src/search/search.service';
import { processNotionSyncJobs } from '../src/sync/sync.worker';

const app = createApp();

function outageEnv(): Env {
  return {
    ...(env as unknown as Record<string, unknown>),
    MOCK_AI_ENABLED: 'false',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"openrouter"}',
    OPENROUTER_API_KEY: undefined,
    NOTION_ACCESS_TOKEN: '',
  } as Env;
}

describe('BG-29 coupled optional-dependency outage and recovery', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM provider_usage'),
      env.DB.prepare('DELETE FROM audit_events'),
      env.DB.prepare('DELETE FROM processing_job_results'),
      env.DB.prepare('DELETE FROM processing_jobs'),
      env.DB.prepare('DELETE FROM sync_attempts'),
      env.DB.prepare('DELETE FROM capture_events'),
      env.DB.prepare('DELETE FROM item_deduplication_keys'),
      env.DB.prepare('DELETE FROM items'),
    ]);
  });

  it('acknowledges original capture/search during both failures, then drains same jobs after restoration', async () => {
    const marker = 'bg29coupledoutageoriginal';
    const runtime = outageEnv();
    const at = new Date();
    const raw = `Public synthetic phrase ${marker} must stay available`;
    const captured = await app.request(
      '/api/v1/captures',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-capture-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: 'bg29-coupled-outage-stable-key',
          source_type: 'text',
          source_app: 'BG29 isolated',
          shared_text: raw,
          privacy_level: 'public',
          captured_at: at.toISOString(),
          client: { name: 'vitest', version: '1.0' },
        }),
      },
      runtime,
    );
    expect(captured.status).toBe(201);
    const body = await captured.json<{
      data: { capture_id: string; status: string };
    }>();
    expect(body.data.status).toBe('saved');
    const id = body.data.capture_id;
    const original = await env.DB.prepare(
      'SELECT raw_text FROM items WHERE id = ?1',
    )
      .bind(id)
      .first<{ raw_text: string }>();
    expect(original?.raw_text).toBe(raw);
    expect(
      (await executeSearch(env.DB, { q: marker, limit: 10 })).data.map(
        (result) => result.id,
      ),
    ).toContain(id);

    const scheduled = await env.DB.prepare(
      "SELECT status FROM processing_jobs WHERE item_id = ?1 AND job_type = 'enrich'",
    )
      .bind(id)
      .first<{ status: string }>();
    expect(scheduled?.status).toBe('pending');
    // The server persists available_at at acknowledgment time. The client
    // capture timestamp can precede that server timestamp by milliseconds.
    const outageAt = new Date(Date.now() + 2000);
    const jobs = new JobService(env.DB);
    const claimed = await jobs.leaseProcessingJobs(
      'enrich',
      'bg29-down-ai',
      5,
      10,
      outageAt,
    );
    expect(claimed).toHaveLength(1);
    expect(
      await new EnrichService(runtime, env.DB).processEnrichmentJob(
        claimed[0]!,
        'bg29-down-ai',
      ),
    ).toBe(false);
    const deferred = await env.DB.prepare(
      `SELECT status, last_error_code, available_at FROM processing_jobs
       WHERE item_id = ?1 AND job_type = 'enrich'`,
    )
      .bind(id)
      .first<{
        status: string;
        last_error_code: string;
        available_at: string;
      }>();
    expect(deferred?.status).toBe('pending');
    expect(deferred?.last_error_code).toBe('NO_ELIGIBLE_PROVIDER');

    const notionFailure = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'synthetic-notion-unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    await processNotionSyncJobs(env.DB, 'fixture-token', 'fixture-db', {
      now: () => outageAt,
      fetcher: notionFailure,
      batchSize: 1,
    });
    expect(notionFailure).toHaveBeenCalled();
    const deferredNotion = await env.DB.prepare(
      `SELECT status, last_error_code FROM sync_attempts
       WHERE item_id = ?1 AND destination = 'notion'`,
    )
      .bind(id)
      .first<{ status: string; last_error_code: string }>();
    expect(deferredNotion?.status).toBe('pending');
    expect(deferredNotion?.last_error_code).not.toBeNull();
    const during = await new OperationsSummaryService(env.DB).status(outageAt);
    expect(during.backlog.groups.length).toBeGreaterThan(0);
    expect(
      (
        await env.DB.prepare('SELECT raw_text FROM items WHERE id = ?1')
          .bind(id)
          .first<{ raw_text: string }>()
      )?.raw_text,
    ).toBe(raw);

    const restored = {
      ...runtime,
      MOCK_AI_ENABLED: 'true',
      AI_PROVIDERS_ENABLED: 'openrouter',
      AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
    };
    // Advance logical eligibility after the retry delay, not a production
    // clock or quota reset. The same durable job is recovered.
    const afterRetry = new Date(outageAt.getTime() + 26 * 60 * 60_000);
    const recovered = await jobs.leaseProcessingJobs(
      'enrich',
      'bg29-restored-ai',
      5,
      10,
      afterRetry,
    );
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.id).toBe(claimed[0]!.id);
    expect(
      await new EnrichService(restored, env.DB).processEnrichmentJob(
        recovered[0]!,
        'bg29-restored-ai',
      ),
    ).toBe(true);

    const notionRecovered = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'bg29-recovered-page' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    await processNotionSyncJobs(env.DB, 'fixture-token', 'fixture-db', {
      now: () => afterRetry,
      fetcher: notionRecovered,
      batchSize: 1,
    });
    const final = await env.DB.prepare(
      `SELECT raw_text, notion_page_id, processing_status
       FROM items WHERE id = ?1`,
    )
      .bind(id)
      .first<{
        raw_text: string;
        notion_page_id: string | null;
        processing_status: string;
      }>();
    expect(final?.raw_text).toBe(raw);
    expect(final?.processing_status).toBe('complete');
    expect(final?.notion_page_id).toBe('bg29-recovered-page');
    expect(
      (await executeSearch(env.DB, { q: marker, limit: 10 })).data.map(
        (result) => result.id,
      ),
    ).toContain(id);
    const remaining = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM processing_jobs
       WHERE item_id = ?1 AND status != 'complete'`,
    )
      .bind(id)
      .first<{ total: number }>();
    expect(remaining?.total).toBe(0);
    console.log(
      JSON.stringify({
        event: 'bg29_coupled_outage_recovery',
        environment: 'isolated-workerd-d1-mocked-providers',
        acknowledged: 1,
        original_preserved: true,
        ai_jobs_resumed: recovered.length,
        notion_attempts: notionRecovered.mock.calls.length,
        unresolved_processing: remaining?.total,
        caveat:
          'Synthetic logical retry; not real external Notion outage or live hourly cron',
      }),
    );
  }, 120_000);
});
