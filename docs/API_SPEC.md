# Complete API specification

## Global contract

- Base prefix: `/api/v1`.
- HTTPS JSON unless an upload body is explicitly binary.
- Success: `{ "data": ..., "meta": { "request_id": "uuid" } }`.
- Error: `{ "error": { "code": "STABLE_CODE", "message": "user-safe", "fields": {} }, "meta": { "request_id": "uuid" } }`.
- Unknown request fields are rejected unless a future version deliberately enables extension data.
- Technical/provider details, stack traces, tokens, prompts, and raw sensitive content never enter responses.

## Authentication scopes

| Credential          | Allowed operations                                                                  |
| ------------------- | ----------------------------------------------------------------------------------- |
| Capture token       | Create/finalize capture and upload for the configured personal client               |
| Admin token/session | Read, search, edit derived fields, lifecycle, retry, export, deletion, usage        |
| Local-worker token  | Lease scoped local jobs, heartbeat, fetch approved content, submit validated result |

Tokens are long random Worker secrets, rotatable without migration. Future public productization replaces personal tokens with user/session/tenant authorization.

## Implemented capture endpoint

### `POST /api/v1/shortcut/captures`

Capture-token-only compatibility endpoint for Apple Shortcuts. It accepts one
`multipart/form-data` or URL-encoded form with `idempotency_key`, `kind_hint`
(`auto|url|text|attachment`), `content`, optional `user_reason`,
`privacy_level`, and `client_version`. URL/text content may be a string or the
UTF-8 file restored from the offline queue. Attachment content must be an
allowlisted File.

The Worker performs bounded validation, signature and SHA-256 checks, private R2
write/verification, attachment finalization, D1 linking, and capture creation.
An idempotency key is bound to the first request fingerprint; reuse for different
content is rejected.

This route always returns HTTP `200` after reaching the Worker so Shortcuts can
branch on stable top-level fields: `ok`, `saved`, `retryable`, `outcome`,
`shortcut_action`, `code`, `message`, and `request_id`. Actions are
`DELETE_QUEUE`, `KEEP_RETRY`, `KEEP_FIX`, and `KEEP_STOP`. Network/edge failures
produce no envelope, so the client retains its queue record.

### `POST /api/v1/captures`

Current JSON fields: `idempotency_key`, `source_type` (`url|text|note|image|file`), `source_app`, conditional `url`, `shared_text`, or finalized `attachment_id`, optional `user_reason`, `quick_category`, `privacy_level`, `captured_at`, and strict `client{name,version}`. Audio bytes use an upload `source_type` of `audio` and a capture `source_type` of `file` until the future recording contract is approved.

Future-compatible capture fields still reserved include `review_at`, richer source metadata, and video/recording source types.

- `201`: new raw item saved; downstream status may be pending.
- `200`: idempotent replay returns original ID.
- `202`: reserved for a future upload/finalization flow when the raw item is durable and asynchronous final work is explicitly part of that contract.
- `400`: malformed JSON.
- `401/403`: invalid credential/scope.
- `422`: field or conditional validation.
- `503`: raw storage unavailable; retry with same key.

## Implemented attachment flow

### `POST /api/v1/uploads/init`

Capture scope. Input: filename, MIME type, exact byte size, optional SHA-256 content hash, and intended source type. The Worker validates the configured size ceiling and MIME allowlist, persists expiry, and returns an attachment ID plus controlled upload target and allowed headers.

### `PUT /api/v1/uploads/:attachmentId/content`

Controlled byte upload. The authenticated Worker enforces pending state, expiry, exact `Content-Length` and actual byte length, declared MIME, bounded magic-byte signature, and SHA-256 before writing to private R2.

### `POST /api/v1/uploads/:attachmentId/finalize`

Verify object existence, metadata, size, and hash and mark the attachment linkable. Repeated finalization is idempotent. Hourly cleanup removes expired unlinked R2 objects idempotently.

`POST /api/v1/captures` links one finalized `attachment_id` to its canonical item. `GET /api/v1/attachments/:attachmentId/content` streams authorized private bytes; `DELETE` is admin-only. `GET /api/v1/uploads/usage` reports active object counts and bytes by lifecycle state.

The Shortcut compatibility endpoint orchestrates this same private lifecycle
server-side in one request; the staged endpoints remain available to richer
clients.

## Implemented privacy override

