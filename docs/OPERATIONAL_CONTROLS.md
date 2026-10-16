# Operational control inventory (BG-23)

Inventory baseline: `b6f5113`, October 14, 2026. Source of requirements: OPE-247, ADR-008/033 and `OPERATIONS_RUNBOOK.md`. BG21/BG22's open release checks remain inherited qualifications; the owner authorized continuing this inventory and BG24 implementation.

## Actors and existing surfaces

All paths below are relative to `/api/v1`. Normal capture/review remains on `/`, `/capture`, `/capture/file` and `/items/:id`. There is currently no operations page or operator navigation link. Later BG26-28 own those screens; this document is their exact scope/contract input.

| Actor             | Authority                                                                | Existing surface                                                     |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Owner/admin       | Protected inspection and explicitly authorized operator mutations        | Admin bearer; signed browser session (writes require allowed Origin) |
| Capture client    | Create captures, upload originals and retrieve original attachment bytes | Capture bearer; Shortcut capture remains capture-only                |
| Local worker      | Lease, heartbeat, report results/failures, release owned jobs            | Local-worker bearer; not an admin credential                         |
| External services | Notion projection, Telegram delivery, optional AI                        | Worker-owned integrations; never canonical-delete authority          |

Classify every control as **read-only**, **reversible**, **external**, or **destructive**. A POST inspection may still store a result/audit or call Notion, so it is not automatically a pure read. An absent UI does not imply a missing API. No generic dashboard, new aggregate API, external send or production operation is implemented by this inventory.

Operator APIs below use `{data, meta: {request_id}}`; rejections use `{error: {code, message}, meta}`, except named downloads. Shortcut capture is a separate form-only endpoint whose HTTP-200 `ok/saved/outcome/code` envelope must be inspected even on failure. Reads never perform a retry/purge/restore implicitly. Current helper `apps/web/src/api.ts` expects JSON envelopes; use authenticated download navigation/fetch for exports and originals instead. BG24 makes explicit invalid bearers fail closed for original reads too; remove a stale Authorization header rather than relying on an ambient cookie fallback.

## Usage and capacity (read-only, admin)

`GET /usage` is implemented by `capacityRoutes` and `AiCapacityStatusService` in `apps/worker-api/src/jobs/ai/`. No query/body is required. Response fields are `policy_version`, `generated_at`, `warning_thresholds`, `windows` (provider, scope, period, level, dimensions), `circuit_breakers`, `deferred_jobs` and `last_successful_provider_calls`. Breakers expose `last_success_at`, `last_failure_at`, `last_error_code` and `next_probe_at`. Treat reserved capacity in the dimensions as already unavailable when deciding whether to retry.

At 70% show warning, at 90% high warning, at 100% hard stop. Display units and period boundaries; requests and Neurons are not interchangeable. A provider breaker opens after three qualifying failures and permits one bounded half-open probe after cooldown. Manual retry never bypasses admission, free-model or privacy policy.

Missing dashboard data must say **not measured**, never zero. This route does not establish Cloudflare account billing, Workers/D1/R2 account-wide usage or free-tier remaining balance from provider dashboards. There is no single consolidated backup/restore-rehearsal endpoint. `last_successful_provider_calls` comes from successful application `provider_usage` rows, not from an empty failure list or a provider-account health guarantee. The proposed BG26 protected operations page presents application estimates, breaker state, reset timing and the measurement gaps; current operator alternative is the authenticated API and provider dashboard inspection.

## Jobs and retry (inspection read-only; retry reversible, admin)

Source: `jobs/job.routes.ts`, `job.schema.ts`, `job.admin.service.ts`.

- `GET /jobs?kind=processing&status=failed&limit=50`: `kind` is `processing` (default) or `sync`; `status` is pending/processing/retry_wait/complete/failed; optional `type` (1–80 chars) and `item_id` (1–128 chars); limit 1–100, default 50. Response `{kind, jobs}`. There is no offset/cursor or complete backlog-age aggregate; a bounded list is not a total count.
- `GET /jobs/processing-reconciliation?limit=20`: bounded read-only drift preview. `POST` on the same route with `{"item_ids":["<item-id>"]}` explicitly reconciles aggregate processing state. These are item IDs, not job IDs.
- `POST /jobs/<job-id>/retry?kind=processing` or `kind=sync`: no body/version/confirmation phrase. Only an eligible **failed** job/attempt; success `{job_id, kind, status:"pending"}`. A repeated activation sees non-failed state and returns 409 `JOB_NOT_LEASABLE`; it is not a duplicate queue insertion. Original attempts are retained and manual retries are capped at three.
- Processing retry rejects deleted items, stale generation/privacy, paused optional processing, ineligible enrichment policy and `acquire_url` work (use generation-aware item reprocess instead). Quota admission remains enforced when execution starts. Audit: `manual_retry_requested` or `manual_sync_retry_requested`, actor `request:<request_id>`.
- `retry_wait` means pending with `available_at > now`; do not reset it or steal a live lease. Display `available_at`, lease expiry, attempts, error code and safe entity ID. Successful queueing is **queued**, not completed processing. Refresh the exact job row/item afterward. This retry API has no cancellation endpoint.

