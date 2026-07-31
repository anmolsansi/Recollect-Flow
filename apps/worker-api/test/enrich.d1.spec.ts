import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { EnrichService } from '../src/jobs/enrich.service';
import type { JobRecord } from '../src/jobs/job.service';

describe('EnrichService (D1 Integration)', () => {
  let enrichService: EnrichService;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!, '../../migrations');
  });

  beforeEach(async () => {
    // Enable Mock AI for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).MOCK_AI_ENABLED = 'true';

    await env.DB.prepare('DELETE FROM processing_jobs').run();
    const tables = [
      'processing_job_results',
      'processing_jobs',
      'audit_events',
      'provider_usage',
      'item_field_overrides',
      'extraction_records',
      'sync_attempts',
      'items',
    ];
    for (const table of tables) {
      await env.DB.prepare(`DELETE FROM ${table}`).run();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrichService = new EnrichService(env as any, env.DB);
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
    await insertItem('item-1', { raw_text: 'Valid text to process' });
    await insertJob('job-1', 'item-1');

    await enrichService.processEnrichmentJob(
      { id: 'job-1', itemId: 'item-1' } as unknown as JobRecord,
      'owner-1',
    );

    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
      .bind('item-1')
      .first();
    expect(item?.processing_status).toBe('complete');
    expect(item?.title).toBe('Mock Title');

    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('item-1')
      .first();
    expect(usage?.provider).toBe('openrouter'); // Based on privacy_level = 'personal'
    expect(usage?.status).toBe('success');

    const audit = await env.DB.prepare(
      'SELECT * FROM audit_events WHERE item_id = ?',
    )
      .bind('item-1')
      .first();
    expect(audit?.event_type).toBe('enrichment_completed');

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('job-1')
      .first();
    expect(job?.status).toBe('complete');
  });

  it('fails gracefully when provider returns unparseable json', async () => {
    await insertItem('item-2', { raw_text: 'TRIGGER_REPAIR_ERROR' });
    await insertJob('job-2', 'item-2');

    await enrichService.processEnrichmentJob(
      { id: 'job-2', itemId: 'item-2' } as unknown as JobRecord,
      'owner-1',
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('job-2')
      .first();
    // It should be set to pending to retry, since it's a retryable failure and attempts < maxAttempts
    expect(job?.status).toBe('pending');
    expect(job?.last_error_code).toBe('JSON_PARSE_ERROR');

    const usage = await env.DB.prepare(
      'SELECT * FROM provider_usage WHERE item_id = ?',
    )
      .bind('item-2')
      .first();
    expect(usage?.status).toBe('failed');
    expect(usage?.error_code).toBe('JSON_PARSE_ERROR');
  });

  it('preserves manual field overrides', async () => {
    await insertItem('item-3', { raw_text: 'Valid text to process' });
    await insertJob('job-3', 'item-3');

    // Create an override
    await env.DB.prepare(
      `INSERT INTO item_field_overrides (id, item_id, field_name, override_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        'override-1',
        'item-3',
        'title',
        'Manual User Title',
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    await enrichService.processEnrichmentJob(
      { id: 'job-3', itemId: 'item-3' } as unknown as JobRecord,
      'owner-1',
    );

    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?')
      .bind('item-3')
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
});