### `PATCH /api/v1/items/:itemId/privacy`

Admin scope. Required input: `privacy_level` plus `derived_data_action` (`reprocess|purge`). Optional hosted-routing evidence: `ai_provider` (`openrouter|gemini`), `credential_source` (`app_managed|user_provided|none`), `hosted_processing_consent`, `zero_data_retention_enforced`, and `data_collection_denied`. The API never accepts or returns a provider secret. The operation invalidates current derived fields/jobs, records an audit event and either creates a policy-stamped enrichment job or leaves derived data purged. Personal app-managed reprocessing selects OpenRouter only when consent, ZDR and denied data collection are all explicit; otherwise it records `none`.

## Planned item and review API

- `GET /api/v1/items/:id`: authoritative item, source/derived fields, attachments, coverage, status, jobs, sync, provenance.
- `GET /api/v1/items`: cursor pagination and filters for status/source/project/topic/privacy/date/processing.
- `PATCH /api/v1/items/:id`: admin edits to allowed derived/review fields with optimistic version check.
- `POST /api/v1/items/:id/status`: validated lifecycle transition.
- `POST /api/v1/items/:id/retry`: enqueue only an eligible failed/pending stage.
- `POST /api/v1/items/:id/feedback`: Useful, Not Relevant, Already Used, Outdated.
- `POST /api/v1/items/:id/delete`: soft delete and grace-period start.
- `POST /api/v1/items/:id/restore`: restore during grace period.
- `DELETE /api/v1/items/:id`: explicit confirmed purge; admin/human gate.

Raw source fields and original user reason are immutable. Corrections target derived/editable fields and create audit events.

## Implemented search API

### `GET /api/v1/search`

Admin scope only. Capture and local-worker tokens are rejected. The server returns
all non-deleted privacy levels for the current personal-admin contract; clients
cannot override visibility.

Query parameters:

- `q`: optional keyword query, trimmed and capped at 256 characters. Missing or
  blank selects filter-only browsing; a nonblank query containing no searchable
  Unicode letter, number, or underscore returns an empty page.
- `source`: one of `url`, `text`, `note`, `image`, or `file`.
- `project`, `lifecycle_status`, `processing_status`, `importance_min`,
  `importance_max`, `captured_from`, and `captured_to`: optional exact/range
  filters combined with `AND`. Importance is 0–100 and capture dates are
  offset-bearing ISO-8601 timestamps; inverted ranges are rejected.
- `limit`: 1–100, default 25.
- `cursor`: optional opaque base64url keyset cursor, capped at 1024 characters.
  Cursors are versioned and fingerprinted to the normalized query and filters;
  changing those values invalidates the cursor. Page size may change.

Keyword results order by FTS rank ascending, then `captured_at DESC`, then
`id ASC`. Filter-only results order by `captured_at DESC`, then `id ASC`.
Cursors include the corresponding order keys and the first-page cutoff, so a
newer capture does not enter a traversal that is already in progress.

The response uses `{ data, meta }`. Each data item contains the item ID, title,
source type/app, project, topics, importance, lifecycle/processing/privacy
statuses, captured date, coverage, and `snippet: { segments, truncated }`.
Each segment is `{ text, highlighted }`; callers must render `text` as text and
must not feed it to `innerHTML`. `meta` contains `request_id`, `count`,
`duration_ms`, and `next_cursor` only when another page exists. Invalid input
returns the standard `VALIDATION_ERROR` envelope; auth and internal failures use
the existing redacted global error contract.

Search is lexical retrieval using D1 FTS5 `unicode61`. It does not call an AI
provider and does not require embeddings, a vector database, reranking, or
generation.

## Implemented processing and operations API

- `GET /api/v1/jobs`: admin-only list. Query `kind=processing|sync`,
  `status=pending|processing|retry_wait|complete|failed`, optional `type`,
  `item_id`, and `limit` 1–100. `retry_wait` is the derived representation of
  `pending` plus a future `available_at`.
- `POST /api/v1/jobs/:id/retry?kind=processing|sync`: admin-only, bounded to
  three manual retries. It rejects deleted items, paused optional processing,
  stale privacy snapshots, ineligible hosted processing and deleted Notion
  pages.
- `POST /api/v1/items/:id/notion/recreate`: admin-only owner approval for a
  confirmed deleted/missing Notion page.
