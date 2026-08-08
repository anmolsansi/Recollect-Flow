import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { itemDetailResponseSchema } from '@recollect/contracts';

import { createApp } from '../src/app';

const NOW = '2026-08-01T12:00:00.000Z';

function adminHeaders(): HeadersInit {
  return {
    Authorization: 'Bearer test-admin-token',
    'Content-Type': 'application/json',
  };
}

async function resetDatabase(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM item_feedback_events'),
    env.DB.prepare('DELETE FROM item_field_overrides'),
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM items'),
  ]);
}

async function insertItem(
  id: string,
  options: {
    notionPageId?: string | null;
    notionMissingAt?: string | null;
  } = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, source_url, raw_text,
       title, summary, topics_json, project, privacy_level, processing_status,
       lifecycle_status, edit_version, captured_at, created_at, updated_at,
       notion_page_id, notion_missing_at
     ) VALUES (
       ?1, ?2, 'url', 'Safari', 'https://example.test/source',
       'immutable source evidence', 'Original title', 'Original summary',
       '["original-topic"]', 'Original project', 'public', 'complete',
       'Inbox', 1, ?3, ?3, ?3, ?4, ?5
     )`,
  )
    .bind(
      id,
      `key-${id}`,
      NOW,
      options.notionPageId ?? null,
      options.notionMissingAt ?? null,
    )
    .run();
}

async function requestJson(
  path: string,
  method: string,
  body: unknown,
): Promise<Response> {
  return createApp().request(
    path,
    { method, headers: adminHeaders(), body: JSON.stringify(body) },
    env,
  );
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
});

beforeEach(resetDatabase);

describe('OPE-248 item review and recovery routes', () => {
  it('rejects unauthenticated list, detail, edit, lifecycle, and recovery access', async () => {
    await insertItem('auth-item');
    const app = createApp();
    const requests = [
      app.request('/api/v1/items', {}, env),
      app.request('/api/v1/items/auth-item', {}, env),
      app.request(
        '/api/v1/items/auth-item',
        { method: 'PATCH', body: JSON.stringify({ edit_version: 1 }) },
        env,
      ),
      app.request(
        '/api/v1/items/auth-item/delete',
        { method: 'POST', body: JSON.stringify({ edit_version: 1 }) },
        env,
      ),
      app.request(
        '/api/v1/items/auth-item/notion/recreate',
        { method: 'POST' },
        env,
      ),
    ];

    for (const response of await Promise.all(requests)) {
      expect(response.status).toBe(403);
    }
  });

  it('returns truthful source state and authoritative Notion recovery eligibility', async () => {
    await insertItem('detail-item', {
      notionPageId: 'notion-page-1',
      notionMissingAt: NOW,
    });

    const response = await createApp().request(
      '/api/v1/items/detail-item',
      { headers: adminHeaders() },
      env,
    );
    expect(response.status).toBe(200);
    const payload = itemDetailResponseSchema.parse(await response.json());
    expect(payload.data.item.raw_text).toBe('immutable source evidence');
    expect(payload.data.item.source_url).toBe('https://example.test/source');
    expect(payload.data.item.notion_recovery).toEqual({
      eligible: true,
      reason: 'eligible',
    });
    expect(payload.data.attachments).toEqual([]);
    expect(payload.data.processing_jobs).toEqual([]);
  });

  it('edits derived fields atomically without false conflicts from FTS triggers', async () => {
    await insertItem('edit-item');

    const edited = await requestJson('/api/v1/items/edit-item', 'PATCH', {
      edit_version: 1,
      title: 'Edited searchable title',
      summary: 'Owner summary',
      topics: ['owner-topic'],
      project: 'OPE-248',
      importance: 90,
    });
    expect(edited.status).toBe(200);
    await expect(edited.json()).resolves.toMatchObject({
      data: { item_id: 'edit-item', edit_version: 2 },
    });

    const item = await env.DB.prepare(
      `SELECT title, summary, topics_json, project, importance, raw_text,
              edit_version
       FROM items WHERE id = 'edit-item'`,
    ).first<Record<string, unknown>>();
    expect(item).toMatchObject({
      title: 'Edited searchable title',
      summary: 'Owner summary',
      topics_json: '["owner-topic"]',
      project: 'OPE-248',
      importance: 90,
      raw_text: 'immutable source evidence',
      edit_version: 2,
    });

    const overrides = await env.DB.prepare(
      `SELECT field_name FROM item_field_overrides
       WHERE item_id = 'edit-item' ORDER BY field_name`,
    ).all<{ field_name: string }>();
    expect(overrides.results.map((row) => row.field_name)).toEqual([
      'importance',
      'project',
      'summary',
      'title',
      'topics_json',
    ]);
    expect(
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM audit_events
         WHERE item_id = 'edit-item' AND event_type = 'item_updated'`,
      ).first<number>('count'),
    ).toBe(1);

    const search = await createApp().request(
      '/api/v1/search?q=Edited%20searchable',
      { headers: adminHeaders() },
      env,
    );
    expect(search.status).toBe(200);
    expect(
      ((await search.json()) as { data: Array<{ id: string }> }).data.map(
        (row) => row.id,
      ),
    ).toContain('edit-item');

    const stale = await requestJson('/api/v1/items/edit-item', 'PATCH', {
      edit_version: 1,
      title: 'Stale overwrite',
    });
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toMatchObject({
      error: { code: 'VERSION_CONFLICT' },
    });
    expect(
      await env.DB.prepare(
        `SELECT title FROM items WHERE id = 'edit-item'`,
      ).first<string>('title'),
    ).toBe('Edited searchable title');

    const immutable = await requestJson('/api/v1/items/edit-item', 'PATCH', {
      edit_version: 2,
      raw_text: 'attempted rewrite',
    });
    expect(immutable.status).toBe(422);
    expect(
      await env.DB.prepare(
        `SELECT raw_text FROM items WHERE id = 'edit-item'`,
      ).first<string>('raw_text'),
    ).toBe('immutable source evidence');
  });

  it('changes lifecycle, soft-deletes, and restores with stable versions', async () => {
    await insertItem('lifecycle-item');

    const reviewed = await requestJson(
      '/api/v1/items/lifecycle-item/status',
      'POST',
      { edit_version: 1, lifecycle_status: 'Reviewed' },
    );
    expect(reviewed.status).toBe(200);
    await expect(reviewed.json()).resolves.toMatchObject({
      data: { edit_version: 2 },
    });

    const deleted = await requestJson(
      '/api/v1/items/lifecycle-item/delete',
      'POST',
      { edit_version: 2 },
    );
    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toMatchObject({
      data: { edit_version: 3 },
    });
    expect(
      await env.DB.prepare(
        `SELECT lifecycle_status FROM items WHERE id = 'lifecycle-item'`,
      ).first<string>('lifecycle_status'),
    ).toBe('Deleted');

    const restored = await requestJson(
      '/api/v1/items/lifecycle-item/restore',
      'POST',
      { edit_version: 3 },
    );
    expect(restored.status).toBe(200);
    await expect(restored.json()).resolves.toMatchObject({
      data: { edit_version: 4 },
    });
    expect(
      await env.DB.prepare(
        `SELECT lifecycle_status FROM items WHERE id = 'lifecycle-item'`,
      ).first<string>('lifecycle_status'),
    ).toBe('Reviewed');

    const audit = await env.DB.prepare(
      `SELECT event_type FROM audit_events WHERE item_id = 'lifecycle-item'
       ORDER BY created_at, event_type`,
    ).all<{ event_type: string }>();
    expect(audit.results.map((row) => row.event_type).sort()).toEqual([
      'item_deleted',
      'item_restored',
      'lifecycle_changed',
    ]);
  });

  it('changes privacy without treating FTS trigger writes as a conflict', async () => {
    await insertItem('privacy-item');

    const edited = await requestJson('/api/v1/items/privacy-item', 'PATCH', {
      edit_version: 1,
      title: 'Owner privacy title',
      summary: 'Owner privacy summary',
      suggested_action: 'Keep this owner action',
    });
    expect(edited.status).toBe(200);

    const response = await requestJson(
      '/api/v1/items/privacy-item/privacy',
      'PATCH',
      {
        edit_version: 2,
        privacy_level: 'sensitive',
        derived_data_action: 'reprocess',
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        item_id: 'privacy-item',
        edit_version: 3,
        privacy_level: 'sensitive',
      },
    });
    expect(
      await env.DB.prepare(
        `SELECT privacy_level, title, summary, suggested_action
         FROM items WHERE id = 'privacy-item'`,
      ).first<Record<string, unknown>>(),
    ).toMatchObject({
      privacy_level: 'sensitive',
      title: 'Owner privacy title',
      summary: 'Owner privacy summary',
      suggested_action: 'Keep this owner action',
    });
  });

  it('records feedback idempotently and rejects missing items', async () => {
    await insertItem('feedback-item');
    const body = {
      idempotency_key: 'feedback-once',
      feedback_type: 'useful',
      source_surface: 'web_item_detail',
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await requestJson(
        '/api/v1/items/feedback-item/feedback',
        'POST',
        body,
      );
      expect(response.status).toBe(200);
    }
    expect(
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM item_feedback_events
         WHERE item_id = 'feedback-item'`,
      ).first<number>('count'),
    ).toBe(1);

    const missing = await requestJson(
      '/api/v1/items/missing-item/feedback',
      'POST',
      { ...body, idempotency_key: 'missing-feedback' },
    );
    expect(missing.status).toBe(404);
  });

  it('shows a failed processing job and allows an eligible manual retry', async () => {
    await insertItem('retry-item');
    await env.DB.prepare(
      `INSERT INTO processing_jobs (
         id, item_id, job_type, status, attempts, available_at,
         created_at, updated_at, last_error_code, provider_eligibility,
         privacy_level_snapshot, hosted_processing_consent, input_hash
       ) VALUES (
         'failed-job', 'retry-item', 'enrich', 'failed', 1, ?1,
         ?1, ?1, 'PROVIDER_UNAVAILABLE', 'openrouter', 'public', 0,
         'retry-input-hash'
       )`,
    )
      .bind(NOW)
      .run();

    const detail = await createApp().request(
      '/api/v1/items/retry-item',
      {
        headers: adminHeaders(),
      },
      env,
    );
    const detailPayload = itemDetailResponseSchema.parse(await detail.json());
    expect(detailPayload.data.processing_jobs[0]).toMatchObject({
      id: 'failed-job',
      visibleStatus: 'failed',
      lastErrorCode: 'PROVIDER_UNAVAILABLE',
    });

    const retried = await createApp().request(
      '/api/v1/jobs/failed-job/retry?kind=processing',
      { method: 'POST', headers: adminHeaders() },
      env,
    );
    expect(retried.status).toBe(200);
    expect(
      await env.DB.prepare(
        `SELECT status FROM processing_jobs WHERE id = 'failed-job'`,
      ).first<string>('status'),
    ).toBe('pending');
  });

  it('queues Notion recreation only when the detail contract marks it eligible', async () => {
    await insertItem('recovery-item', {
      notionPageId: 'notion-page-1',
      notionMissingAt: NOW,
    });
    await insertItem('ineligible-item', { notionMissingAt: NOW });
    await env.DB.prepare(
      `INSERT INTO sync_attempts (
         id, item_id, destination, status, attempts, available_at,
         created_at, updated_at
       ) VALUES (
         'superseded-sync', 'recovery-item', 'notion', 'pending', 0,
         ?1, ?1, ?1
       )`,
    )
      .bind(NOW)
      .run();

    const recreated = await createApp().request(
      '/api/v1/items/recovery-item/notion/recreate',
      { method: 'POST', headers: adminHeaders() },
      env,
    );
    expect(recreated.status).toBe(200);
    expect(
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM sync_attempts
         WHERE item_id = 'recovery-item' AND destination = 'notion'
           AND status = 'pending'`,
      ).first<number>('count'),
    ).toBe(1);
    expect(
      await env.DB.prepare(
        `SELECT last_error_code FROM sync_attempts WHERE id = 'superseded-sync'`,
      ).first<string>('last_error_code'),
    ).toBe('SUPERSEDED_BY_RECREATION');

    const obsoleteRetry = await createApp().request(
      '/api/v1/jobs/superseded-sync/retry?kind=sync',
      { method: 'POST', headers: adminHeaders() },
      env,
    );
    expect(obsoleteRetry.status).toBe(409);

    const detail = await createApp().request(
      '/api/v1/items/ineligible-item',
      { headers: adminHeaders() },
      env,
    );
    const payload = itemDetailResponseSchema.parse(await detail.json());
    expect(payload.data.item.notion_recovery).toEqual({
      eligible: false,
      reason: 'projection_reference_missing',
    });

    const rejected = await createApp().request(
      '/api/v1/items/ineligible-item/notion/recreate',
      { method: 'POST', headers: adminHeaders() },
      env,
    );
    expect(rejected.status).toBe(409);
    await expect(rejected.json()).resolves.toMatchObject({
      error: { code: 'OWNER_APPROVAL_REQUIRED' },
    });
  });
});
