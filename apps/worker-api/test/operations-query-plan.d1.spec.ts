import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import { OperationsSummaryService } from '../src/jobs/operations-summary.service';

describe('BG-26 D1 aggregate query observability', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });

  it('inspects the actual backlog SQL plans and measures D1 rows read', async () => {
    const captured: string[] = [];
    const db = {
      prepare(sql: string) {
        captured.push(sql);
        return env.DB.prepare(sql);
      },
    } as unknown as D1Database;
    const now = new Date('2026-10-16T12:00:00.000Z');
    await new OperationsSummaryService(db).status(now);
    const backlogSql = captured.filter((sql) => sql.includes('WITH current_jobs AS'));
    expect(backlogSql).toHaveLength(2);

    for (const [index, sql] of backlogSql.entries()) {
      const plan = await env.DB.prepare('EXPLAIN QUERY PLAN ' + sql)
        .bind(now.toISOString())
        .all<{ detail: string }>();
      expect(plan.results.length).toBeGreaterThan(0);
      const measured = await env.DB.prepare(sql)
        .bind(now.toISOString())
        .all();
      const rowsRead = measured.meta?.rows_read;
      expect(typeof rowsRead).toBe('number');
      expect(rowsRead).toBeGreaterThanOrEqual(0);
      console.log(
        JSON.stringify({
          event: 'bg26_local_d1_aggregate_query_plan',
          kind: index === 0 ? 'processing' : 'sync',
          rows_read: rowsRead,
          row_groups_returned: measured.results.length,
          plan: plan.results.map((row) => row.detail),
          source: 'isolated Miniflare D1 fixture, NOT remote Cloudflare account usage',
        }),
      );
    }
  });
});
