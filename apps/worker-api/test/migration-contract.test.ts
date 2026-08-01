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
const captureFingerprintMigration = readFileSync(
  new URL(
    '../../../migrations/0006_add_capture_request_fingerprint.sql',
    import.meta.url,
  ),
  'utf8',
);
const leaseMigration = readFileSync(
  new URL('../../../migrations/0007_add_job_leases.sql', import.meta.url),
  'utf8',
);
const syncAvailabilityMigration = readFileSync(
  new URL(
    '../../../migrations/0008_add_sync_available_at.sql',
    import.meta.url,
  ),
  'utf8',
);
const completedJobMigration = readFileSync(
  new URL(
    '../../../migrations/0009_complete_jobs_and_notion_projection.sql',
    import.meta.url,
  ),
  'utf8',
);
const searchMigration = readFileSync(
  new URL('../../../migrations/0016_add_item_search_fts.sql', import.meta.url),
  'utf8',
);
const searchRebuildScript = readFileSync(
  new URL('../../../scripts/rebuild-item-search-index.sql', import.meta.url),
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

  it('binds idempotency keys to request fingerprints', () => {
    expect(captureFingerprintMigration).toContain(
      'ADD COLUMN request_fingerprint TEXT',
    );
    expect(captureFingerprintMigration).toContain(
      'idx_capture_events_request_fingerprint',
    );
  });

  it('adds owner-checked job and sync leases', () => {
    expect(leaseMigration).toContain('lease_owner');
    expect(leaseMigration).toContain('lease_expires_at');
    expect(leaseMigration).toContain('idx_processing_jobs_lease');
    expect(leaseMigration).toContain('idx_sync_attempts_lease');
  });

  it('rebuilds sync attempts with a non-null availability timestamp', () => {
    expect(syncAvailabilityMigration).toContain(
      'CREATE TABLE sync_attempts_available_20260729',
    );
    expect(syncAvailabilityMigration).toContain('available_at TEXT NOT NULL');
    expect(syncAvailabilityMigration).toContain('INSERT INTO sync_attempts');
    expect(syncAvailabilityMigration.indexOf('INSERT INTO')).toBeLessThan(
      syncAvailabilityMigration.indexOf('DROP TABLE sync_attempts'),
    );
  });

  it('adds projection metadata, idempotent results and active-job uniqueness', () => {
    expect(completedJobMigration).toContain('projection_hash');
    expect(completedJobMigration).toContain('notion_missing_at');
    expect(completedJobMigration).toContain(
      'CREATE TABLE processing_job_results',
    );
    expect(completedJobMigration).toContain(
      'idx_processing_jobs_active_unique',
    );
    expect(completedJobMigration).toContain('idx_sync_attempts_active_unique');
    expect(completedJobMigration).toContain('operational_controls');
  });

  it('creates and synchronizes the complete OPE-225 lexical projection', () => {
    expect(searchMigration).toContain(
      'CREATE VIRTUAL TABLE item_search_fts USING fts5',
    );
    for (const field of [
      'title',
      'raw_text',
      'user_note',
      'summary',
      'topics',
      'project',
      'people',
      'companies',
    ]) {
      expect(searchMigration).toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(searchMigration).toContain(
      "tokenize='unicode61 remove_diacritics 1'",
    );
    expect(searchMigration).toContain("prefix='2 3 4 5'");
    expect(searchMigration).toContain('WHERE deleted_at IS NULL');
    expect(searchMigration).toContain('CREATE TRIGGER items_search_fts_ai');
    expect(searchMigration).toContain('CREATE TRIGGER items_search_fts_au');
    expect(searchMigration).toContain('CREATE TRIGGER items_search_fts_ad');
    expect(searchMigration).toContain('WHERE rowid = OLD.rowid');
    expect(searchMigration).toContain('json_valid(NEW.topics_json)');
    expect(searchMigration).toContain('json_valid(NEW.people)');
    expect(searchMigration).toContain('json_valid(NEW.companies)');
  });

  it('keeps the OPE-225 rebuild operational, repeatable and verifiable', () => {
    expect(searchRebuildScript).toContain('BEGIN TRANSACTION');
    expect(searchRebuildScript).toContain('DELETE FROM item_search_fts');
    expect(searchRebuildScript).toContain('FROM items');
    expect(searchRebuildScript).toContain('WHERE deleted_at IS NULL');
    expect(searchRebuildScript).toContain('COMMIT');
    expect(searchRebuildScript).toContain('missing_from_fts');
    expect(searchRebuildScript).toContain('orphaned_or_deleted_in_fts');
    expect(searchRebuildScript).toContain('duplicate_item_ids');
    expect(searchRebuildScript).toContain('distinct_indexed_items');
    expect(searchRebuildScript).toContain(
      'd1 execute recollect-flow-prod --local',
    );
    expect(searchRebuildScript).toContain(
      'd1 execute recollect-flow-prod --remote',
    );
  });
});