## Notion projection recovery (external, admin)

### Source recovery alternative for URL jobs

`GET /items/<id>/source/retry-eligibility?source_revision=<positive integer>` is read-only. `POST /items/<id>/source/retry` requires `{"source_revision":<same revision>}`; the server rechecks current generation, state, privacy and retry timing. For legacy captures, `GET /admin/source-reprocess/preview?limit=20` is a bounded read-only candidate list (1–20), and `POST /admin/source-reprocess/run` accepts `{"items":[{"item_id":"<id>","source_revision":1}]}` (1–20 entries). Inspect each returned result; it is not a generic failed-job retry or a promise that fetching succeeded.

Existing item UI also uses `POST /items/<id>/source/text` with `{"edit_version":<current positive integer>,"text":"<owner excerpt>"}` (trimmed 1–250000 chars), or `/source/url` with the same version and `source_url` (valid URL ≤2048 chars). These are explicit evidence changes with version guards, not background inspection. Never overwrite acquired evidence with an unlabeled owner excerpt. Source-service audit/version records remain authoritative; there is no generic `/items/:id/reprocess` endpoint.

### Notion recreation

Inspect `GET /items/<item-id>` for `notion_recreation` eligibility and `GET /jobs?kind=sync&status=failed&item_id=<item-id>` for the stored failure. `POST /items/<item-id>/notion/recreate` has no request body or version field; the server rechecks that the item is active and its stored projection is confirmed missing. A missing page alone never authorizes canonical deletion.

Success: `{item_id, notion_recreation:"approved", sync_status:"pending"}`. It clears the old missing projection reference, supersedes pending/processing attempts and queues one new retry-safe attempt. Audit `notion_recreation_approved` includes the request actor and safe sync-attempt ID. Repetition after approval fails 409 `OWNER_APPROVAL_REQUIRED` because missing-page eligibility was cleared. This does not claim the Notion page already exists. UI confirmation: **Recreate the missing Notion projection for this item? Original D1/R2 data stays authoritative.** Refresh eligibility and sync status; there is no API cancellation after external work starts. BG27 owns a minimal failure/retry view; the current item view already exposes eligible recovery actions.

## Digests and delivery (admin; generation reversible, delivery external)

Source: `digests/digest.routes.ts`, `digest.schema.ts` and repository state guards.

