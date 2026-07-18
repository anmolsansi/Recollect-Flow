import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../migrations/0001_initial.sql', import.meta.url),
  'utf8',
);

describe('0001_initial migration contract', () => {
  it('creates every V1 durability table', () => {
    for (const table of [
      'items',
      'attachments',
      'processing_jobs',
      'sync_attempts',
      'provider_usage',
      'audit_events',
    ]) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }
  });

  it('enforces idempotency, state, and retention constraints', () => {
    expect(migration).toContain('idempotency_key TEXT NOT NULL UNIQUE');
    expect(migration).toContain(
      "CHECK (privacy_level IN ('unknown', 'public', 'personal', 'sensitive'))",
    );
    expect(migration).toContain('REFERENCES items(id) ON DELETE RESTRICT');
    expect(migration).toContain('CHECK (attempts >= 0)');
  });

  it('indexes duplicate and processing lookup fields', () => {
    expect(migration).toContain('idx_items_canonical_url');
    expect(migration).toContain('idx_items_content_hash');
    expect(migration).toContain('idx_processing_jobs_ready');
  });
});
