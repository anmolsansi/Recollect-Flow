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

## Item lifecycle

User lifecycle: `Inbox → Reviewed → Actioned|Archived`; any active state may become `Duplicate` or `Deleted`; Deleted may be restored during grace or progress to Purged.

Processing lifecycle is independent: `Saved → MetadataPending → ExtractionPending → AiPending → NotionSyncPending → Ready`; recoverable failure enters `RetryWait`; nonrecoverable optional failure becomes `ReadyPartial`; no stage removes Saved availability.

Job lifecycle: `Pending → Leased/Processing → Complete`; recoverable failure `RetryWait → Pending`; terminal failure `Failed`; stale lease returns safely to pending/retry.

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
- FTS5 across title, reason, shared/extracted text, summary, topics, project, source account/site.
- Avoid unindexed broad scans because D1 pricing counts rows read.

## Duplicate model

Idempotency replay is the same request and returns its existing CaptureEvent and Item. Cross-key duplication reuses one Item only when the exact source URL, normalized canonical URL, or byte-exact text hash matches. Every accepted new key creates a CaptureEvent and preserves its note. Query parameters not on the tracking allowlist, path differences, and even whitespace/case changes in text remain distinct. Repeated events do not count as independent evidence in RAG.

## Deletion and retention

1. Soft delete hides item and begins configurable grace period.
2. Restore may cancel purge during grace.
3. Confirmed purge removes R2 bytes, derived content, FTS/vector records, chunks, citations/caches, Notion projection, and content-bearing events according to policy.
4. Minimal non-content tombstone metadata may remain for audit unless full purge is requested and legally/policy permitted.
5. Every purge is idempotent and produces completion evidence.

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

### RagAnswer / AnswerCitation

Retrieval run, conversation/turn, answer state/JSON, provider/model/prompt/context hash/versions; citations map answer block and stable citation ID to exact chunk/item/span.

### AnswerCache

Question/filter/privacy/corpus/index/prompt/context hash to validated answer; any source edit/delete/restriction, index switch, or policy change invalidates affected entries.

## Migration policy

Wrangler migrations are forward-only under `migrations/`. Manual rollback scripts live under `docs/sql` so Wrangler cannot auto-apply them. Every schema change documents forward/backfill/compatibility/rollback/export impact, updates fixtures/tests, and preserves raw-source readability across versions.
