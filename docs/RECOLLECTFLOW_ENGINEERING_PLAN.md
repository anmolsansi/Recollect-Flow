# RecollectFlow roadmap and detailed engineering tickets — creation plan

**Status:** Approved plan; roadmap and individual ticket generation not yet executed.
**Published:** 2026-09-20.
**Publication baseline:** `f548039`.

This document records the approved documentation plan. It does not claim that
the planned tickets have been created or their engineering work completed.
The requested scope is the existing 40 tasks, verified gaps, and the documented
future product backlog, delivered as one roadmap and individual Markdown tickets.

## Current implementation note (2026-10-10)

This is the historical 2026-09-20 ticket-publication plan, not the
live implementation tracker. The BG-12 decision contract and BG-13
transactional persistence are now completed and verified on `main`.
BG-13 was delivered by [merged PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62)
and [tracking issue #61](https://github.com/anmolsansi/Recollect-Flow/issues/61).
See the [BG-13 checklist](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-13--100-executable-microtasks)
and [final verification](verification/BG-13_FINAL_CLOSEOUT.md).

The latest scope-specific completion is the implementation and D1/CI
integration, not a production rollout or automatic legacy backfill.
BG-14 implementation merged through [PR #64](https://github.com/anmolsansi/Recollect-Flow/pull/64)
and is tracked by [issue #63](https://github.com/anmolsansi/Recollect-Flow/issues/63).
The [browser acceptance record](verification/BG-14_BROWSER_ACCEPTANCE.md)
records real Chrome signed-cookie, downloads, search and state proof,
plus [passing upstream-mocked acquisition](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38057058035)
through the same Worker parser, D1 and browser. The
[final BG-14 closeout](verification/BG-14_FINAL_CLOSEOUT.md) cites the
[passing PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38061589399)
and [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38061802146).
BG-14 is 100/100 complete and BG-15 is unlocked. This update
does not rewrite the original engineering-ticket publication scope.

## BG-15 browser write-authentication checkpoint

BG-14 is verified complete. BG-15's authorization scope has been merged to `main` through
[PR #66](https://github.com/anmolsansi/Recollect-Flow/pull/66), tracked by
[issue #65](https://github.com/anmolsansi/Recollect-Flow/issues/65) and the
[final closeout](verification/BG-15_FINAL_CLOSEOUT.md).

The change reuses existing capture and attachment services, adds cookie-based
owner write authorization with exact Origin checks, preserves explicit
capture/admin bearer identity and local-worker isolation, and binds signed
sessions to a server-validated expiry. The
[write boundary evidence](verification/BG-15_BROWSER_WRITE_AUTH.md)
records tests and operational constraints.

The implementation passed exact PR-head CI. The final closeout reconciles
93 verified checklist items and explicitly carries forward browser form
recovery and URL credential inspection. BG-16 is unlocked only after the
merged-main and documentation CI gates pass.

## BG-16 Web browser capture implementation

The URL, pasted-text and note Web form has merged through
[PR #70](https://github.com/anmolsansi/Recollect-Flow/pull/70),
with [PR-head CI #38082248375](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082248375)
passing the new isolated-Chrome/D1 capture test and full repository checks.
[Issue #69](https://github.com/anmolsansi/Recollect-Flow/issues/69) tracks
the 100 authoritative microtasks in 50 pairs.
[BG-16 acceptance and closeout](verification/BG-16_FINAL_CLOSEOUT.md)
documents the Web form contract, evidence and residual scope.
BG-17 owns draft lifetime and safe retry across reloads; BG-18 owns
attachments. No production deployment was authorized or performed.

## Deliverables

Create:

- `docs/RECOLLECTFLOW_ENGINEERING_ROADMAP.md`: the master roadmap, status summary,
  priorities, dependencies and linked ticket index.
- `docs/tickets/Pending/<ID>-<description>.md`: one self-contained execution manual
  per engineering outcome.
- `docs/tickets/Completed/README.md`: completion rules; no ticket is completed
  merely because its documentation was written.

Preserve the existing [build guide](RECOLLECTFLOW_BUILD_GUIDE.md) and
[microtask checklist](RECOLLECTFLOW_MICROTASK_CHECKLIST.md) as references.
The publication baseline includes newer BG completion records, including BG-10.
Reconcile these records during generation; do not reset completed work or present
the September 12 audit as the current implementation state.

## Repository investigation and decomposition

Before authoring tickets:

1. Read the supplied engineering-ticket standard and applicable repository instructions.
2. Reconcile current source, configuration, migrations, tests, architecture decisions,
   requirements, existing OPE tickets and historical audit evidence.
3. Record the inspected revision. Separate historical results from checks actually rerun.
4. Map every BG task and documented product requirement to existing implementation,
   remaining work or conditional future work.
5. Deduplicate overlapping outcomes. Preserve BG identifiers and microtask references;
   assign new area-based identifiers to additional outcomes.
6. Split tasks only where independent architecture, verification or rollout boundaries
   justify it. Record every split in the roadmap.
7. Resolve engineering decisions from repository evidence. Where a genuine product or
   operator decision remains, create a specific discovery or decision ticket that
   blocks dependent implementation.

Application implementation, production operations and external tracker changes are
outside this documentation task.

## Master roadmap contents

Include:

- Product purpose, architecture overview and evidence baseline.
- Completed capabilities, partially implemented workflows, missing features and
  immediate blockers.
- A linked ticket table with release, priority, status, dependency, operator
  requirement and expected outcome.
- A dependency graph, first executable ticket and safely parallel preparation work.
- V1: existing 40-task sequence and verified completion gaps.
- V1.1: documented friction improvements, reminders, review and conditional
  capture clients.
- V1.5: RAG, retrieval evaluation, citations, privacy, invalidation and local processing.
- V2/V3: documented contextual, multimodal, extension, knowledge-relationship and
  productization work.
- Explicit entry conditions for conditional features. Future work does not become
  a V1 blocker.
- Traceability between requirements, BG references, existing OPE records and new tickets.
- A distinction between delivery order and P0–P3 severity, since existing documents
  use those labels differently.

Use the [release roadmap](RELEASE_ROADMAP.md),
[requirements catalog](REQUIREMENTS_CATALOG.md),
[architecture decisions](DECISIONS.md), and
[verification records](verification/README.md) as repository evidence, checking
their claims against implementation and available validation results.

## Individual ticket standard

Use this section order, omitting only genuinely irrelevant sections:

1. Ticket Metadata
2. Objective
3. Junior Engineer Mental Model
4. Why This Ticket Exists
5. Current Behavior
6. Target Behavior
7. Architecture Discussion and Decisions
8. Facts / Assumptions / Unknowns
9. Security / Data / Reliability Invariants
10. Scope
11. Required Reading
12. Pre-Flight Repository Reconnaissance
13. Baseline Commands
14. Implementation Phases
15. Detailed Step-by-Step Execution
16. Checkpoints
17. Error / Failure Semantics
18. Security Considerations
19. Database / Migration Impact
20. External Provider Behavior
21. Logging / Observability
22. Detailed Test Specification
23. Manual Verification
24. Failure Diagnosis Guide
25. PR Evidence Required
26. Acceptance Criteria
27. Definition of Done
28. Rollback Plan
29. Forbidden Shortcuts
30. STOP — NEEDS ARCHITECT DECISION
31. Completion Record

### Required depth

Each ticket must explain the objective, user impact, current behavior and target
behavior in language a junior engineer can understand. Cite verified files and
symbols, record the source revision, and distinguish facts, assumptions, unknowns
and deliberate architecture decisions.

Specify the chosen solution, rejected alternatives, preserved invariants and
applicable API, UI, persistence and integration contracts. Identify files to
inspect and change, excluded changes, prerequisites and operator actions.

Write ordered phases and concrete steps using **Action → Why → Verify**. Place
checkpoints before dependent work. Explain retries, timeouts, concurrency, stale
writes, restarts, partial success and recovery wherever they affect the outcome.

For each important test, provide setup, inputs, action, expected response,
expected durable state, forbidden side effects and diagnosis guidance. Include
safe logging, migrations, rollout order, go/no-go checks, rollback limits and
irreversible effects where relevant.

Finish with manual acceptance, reviewer evidence, acceptance criteria, Definition
of Done, forbidden shortcuts, escalation conditions and an unfilled completion
record. Never invent passing test results, reviewer approval or production evidence.

### Microtask preservation and future work

Retain the existing **100 microtasks per BG task**, bringing them into the
corresponding ticket with their identifiers and explanatory context. Preserve
verified checkbox states and evidence from the generation baseline. New tickets
use meaningful steps rather than padding to a quota.

Future features lacking approved requirements receive detailed discovery or
decision tickets with concrete outputs. Dependent implementation remains
explicitly blocked instead of receiving invented contracts.

## Ticket lifecycle

New tickets start in `Pending`. Intermediate states such as In Progress, Blocked,
Needs Review and Awaiting Operator Action remain in that directory. A ticket may
move to `Completed` only after its complete Definition of Done is evidenced.

Move the exact file rather than copying it. Preserve its identifier and history.
Record implementation, review, revision, dates, verification and remaining
limitations truthfully. Existing completed BG work is recorded in the roadmap with
its evidence; documentation generation must not instruct an engineer to repeat it
unnecessarily. Any newly created reconciliation ticket remains Pending until its
own required verification is performed.

## Validation and completion criteria

- Every original BG task and documented future capability has a traceable disposition.
- All 4,000 existing microtask identifiers are accounted for without accidental
  loss or duplication.
- Every ticket has one understandable outcome, explicit dependencies and observable
  completion criteria.
- Dependency links resolve, ordering is consistent and the graph contains no cycles.
- Referenced existing paths and commands are checked; proposed additions are labeled.
- Ticket-specific explanations replace generic boilerplate and unresolved
  “decide how” instructions.
- Formatting and Markdown links pass validation.
- Historical, local, production, device and elapsed-time evidence remain separated.
- All newly generated tickets remain Pending with unclaimed completion fields;
  existing completed-work evidence is preserved.

The output is a roadmap for navigation and a set of detailed Markdown execution
manuals that a junior engineer can follow without rediscovering the design.
