-- Manual rollback only. Wrangler applies every .sql file in migrations/, so this
-- script intentionally lives outside that directory.
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS provider_usage;
DROP TABLE IF EXISTS sync_attempts;
DROP TABLE IF EXISTS processing_jobs;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS items;
