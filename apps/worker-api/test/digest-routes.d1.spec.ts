import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

async function resetDatabase() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM digest_audit_events'),
    env.DB.prepare('DELETE FROM digest_deliveries'),
    env.DB.prepare('DELETE FROM digest_runs'),
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
  await env.DB.prepare(
    `INSERT INTO items (
       id, idempotency_key, source_type, source_app, title, privacy_level,
       processing_status, captured_at, created_at, updated_at
     ) VALUES (
       'digest-route-item', 'digest-route-key', 'note', 'test', 'Route item',
       'public', 'complete', '2026-08-02T10:00:00.000Z',
       '2026-08-02T10:00:00.000Z', '2026-08-02T10:00:00.000Z'
     )`,
  ).run();
}

function adminHeaders(): HeadersInit {
  return {
    Authorization: 'Bearer test-admin-token',
    'Content-Type': 'application/json',
  };
}

describe('digest administrative routes', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  beforeEach(resetDatabase);

  it('requires admin access and supports generate, review, queue and inspect', async () => {
    const app = createApp();
    const unauthenticated = await app.request(
      '/api/v1/digests/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digest_type: 'daily',
          scheduled_at: '2026-08-03T02:00:00.000Z',
        }),
      },
      env,
    );
    expect(unauthenticated.status).toBe(403);

    const generatedResponse = await app.request(
      '/api/v1/digests/generate',
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          digest_type: 'daily',
          scheduled_at: '2026-08-03T02:00:00.000Z',
        }),
      },
      env,
    );
    expect(generatedResponse.status).toBe(200);
    const generated = (await generatedResponse.json()) as {
      data: { run: { id: string } };
    };
    const runId = generated.data.run.id;

    const prematureDelivery = await app.request(
      `/api/v1/digests/${runId}/deliver`,
      { method: 'POST', headers: adminHeaders(), body: '{}' },
      env,
    );
    expect(prematureDelivery.status).toBe(409);

    const reviewed = await app.request(
      `/api/v1/digests/${runId}/review`,
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ reviewed_by: 'acceptance-test' }),
      },
      env,
    );
    expect(reviewed.status).toBe(200);

    const queued = await app.request(
      `/api/v1/digests/${runId}/deliver`,
      { method: 'POST', headers: adminHeaders(), body: '{}' },
      env,
    );
    expect(queued.status).toBe(200);

    const details = await app.request(
      `/api/v1/digests/${runId}`,
      { headers: adminHeaders() },
      env,
    );
    expect(details.status).toBe(200);
    const body = (await details.json()) as {
      data: {
        run: { reviewStatus: string };
        deliveries: Array<{ state: string }>;
        audit: Array<{ eventType: string }>;
      };
    };
    expect(body.data.run.reviewStatus).toBe('reviewed');
    expect(body.data.deliveries[0]?.state).toBe('pending');
    expect(body.data.audit.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        'digest_generated',
        'digest_marked_reviewed',
        'digest_delivery_queued',
      ]),
    );
  });

  it('does not allow an admin generation request to bypass review and queue delivery', async () => {
    const response = await createApp().request(
      '/api/v1/digests/generate',
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          digest_type: 'daily',
          scheduled_at: '2026-08-03T02:00:00.000Z',
          deliver: true,
        }),
      },
      env,
    );

    expect(response.status).toBe(422);
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM digest_deliveries',
    ).first<{ count: number }>();
    expect(count?.count).toBe(0);
  });

  it('requires reconciliation instead of retrying unknown delivery state', async () => {
    const app = createApp();
    const generatedResponse = await app.request(
      '/api/v1/digests/generate',
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          digest_type: 'daily',
          scheduled_at: '2026-08-03T02:00:00.000Z',
        }),
      },
      env,
    );
    const generated = (await generatedResponse.json()) as {
      data: { run: { id: string } };
    };
    const runId = generated.data.run.id;
    await app.request(
      `/api/v1/digests/${runId}/review`,
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ reviewed_by: 'reconciliation-test' }),
      },
      env,
    );
    const queuedResponse = await app.request(
      `/api/v1/digests/${runId}/deliver`,
      { method: 'POST', headers: adminHeaders(), body: '{}' },
      env,
    );
    const queued = (await queuedResponse.json()) as { data: { id: string } };
    const deliveryId = queued.data.id;
    await env.DB.prepare(
      `UPDATE digest_deliveries SET state = 'unknown',
              last_error_code = 'TELEGRAM_TIMEOUT_AMBIGUOUS'
       WHERE id = ?1`,
    )
      .bind(deliveryId)
      .run();

    const retry = await app.request(
      `/api/v1/digest-deliveries/${deliveryId}/retry`,
      { method: 'POST', headers: adminHeaders(), body: '{}' },
      env,
    );
    expect(retry.status).toBe(409);

    const reconciled = await app.request(
      `/api/v1/digest-deliveries/${deliveryId}/reconcile`,
      {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          state: 'sent',
          telegram_message_id: 'manual-123',
        }),
      },
      env,
    );
    expect(reconciled.status).toBe(200);
    const row = await env.DB.prepare(
      'SELECT state, telegram_message_id FROM digest_deliveries WHERE id = ?1',
    )
      .bind(deliveryId)
      .first<{ state: string; telegram_message_id: string }>();
    expect(row).toEqual({
      state: 'sent',
      telegram_message_id: 'manual-123',
    });
  });
});