| Control                                           | Exact input and success                                                                 | Eligibility, repeat, audit                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /digests`                                    | No body; returns up to 20 recent run summaries                                          | Admin only, no-store, no delivery side effects                                                                     |
| `POST /digests/generate`                          | `{"digest_type":"daily"}` or weekly; optional UTC `scheduled_at`; returns generated run | Period/version deduplicated; does **not** queue delivery                                                           |
| `GET /digests/<run-id>`                           | No body; returns run details, deliveries, current live preview                          | Admin only, no-store; 404 absent; preview never queues or sends                                                    |
| `POST /digests/<run-id>/regenerate`               | Strict empty `{}`; returns new generated version                                        | Explicit regeneration; does not send; use returned run ID                                                          |
| `POST /digests/<run-id>/review`                   | `{"reviewed_by":"operator-id"}` (default admin)                                         | `{digest_run_id, reviewed:true, replayed}`; `digest_marked_reviewed`                                               |
| `POST /digests/<run-id>/deliver`                  | No body; returns delivery record                                                        | Reviewed run required or 409 `DIGEST_REVIEW_REQUIRED`; queues delivery, not sent proof; audit queued/skipped-empty |
| `POST /digest-deliveries/<delivery-id>/retry`     | No body; `{delivery_id,queued:true}`                                                    | Only definite failed; 409 `INVALID_STATE` otherwise; `digest_delivery_manual_retry`                                |
| `POST /digest-deliveries/<delivery-id>/reconcile` | `{"state":"sent","telegram_message_id":"observed-id"}` or `{"state":"failed"}`          | Only unknown; reconcile after checking destination; `digest_delivery_reconciled`                                   |
| `POST /digest-deliveries/<delivery-id>/cancel`    | No body; `{delivery_id,state:"cancelled"}`                                              | Pending/failed only; no recall of sent message; `digest_delivery_cancelled`                                        |

A manual operator must inspect actual destination evidence before reconciling an `unknown` delivery. A `sent` reconciliation requires the observed Telegram message ID, never a guessed value. Reconcile to `failed` only when affirmative provider evidence proves non-delivery, not merely because the message is not currently visible. No version/confirmation phrase is required by these APIs. The proposed UI must display the exact run/delivery ID and require explicit delivery approval: **Queue this reviewed digest to the configured private destination?** Never show raw captures or a chat credential. For `unknown`, say **Delivery may already have succeeded; inspect the destination before reconciling.** Do not offer Retry. Cancellation cannot retract an in-flight/accepted external message. BG-27 implements these minimal controls through the authenticated `/digests` Web Inbox page, not a new sending engine. Another generation of the same period cannot be queued when any non-skipped delivery history exists. An expired leased send is marked `unknown` instead of being resent automatically. Previewing never sends, but a scheduled digest Worker may still send its separately configured eligible run.

## Export, backup and recovery (admin)

Source: `recovery/*.routes.ts` and [existing procedures](OPERATIONS.md#ope-228-backup-export-purge-and-recovery-operations).

| Control                               | Request/result                                                           | Safety and repeat semantics                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /export?format=json` or csv      | Full portable JSON or CSV attachment; not an envelope                    | Read-only disclosure of owner content; private destination only. CSV is not restore input. Attachment bytes are separate. Unsupported format 422 |
| `POST /backups`                       | Empty body; 201 artifact metadata                                        | Writes private R2 and D1 verification metadata; read-back/hash required for complete. Repeated POST creates a new backup; no idempotency key     |
| `GET /backups`                        | `{backups}`                                                              | Read-only metadata, use only verified complete artifacts as recovery candidates                                                                  |
| `GET /backups/<backup-id>/download`   | JSON attachment plus `X-RecollectFlow-Backup-SHA256`                     | Authenticated read; verify bytes/hash. Original data is not rewritten on backup failure                                                          |
| `POST /integrity-checks`              | Empty body; 201 `{run,findings}`                                         | Inspects D1/R2/Notion and records a run. **Not** side-effect-free: audit persistence and external Notion reads; no canonical deletion            |
| `GET /integrity-checks/<run-id>`      | `{run,findings}`                                                         | Read-only stored result, 404 absent; no list-latest route                                                                                        |
| `POST /items/<item-id>/purge-request` | `{"edit_version":<current integer>}`; 201 workflow ID, phrase and expiry | Destructive workflow preparation for soft-deleted item only; stale/reverted version rejected                                                     |
| `POST /purges/<workflow-id>/confirm`  | `{"confirmation":"<server-issued phrase>"}`; queued state                | Exact phrase, workflow/item state and 15-minute expiry checked; does not bypass version guard                                                    |
| `GET /purges/<workflow-id>`           | `{workflow,steps}`                                                       | Read-only; show partial progress and safe error codes; no purge-list aggregate                                                                   |
| `POST /purges/<workflow-id>/run`      | Empty body; refreshed `{workflow,steps}`                                 | Only queued/processing/partial or 409 `PURGE_NOT_RUNNABLE`; resumes incomplete steps; never claim cross-system atomic success                    |
| `POST /restore?dry_run=true`          | Portable JSON document as body; validation/restore plan                  | Explicit dry-run required in procedure; inspect target and purge-ledger exclusions first                                                         |
| `POST /restore?dry_run=false`         | Same full JSON; result with verification                                 | Destructive clean-target insert only; refuses populated canonical target. Omitting the flag is rejected with 422; always specify the intended mode         |

Purge preparation writes `purge_confirmation_requested`; approval writes `purge_confirmed`, followed by workflow/step/receipt evidence. Restore/backup/integrity retain run/artifact outcome records rather than a universal operator audit feed. Restore dry-run also writes a run record; it returns `{run,plannedItemCount,skippedPurgedItemIds,attachmentReadiness}` while leaving canonical item data unchanged. Non-dry-run returns the same shape after verification, or 409 `RESTORE_TARGET_NOT_EMPTY` for a populated target. No API cancellation is available for confirmed purge or restore. Confirmation copy: **Permanently purge this exact item and its controlled originals? External owner-downloaded copies cannot be recalled.** Advanced restore remains command/procedure-only: identify Worker/account/D1/R2, preserve purge receipts, run dry-run, verify clean target and backup before explicit approval. Existing Time Travel and SQL-export commands in the runbook remain separate from portable restore; do not expose an in-place restore button.

## Incident-to-control mapping

| Incident                            | Diagnosis and safe next action                                | Completion proof / unresolved boundary                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Capture/storage failure             | Health + request ID; client retains same idempotency key      | Read canonical item after replay; no false Saved. No operator search-by-idempotency endpoint; reconcile using retained client response/operator D1 procedure |
| AI outage/quota pause               | `/usage` reset/probe times; `/jobs` future `available_at`     | Wait for eligibility; failed-only manual retry or item reprocess; paused optional processing is an existing DB control without a Web/API toggle              |
| Notion failure/page loss            | Item recreation eligibility + sync failure list               | Explicit recreate or failed-attempt retry; refreshed projection sync proof; D1/R2 remain intact                                                              |
| Digest timeout/unknown              | Exact digest/delivery record and observed private destination | Reconcile unknown, never blind resend; no latest-run aggregate                                                                                               |
| Backup failed/incomplete            | `/backups`, exact artifact verification, integrity findings   | Verified content hash/read-back; do not modify canonical data to fix backup                                                                                  |
| Partial purge                       | `/purges/<id>` failed step and receipt status                 | Run only confirmed workflow, resume incomplete steps; show **Some steps remain incomplete** until complete                                                   |
| Stale lease                         | `/jobs` lease expiry, owner, generation, retry timing         | Wait/worker-owned release; no operator force-steal control; eligible work retried with server guards                                                         |
| Missing/corrupt original            | Item attachments, download status/hash, integrity check       | Recover verified bytes from approved backup procedure; no fabricated successful download                                                                     |
| Token exposure                      | Affected scope and safe request/rotation evidence             | Immediate scope revocation and client update per BG24; copied sessions require key revocation, not only Logout                                               |
| Corrupted/lost D1                   | Cloudflare status/bookmark and verified export/purge ledger   | Clean-target restore plus FK/count/FTS checks before approved traffic switch                                                                                 |
| Deleted/restricted content surfaces | Integrity/search and item/index generation evidence           | Stop affected retrieval; approved purge/index-rebuild procedure; V1.5 RAG/vector/cache controls remain later scope                                           |
| Search-index drift                  | Existing `scripts/rebuild-item-search-index.sql` count output | Approved backup first, rebuild isolated target, zero missing/orphaned/duplicate counts; command-only                                                         |

For every write, show the safe target ID and refreshed server result. A queue acceptance is not external completion; an unavailable capability is **not implemented**, not a disabled-but-working button. Existing operator SQL, external dashboards and restore rehearsal records are manual alternatives, not hidden Web features.

## Minimum V1 interface and handoff

- **BG24-25:** bounded credentials, session behavior, authentication/log safety; normal capture/review remain unchanged.
- **BG26:** one protected operations page, reachable by an owner navigation link, showing usage/headroom, reset/probe timing and failed/stalled work. Explicitly label unavailable account/storage measurements. Use existing APIs; no UI-derived permission policy.
- **BG27:** failed processing/sync inspection and eligible retry/recreation using the exact job, sync-attempt or item ID above. Refresh server eligibility; keep unknown/paused/stale/deleted work unavailable with an explanation.
- **BG28:** digest inspection/review/reconciliation and private authenticated export/backup/integrity surfaces within its approved chapter. External delivery remains deliberate; unknown is never a Retry button.
- **Command-only:** clean-target restore, Time Travel, SQL snapshot/FTS rebuild and external provider token rotation. Carry actor, target, operation timestamp and verified outcome in a nonsecret operator ledger.
- **Deferred:** account-wide billing/storage aggregation, newest digest/integrity/restore-rehearsal discovery, purge backlog aggregate, optional-processing toggle and V1.5 vectors/RAG/cache controls. Their current alternatives are safe API IDs, operator-owned SQL/dashboards and rehearsal records. Define a new contract only when a later ticket explicitly owns it.

No settled decision is needed to start these minimal scopes. BG23 is an inventory/design deliverable; it does not complete OPE-247's dashboard or consolidated security acceptance. BG21/BG22 release qualifications and remote/device acceptance remain open regardless of this handoff.
