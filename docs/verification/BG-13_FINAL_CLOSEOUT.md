# BG-13 — Final merged-main closeout

**Status: COMPLETE for BG-13's approved atomic processing-state integration
scope. BG-14 browser verification is unlocked.** This is not a production
deployment or authorization for automated legacy backfill.

## Immutable delivery and validation evidence

- Predecessor: BG-12 final merged-main contract at `8a8b2a53494f908b153c10492d12e7958f93b86d`.
- Tracking: [GitHub issue #61](https://github.com/anmolsansi/Recollect-Flow/issues/61).
- Implementation: [merged PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62),
  `agent/bg-13-atomic-transitions`, more than 80 incremental commits.
- Exact tested implementation head: `28c6e83a69b0dbf9d9c2dfda41349407e2ce45bf`.
- [Passing exact-head PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38052047097):
  formatting, lint, type checks, unit/workerd D1 suites, contract and Web
  checks, local migrations, Chrome and browser source-recovery acceptance.
- Merged to `main`: `3d1af004bc0ebfaa95645a39880b38f623d3c447`.
- [Passing merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38052191291)
  on that exact merge commit.

## Accepted changes

`migrations/0023_add_processing_generation.sql` adds an explicit current
processing epoch on each item and nullable provenance on processing jobs and
attachment extraction records. Source, policy, raw-text and deleted/restored
changes advance the epoch and supersede old pending or leased work. Historical
jobs with unknown epochs remain untrusted rather than timestamp-backfilled.

`migrations/0024_materialize_current_processing_status.sql` derives the
stored four-value aggregate from current-generation stage/evidence rows and
materializes it inside the same SQLite mutation transaction as job and
extraction transitions. It honors required current failures, active work,
pending/deferred work, current attachment completeness, missing URL/acquisition
or downstream enrichment stages, and deliberately skipped no-AI stages.
Notion synchronization and digests are outside the aggregate status.

Job failure, completion, replay, extraction upsert, URL acquisition,
enrichment, capacity deferral, manual retry, deleted-item and purge paths
recheck ownership, lease expiry, current generation and policy as relevant.
Stale writes cannot silently commit accepted evidence. The restored archive
retains unknown pre-migration provenance and does not duplicate derived
Notion sync attempts.

Admin-only `GET /api/v1/jobs/processing-reconciliation?limit=20` previews
current-generation differences. Explicitly reviewed IDs can be passed to
`POST /api/v1/jobs/processing-reconciliation`, in 1–20 unique-item batches.
The guarded action reports updated and skipped counts, is repeatable, and
does not repair ambiguous legacy-only work.

## Acceptance and risk review

The normal repository gate and Workerd D1 integrations covered terminal
failure/pending disagreement, stale/expired worker ownership, competing
completions, retry versus old owner, privacy/delete/purge races, current
attachment reprocessing, save-only no-AI, missing required stage,
restoration, reconciliation idempotence and list/detail/filter agreement.
See the source tests in `apps/worker-api/test/` and the
[implementation evidence](BG-13_ATOMIC_TRANSITIONS.md).

Stored status is event-driven: mere clock passage does not make an SQL write.
Expired leases are rejected or reclaimable at the next guarded transition,
and BG-14 should verify the resulting browser presentation under live
scheduler timing. This does not authorize a new stored status or inferred
historical generation.

**No live source host, external user data, production D1 database, remote
backfill or deployment was changed as part of BG-13 verification.** A future
production rollout requires its own backup, migration, rollback and
post-deployment acceptance gates.

## Checklist and successor

The [100 BG-13 microtasks](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-13--100-executable-microtasks)
are reconciled against the accepted code, tests, exact-head PR CI and actual
merged-main CI. BG-13 is complete for the approved engineering scope; BG-14
starts its independent browser proof. Real-world production readiness remains
separate.
