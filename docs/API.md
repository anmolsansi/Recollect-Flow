# Api

<!-- OPE-227 START -->

## OPE-227 AI capacity status

`GET /api/v1/usage` is admin-only. It returns safe capacity metadata: policy version, current quota windows, consumed/reserved/remaining dimensions, 70%/90%/hard utilization states, circuit-breaker state and next probe time, capacity-deferred job counts, and last successful provider-operation timestamps. It must not return prompts, raw item content, provider responses, credentials, or token values.

Hosted AI execution remains behind the existing privacy policy. OPE-227 adds a mandatory zero-cost capacity admission step before non-mock enrichment, vision extraction, or optional digest wording. Capacity errors use stable codes including `QUOTA_PAUSED`, `PROVIDER_UNAVAILABLE`, and `NO_ELIGIBLE_PROVIDER`.
<!-- OPE-227 END -->

<!-- OPE-228 START -->

## OPE-228 backup, export, purge, restore, and integrity API

All OPE-228 routes require the existing admin authorization boundary. A capture token is insufficient.

### Portable export

`GET /api/v1/export?format=json|csv`

- `json` is the versioned full-fidelity portable/restore format.
- `csv` is an independently readable item-level projection and is not a restore input.
- attachment metadata/references are exported; attachment bytes and credentials are not.

### Hosted backup

`POST /api/v1/backups`

Creates a new immutable hosted JSON backup artifact under a unique private R2 key. The route returns only after write/read-back hash and byte-size verification succeeds.

`GET /api/v1/backups`

Lists hosted-backup metadata including state, schema version, SHA-256, size, verification timestamp, and expiry.

`GET /api/v1/backups/:id/download`

Returns the stored JSON only for a verified unexpired `complete` artifact. Retrieval recomputes the content hash/size and refuses a mismatched object.

### Explicit permanent purge

`POST /api/v1/items/:id/purge-request`

Body:

```json
{ "edit_version": 7 }
```

Requires the item to already be soft deleted at that exact edit version. Returns a workflow-bound confirmation phrase and expiry.

`POST /api/v1/purges/:id/confirm`

Body:

```json
{ "confirmation": "PURGE <item-id> <workflow-id>" }
```

Queues destructive work only when the phrase matches, the 15-minute confirmation window is active, the item is still soft deleted, and its edit version has not changed.

`GET /api/v1/purges/:id`

Returns durable workflow/step state and stable failure codes without returning deleted content.

`POST /api/v1/purges/:id/run`

Runs or resumes an already confirmed `queued|processing|partial` purge. It cannot create or bypass confirmation. Partial external failures remain retryable.

### Portable restore

`POST /api/v1/restore?dry_run=true|false`

Accepts the versioned JSON portable export. Restore applies the newest D1/export/private-R2 purge receipt ledger before planning item insertion. Non-dry-run restore requires an empty canonical target and verifies foreign keys, active-item FTS coverage, item counts, and anti-resurrection guarantees before reporting success.

### Recovery integrity scan

`POST /api/v1/integrity-checks`

Runs read-only checks for attachment/R2 drift, missing Notion projections, partial purges, and hosted-backup verification/retention drift.

`GET /api/v1/integrity-checks/:id`

Returns the persisted run and findings. Integrity findings never initiate canonical deletion.
<!-- OPE-228 END -->

## BG-11 URL recovery (merged-main CI verified)

All routes are under `/api/v1` and require an admin session or token. A capture
token cannot call them. Request bodies are strict; all error messages are safe
for display and never contain fetched content or signed URL parameters.

| Method | Endpoint                                                | Purpose                                                                                                      |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/items/:id/source/retry-eligibility?source_revision=N` | Returns current `eligible`, `reason` and `active_job_id` without side effects                                |
| POST   | `/items/:id/source/retry`                               | With `{"source_revision":N}`, return current active job or enqueue a bounded public-safe retry               |
| POST   | `/items/:id/source/text`                                | With `{"edit_version":N,"text":"..."}`, record owner-supplied text once without rewriting capture provenance |
| POST   | `/items/:id/source/url`                                 | With `{"edit_version":N,"source_url":"https://..."}`, start a new source revision and suppress stale fetches |
| GET    | `/admin/source-reprocess/preview?limit=N`               | Read-only count/IDs for at most 20 old eligible URL items                                                    |
| POST   | `/admin/source-reprocess/run`                           | With explicit `{"items":[{"item_id":"...","source_revision":N}]}`, enqueue at most 20 candidates             |

The retry endpoint enforces Public source-host privacy, safe destination,
non-deleted/non-purging state, current revision and operational pause. Source
acquisition has three automatic transient attempts, up to three accepted owner
retries per URL revision, and bounded `Retry-After` handling. Backfill does not
run from deployments or migrations.

The source outcome is separate from `items.processing_status`. The aggregate
processing-status contract remains the BG-12 milestone. See
[BG-11 evidence](verification/BG-11_URL_RECOVERY.md).
