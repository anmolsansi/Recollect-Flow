# BG-12 — Aggregate item processing-status contract

**Status:** BG-12 contract helper and truth-table tests passed full PR CI. Final PR-head/merged-main verification remains a separate gate.

**Tracking:** [GitHub #56](https://github.com/anmolsansi/Recollect-Flow/issues/56) · [Linear OPE-338](https://linear.app/openclaw-neutron/issue/OPE-338/bg-12-define-one-aggregate-processing-state-rule)

**Prerequisite:** [BG-11 verified merged-main closeout](BG-11_FINAL_CLOSEOUT.md), commit `aa526a6058d05d2c4e0f10528f56dac362cfaad0`.

## Decision: one deterministic rule, no stored enum expansion

`items.processing_status` can contain only `pending`, `processing`, `complete`, `failed`. The original SQLite CHECK constraint in `migrations/0001_initial.sql` remains authoritative. `retry_wait`, `capacity_paused` and `policy_paused` are **presentational reasons**, not new stored status values. URL `coverage`, lifecycle `Deleted`, and Notion synchronization are separate concepts.

Do not use the last job writer to win, or interpret `items.updated_at` as a lease. Adopt **required terminal failure > valid required active lease > required queued/deferred or missing work > complete**, after filtering out superseded generations and older attempts of a stage.

### Pure decision contract

`apps/worker-api/src/jobs/aggregate-processing-state.ts` exports
`decideAggregateProcessing({ generation, requiredStages, jobs, attachments, deleted, now })`.

- `generation` is a **caller-verified processing generation**, not a guess derived from `updated_at`.
- `requiredStages` is a normalized stage set selected by the **current** capture/source/privacy/AI policy. Available stages: `acquire_url`, `extract`, `enrich`. A current policy that deliberately skips AI omits `enrich`. If no stages are required, save-only processing is complete.
- `jobs` contains item-scoped job records with `stage`, `generation`, `status`, `createdAt`, `availableAt`, lease fields, and optional sanitized error/defer codes. Of repeated attempts for one stage/generation, choose the newest `createdAt` and break ties with stable job ID. Previous terminal failures never poison a newer attempt.
- `attachments` contains item-scoped required flags, current generation, and per-file completeness. A required file with `failed`, `empty`, or `unsupported` evidence blocks aggregate success. `partial` is successful at the stage boundary when usable text exists; communicate the limitation in `coverage` rather than inventing a fifth status. A pending or processing required file remains pending.
- `deleted` returns `status: null` (excluded from reconciliation). It **does not** write an item status, restore the item, or trigger work.
- `now` is an explicit valid clock; no implicit clock reads are used in the pure helper.
- Output `{ status, reason, blockingStage, blockingAttachmentId, nextEligibleAt, errorCode }` uses a four-value stored status or null for deleted, with safe explanatory metadata. Never expose raw job payloads to the UI.

### Decision table

| Current required work                                                                           | Item status                                     | Reason / important detail                                                                           |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Current required job terminally failed                                                          | `failed`                                        | `required_job_failed`, stable error code and stage; wins even if another required stage has a lease |
| Current required attachment terminally failed/empty/unsupported                                 | `failed`                                        | `required_attachment_failed`, attachment ID, regardless of other successful files                   |
| At least one required stage has a **valid** lease                                               | `processing`                                    | `lease_active`; a separate stage may still be pending                                               |
| A processing lease is expired/has no owner                                                      | `pending`                                       | `lease_expired`, not actively processing                                                            |
| A required stage has no current job                                                             | `pending`                                       | `required_stage_missing`, not falsely complete                                                      |
| Required pending job with `availableAt` in future                                               | `pending`                                       | `retry_wait`, with `nextEligibleAt`; this is not stored `retry_wait`                                |
| Explicit capacity, privacy, operator pause                                                      | `pending`                                       | `capacity_paused`, `policy_paused`, `operational_paused`; optional next eligible time               |
| Ready queued required job                                                                       | `pending`                                       | `queued`                                                                                            |
| All current required stages complete; required files complete or partial usable                 | `complete`                                      | `all_required_finished`                                                                             |
| Current policy deliberately requires no processing                                              | `complete`                                      | `all_required_finished` (save-only/no-AI)                                                           |
| Source acquisition terminally `complete` with login wall, only URL/metadata, policy restriction | `complete` when no other required work          | Source coverage **still limited**; successful bookkeeping is not proof of full source text          |
| Historical failure superseded by newer same-stage/current-generation job                        | newer job's status                              | Historical failure excluded                                                                         |
| Old input/source/privacy revision failed                                                        | ignored                                         | Must not poison new work                                                                            |
| Notion sync or digest failure                                                                   | no effect                                       | Their own health/sync state reports this independently                                              |
| Deleted item                                                                                    | `null`                                          | `deleted_excluded`, lifecycle/purge controls govern visibility                                      |
| Restored item                                                                                   | recompute only from explicit current generation | Do not resurrect stale work or mutate lifecycle                                                     |

**Failure precedence is intentionally strict for required work.** This is safer than hiding a terminal failed attachment behind an unrelated running enrichment job. A different product choice would need an approved contract change. Failures belonging to optional non-required jobs are **not** terminal blockers.

### Generation identity and compatibility gate

**Existing evidence:** `processing_jobs` stores `input_hash`, `privacy_level_snapshot`, `policy_version`, lease metadata, and time fields. `items.source_revision` advances when a URL changes; `acquire_url` expects `url-source-v1:<revision>`. Other processing jobs use values such as `enrich-after-extract`, or may have `NULL` input hashes. Job `created_at`/last update alone cannot reliably assign every old extract/enrich attempt to the current privacy, restored-item, source-text, and source-revision generation.

**Decision:** do not pretend the existing fields form a universal processing-generation key. This is **insufficient for a safe automatic database backfill**. BG-12 accepts a pure helper requiring a caller-proven `generation`. BG-13 must choose and implement the smallest explicit persisted `processing_generation` epoch for the items and relevant jobs, or provide an equally provable authoritative job/generation binding. Old ambiguous jobs must be treated as untrusted historical evidence until mapped by a bounded, auditable migration. New epoch changes must occur in the same transaction as authoritative reprocessing decisions; replay/rollback must preserve old provenance. Do not run an automatic production table-wide reconciliation based on timestamps.

**Needs Architect Decision (BG-13 before state writes):** exact epoch bump events and transaction boundary spanning item source edits, privacy-route updates, owner retries, restoration, and job creation. The final DB migration and write-time guards must be accepted in BG-13. This is not a blocker to deciding and unit-testing BG-12's function, but it blocks declaring the _runtime_ aggregate status repaired.

### Responsibility and compatibility

- The pure helper is deterministic and does **not** perform I/O or mutate `items`, `processing_jobs`, sync attempts, URL evidence, captures, or audit events.
- Existing item detail, list, and filters currently read the stored status. **BG-13 must wire this same accepted rule into transactionally reconciled authoritative writes** and update readers together. Exposing the pure helper only in detail would falsely disagree with list filters, so BG-12 intentionally does not introduce a partial projection into those endpoints.
- Failed Notion projection and digest work never contribute to `requiredStages`, regardless of `sync_attempts` status.
- Extraction records are attachment-specific; a successful `extract` job alone does not prove that all required attachments were extracted.
- `retry_wait` is derived from queued job's future `available_at`; capacity/policy pauses should come from explicit scheduler/policy reasons rather than date heuristics.
- `complete` is not a claim that URL article body was acquired, that a hosted AI call ran, or that all future optional integrations succeeded. Coverage and per-stage evidence must remain visible.

### Tests, commands and rollback

Unit tests: `apps/worker-api/test/aggregate-processing-state.test.ts`, using fixed clocks and synthetic attempts, including required/optional failures, same-generation supersession, old privacy/source epoch, expired lease, deferral, no-AI, partial file, restored/deleted behavior, stable ordering and invalid timestamps.

Execute local gate: `npm ci && npm run check && npm run db:migrate:local`. Repository CI also exercises Chrome download and source recovery. No migration was added for this contract-only milestone; rollback is removal of the pure helper and its documentation, without stored data mutation.

**BG-13 acceptance requirement:** D1 integration fixtures demonstrating authoritative atomic item/job transitions, re-enqueue/lease correctness, list/details/filter agreement, reprocessing/restoration safety, and no stale worker finalization. Do not mark the original reported stale item badge defect production-fixed merely because this pure decision helper passes unit tests.

## Verification evidence

- [Full passing implementation PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37989348774) on `dd76578401569fe3646b82f995e708717aa95b12`: formatting, lint, TypeScript, repository unit/workerd tests, contract checks, Web build, local D1 migrations, Chrome download and URL recovery acceptance.
- [PR #57](https://github.com/anmolsansi/Recollect-Flow/pull/57) contains the implementation and exact current documentation. The authoritative 100-action checklist is in `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`. Its final merge gate must not be checked until the final changes pass exact-head CI and merge into `main`.
- A code-diff review confirmed the helper is side-effect-free, the new test file exercises a fixed clock, there is no new database migration or API mutation, and all runtime cross-service status writes are still explicitly assigned to BG-13.
- **Verified BG-12 outcome:** a reviewer can compute the same item status from the current-generation required-stage job/attachment set. **Unverified BG-13 outcome:** the persisted item status is changed atomically on each relevant job transition, and list/detail/filter agree. This is deliberately not claimed.

## Release boundary

No production D1 migration, live-source probing, production backfill, external messaging, deployment, or BG-13 implementation is authorized by BG-12. Record exact CI and merge evidence before claiming BG-13 is unlocked.
