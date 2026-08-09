# OPE-228 local acceptance evidence

Status: local implementation and acceptance complete; production release pending.

This file records acceptance evidence for `agent/ope-228-backup-export-recovery`. It does not authorize a production migration, deployment, backup, restore, or purge.

## Portable export

- [x] Full-fidelity JSON export is versioned and independently readable.
- [x] Readable CSV export opens without RecollectFlow and preserves structured related data as quoted JSON cells.
- [x] Export includes canonical item fields, owner notes/reasons, derived fields, capture history, processing jobs/results, sync attempts, provider usage, field overrides, feedback, audit history, deduplication keys, and attachment references/metadata.
- [x] Attachment bytes are not embedded in the portable export.
- [x] Credential-like keys are recursively stripped from portable output.
- [x] All export routes require admin authorization; capture-scoped tokens are rejected.

## Hosted backup

- [x] Hosted backups use unique private R2 keys and never overwrite a prior application backup object.
- [x] Backup completion requires SHA-256 and byte-size read-back verification.
- [x] Download re-verifies the stored object before returning bytes.
- [x] Tampered or missing verified objects are rejected.
- [x] Hosted application backups use a fixed 30-day retention window.
- [x] Scheduled cleanup removes only expired backup objects and leaves unexpired backups and canonical item data unchanged.
- [x] Backup creation/read-back failure marks only the backup attempt failed and leaves live canonical data untouched.

## Explicit permanent purge

- [x] Soft delete remains reversible and separate from permanent purge.
- [x] Permanent purge can be requested only for a currently soft-deleted item.
- [x] Purge request is bound to the exact current item `edit_version`.
- [x] Destructive work requires a second workflow-bound confirmation phrase.
- [x] Confirmation expires after 15 minutes and cannot be replayed after expiry.
- [x] Restoration/editing after purge request invalidates confirmation.
- [x] Purge steps are durable, ordered, leased, and reclaimable only after stale lease expiry.
- [x] Completed purge removes linked private R2 attachment bytes and content-bearing D1 item/derived rows.
- [x] The D1 purge receipt is written atomically with canonical D1 deletion.
- [x] A non-content receipt is mirrored to the private R2 purge ledger for disaster recovery.
- [x] R2 deletion failure stops before canonical D1 deletion and leaves the workflow partial/retryable.
- [x] Notion archival failure stops before canonical D1 deletion and leaves the workflow partial/retryable.
- [x] Missing/deleted Notion pages never create purge authority; D1 remains the permanent-deletion source of truth.

## Restore and anti-resurrection

- [x] Restore accepts only the versioned JSON portable format.
- [x] Restore validates child ownership and cross-record references before writes.
- [x] Non-dry-run restore refuses a non-empty canonical target.
- [x] A clean-D1 round trip recreates canonical fields, notes, derived fields, history, jobs, sync state, and searchable FTS content.
- [x] Transient processing/sync leases are reset to safe pending state during restore.
- [x] Restore merges export, current-D1, and private-R2 purge receipt ledgers before inserting items.
- [x] A newer purge receipt prevents a pre-purge backup from resurrecting the item.
- [x] Duplicate references to a purged/missing canonical target are safely detached.
- [x] Post-restore verification checks foreign keys, item count, active-item FTS coverage, and skipped purged IDs.

## Integrity and operations

- [x] Read-only integrity scans report missing R2 attachment objects.
- [x] Read-only integrity scans report attachment/item state drift.
- [x] Read-only integrity scans report missing Notion projections without deleting canonical content.
- [x] Read-only integrity scans report partial purge workflows.
- [x] Read-only integrity scans report incomplete backup verification and overdue hosted retention.
- [x] Populated pre-0021 D1 migration rehearsal preserves canonical item/job data and passes foreign-key checks.
- [x] Operations documentation covers portable export/restore, hosted backup, D1 SQL export/import, D1 Time Travel, explicit purge, integrity checks, and incident order of operations.
- [x] Repository quality gate, local migration application, and Wrangler deployment dry-run have passed on the OPE-228 branch during implementation acceptance.

## Release boundary

Local acceptance does not apply migration `0021` to production, create a production backup, execute a production purge, restore a production database, deploy a Worker, update Linear, or create/merge a pull request. Those remain separately authorized release actions.
