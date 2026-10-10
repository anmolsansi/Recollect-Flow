# BG-13 Atomic Transitions: Implementation and Review Evidence

Status: **in implementation, not release-ready**. Main task [#61](https://github.com/anmolsansi/Recollect-Flow/issues/61), draft [PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62), branch `agent/bg-13-atomic-transitions`, starting main `8a8b2a53494f908b153c10492d12e7958f93b86d`.

## Why this work exists

BG-12 proved a deterministic aggregate decision but did not bind that rule to stored items. A terminal processing job could be failed while an item still reported pending, and a late worker could accept a result after privacy/source revision changed. Read and write paths must agree, with no external provider request inside an open database transaction.

## Chosen approach and tradeoff

Use additive D1 generation columns with SQL same-statement status projection. SQLite triggers run with job and item updates atomically, avoiding an application-level read/recompute/write race. Unlike a centralized application service, this also covers legacy writers that already update the job table directly. The cost is more SQL maintenance and a need to test every writer's actual `RETURNING` row, not indirect trigger-inflated `meta.changes`.

The alternative was service-owned D1 batches across every writer. That would require refactoring the existing source acquisition, extraction, enrichment, retry, and other writers before they could be safe. The database-side projection limits simultaneous redesign, but it must still converge with BG-12's exact required-stage rules.

## Data ownership and migration

- `migrations/0023_add_processing_generation.sql` defines `items.processing_generation` and nullable provenance on `processing_jobs` and `extraction_records`. New inserts receive the current item epoch. Rows created before this migration remain NULL and cannot be silently interpreted as current.
- An item source revision, privacy level, supplied raw text, or deleted/restored transition advances the epoch in the same SQLite transaction. Superseded pending/processing jobs are released from their active uniqueness slot and tagged `PROCESSING_SUPERSEDED`.
- `migrations/0024_materialize_current_processing_status.sql` creates current-stage/aggregate views and status projection triggers. Only jobs in the current epoch contribute. The stored enum remains `pending | processing | complete | failed`; retry wait stays presentation-only.
- User notes, owner overrides, original capture evidence, audit events, FTS and optimistic `edit_version` are separate and must remain intact. Notion/digest cannot fail primary processing.

## Guarded workers

- `JobService`: current-generation and privacy/purge eligibility at lease, heartbeat, completion, result insertion, extraction evidence, failure, deferral and release.
- `SourceAcquisitionService`: source revision, privacy snapshot, active lease and current epoch checked before durable source evidence/chaining/completion.
- `EnrichService`: provider and derived-item writes must have an active lease and current epoch at commit, not just before network I/O.
- `JobAdminService`: manual retry checks current epoch and eligibility; race-losing writes are rejected.
- `ProcessingReconciliationService`: admin-only bounded preview and explicit 1–20 ID repair. Every repair recalculates from live current-generation evidence. Deleted, purging and ambiguous legacy-only items are excluded. No scheduled, automatic historical backfill is permitted.

## Admin repair contract

`GET /api/v1/jobs/processing-reconciliation?limit=20` returns the count and up to 20 current-generation mismatches. `POST /api/v1/jobs/processing-reconciliation` takes `{ "item_ids": ["reviewed-item-id"] }` and returns `updated` and `skipped`. Both require the normal admin token. Preview before submitting IDs. Repeated submissions should become no-ops. The API must never infer epochs from historical timestamps.

## Verification and outstanding acceptance

The implementation adds workerd D1 regressions for terminal failure, privacy supersession, expired-lease failure rejection and explicit-ID reconciliation. Existing tests cover source acquisition and other job transitions. Run `npm run check` and `npm run db:migrate:local` in CI. Do not report success or mark BG-13 complete until **exact-head CI passes**, migration/query review is complete, source and capacity writers are regression-clean, all canonical BG-13 steps are reconciled, and merged-main CI is verified.

No production migration, remote D1 backfill, live URL fetch, external source calls, or deployment was performed in this implementation session. The changed SQL/views and read model are not production-approved until CI and review gates pass.

## Known decision boundaries

- Historical NULL-generation work is intentionally not backfilled by timestamp. Operator review is required for an ambiguous item.
- A lease can expire without a new mutation. A clock-driven reconciliation/claim pass is required before calling an apparently active lease permanently authoritative.
- Current-stage SQL projection must match BG-12's no-AI, missing-required-stage and multi-attachment fixtures before completion is claimed.
- Rollback is forward-fix for additive D1 columns/triggers, not destructive down migration. Take a verified backup before any future production migration; disable new writers/reconciliation on a failed gate.