- `POST /api/v1/worker/jobs/lease`: local-worker token; body contains
  `job_type`, `owner_id`, `ttl_minutes` and `limit`.
- `POST /api/v1/worker/jobs/:id/heartbeat`: local-worker token and exact owner.
- `POST /api/v1/worker/jobs/:id/fail`: local-worker token and exact owner;
  accepts a stable `error_code`, `retryable`, and optional bounded
  `retry_after_seconds`. The server owns the retry ceiling and persists only
  safe error codes.
- `POST /api/v1/worker/jobs/:id/result`: local-worker token; idempotent
  `submission_id`, `input_hash`, `result_version`, and a credential-key-free
  result object capped at 64 KiB.
- `POST /api/v1/worker/jobs/:id/release`: local-worker token; controlled
  release/shutdown.

Provider workers lease only policy-stamped jobs. Separate capture, admin, and
local-worker secrets preserve least privilege.

## Planned operations API

- `GET /api/v1/usage`: storage, provider use, quotas/headroom, rows read/written, sync lag.
- `GET /api/v1/health`: service/dependency status without secrets.
- `POST /api/v1/exports`: create versioned export job.
- `GET /api/v1/exports/:id`: status and short-lived authorized download.

## Planned Notion/digest endpoints

- `POST /api/v1/notion/reconcile`: import only allowed editable fields with conflict/version policy.
- `POST /api/v1/digests/generate`: deterministic eligible digest, idempotent per period/config.
- `POST /api/v1/digests/:id/review`: owner review marker.

Notion deletion is never a D1 deletion command.

## Conditional V1.5 RAG API

### `POST /api/v1/rag/query`

Input: question, optional conversation ID, project/source/date/topic filters, privacy mode, result/evidence limits. Output includes retrieval run ID, answer state (`answered|partially_answered|conflicting_evidence|insufficient_evidence`), cited answer blocks, conflicts, limitations, suggested follow-up, corpus/index/prompt versions, and provider mode (`hosted|local|retrieval_only`).

Every citation ID resolves through an authorized endpoint to one chunk/source span/item. No supplied-context citation means the factual block is rejected.

- `GET /api/v1/rag/retrievals/:id`: authorized candidate/score/selection trace.
- `GET /api/v1/rag/citations/:id`: exact chunk span and item/source metadata.
- `POST /api/v1/rag/feedback`: usefulness, unsupported claim, citation issue, irrelevant evidence.
- `POST /api/v1/rag/reindex`: human/admin-gated versioned index build/switch.

Vector/generation outage degrades to lexical retrieval or evidence-only results, never fabricated answers.

## Stable error families

`INVALID_JSON`, `INVALID_FORM`, `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `VERSION_CONFLICT`, `UNSUPPORTED_TYPE`, `WRONG_SIGNATURE`, `FILE_TOO_LARGE`, `INVALID_URL`, `UPLOAD_EXPIRED`, `UPLOAD_INCOMPLETE`, `STORAGE_UNAVAILABLE`, `QUOTA_PAUSED`, `JOB_NOT_LEASABLE`, `PROVIDER_UNAVAILABLE`, `INVALID_PROVIDER_OUTPUT`, `SYNC_RATE_LIMITED`, `EXPORT_NOT_READY`, `PURGE_CONFIRMATION_REQUIRED`, `INSUFFICIENT_EVIDENCE`, `INTERNAL_ERROR`.

## Pagination, concurrency, and idempotency

List/search endpoints use stable cursor pagination. Mutable resources expose an update/version token. Create/finalize/retry/digest/export operations accept idempotency semantics. Duplicate delivery must never produce duplicate canonical items, Notion pages, jobs, answer caches, or purge actions.

## Digest administration

All digest endpoints require the admin token or signed admin session.

- `POST /api/v1/digests/generate` — `{ digest_type, scheduled_at?, deliver? }`.
- `GET /api/v1/digests/:id` — run, delivery history and audit history.
- `POST /api/v1/digests/:id/regenerate` — creates a new generation version.
- `POST /api/v1/digests/:id/review` — records operator review.
- `POST /api/v1/digests/:id/deliver` — queues a reviewed run.
- `POST /api/v1/digest-deliveries/:id/retry` — definite failures only.
- `POST /api/v1/digest-deliveries/:id/reconcile` — resolves `unknown` as sent or failed.
- `POST /api/v1/digest-deliveries/:id/cancel` — cancels pending or failed delivery.
