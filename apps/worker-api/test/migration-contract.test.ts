import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../migrations/0001_initial.sql', import.meta.url),
  'utf8',
);
const duplicateMigration = readFileSync(
  new URL('../../../migrations/0002_add_duplicate_of.sql', import.meta.url),
  'utf8',
);
const attachmentMigration = readFileSync(
  new URL(
    '../../../migrations/0003_add_attachments_table.sql',
    import.meta.url,
  ),
  'utf8',
);
const policyMigration = readFileSync(
  new URL('../../../migrations/0004_add_policy_routing.sql', import.meta.url),
  'utf8',
);
const approvedPolicyMigration = readFileSync(
  new URL(
    '../../../migrations/0005_update_hosted_ai_policy.sql',
    import.meta.url,
  ),
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

describe('follow-up migration contracts', () => {
  it('adds immutable capture events and atomic deduplication claims', () => {
    expect(duplicateMigration).toContain('CREATE TABLE capture_events');
    expect(duplicateMigration).toContain(
      'idempotency_key TEXT NOT NULL UNIQUE',
    );
    expect(duplicateMigration).toContain(
      'CREATE TABLE item_deduplication_keys',
    );
    expect(duplicateMigration).toContain('deduplication_key TEXT PRIMARY KEY');
    expect(duplicateMigration).toContain('INSERT INTO capture_events');
  });

  it('copies legacy attachment rows before removing the old table', () => {
    expect(attachmentMigration).toContain(
      'ALTER TABLE attachments RENAME TO attachments_legacy',
    );
    expect(attachmentMigration).toContain('INSERT INTO attachments');
    expect(attachmentMigration.indexOf('INSERT INTO attachments')).toBeLessThan(
      attachmentMigration.indexOf('DROP TABLE attachments_legacy'),
    );
    expect(attachmentMigration).toContain("'finalized'");
    expect(attachmentMigration).toContain('expires_at TEXT NOT NULL');
    expect(attachmentMigration).toContain(
      'CREATE TRIGGER capture_event_attachment_must_be_linkable',
    );
    expect(attachmentMigration).toContain(
      'CREATE TRIGGER capture_event_link_attachment',
    );
  });

  it('stamps every processing job with policy evidence', () => {
    expect(policyMigration).toContain('privacy_level_snapshot');
    expect(policyMigration).toContain('provider_eligibility');
    expect(policyMigration).toContain('policy_version');
  });

  it('preserves jobs while adding OpenRouter and consent evidence', () => {
    expect(approvedPolicyMigration).toContain(
      'CREATE TABLE processing_jobs_policy_20260721',
    );
    expect(approvedPolicyMigration).toContain('INSERT INTO processing_jobs');
    expect(approvedPolicyMigration.indexOf('INSERT INTO')).toBeLessThan(
      approvedPolicyMigration.indexOf('DROP TABLE processing_jobs'),
    );
    expect(approvedPolicyMigration).toContain("'openrouter'");
    expect(approvedPolicyMigration).toContain('credential_source');
    expect(approvedPolicyMigration).toContain('hosted_processing_consent');
    expect(approvedPolicyMigration).toContain('zero_data_retention_required');
    expect(approvedPolicyMigration).toContain('data_collection_denied');
    expect(approvedPolicyMigration).toContain("'2026-07-21.1'");
  });
});
