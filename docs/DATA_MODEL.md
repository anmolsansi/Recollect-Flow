# Complete data model and lifecycle

## Authority rule

D1 owns canonical metadata and state. R2 owns original attachment bytes. Notion is a projection. FTS/vector indexes, chunks, summaries, answers, and caches are derived and rebuildable. The original capture and user reason remain evidence.

## Core operational entities

### Item

Stable ID, idempotency key, source type/app, original URL, canonical URL, raw/shared text, immutable user reason, quick category, privacy, title/summary/project/topics/importance/suggested action, coverage, lifecycle status, processing status, duplicate-of, hashes, Notion ID, review date, captured/created/updated/deleted timestamps, and schema/content version.

### CaptureEvent

One immutable record for every share attempt accepted under a new idempotency key. It references the canonical Item and preserves the original source URL/text, user note, privacy selection, optional attachment, capture time, and `duplicate_of` canonical item ID. Repeated shares never require a second knowledge item.

### Attachment

Item relationship, opaque R2 key, safe display filename, detected/declared MIME, byte size, checksum, dimensions/page/duration metadata, upload/link/extraction state, privacy, creation/purge timestamps. Unlinked attachments expire.

### ProcessingJob

Item/attachment/content-version scope, job type, provider eligibility, state, priority, attempt count, available time, lease owner/expiry/heartbeat, input hash, result version, safe error code, created/updated/completed timestamps.

### SyncAttempt

Destination (Notion/Telegram/future), external ID, state, attempts, next time, payload version/hash, rate-limit metadata, safe last error, timestamps.

### ProviderUsage

Provider/model/operation, item/job reference, input/output units, estimated/free allocation use, cost micros, policy decision, timestamp. No raw prompt/content.

### AuditEvent

Actor type/ID, item/related entity, event type, safe structured details, request/job ID, timestamp. Content-bearing audit fields follow the same privacy/deletion policy.

### Project, Topic, ItemTopic

Stable slugs, display names, active/archive status, optional descriptions and item links. Known projects form a closed list for AI suggestions.

### RetrievalFeedback / RecollectionEvent

Item/search/retrieval reference, Useful/Not Relevant/Already Used/Outdated/actioned signal, source surface, timestamp. Used for metrics/ranking, not external training by default.

### Digest and DigestItem

Period/config version, deterministic selection hash, delivery status/channel, reviewed timestamp, ordered item links, selection reason, privacy-safe preview policy.

### Export and DeletionRequest

Export schema version, manifest/checksum/counts, object location/expiry/status. Deletion request captures grace/purge state, explicit confirmation, affected derived systems, completion evidence.

### BackupArtifact

OPE-228 hosted-backup registry. Stores an immutable private R2 object key, portable schema version, lifecycle (`creating|verifying|complete|failed|expired`), SHA-256, byte size, creation/verification/expiry timestamps, and a stable non-content failure code. A row may become `complete` only after R2 read-back verification. Normal hosted retention is 30 days.

### PurgeWorkflow / PurgeStep

Permanent deletion is not represented by `items.deleted_at` alone. A PurgeWorkflow records the item ID, confirmation digest/expiry, requested item edit version, confirmation/completion timestamps, state (`confirmation_pending|queued|processing|partial|complete|cancelled`), and stable failure code. It intentionally does not FK to `items`, because workflow evidence survives canonical deletion.

Each workflow owns exactly one ordered PurgeStep for `freeze_jobs`, `delete_r2_attachments`, `archive_notion_projection`, `delete_d1_item_data`, and `finalize_receipt`. Steps persist attempts, state, lease owner/expiry, timestamps, and safe failure code. Leases make destructive work recoverable after Worker termination without allowing concurrent healthy owners to execute the same step.

### PurgeReceipt

Standalone non-content anti-resurrection ledger keyed by purged item ID. Stores purge workflow ID, receipt version, purge timestamp, and the newest applicable hosted-backup retention boundary. It deliberately has no FK to PurgeWorkflow or Item so it can be imported independently into a clean disaster-recovery D1. A corresponding hashed private R2 receipt under `purge-receipts/v1/` provides a ledger newer than an old backup snapshot.

### RestoreRun

Records portable restore lifecycle (`validating|restoring|verifying|complete|failed`), schema version, dry-run flag, source item count, restored count, purge-ledger skip count, safe failure code, and timestamps. Restore is a clean-target operation; a RestoreRun is operational evidence rather than canonical user content.

### IntegrityRun / IntegrityFinding

Read-only recovery scan. IntegrityRun records state/count/timestamps. IntegrityFinding records a safe finding type/severity plus optional item ID, attachment ID, external reference, and non-content details. Findings cover missing attachment objects, attachment link-state drift, missing Notion projections, incomplete purge workflows, and backup verification/retention drift. Findings never confer deletion authority.

## Item lifecycle

