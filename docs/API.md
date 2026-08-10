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
