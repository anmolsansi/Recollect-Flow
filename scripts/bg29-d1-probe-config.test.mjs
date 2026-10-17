import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const base = await readFile('wrangler.bg29-d1-probe.toml', 'utf8');
const hourly = await readFile('wrangler.bg29-d1-probe-cron.toml', 'utf8');

test('both probe configs target only the preverified BG29 staging database', () => {
  for (const config of [base, hourly]) {
    assert.match(config, /^name = "recollect-flow-bg29-d1-cron-probe"$/m);
    assert.match(config, /^workers_dev = false$/m);
    assert.match(config, /^preview_urls = false$/m);
    assert.match(config, /^database_name = "recollect-flow-bg29-staging"$/m);
    assert.match(
      config,
      /^database_id = "b5cbeccc-92fb-4bbc-9597-f0174b84e57d"$/m,
    );
    assert.doesNotMatch(config, /\[\[r2_buckets\]\]|\[ai\]|\[secrets\]/);
    assert.doesNotMatch(config, /^\s*(routes?|route)\s*=/m);
    assert.doesNotMatch(config, /recollect-flow-attachments-prod/);
    assert.doesNotMatch(config, /recollect-flow-prod/);
  }
});

test('initial deploy has no Cron, opt-in file only adds hourly Cron', () => {
  assert.doesNotMatch(base, /\[triggers\]|^crons\s*=/m);
  assert.match(hourly, /^crons = \["17 \* \* \* \*"\]$/m);
});
