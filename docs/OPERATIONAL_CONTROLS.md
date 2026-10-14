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

Unless a download is identified, results use `{data, meta: {request_id}}`; rejections use `{error: {code, message}, meta}`. Reads never perform a retry/purge/restore implicitly. Current helper `apps/web/src/api.ts` expects JSON envelopes; use authenticated download navigation/fetch for exports and originals instead.

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

Inspect `GET /items/<item-id>` for `notion_recreation` eligibility and `GET /jobs?kind=sync&status=failed&item_id=<item-id>` for the stored failure. `POST /items/<item-id>/notion/recreate` has no request body or version field; the server rechecks that the item is active and its stored projection is confirmed missing. A missing page alone never authorizes canonical deletion.

Success: `{item_id, notion_recreation:"approved", sync_status:"pending"}`. It clears the old missing projection reference, supersedes pending/processing attempts and queues one new retry-safe attempt. Audit `notion_recreation_approved` includes the request actor and safe sync-attempt ID. Repetition after approval fails 409 `OWNER_APPROVAL_REQUIRED` because missing-page eligibility was cleared. This does not claim the Notion page already exists. UI confirmation: **Recreate the missing Notion projection for this item? Original D1/R2 data stays authoritative.** Refresh eligibility and sync status; there is no API cancellation after external work starts. BG27 owns a minimal failure/retry view; the current item view already exposes eligible recovery actions.
