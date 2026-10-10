# BG-12 — Final merged-main closeout

**Status: COMPLETE for BG-12's approved aggregate-state decision-contract scope. BG-13 is unlocked, not implemented.**

## Exact implementation evidence

- Prerequisite BG-11 final `main`: `aa526a6058d05d2c4e0f10528f56dac362cfaad0`.
- Main tracking: [GitHub #56](https://github.com/anmolsansi/Recollect-Flow/issues/56), [Linear OPE-338](https://linear.app/openclaw-neutron/issue/OPE-338/bg-12-define-one-aggregate-processing-state-rule).
- Implementation: [PR #57](https://github.com/anmolsansi/Recollect-Flow/pull/57), merged on **2026-10-09**.
- Exact final implementation head: `1c8faf5221f254c9db88b17ad06206693dfa8bd4`.
- [Passing exact-head PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37989816798).
- Implementation merged to `main`: `408d415d1d54ab8a5c5668a4b19efc03f3a56171`.
- [Passing merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37990069598), triggered by `push`, checked at the exact merge revision.

## Accepted decision

BG-12 takes current-generation required stage/job/attachment evidence and computes
one deterministic aggregate processing outcome. The accepted four stored values
are `pending`, `processing`, `complete`, `failed` (unchanged DB CHECK
constraint). The pure helper `decideAggregateProcessing` is implemented in
`apps/worker-api/src/jobs/aggregate-processing-state.ts`; its truth-table
fixtures are in `apps/worker-api/test/aggregate-processing-state.test.ts`.

**Order:** required terminal failure (including a required attachment) wins
over unrelated active work; otherwise valid current lease means processing,
queued/deferred/missing required work means pending, and all committed or
deliberately skipped required work means complete. A newer current-generation
attempt supersedes old same-stage failure. Notion/digest sync failures and
optional enrichment cannot overwrite the required-source outcome.

`retry_wait`, capacity/privacy/operator pauses, next eligible time and safe
error codes are explanatory fields, **not additional stored statuses**.
Source coverage and lifecycle deletion remain independent: a limited URL
bookmark can have `complete` bookkeeping while its coverage still states
`url_only` or `metadata_only`. A deleted item is excluded from
reconciliation without causing reprocessing or restoration.

## Contract proof and boundaries

The [BG-12 decision table](BG-12_AGGREGATE_STATE_CONTRACT.md) enumerates
terminal/current failures, mixed concurrent statuses, future retries,
expired leases, no-AI and source-limited work, required and optional
attachments, source/privacy supersession, delete/recovery, and integration
independence. The tests use explicit clocks and deterministic generation
inputs. Full repository quality gates, D1 migrations and original Chrome
acceptance also passed on the exact PR head and merged `main`.

**The historical production symptom is not yet fixed at the database write
layer.** Existing legacy `input_hash`, `policy_version`, snapshot and
`source_revision` values cannot reliably distinguish every extract/enrich
generation. BG-13 must implement the smallest provable durable epoch binding
and migrate/backfill safely, then atomically reconcile item status with
current job transitions and make list/detail/filter behavior consistent.
The helper cannot be dropped into a single endpoint without causing a
partial, misleading status picture.

BG-12 introduced no migration, modified no production records or job
writers, invoked no live source host, and performed no deployment.
Any production rollout remains a separately authorized release gate.

## Checklist and successor gate

The [100-action BG-12 checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-12--100-executable-microtasks)
is **100/100 checked against the reviewed contract implementation and verified
merged-main CI**. `BG-12.100` unlocks BG-13 specifically because the
deterministic rule and safe migration handoff are proved, not because BG-13's
transactional state repair is already implemented.

A [subsequent 2026-10-10 Markdown and test audit](BG-12_MARKDOWN_AUDIT_2026-10-10.md)
explicitly verified the deleted/restored fixture and corrected stale
successor-status wording without extending BG-12 into BG-13 runtime code.
Historical PR/CI evidence above remains tied to the original closeout.

The target read model and potential migration/rollback are reviewed in
[the engineering build guide](../RECOLLECTFLOW_BUILD_GUIDE.md#18-bg-12--define-one-aggregate-processing-state-rule)
and the [BG-12 contract](BG-12_AGGREGATE_STATE_CONTRACT.md).
