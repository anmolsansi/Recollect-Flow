import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { OperationsSummaryService } from '../src/jobs/operations-summary.service';

describe('BG-26 operational visibility', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('allows only the admin to inspect private operational counts', async () => {
    const app = createApp();
    const anonymous = await app.request('/api/v1/operations/summary', {}, env);
    expect(anonymous.status).toBe(403);
    const capture = await app.request(
      '/api/v1/operations/summary',
      { headers: { Authorization: `*** } },
      env,
    );
    expect(capture.status).toBe(403);
    const response = await app.request(
      '/api/v1/operations/summary',
      { headers: { Authorization: `*** } },
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = (await response.json()) as {
      data: {
        storage: { r2_provider_bytes: number | null };
        backlog: { truncated: boolean };
      };
    };
    expect(body.data.storage.r2_provider_bytes).toBeNull();
    expect(body.data.backlog.truncated).toBe(false);
  });

  it('does not claim missing provider totals or a verified backup on an empty database', async () => {
    const summary = await new OperationsSummaryService(env.DB).status(
      new Date('2026-10-16T12:00:00.000Z'),
    );
    expect(summary.backlog.groups).toEqual([]);
    expect(summary.recovery.latest_verified_backup).toBeNull();
    expect(summary.storage.r2_provider_objects).toBeNull();
    expect(summary.storage.d1_provider_rows_read).toBeNull();
    expect(summary.storage.source).toContain('metadata');
  });

  it('groups current processing and sync work, with safe errors and recovery flags', async () => {
    const at = '2026-10-16T12:00:00.000Z';
    const later = '2026-10-16T13:00:00.000Z';
    await env.DB.prepare(
      "INSERT INTO items (id, idempotency_key, source_type, source_app, captured_at, created_at, updated_at) VALUES ('bg26-item', 'bg26-key', 'text', 'test', ?1, ?1, ?1)",
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      "UPDATE items SET raw_text = 'BG26_PRIVATE_MARKER' WHERE id = 'bg26-item'",
    ).run();
    await env.DB.prepare(
      "INSERT INTO processing_jobs (id, item_id, job_type, status, available_at, last_error_code, created_at, updated_at) VALUES ('bg26-job', 'bg26-item', 'enrich', 'pending', ?1, 'QUOTA_PAUSED', ?2, ?2)",
    )
      .bind(later, at)
      .run();
    await env.DB.prepare(
      "INSERT INTO sync_attempts (id, item_id, destination, status, available_at, last_error_code, created_at, updated_at) VALUES ('bg26-sync', 'bg26-item', 'notion', 'failed', ?1, 'PROVIDER_UNAVAILABLE', ?1, ?1)",
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      "INSERT INTO sync_attempts (id, item_id, destination, status, available_at, last_error_code, created_at, updated_at) VALUES ('bg26-sync-2', 'bg26-item', 'notion', 'failed', ?1, 'SYNC_AUTH_EXPIRED', ?1, ?1)",
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      "INSERT INTO purge_workflows (id, item_id, state, confirmation_digest, confirmation_expires_at, requested_edit_version, created_at, updated_at) VALUES ('bg26-purge', 'bg26-item', 'partial', 'digest', ?1, 0, ?1, ?1)",
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      "INSERT INTO backup_artifacts (id, object_key, state, schema_version, created_at, expires_at) VALUES ('bg26-backup', 'bg26/backup', 'failed', 'v1', ?1, ?2)",
    )
      .bind(at, later)
      .run();
    await env.DB.prepare(
      "INSERT INTO digest_runs (id, digest_type, period_start, period_end, selector_version, source_snapshot_at, canonical_payload_json, content_hash, deterministic_text, generation_source, created_at, updated_at) VALUES ('bg26-digest', 'daily', '2026-10-15', '2026-10-16', 'v1', ?1, '{}', 'abc', 'example', 'deterministic', ?1, ?1)",
    )
      .bind(at)
      .run();
    await env.DB.prepare(
      "INSERT INTO digest_deliveries (id, digest_run_id, destination, state, available_at, created_at, updated_at) VALUES ('bg26-delivery', 'bg26-digest', 'telegram', 'unknown', ?1, ?1, ?1)",
    )
      .bind(at)
      .run();

    const summary = await new OperationsSummaryService(env.DB).status(
      new Date(at),
    );
    expect(summary.backlog.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'processing',
          type: 'enrich',
          status: 'retry_wait',
          count: 1,
          next_available_at: later,
          oldest_eligible_created_at: null,
          sample_error_code: 'QUOTA_PAUSED',
        }),
        expect.objectContaining({
          kind: 'sync',
          type: 'notion',
          status: 'failed',
          sample_error_code: 'PROVIDER_UNAVAILABLE',
        }),
      ]),
    );
    expect(
      summary.backlog.groups.filter(
        (group) => group.kind === 'sync' && group.status === 'failed',
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          count: 1,
          sample_error_code: 'PROVIDER_UNAVAILABLE',
        }),
        expect.objectContaining({
          count: 1,
          sample_error_code: 'SYNC_AUTH_EXPIRED',
        }),
      ]),
    );
    expect(summary.recovery.partial_purges).toBe(1);
    expect(summary.recovery.partial_purge_samples).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'bg26-purge' })]),
    );
    expect(summary.recovery.failed_backups).toBe(1);
    expect(summary.recovery.ambiguous_digests).toBe(1);
    expect(JSON.stringify(summary)).not.toContain('canonical_payload_json');
    expect(JSON.stringify(summary)).not.toContain('BG26_PRIVATE_MARKER');
  });

  it('returns an error rather than stale-success JSON when an aggregate query fails', async () => {
    const invalidDb = {
      prepare: () => {
        throw new Error('simulated query failure');
      },
    } as unknown as D1Database;
    await expect(
      new OperationsSummaryService(invalidDb).status(),
    ).rejects.toThrow('simulated query failure');
  });
});
