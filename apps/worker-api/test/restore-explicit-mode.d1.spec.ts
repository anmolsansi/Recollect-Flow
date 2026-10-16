import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { ExportService } from '../src/recovery/export.service';

describe('BG-28 explicit restore mode', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  async function callRestore(query: string) {
    const envelope = await new ExportService(env.DB).buildJson();
    const response = await createApp().request(
      `/api/v1/restore${query}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelope),
      },
      env,
    );
    return response;
  }

  it('refuses missing or invalid mode without creating a restore run', async () => {
    const before = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM restore_runs',
    ).first<{ count: number }>();
    for (const query of ['', '?dry_run=', '?dry_run=1', '?dry_run=TRUE']) {
      const response = await callRestore(query);
      expect(response.status, query).toBe(422);
      expect(await response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }
    const after = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM restore_runs',
    ).first<{ count: number }>();
    expect(after?.count).toBe(before?.count);
  });

  it('allows explicitly requested dry_run=true without altering canonical items', async () => {
    const response = await callRestore('?dry_run=true');
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      data: { run: { dryRun: boolean; restoredCount: number } };
    };
    expect(result.data.run.dryRun).toBe(true);
    expect(result.data.run.restoredCount).toBe(0);
  });
});
