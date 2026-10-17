import assert from 'node:assert/strict';
import { test } from 'node:test';

import probe, {
  isAllowedCron,
  runD1CronProbe,
} from './bg29-d1-cron-probe-worker.mjs';

test('only the background hourly Cron is allowed', () => {
  assert.equal(isAllowedCron('17 * * * *'), true);
  assert.equal(isAllowedCron('0 2 * * *'), false);
});

test('no HTTP endpoint can expose probe or application data', async () => {
  const response = await probe.fetch();
  assert.equal(response.status, 404);
});

test('D1 probe retains bounded original count and emits a D1-only record', async () => {
  const calls = [];
  const db = {
    async exec(sql) {
      calls.push({ kind: 'exec', sql });
    },
    prepare(sql) {
      calls.push({ kind: 'prepare', sql });
      return {
        bind(...args) {
          calls.push({ kind: 'bind', args });
          return {
            async run() {
              return { success: true };
            },
          };
        },
        async first() {
          return { originals: 24, completed: 8, pending: 16 };
        },
      };
    },
  };
  const originalConsoleLog = console.log;
  console.log = () => {};
  try {
    const result = await runD1CronProbe(
      db,
      '2026-10-17T11:17:00.000Z',
      '2026-10-17T11:17:01.000Z',
    );
    assert.equal(result.scope, 'd1_only');
    assert.equal(result.originals, 24);
    assert.equal(result.completed, 8);
    assert.equal(result.pending, 16);
    assert.match(result.limitations, /Notion projection/);
    assert.ok(calls.every((c) => !/R2|openrouter|notion/i.test(c.sql ?? '')));
  } finally {
    console.log = originalConsoleLog;
  }
});
