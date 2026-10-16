# BG-28 recovery operator procedure

This procedure supports the [BG-28 build-guide gate](RECOLLECTFLOW_BUILD_GUIDE.md#34-bg-28--make-backup-restore-and-purge-procedures-complete) and [ADR-031](DECISIONS.md). It is for a **separately authorized, isolated target**. This document alone does not authorize production D1/R2 writes, purge, Time Travel restore, or DNS changes. BG-37 owns an independent disaster-recovery rehearsal.

## 1. Identify and freeze the incident

Record the UTC timestamp, owner/operator, exact Worker revision, source account, source D1 database ID, source R2 bucket name and target account/database/bucket IDs. Confirm the target cannot serve production traffic. Stop further capture, scheduled processing and destructive commands on the _affected_ environment through an approved operational mechanism. Preserve D1 Time Travel bookmark, non-content purge receipts, last known-good release, and request/backup IDs. Do not experiment on the only remaining copy.

Do not record admin tokens, original attachment contents, private notes or raw provider responses in tickets.

## 2. Take portable JSON and readable CSV exports

The admin-only endpoint is `GET /api/v1/export?format=json`. Its current `format` is `recollectflow-portable-export`, with `schemaVersion` `2026-09-19.1`, `generatedAt`, `itemCount`, `items`, `purgeReceipts` and `disclosures`. `itemCount` is the count of exported canonical `items` records, including soft-deleted items still present, not a count of attachment objects or historical purge receipts. Each item's child records include capture events, attachments, extraction records, URL acquisition evidence, jobs, sync/audit/feedback and deduplication data.

The CSV endpoint, `GET /api/v1/export?format=csv`, is an owner-readable projection, **not** a restore payload. JSON contains attachment `object_key`, `size_bytes`, `content_hash`, `item_id` and status, not original image/PDF bytes. Both formats exclude credentials. Owner copies live outside application-controlled remote deletion, even after a purge.

Record the API response status, exported `schemaVersion`, `generatedAt`, `itemCount`, exported file byte length and SHA-256. Keep the export encrypted in owner-controlled storage. The backup's embedded `purgeReceipts` are historical and **must not** replace a newer independent receipt ledger.

## 3. Produce a genuinely independent original-byte copy

A backup created in the same R2 bucket as the original attachments cannot survive loss of that entire bucket. Use an explicitly authorized independent bucket/account or securely retained offline volume. Record **both** source and destination bucket/account identities. Acquire each still-needed `items[].attachments[].object_key` from the source bucket, preserving that key as the path below the independent `objects/` directory, as well as its `item_id` ownership and original `size_bytes`/`content_hash`. Do **not** silently regenerate originals from extracted text or thumbnails. Missing/legacy null checksums must be handled as a recovery exception, not silently accepted.

Independently copy every `purge-receipts/v1/*.json` mirror into protected, separately retained storage. Read back and verify their stored R2 SHA-256 metadata before assembling a JSON array of their receipt bodies as `independent-receipts.json`. Do not rely on a copy of receipts embedded in the old export. Record full object listing/pagination, object count, snapshot time and independent copy identity. A missing, incomplete or stale ledger is a **stop condition** for any restore. If D1 was lost and only the original R2 bucket held receipts, anti-resurrection cannot be guaranteed without that independent copy.

For an explicitly authorized, named R2 source profile, use the Cloudflare-documented `rclone` bulk-copy approach. Configure the source and destination profiles separately and confirm that the destination is outside the source bucket's failure domain. Example for a protected offline directory, **not** an instruction to run against production without approval:

```bash
# Source profile and bucket are illustrative, never use default credentials.
rclone copy r2-source:<source-bucket> /secure/recovery/objects
rclone lsf --recursive r2-source:<source-bucket> > /secure/recovery/source-object-keys.txt
rclone lsf --recursive /secure/recovery/objects > /secure/recovery/copied-object-keys.txt
```

Check listing completeness and source/destination identity before creating a manifest. The copied object-key listing includes `purge-receipts/v1/`; **do not** mistake that directory for the up-to-date receipt array consumed by the verifier. Separately parse and validate those JSON receipt objects into `independent-receipts.json` only after verifying their recorded hashes and listing pagination. Keep receipt mirrors available beyond hosted JSON expiration so an older owner copy cannot silently resurrect purged content. Owner-controlled original-byte copies use an owner-approved encrypted retention schedule, not the hosted JSON 30-day policy. Do not erase the previous independent set until the replacement set, hashes and newest receipt ledger have all passed verification.

For a previously downloaded **synthetic or approved** bundle use:

```bash
node scripts/recovery-bundle.mjs \
  /secure/recovery/portable.json \
  /secure/recovery/objects \
  /secure/recovery/independent-receipts.json \
  /secure/recovery/verified-manifest.json
```

The tool is local-only, never calls Cloudflare and never deletes objects. It checks JSON format/count/disclosures, independent purge receipts, expected attachment size and SHA-256, and rejects missing/tampered originals or unsafe object paths. It writes a mode-0600 manifest **only after every required byte passes**. The manifest contains owner item IDs and R2 keys, so keep it encrypted and out of Git. If the output file already exists, the tool refuses to overwrite it. A passing manifest proves those downloaded files, not source-bucket completeness or independent location durability. Verify those separately.

## 4. Hosted JSON backup creation, verification, retention and schedule

The admin-only `POST /api/v1/backups` creates a unique private `backups/v1/<backup-id>.json`. `GET /api/v1/backups` returns each backup's ID, `objectKey`, `schemaVersion`, `state`, SHA-256, `sizeBytes`, `createdAt`, `verifiedAt`, `expiresAt` and `failureCode`. Only `complete` with verified readback hash/byte count counts as successful. `GET /api/v1/backups/<id>/download` validates again before download.

**Current scheduling truth:** the hourly background Cron runs _expiry cleanup_, not backup creation. BG-28 implements opt-in verified JSON backup creation on the existing Monday 02:15 UTC weekly Cron. It is **off by default**. Only after the owner authorizes the schedule, applies migration `0025_bg28_scheduled_backups.sql`, and sets `HOSTED_BACKUP_AUTOCREATE_ENABLED=true`, the Worker attempts one backup per UTC Monday period. The durable `scheduled_backup_periods` table records `running|complete|failed`, verified backup ID and safe failure code. Repeated weekly ticks never create duplicate JSON archives in that period. Failed claims are not auto-retried, so an operator must investigate and may create a separate manual backup. The hosted JSON never includes original R2 bytes or separately retained purge receipts. Until the toggle is approved, perform `POST /api/v1/backups` manually at least weekly and verify complete state, object readback, independent copies, receipts and quota impact.

[ADR-031](DECISIONS.md) retains immutable verified hosted JSON artifacts for **30 days** from creation. Cleanup deletes only expired completed backup objects and leaves non-content audit metadata. Independently downloaded copies are outside this remote retention/deletion control. Record backup creation schedule evidence, remote retention timestamps and offline-copy retention policy separately.

## 5. Restore into a clean, identified target

Before either request, verify target account, Worker revision, D1 ID and bucket name, corresponding migrations and configuration. Capture the exact target identity in the incident record. Copy the independently verified original objects and newer purge-receipt mirror into that **isolated target**. Confirm that the new target is intentionally clean, not merely pointed at the old environment, and that those objects have the same keys and hashes.

Send the portable JSON body with admin authorization and `Content-Type: application/json`. The query parameter is **mandatory**.

```text
POST /api/v1/restore?dry_run=true
POST /api/v1/restore?dry_run=false
```

Always run `dry_run=true` first. It validates portable schema/version/count/child references, merges historical and current D1/R2 receipts, reports skipped purged item IDs and now reports `attachmentReadiness.checked` and `attachmentReadiness.problems[]`. `problems[].reason` is `missing` or `size_mismatch`. This is an R2 existence/length check, not a replacement for the independent full-byte SHA-256 manifest. The dry run writes a restore-run status record, not item content.

**Stop** if the preview has any attachment problem, unexpected `plannedItemCount`, unverified independent receipt ledger, schema incompatibility, identity mismatch or unapproved target. Then send `dry_run=false` only when authorized. Missing or invalid `dry_run` is rejected with 422; there is no implicit apply. Applying also refuses a nonempty canonical target and missing/undersized originals.

On successful apply, verify D1 foreign keys, item/child counts, missing attachment count zero, FTS search for known synthetic/approved phrases, readable original bytes and checksum, canonical privacy and source links, URL acquisition evidence, processing lease reset, newest purge receipts and absence of purged items. After completing all tests and a recorded rollback decision, an authorized operator may separately switch traffic. Do not point production traffic at an unverified target.

## 6. Permanent purge and partial failures

Soft-delete an item first through the existing item lifecycle API. Retrieve the item's current `edit_version`, then submit `POST /api/v1/items/<id>/purge-request` with JSON `{"edit_version": <current-version>}`. The response gives a workflow ID, **exact** confirmation phrase and 15-minute expiry. Verify all three, then submit the phrase to `POST /api/v1/purges/<workflow-id>/confirm`. Never construct a global `delete everything` request or collapse the two-stage confirmation.

Inspect `GET /api/v1/purges/<workflow-id>` for `queued`, `processing`, `partial` or `complete`, and each ordered step: `freeze_jobs`, `delete_r2_attachments`, `archive_notion_projection`, `delete_d1_item_data`, `finalize_receipt`. Only a confirmed workflow may be resumed with `POST /api/v1/purges/<workflow-id>/run`. An R2 or required Notion failure leaves the soft-deleted canonical item and a retryable partial workflow. An absent Notion projection is not permission to purge content. If receipt mirroring fails after D1 delete, retain the D1 receipt and do not replay an older backup until the independent ledger is reconciled.

URL acquisition evidence is exported under `urlAcquisitions`, restored into `url_acquisitions`, removed with canonical item purge and checked for orphan references by the integrity scan. Verify URL-related IDs before and after the isolated rehearsal. Never treat Notion or cached content as authority for deletion.

## 7. Acceptance matrix and recovery exit

- Corrupt hosted JSON download: detect changed SHA-256/length and reject.
- Nonempty restore target: return `RESTORE_TARGET_NOT_EMPTY`, preserve existing canonical rows.
- Missing/short attachment: dry run reports the reference, real apply rejects, original item bytes remain unchanged.
- Partial R2/Notion purge: no canonical item deletion ahead of required earlier steps, per-step failure visible and resumable.
- Backup before purge and newer independent receipt: skip the purged item in planning, do not restore its content, keep the newer non-content receipt.
- URL evidence: export, restore, integrity and purge preserve the current source-record invariant.
- Verify backup expiry/immutability, an independent byte-count/hash manifest, FTS counts/search and restoration of originals before traffic switch.

For source-controlled isolated tests run `npm run recovery:bundle:test` and `npm run check`. See [BG-28 evidence](verification/BG-28_BACKUP_RESTORE_PURGE.md). A passing local CI run is **not** evidence of operator-owned weekly scheduling, independent hosted bucket replication, production deployment or BG-37 disaster recovery.

**Rollback:** Stop traffic switching on any mismatch. Preserve source and candidate backups, incident timestamps, receipts, manifests and failure codes. Do not overwrite production or delete the last good copy to make the rehearsal green.