User lifecycle: `Inbox → Reviewed → Actioned|Archived`; any active state may become `Duplicate` or `Deleted`; Deleted may be restored during grace or progress to Purged.

Processing lifecycle is independent: `Saved → MetadataPending → ExtractionPending → AiPending → NotionSyncPending → Ready`; recoverable failure enters `RetryWait`; nonrecoverable optional failure becomes `ReadyPartial`; no stage removes Saved availability.

Job lifecycle: `Pending → Leased/Processing → Complete`; recoverable failure
is stored as `pending` with a future `available_at` and exposed to operators as
derived `retry_wait`; terminal failure is `failed`; stale leases become leasable
after `lease_expires_at`. Results are keyed by job and idempotent submission ID.

## Coverage vocabulary

`URL_ONLY`, `METADATA`, `SHARED_TEXT`, `EXTRACTED_TEXT`, `SCREENSHOT_TEXT`, `USER_TRANSCRIPT`, `FULL_USER_FILE`, plus `PARTIAL` with explicit provenance. Coverage can advance but never claim content not actually acquired.

## Privacy vocabulary

`Unknown`, `Public`, `Personal`, `Sensitive`. Unknown routes conservatively. A later move to more restrictive privacy invalidates future hosted eligibility, indexes/caches where required, and communicates that already-sent provider data cannot be revoked.

Every processing job snapshots policy version, eligible provider, credential source, hosted-processing consent, ZDR requirement and data-collection restriction. Provider keys are never stored in job or audit payloads.

## Index strategy

- Unique idempotency key.
- Canonical URL and content hash for conservative duplicate lookup.
- Lifecycle/processing/captured/project/privacy compound indexes.
- Pending jobs by state/available/priority.
- Migration `0016_add_item_search_fts.sql` adds the rebuildable FTS5
  `item_search_fts` projection across `title`, `raw_text`, `user_note`,
  `summary`, `topics`, `project`, `people`, and `companies`. It uses the
  `unicode61` tokenizer for lexical search independent of AI embeddings and is
  synchronized from canonical `items` rows by insert, relevant-update, and
  delete triggers. `items` remains the source of truth for privacy and deletion.
- OPE-228 indexes backup retention, active purge workflows, purge-step leases,
  receipt timestamps, and restore/integrity run chronology. These operational
  tables contain identifiers and safe state, not backup payload bytes.
- Avoid unindexed broad scans because D1 pricing counts rows read.

## Duplicate model

Idempotency replay is the same request and returns its existing CaptureEvent and Item. Cross-key duplication reuses one Item only when the exact source URL, normalized canonical URL, or byte-exact text hash matches. Every accepted new key creates a CaptureEvent and preserves its note. Query parameters not on the tracking allowlist, path differences, and even whitespace/case changes in text remain distinct. Repeated events do not count as independent evidence in RAG.

## Deletion and retention

1. Soft delete hides an item and remains reversible until the owner explicitly requests and separately confirms permanent purge.
2. Purge request is bound to the current soft-deleted item `edit_version` and a short-lived confirmation phrase. Restoration/editing invalidates the pending confirmation.
3. Confirmed purge freezes outstanding item work, deletes private R2 attachment objects, archives the downstream Notion projection, removes content-bearing canonical/derived D1 rows, and removes digest artifacts that reference the purged item.
4. The D1 purge receipt is inserted atomically in the same D1 batch that deletes the item, preventing a crash between canonical deletion and tombstone creation.
5. The final purge step mirrors that non-content receipt into private R2. If the mirror fails, the D1 item remains deleted but the workflow is `partial` and receipt finalization is retryable.
6. Hosted portable backups expire after 30 days. Purge receipts outlive that retention boundary. Owner-downloaded/offline exports are outside remote deletion control and must be managed separately by the owner.
7. Restore merges the newest export, current-D1, and private-R2 purge ledgers before item insertion. A matching receipt causes the older item record to be skipped rather than resurrected.

## Conditional RAG entities

### ContentVersion

Item, monotonically increasing version, normalized text, hash, extraction provenance, active flag, timestamp. Citation traceability survives extraction changes.

### Chunk

Content version, ordinal, source-aware text, token estimate, source span (page/heading/paragraph/time), coverage, privacy, hash, deletion state. Exact duplicate text may share clustering while retaining provenance.

### EmbeddingRecord / IndexVersion

Chunk, provider/model/dimensions/vector key/content hash/status/index version. New models build parallel indexes before activation; unchanged hashes are idempotent.

### RetrievalRun / RetrievedChunk

Question, filters, privacy/provider mode, corpus/index versions, status; every candidate stores lexical/vector rank, component/fused/rerank scores, selected flag, and selection reason.

### Conversation / Turn

Owner, privacy/filter defaults, timestamps; each turn references its own fresh retrieval run. Prior answer text is never evidence.