import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { Env } from '../src/env';
import { EnrichService } from '../src/jobs/enrich.service';
import type { JobRecord } from '../src/jobs/job.service';

const workerEnv: Env = env;

describe('EnrichService (D1 Integration)', () => {
  let enrichService: EnrichService;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!, '../../migrations');
  });

  beforeEach(async () => {
    workerEnv.MOCK_AI_ENABLED = 'true';

    await env.DB.prepare('DELETE FROM processing_jobs').run();
    const tables = [
      'processing_job_results',
      'processing_jobs',
      'audit_events',
      'provider_usage',
      'item_field_overrides',
      'sync_attempts',
      'items',
    ];
    for (const table of tables) {
      await env.DB.prepare(`DELETE FROM ${table}`).run();
    }

    enrichService = new EnrichService(workerEnv, env.DB);
  });

  const insertItem = async (
    id: string,
    overrides: Record<string, unknown> = {},
  ) => {
    const item = {
      id,
      idempotency_key: id,
      source_url: `https://example.com/${id}`,
      canonical_url: `https://example.com/${id}`,
      source_app: 'web',
      source_type: 'url',
      title: null,
      summary: null,
      raw_text: 'Raw content here',
      user_note: 'A user note',
      project: null,
      topics_json: '[]',
      lifecycle_status: 'Inbox',
      processing_status: 'pending',
      privacy_level: 'public',
      importance: 5,
      captured_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };

    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_url, canonical_url, source_app, source_type,
        title, summary, raw_text, user_note, project, topics_json,
        lifecycle_status, processing_status, privacy_level, importance,
        captured_at, created_at, updated_at, deleted_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `,
    )
      .bind(
        item.id,
        item.idempotency_key,
        item.source_url,
        item.canonical_url,
        item.source_app,
        item.source_type,
        item.title,
        item.summary,
        item.raw_text,
        item.user_note,
        item.project,
        item.topics_json,
        item.lifecycle_status,
        item.processing_status,
        item.privacy_level,
        item.importance,
        item.captured_at,
        item.created_at,
        item.updated_at,
        overrides.deleted_at || null,
      )
      .run();
  };

  const insertJob = async (id: string, itemId: string) => {
    await env.DB.prepare(
      `
      INSERT INTO processing_jobs (
        id, item_id, job_type, status, available_at, attempts, created_at, updated_at,
        provider_eligibility, privacy_level_snapshot, hosted_processing_consent, input_hash,
        lease_owner, lease_expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        itemId,
        'enrich',
        'processing',
        new Date().toISOString(),
        1,
        new Date().toISOString(),
        new Date().toISOString(),
        'openrouter',
        'public',
        0,
        'input-hash',
        'owner-1',
        new Date(Date.now() + 60000).toISOString(),
      )
      .run();
  };

  it('successfully enriches an item and logs usage and audit', async () => {
    await insertItem('00000000-0000-0000-0000-000000000001', {
      raw_text: 'Valid text to process',
    });
    await insertJob(
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000001',
    );

    await enrichService.processEnrichmentJob(
      {
        id: '11111111-1111-1111-1111-111111111111',
        itemId: '00000000-0000-0000-0000-000000000001',
      } as unknown as JobRecord,
      'owner-1',
    );

    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
      .bind('00000000-0000-0000-0000-000000000001')
      .first();
    expect(item?.processing_status).toBe('complete');
    expect(item?.title).toBe('Mock Title');

    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('00000000-0000-0000-0000-000000000001')
      .first();
    expect(usage?.provider).toBe('openrouter'); // Based on privacy_level = 'personal'
    expect(usage?.status).toBe('success');

    const audit = await env.DB.prepare(
      'SELECT * FROM audit_events WHERE item_id = ?',
    )
      .bind('00000000-0000-0000-0000-000000000001')
      .first();
    expect(audit?.event_type).toBe('enrichment_completed');

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('11111111-1111-1111-1111-111111111111')
      .first();
    expect(job?.status).toBe('complete');
  });

  it('fails gracefully when provider returns unparseable json', async () => {
    await insertItem('00000000-0000-0000-0000-000000000002', {
      raw_text: 'TRIGGER_REPAIR_ERROR',
    });
    await insertJob(
      '22222222-2222-2222-2222-222222222222',
      '00000000-0000-0000-0000-000000000002',
    );

    await enrichService.processEnrichmentJob(
      {
        id: '22222222-2222-2222-2222-222222222222',
        itemId: '00000000-0000-0000-0000-000000000002',
      } as unknown as JobRecord,
      'owner-1',
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('22222222-2222-2222-2222-222222222222')
      .first();
    // It should be set to pending to retry, since it's a retryable failure and attempts < maxAttempts
    expect(job?.status).toBe('pending');
    expect(job?.last_error_code).toBe('JSON_PARSE_ERROR');

    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('00000000-0000-0000-0000-000000000002')
      .first();
    expect(usage?.status).toBe('failed');
    expect(usage?.error_code).toBe('JSON_PARSE_ERROR');
  });

  it('preserves manual field overrides', async () => {
    await insertItem('00000000-0000-0000-0000-000000000003', {
      raw_text: 'Valid text to process',
      title: 'Manual User Title',
    });
    await insertJob('job-3', '00000000-0000-0000-0000-000000000003');

    // Create an override
    await env.DB.prepare(
      `INSERT INTO item_field_overrides (id, item_id, field_name, override_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        'override-1',
        '00000000-0000-0000-0000-000000000003',
        'title',
        'Manual User Title',
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    await enrichService.processEnrichmentJob(
      {
        id: 'job-3',
        itemId: '00000000-0000-0000-0000-000000000003',
      } as unknown as JobRecord,
      'owner-1',
    );

    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
      .bind('00000000-0000-0000-0000-000000000003')
      .first();
    // Should use the manual override, not the 'Mock Title' from AI
    expect(item?.title).toBe('Manual User Title');
  });

  it('avoids orphaned usage logs if item is deleted during processing (deletion race)', async () => {
    await insertItem('item-4', { raw_text: 'Valid text to process' });
    await insertJob('job-4', 'item-4');

    // We can't strictly pause mid-execution, but we can set the item as deleted BEFORE calling processJob
    // to simulate the query conditions failing
    await env.DB.prepare('UPDATE items SET deleted_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), 'item-4')
      .run();

    await enrichService.processEnrichmentJob(
      { id: 'job-4', itemId: 'item-4' } as unknown as JobRecord,
      'owner-1',
    );

    // Because item is deleted, provider_usage shouldn't be logged since the SELECT WHERE EXISTS fails.
    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('item-4')
      .first();
    expect(usage).toBeNull();
  });

  it('defers job and avoids orphaned usage if provider has outage', async () => {
    await insertItem('item-5', { raw_text: 'TRIGGER_PROVIDER_FAILURE' });
    await insertJob('job-5', 'item-5');

    await enrichService.processEnrichmentJob(
      { id: 'job-5', itemId: 'item-5' } as unknown as JobRecord,
      'owner-1',
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('job-5')
      .first();

    // Outage is a transient error, so it should be pending for a retry.
    expect(job?.status).toBe('pending');
    expect(job?.last_error_code).toBe('PROVIDER_OUTAGE');

    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('item-5')
      .first();
    // Failed usage SHOULD be logged for outages so we track provider availability!
    expect(usage?.status).toBe('failed');
    expect(usage?.error_code).toBe('PROVIDER_OUTAGE');
  });

  it('fails job but updates nothing if job lease is stolen', async () => {
    await insertItem('item-7', { raw_text: 'Valid text' });
    await insertJob('job-7', 'item-7');

    // Steal lease
    await env.DB.prepare(
      'UPDATE processing_jobs SET lease_owner = ? WHERE id = ?',
    )
      .bind('owner-2', 'job-7')
      .run();

    await enrichService.processEnrichmentJob(
      { id: 'job-7', itemId: 'item-7' } as unknown as JobRecord,
      'owner-1',
    );

    // Should fail with ITEM_STATE_CHANGED_DURING_ENRICHMENT
    // and item title should NOT be updated.
    const item = await env.DB.prepare('SELECT title FROM items WHERE id = ?')
      .bind('item-7')
      .first();
    expect(item?.title).toBeNull();
  });

  it('keeps the item and job safely pending when no provider is available', async () => {
    const previousMock = workerEnv.MOCK_AI_ENABLED;
    const previousEnabled = workerEnv.AI_PROVIDERS_ENABLED;
    const previousImplementations = workerEnv.AI_PROVIDER_IMPLEMENTATIONS;
    try {
      workerEnv.MOCK_AI_ENABLED = 'false';
      workerEnv.AI_PROVIDERS_ENABLED = '';
      workerEnv.AI_PROVIDER_IMPLEMENTATIONS = '{}';
      await insertItem('item-no-provider', {
        raw_text: 'Source must remain unchanged',
      });
      await insertJob('job-no-provider', 'item-no-provider');

      const completed = await new EnrichService(
        workerEnv,
        env.DB,
      ).processEnrichmentJob(
        { id: 'job-no-provider', itemId: 'item-no-provider' } as JobRecord,
        'owner-1',
      );
      expect(completed).toBe(false);

      const item = await env.DB.prepare(
        `SELECT raw_text, processing_status FROM items
         WHERE id = 'item-no-provider'`,
      ).first<{ raw_text: string; processing_status: string }>();
      expect(item).toEqual({
        raw_text: 'Source must remain unchanged',
        processing_status: 'pending',
      });

      const job = await env.DB.prepare(
        `SELECT status, last_error_code, available_at FROM processing_jobs
         WHERE id = 'job-no-provider'`,
      ).first<{
        status: string;
        last_error_code: string | null;
        available_at: string;
      }>();
      expect(job?.status).toBe('pending');
      expect(job?.last_error_code).toBe('NO_ELIGIBLE_PROVIDER');
      expect(new Date(job!.available_at).getTime()).toBeGreaterThan(Date.now());

      const usage = await env.DB.prepare(
        `SELECT id FROM provider_usage WHERE item_id = 'item-no-provider'`,
      ).first();
      expect(usage).toBeNull();
    } finally {
      workerEnv.MOCK_AI_ENABLED = previousMock;
      workerEnv.AI_PROVIDERS_ENABLED = previousEnabled;
      workerEnv.AI_PROVIDER_IMPLEMENTATIONS = previousImplementations;
    }
  });
});
