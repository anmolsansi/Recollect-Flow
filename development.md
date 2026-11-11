# RecollectFlow development handbook

Step-by-step execution guide for a junior engineer. Covers all 52 remaining packets, R01–R52. Prepared November 10, 2026 against the ticket-redesign branch at `c30cad9`; this handbook does not claim production acceptance.

## 1. Start here

The goal is full V1: reliable capture, original preservation, lexical search, approved enrichment, Notion projection, digest delivery, real iPhone recovery, independently tested backup and runnable private local AI on the Mac. Core deployment already exists. Do not rebuild or redeploy it just because an old checklist is unchecked. RAG and later expansion remain conditional.

Use this handbook for day-to-day execution. [The execution contract](docs/tickets/REMAINING_WORK.md) owns scope/authority and [packet definitions](docs/tickets/REMAINING_WORK_PACKETS.md) own original requirements. This handbook expands them without waiving any criterion. [Coverage](docs/tickets/REMAINING_WORK_COVERAGE.csv) preserves all 1,236 old unchecked actions. If a future accepted contract changes behavior, update the affected handbook chapter in the same change.

**A junior engineer owns implementation, not unresolved product architecture.** Chapters labeled architect/owner work are prerequisite deliverables the junior must receive, not puzzles to solve. A junior can prepare evidence for them, but must not invent missing routes, models, privacy rules or budget limits. A blocked future feature is not ready for coding simply because it appears below. Each chapter explains the exact prerequisite output that removes the block.

This file is an execution manual, not an additional completion tracker. Record outcomes in each ticket's result file and mirror links in its existing parent. Do not maintain another set of percentage counters here.

## 2. Understand how the parts connect

```text
iPhone Shortcut / Web capture
  -> Worker authentication + input validation
  -> canonical D1 item and capture event + durable jobs
  -> private R2 original bytes (for attachments)
  -> extraction/acquisition -> optional AI enrichment
  -> current derived fields -> FTS search / Web detail
  -> independent Notion projection / eligible digest delivery

Mac local worker
  -> scoped lease -> authorized job input -> local Ollama inference
  -> validated current-generation result -> item materialization -> FTS
  -> heartbeat/release/fail keep ownership and retry truthful

Recovery
  portable JSON + independent original bytes + latest purge receipts
  -> encrypted independent copy -> clean isolated restore
  -> counts + hashes + search + anti-resurrection verification
```

- D1 is canonical structured storage. Notion is a replaceable projection, not deletion authority.
- R2 stores originals. JSON export contains references, not file bytes. A JSON-only backup cannot prove complete recovery.
- Jobs separate raw save from optional work. Saved does not mean AI finished. A completed job record does not by itself prove item fields/search changed.
- A capture event is a particular share. Same-operation retry preserves its key; intentional new share gets a new key and may reuse a canonical item.
- `edit_version` protects owner edits; source/processing generations reject stale work. Use returned server versions, never guess or locally increment them.
- The Worker uses Hono routes, services and D1 queries. Follow existing layers: route validates/authenticates, service owns lifecycle, storage enforces uniqueness/guards. Do not put all logic into UI or route callbacks.
- Web code is under `apps/web/src`; Worker code under `apps/worker-api/src`; shared contracts under `packages/contracts`; forward SQL under `migrations`; local verification tooling under `scripts`.

## 3. First-session setup and command safety

Run from repository root. Inspect local changes before doing anything that might overwrite them.

```bash
git status --short --branch
git rev-parse HEAD
node --version
npm --version
```

Use Node 22 to match `.github/workflows/ci.yml`, even though package.json permits newer versions. With an approved development environment and lockfile, `npm ci` installs exact dependencies. Read applicable AGENTS.md files. Prefer the code graph for source discovery; if its snippet does not contain the requested symbol, its line offsets are stale, so read the located owning source and record that limitation.

| Command                                                              | What it proves / prerequisite                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run check`                                                      | Repository static/unit/D1/Web/build gates; no device or live-provider acceptance                  |
| `npx vitest run --config vitest.node.config.ts <existing-test-file>` | Narrow pure/Node tests; replace placeholder with chapter's real path                              |
| `npx vitest run --config vitest.d1.config.ts <existing-test-file>`   | Isolated workerd/D1 behavior                                                                      |
| `npm run web:test`                                                   | Web suite; add or extend observable behavior tests for changed UI                                 |
| `npm run browser:capture:test`                                       | Existing isolated browser harness; Chrome must be available                                       |
| `npm run bg32:readonly:test`                                         | Offline smoke-verifier regressions, not a production request                                      |
| `npm run bg32:readonly`                                              | Actual public HTTP requests to frozen production target; use only within approved read-only scope |
| `npm run db:migrate:local`                                           | Changes local database state; use disposable local persistence, never the only copy of owner data |
| `npm run deploy`, `npm run db:migrate:remote`                        | Live mutations, not validation commands; never run merely because tests passed                    |

Existing browser scripts create isolated fixtures/runtime; do not repoint them at production. Before a live command, the operator must hold the ticket's exact target, scope and stop limits. Private credentials belong in approved secure local storage, never command history, a committed example, a screenshot or a result file. Do not copy real `.dev.vars` into test fixtures.

## 4. Universal ticket workflow

1. Read your chapter's requirement and dependencies. Open referenced result/contract outputs. If they do not exist or did not pass, mark BLOCKED_DEPENDENCY and work on a ready preparation task.
2. Record source SHA, intended environment, parent issue and the exact behavior you will change or observe. Separate local source, deployed artifact and device version.
3. Read listed files and trace input -> validation/auth -> service -> storage/external effect -> response/UI. Confirm every producer and consumer agrees on fields and failure states.
4. For implementation, start from the architect's approved exact path/contract handoff. Write a narrow regression for the promised behavior, implement it at the owning layer, then verify its caller. Do not create a wrapper or new dependency when an existing helper works.
5. For verification, reuse valid prior proof and execute only missing observations. Record actual results, not intended results. New evidence must identify the version/environment it actually tested.
6. Run the chapter's focused checks. After runtime changes, run the full applicable repository/CI gates before merge. Do not rerun every application test for a documentation-only correction; validate links, scope, consistency and formatting instead.
7. Review diff for unrelated edits, secrets, raw content, removed validation, broadened permissions and owner data. Update current runbook/contract explanations where behavior changed.
8. Write the result file using the template below. Keep failures and blockers explicit. Link the commit/PR/CI when those exist. No commit or PR is proof of deployment.
9. Reviewer checks every acceptance assertion. Update only the authorized parent tracker; then hand off exact outputs to dependent packets. Owner release decisions remain explicit.

### Result template

Create `docs/verification/Rxx_RESULT.md` for the executed chapter (replace Rxx with its ID). Record only safe evidence.

```markdown
# Rxx result

Status: IN_PROGRESS / VERIFIED / FAILED / BLOCKED_INPUT / BLOCKED_DEPENDENCY
Parent:
Source SHA / deployed version / device or model version:
Environment and safe target identity:
Observed at (UTC):
Authorization reference and operation limits (if applicable):

| Criterion | Input/action                      | Expected             | Actual        | Status                                              | Evidence       | Evidence class                     |
| --------- | --------------------------------- | -------------------- | ------------- | --------------------------------------------------- | -------------- | ---------------------------------- |
| Rxx-C01   | synthetic marker / bounded action | observable assertion | actual result | PASS/FAIL/NOT_EXECUTED/NOT_TRIGGERED/NOT_APPLICABLE | safe reference | observed/owner-reported/historical |

Commands/checks and actual outcomes:
Changed files and reason:
Failures, preserved data, stop actions:
Remaining blocker, responsible role, exact next action:
Review/commit/PR/CI references:
Handed-off output and next eligible packet:
```

NOT_TRIGGERED is only for a conditional action whose condition did not occur; it cannot satisfy a separate recovery-capability test. Missing historic command output stays missing. Do not replay a migration to obtain a new exit code.

### What to do when something fails

Record the smallest reproducible input, expected/actual behavior, safe request/job ID, environment/SHA and affected user outcome. Preserve originals and prior good backups. Fix an in-scope implementation defect using the existing contract. If the contract or allowed integration path is missing, send that evidence to the architect agent; ask it for exact changed files, interfaces, assertions and recheck scope. Do not ask the owner to debug ordinary code. Only unavailable personal inputs, changed product/privacy/cost choices or unapproved live/destructive operations go to the owner.

## 5. Execution order and roles

Start with R01, R03, R08, R10–R12 preparation and R17. Then complete prerequisite chains shown in each chapter. Run R50–R52 before the V1 real-use trial and release, despite their larger IDs. R23/R24 and R25 may share eligible calendar days; they cannot skip technical gates. All required V1 evidence converges at R27 -> R28. R29 -> R30 gates RAG. R31–R33 are architect contracts; R34–R45 are future build work. R46 -> R47 gates V1.5. R48/R49 are independently approved discovery, not an automatic feature build.

**Role labels:** Engineer = junior can execute provided prerequisites. Architect = senior/architect agent must settle the written contract before a junior build starts. Operator = authorized person/agent with required access. Owner = product/risk/usefulness decision or private device action. Preparation can continue while another lane is blocked; shared release records are updated serially.

## 6. Ticket index

- [R01 — Reconcile old open work against actual evidence](#r01)
- [R02 — Verify the deployed identity and current read-only boundary](#r02)
- [R03 — Prepare one independent recovery operation packet](#r03)
- [R04 — Acquire and verify an independent recovery set](#r04)
- [R05 — Prove isolated restore without touching production](#r05)
- [R06 — Resolve historical migration evidence and current index proof](#r06)
- [R07 — Close only the BG-32 release-execution boundary](#r07)
- [R08 — Make isolated hourly proof ready for one approval](#r08)
- [R09 — Observe actual hosted multi-stage hourly drain](#r09)
- [R10 — Close deployed security and credential evidence](#r10)
- [R11 — Verify operations visibility and incident diagnosis](#r11)
- [R12 — Verify deletion and privacy freshness across surfaces](#r12)
- [R13 — Prove browser capture and recovery on the deployed core](#r13)
- [R14 — Prove source acquisition and lexical recall](#r14)
- [R15 — Prove approved AI modality, privacy and quota boundaries](#r15)
- [R16 — Prove Notion projection, outage and recreation](#r16)
- [R17 — Audit actual client gaps before device testing](#r17)
- [R18 — Complete the online Shortcut artifact](#r18)
- [R19 — Implement durable queue and stable retry artifact](#r19)
- [R20 — Run one prepared online physical-iPhone session](#r20)
- [R21 — Run prepared offline, restart and rotation session](#r21)
- [R22 — Rehearse independent disaster recovery and anti-resurrection](#r22)
- [R23 — Prepare and activate bounded daily/weekly delivery](#r23)
- [R24 — Observe seven consecutive eligible daily sends and weekly review](#r24)
- [R25 — Run the two-week real-use observation](#r25)
- [R26 — Reconcile real usage and actual cost](#r26)
- [R27 — Assemble one full-V1 acceptance dossier](#r27)
- [R28 — Record owner V1 go/no-go](#r28)
- [R29 — Convert measured friction into bounded V1.1 fixes](#r29)
- [R30 — Decide whether RAG should begin](#r30)
- [R31 — Freeze evidence-only answer and trust policy](#r31)
- [R32 — Approve gold questions and model evidence before integration](#r32)
- [R33 — Publish exact RAG contracts before builders start](#r33)
- [R34 — Implement versioned RAG storage and provenance](#r34)
- [R35 — Implement bounded source-aware chunking](#r35)
- [R36 — Implement approved embedding/index lifecycle](#r36)
- [R37 — Implement privacy and invalidation before serving retrieval](#r37)
- [R38 — Implement hybrid retrieval with lexical fallback](#r38)
- [R39 — Implement diversity, conflicts and deterministic reranking fallback](#r39)
- [R40 — Implement bounded context and query orchestration](#r40)
- [R41 — Implement grounded answer validation and fallback](#r41)
- [R42 — Implement evaluation before enabling answers](#r42)
- [R43 — Implement accessible conversational evidence UI](#r43)
- [R44 — Implement approved private local RAG worker](#r44)
- [R45 — Complete RAG quota, cache and operational controls](#r45)
- [R46 — Run independent V1.5 acceptance](#r46)
- [R47 — Record owner V1.5 go/no-go](#r47)
- [R48 — Evaluate V2 candidates individually from demand](#r48)
- [R49 — Evaluate V3 and public productization separately](#r49)
- [R50 — Freeze the V1 local-processing client contract](#r50)
- [R51 — Implement the runnable V1 Mac worker](#r51)
- [R52 — Verify local AI on the actual Mac and join V1 acceptance](#r52)

<a id="r01"></a>

## R01 — Reconcile old open work against actual evidence

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-01/02/03/11/15/21/22; OPE-320/321/340/341.

**Readiness / dependencies:** READY.

**Goal and user outcome:** Reconcile old open work against actual evidence. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`, `docs/verification/BG-30_EVIDENCE.md`, `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`.

**Output / allowed evidence file:** `docs/verification/R01_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare every mapped unchecked criterion with dated source/CI/release evidence. Preserve evidence class and SHA. Move any genuine missing behavior to R02/R10/R13/R14/R15/R16; do not rerun historical setup merely to check a box. Reconcile GitHub #23/#83/#85 and Linear without claiming hosted acceptance from source CI.

**Acceptance, validation and failure assertions:** Every old action has evidence or an explicit remaining packet; completed source is not rebuilt; stale tracker prose is superseded without deleting history.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Historical records -> criterion reconciliation -> active queue
```

**Owning integration references to inspect:** `apps/worker-api/src/app.ts`, `scripts/bg32-readonly-smoke.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                    | Check before continuing                           |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Export the coverage CSV rows for each old parent                          | Every old ID is represented                       |
| 2    | Read the newest dated evidence before the old unchecked list              | Record source SHA, environment and actual claim   |
| 3    | Compare each requirement with the evidence, including inherited BG-11.028 | A passed source test does not become device proof |
| 4    | Classify each as supported, genuinely missing or conditional              | Missing behavior gets one existing R-packet owner |
| 5    | Reconcile current tracker summary without deleting history                | Next engineer sees one current queue              |

### Testing and expected results

| Case    | Assertion that must hold                                         | Evidence level                                                                |
| ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R01-T01 | An old unchecked but evidenced action must not trigger a rebuild | Local regression plus actual environment evidence where the scope requires it |
| R01-T02 | A source-only result must not satisfy a hosted criterion         | Local regression plus actual environment evidence where the scope requires it |
| R01-T03 | An orphan legacy ID fails reconciliation                         | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run bg32:readonly:test
npm run bg31:manifest:test
npm run bg31:ledger:test
```

### Failure handling and completion handoff

If any assertion fails, record `R01` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R01_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r02"></a>

## R02 — Verify the deployed identity and current read-only boundary

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-21/32; OPE-340/346.

**Readiness / dependencies:** R01.

**Goal and user outcome:** Verify the deployed identity and current read-only boundary. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`, `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`, `package.json`.

**Output / allowed evidence file:** `docs/verification/R02_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare immutable source, Worker/Web IDs, account/D1/R2 identities with authorized authenticated inventory. Run existing bg32:readonly only after reading its command requirements. Separate public headers/routes from authenticated configuration and owner evidence. Reuse valid prior observations where freshness is not required.

**Acceptance, validation and failure assertions:** Correct origin/deep links/API denial/cache behavior and target identity have explicit evidence; a redirect or identity mismatch stops checks; no deployment or synthetic mutation occurs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Frozen release -> public HTTP verifier + authenticated inventory -> identity report
```

**Owning integration references to inspect:** `apps/worker-api/src/app.ts`, `scripts/bg32-readonly-smoke.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                      | Check before continuing                      |
| ---- | --------------------------------------------------------------------------- | -------------------------------------------- |
| 1    | Copy exact frozen identifiers into the result header                        | Source SHA and deployed version are separate |
| 2    | Run offline verifier tests before public checks                             | Invalid identity/redirect cases fail closed  |
| 3    | Inspect authorized live account, bindings and version without secret values | Full UUID evidence distinguished from prefix |
| 4    | Run public GET-only smoke without origin substitution                       | Record every stage and decision              |
| 5    | Compare results with previous evidence and record drift                     | Never redeploy to fix a documentary mismatch |

### Testing and expected results

| Case    | Assertion that must hold                                    | Evidence level                                                                |
| ------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R02-T01 | Correct frozen target yields bounded public-boundaries pass | Local regression plus actual environment evidence where the scope requires it |
| R02-T02 | Wrong target or redirect yields STOP                        | Local regression plus actual environment evidence where the scope requires it |
| R02-T03 | Public health alone cannot pass authenticated inventory     | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run bg32:readonly:test
npm run bg31:manifest:test
npm run bg31:ledger:test
```

### Failure handling and completion handoff

If any assertion fails, record `R02` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R02_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r03"></a>

## R03 — Prepare one independent recovery operation packet

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** BG-32/37; OPE-228.

**Readiness / dependencies:** READY for preparation; live action BLOCKED_INPUT.

**Goal and user outcome:** Prepare one independent recovery operation packet. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_BACKUP_AUTHORIZATION_PACKET_2026-11-09.md`, `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`.

**Output / allowed evidence file:** `docs/verification/R03_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse the existing November 9 Scope B/C/D packet, preserving its separate approvals and ceilings: one existing archive download, one export, ten listing pages, twenty R2 HEAD/GET operations, ten MiB maximum; stop rather than omit objects when exceeded. Do not ask the owner to redesign these settled preparation details. Specify exact source IDs, independent encrypted destination, key custody, full objects/receipt listing, permission/access checks, bounded operations, cost evidence, clean restore target and rollback/stop instructions. Reuse accepted destination/access decisions if available. Present the complete operation packet once for the remaining owner inputs and execution approval.

**Acceptance, validation and failure assertions:** Packet contains no placeholder target or ambiguous storage independence; no paid operation inferred from free allowances; approval identifies operations and scope, not just the ticket name.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Existing authorization packet -> feasible bounded operation -> operator handoff
```

**Owning integration references to inspect:** `apps/worker-api/src/recovery/restore.routes.ts`, `scripts/recovery-bundle.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                       | Check before continuing                      |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| 1    | Read the November 9 Scope B/C/D packet before drafting                       | Existing limits reused                       |
| 2    | Inventory destination encryption, independence and key recovery requirements | Owner fills private destination/access only  |
| 3    | Determine whether existing archive is usable                                 | New backup creation remains a separate scope |
| 4    | Prepare source IDs, exact requests, ceilings, stop conditions and cleanup    | No placeholder operation reaches approval    |
| 5    | Check current cost headroom and unresolved access                            | Unknown cost blocks execution                |
| 6    | Present only unresolved decisions with recommendation                        | One approval covers its unchanged scope      |

### Testing and expected results

| Case    | Assertion that must hold                                             | Evidence level                                                    |
| ------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| R03-T01 | Ten listing pages/twenty object reads/ten MiB cannot silently expand | Contract review now; implementation regression after prerequisite |
| R03-T02 | Same failure-domain copy fails independence                          | Contract review now; implementation regression after prerequisite |
| R03-T03 | Scope B cannot authorize POST backup/restore                         | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R03` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R03_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r04"></a>

## R04 — Acquire and verify an independent recovery set

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-32.021–.030; OPE-228.

**Readiness / dependencies:** R03 approved execution.

**Goal and user outcome:** Acquire and verify an independent recovery set. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`.

**Output / allowed evidence file:** `docs/verification/R04_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Acquire portable JSON, originals and newest independent purge receipts with complete pagination. Record schemaVersion/itemCount/size/hash and source/destination identity. Run existing recovery-bundle verifier on protected files. Read back encrypted destination and confirm recovery-key access. Keep previous good set until replacement passes.

**Acceptance, validation and failure assertions:** Every referenced original matches length/hash; receipt ledger completeness and independence proved; corrupt/missing bytes fail; no private bundle enters Git.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Portable JSON + originals + latest receipts -> encrypted independent verified set
```

**Owning integration references to inspect:** `apps/worker-api/src/recovery/restore.routes.ts`, `scripts/recovery-bundle.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                             | Check before continuing                             |
| ---- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 1    | Confirm R03 approval and source identity immediately before access | Scope and target match                              |
| 2    | Retrieve the approved archive/export privately                     | JSON schema/count/timestamp captured                |
| 3    | Enumerate every object/receipt page within ceiling                 | Completeness proved or stop                         |
| 4    | Copy required originals and newest receipts to independent storage | Original paths/ownership retained privately         |
| 5    | Run local bundle verifier with selected file paths                 | Length/hash mismatch rejects set                    |
| 6    | Read back encrypted copy and confirm key recovery                  | Previous good set retained until replacement passes |

### Testing and expected results

| Case    | Assertion that must hold                     | Evidence level                                                                |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| R04-T01 | Remove one original: verification fails      | Local regression plus actual environment evidence where the scope requires it |
| R04-T02 | Change one byte: hash fails                  | Local regression plus actual environment evidence where the scope requires it |
| R04-T03 | Incomplete/stale receipt listing cannot pass | Local regression plus actual environment evidence where the scope requires it |
| R04-T04 | Metadata-only export is not complete backup  | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R04` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R04_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r05"></a>

## R05 — Prove isolated restore without touching production

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-32.075–.077; OPE-228.

**Readiness / dependencies:** R04; approved isolated target.

**Goal and user outcome:** Prove isolated restore without touching production. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/verification/BG-28_FINAL_CLOSEOUT.md`.

**Output / allowed evidence file:** `docs/verification/R05_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use explicit dry-run on a clean target, inspect exclusions and attachment readiness, then approved apply. Verify counts, foreign keys, originals, search and safe pending leases. Keep outbound dispatch off. Record first-install containment/forward-repair instead of inventing a previous compatible Worker.

**Acceptance, validation and failure assertions:** Restored system is independently usable; populated target/corruption is rejected; no production traffic switch; this proof does not claim an incident rollback occurred.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Independent backup -> clean isolated D1/R2 -> recovered application
```

**Owning integration references to inspect:** `apps/worker-api/src/recovery/restore.routes.ts`, `scripts/recovery-bundle.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                               | Check before continuing                |
| ---- | -------------------------------------------------------------------- | -------------------------------------- |
| 1    | Record source and isolated target identities side by side            | Target cannot serve production traffic |
| 2    | Prepare compatible schema and independent bytes under approved scope | Clean target and no outbound dispatch  |
| 3    | Submit explicit dry-run and inspect exclusions/readiness             | Dry-run is treated as write-bearing    |
| 4    | Apply only the separately approved restore                           | Capture actual result and error states |
| 5    | Compare canonical/event counts, FKs, originals and FTS queries       | Restore usable through application     |
| 6    | Record containment/forward-repair plan for first install             | No invented old-version rollback       |

### Testing and expected results

| Case    | Assertion that must hold                            | Evidence level                                                                |
| ------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| R05-T01 | Populated target rejects real restore               | Local regression plus actual environment evidence where the scope requires it |
| R05-T02 | Missing original rejects apply                      | Local regression plus actual environment evidence where the scope requires it |
| R05-T03 | Original hash and internal search phrase round-trip | Local regression plus actual environment evidence where the scope requires it |
| R05-T04 | No external send during restore                     | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R05` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R05_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r06"></a>

## R06 — Resolve historical migration evidence and current index proof

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-32.035/.037/.039.

**Readiness / dependencies:** R01; authorized read-only D1 access.

**Goal and user outcome:** Resolve historical migration evidence and current index proof. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`, `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`.

**Output / allowed evidence file:** `docs/verification/R06_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Locate original migration process result; if absent retain NOT_EXECUTED evidence gap, do not infer exit zero from ledger. Record failure inspection as NOT_TRIGGERED only with no-failure evidence. Compare required indexes from the actual approved migrations against current read-only schema inventory.

**Acceptance, validation and failure assertions:** Index names/definitions match; historical exit evidence either located or remains an explicit release criterion decision; no migration replay.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Historical process evidence + actual migration definitions -> current schema comparison
```

**Owning integration references to inspect:** `apps/worker-api/src/app.ts`, `scripts/bg32-readonly-smoke.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                    | Check before continuing                               |
| ---- | --------------------------------------------------------- | ----------------------------------------------------- |
| 1    | Locate original migration command record by exact release | Preserve actual exit if present                       |
| 2    | If absent, mark missing historical proof                  | Do not manufacture exit zero                          |
| 3    | Check whether any failure actually occurred               | NOT_TRIGGERED only for conditional failure inspection |
| 4    | List expected indexes from approved migration chain       | Include columns/uniqueness, not names alone           |
| 5    | Use authorized read-only current schema inspection        | Compare definitions and record mismatch               |
| 6    | Return only unresolved criterion disposition to architect | No replay of applied SQL                              |

### Testing and expected results

| Case    | Assertion that must hold                             | Evidence level                                                                |
| ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| R06-T01 | Ledger presence alone cannot supply process exit     | Local regression plus actual environment evidence where the scope requires it |
| R06-T02 | Same index name/wrong columns fails                  | Local regression plus actual environment evidence where the scope requires it |
| R06-T03 | No failure does not mean an inspection was performed | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run bg32:readonly:test
npm run bg31:manifest:test
npm run bg31:ledger:test
```

### Failure handling and completion handoff

If any assertion fails, record `R06` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R06_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r07"></a>

## R07 — Close only the BG-32 release-execution boundary

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-32; OPE-346.

**Readiness / dependencies:** R02/R05/R06; unresolved required criterion decisions settled.

**Goal and user outcome:** Close only the BG-32 release-execution boundary. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`.

**Output / allowed evidence file:** `docs/verification/R07_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Consolidate current results above historical chronology. Disposition the 20 previously open actions individually. Carry independent BG-29/OPE-247/device gates forward. Prepare BG-33 handoff with exact source/runtime identities and authorized operation scope.

**Acceptance, validation and failure assertions:** GitHub #141 and OPE-346 have one consistent current status; BG-32 closes only on its criteria; no V1 GO inferred.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
R02/R05/R06 evidence -> BG-32 gate -> BG-33 handoff
```

**Owning integration references to inspect:** `apps/worker-api/src/app.ts`, `scripts/bg32-readonly-smoke.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                              | Check before continuing                |
| ---- | ------------------------------------------------------------------- | -------------------------------------- |
| 1    | List each previously open BG-32 criterion                           | Twenty old open actions accounted for  |
| 2    | Attach exact historical/current evidence classification             | No observation is silently refreshed   |
| 3    | Separate not-triggered incident steps from required recovery proof  | R05 still mandatory                    |
| 4    | Verify operation-specific preflight conditions and missing evidence | Unresolved requirement keeps gate open |
| 5    | Prepare current source/runtime/target handoff                       | BG-33 knows what may execute           |
| 6    | Update parent summary after review                                  | BG-29/OPE-247/V1 remain separate       |

### Testing and expected results

| Case    | Assertion that must hold                               | Evidence level                                                                |
| ------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| R07-T01 | A missing required index/recovery proof blocks closure | Local regression plus actual environment evidence where the scope requires it |
| R07-T02 | A conditional no-rollback record never claims rollback | Local regression plus actual environment evidence where the scope requires it |
| R07-T03 | Closing BG-32 cannot mark full V1 accepted             | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run bg32:readonly:test
npm run bg31:manifest:test
npm run bg31:ledger:test
```

### Failure handling and completion handoff

If any assertion fails, record `R07` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R07_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r08"></a>

## R08 — Make isolated hourly proof ready for one approval

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** BG-29.078; OPE-344.

**Readiness / dependencies:** READY preparation; hosted execution BLOCKED_INPUT.

**Goal and user outcome:** Make isolated hourly proof ready for one approval. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-29_STAGING_ONLY_PLAN.md`, `docs/verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md`.

**Output / allowed evidence file:** `docs/verification/R08_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Refresh actual account/limits and staging identities; replace historical production guards with both old and current production exclusions. Specify mock integrations, full URL/file multi-stage fixture, separate D1/R2, actual Cron schedule, cleanup and zero-cost feasibility. Preserve existing checker contract.

**Acceptance, validation and failure assertions:** Full test is feasible under accepted cost boundary or explicitly blocked; D1-only subset is not full acceptance; no provider sends or production resources reused.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Staging template + actual account feasibility -> isolated Cron operation packet
```

**Owning integration references to inspect:** `apps/worker-api/src/bg29-staging-entry.ts`, `scripts/bg29-hourly-evidence-check.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                         | Check before continuing                   |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| 1    | Read existing staging plan and checker contracts                               | Do not recreate staging framework         |
| 2    | Exclude current and old production IDs                                         | Isolated D1/R2/Worker named               |
| 3    | Specify full URL and file fixtures plus mocked external integrations           | D1-only subset explicitly insufficient    |
| 4    | Freeze schedule, expected stage transitions, actual elapsed window and cleanup | Same evidence shape as checker            |
| 5    | Review current actual cost/limits and permissions                              | Impossible zero-cost case remains blocked |
| 6    | Present one feasible bounded approval packet                                   | No Cron activated during preparation      |

### Testing and expected results

| Case    | Assertion that must hold                            | Evidence level                                                    |
| ------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| R08-T01 | Production binding rejected                         | Contract review now; implementation regression after prerequisite |
| R08-T02 | Real provider destination rejected                  | Contract review now; implementation regression after prerequisite |
| R08-T03 | Missing R2 path cannot count as full stage coverage | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
node --test scripts/bg29-hourly-evidence-check.test.mjs
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-24-items.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R08` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R08_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r09"></a>

## R09 — Observe actual hosted multi-stage hourly drain

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-29.078; OPE-344.

**Readiness / dependencies:** R08 approved; exact staging candidate ready.

**Goal and user outcome:** Observe actual hosted multi-stage hourly drain. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-29_STAGING_ONLY_PLAN.md`.

**Output / allowed evidence file:** `docs/verification/R09_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Execute bounded staging packet, capture original scheduled event logs, sweep timestamps, queue transitions/oldest age, preserved originals and account usage. Apply existing hourly evidence checker including at least 55 minutes actual elapsed time. Shut down only owned scheduled resources under approved cleanup.

**Acceptance, validation and failure assertions:** Full stage/attachment path drains within existing contract, originals remain, provenance authenticates ledger and actual cost is established; accelerated logical hours never pass this gate.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Real scheduled events -> stage ledger -> hourly acceptance
```

**Owning integration references to inspect:** `apps/worker-api/src/bg29-staging-entry.ts`, `scripts/bg29-hourly-evidence-check.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                     | Check before continuing                         |
| ---- | ---------------------------------------------------------- | ----------------------------------------------- |
| 1    | Run only approved isolated candidate and seed fixture set  | Exact artifact/fixture counts recorded          |
| 2    | Observe actual scheduled events rather than manual trigger | Event IDs and UTC times preserved               |
| 3    | Record queue type/state/oldest age on each sweep           | Extraction/enrichment/sync handoff visible      |
| 4    | Verify originals and absence of unexpected failed work     | No dropped capture hidden by empty queue        |
| 5    | Run existing evidence checker on sanitized ledger          | At least required 55 real minutes               |
| 6    | Reconcile account usage and approved cleanup               | No scheduled resource left running accidentally |

### Testing and expected results

| Case    | Assertion that must hold                                      | Evidence level                                                                |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R09-T01 | Accelerated timestamps fail elapsed proof                     | Local regression plus actual environment evidence where the scope requires it |
| R09-T02 | Missing stage/original fails                                  | Local regression plus actual environment evidence where the scope requires it |
| R09-T03 | Unsigned invented JSON cannot replace original event evidence | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
node --test scripts/bg29-hourly-evidence-check.test.mjs
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-24-items.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R09` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R09_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r10"></a>

## R10 — Close deployed security and credential evidence

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-247; BG-15/23/24/25.

**Readiness / dependencies:** READY preparation; execution needs isolated approved target.

**Goal and user outcome:** Close deployed security and credential evidence. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TOKEN_ROTATION.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/verification/BG-23_BG-24_ACCEPTANCE.md`, `docs/verification/BG-25_SECURITY_HARDENING.md`.

**Output / allowed evidence file:** `docs/verification/R10_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Map existing auth/session/scope/Origin/rate-limit/log/SSRF/upload/privacy tests to release evidence. Prepare synthetic capture/admin/worker overlap, expiry and compromise-revocation scenarios. Test using dedicated credentials/isolated environment; never revoke owner access for convenience.

**Acceptance, validation and failure assertions:** Correct scope rejects wrong actor; stale credentials fail per contract; Origin/session protections and redaction verified; no sensitive output; source versus hosted proof explicitly separated.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Scoped credentials -> auth/Origin guards -> protected API and logs
```

**Owning integration references to inspect:** `apps/worker-api/src/shared/auth.ts`, `apps/worker-api/src/jobs/job.routes.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                 | Check before continuing                     |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------- |
| 1    | Map existing rotation/security tests to requirements                   | Test reuse list is explicit                 |
| 2    | Prepare isolated capture/admin/worker credentials and fake clock cases | Owner credentials untouched                 |
| 3    | Exercise correct scope, wrong scope, expiry, overlap and revocation    | Record exact response and data preservation |
| 4    | Exercise cookie writes with allowed/missing/foreign Origin             | Existing contract retained                  |
| 5    | Inspect safe request/error logs using synthetic secret markers         | Markers absent                              |
| 6    | Record hosted versus local evidence and any bounded repair             | No auth broadening to make tests green      |

### Testing and expected results

| Case    | Assertion that must hold                       | Evidence level                                                                |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| R10-T01 | Wrong scope cannot read admin data             | Local regression plus actual environment evidence where the scope requires it |
| R10-T02 | Expired/revoked credential denied              | Local regression plus actual environment evidence where the scope requires it |
| R10-T03 | Secret marker absent from logs                 | Local regression plus actual environment evidence where the scope requires it |
| R10-T04 | Rotation does not change stored item ownership | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run auth:rotation:test
npx vitest run --config vitest.node.config.ts apps/worker-api/test/bg25-security.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R10` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R10_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r11"></a>

## R11 — Verify operations visibility and incident diagnosis

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-247; BG-26/27.

**Readiness / dependencies:** READY preparation; deployed observations after R02.

**Goal and user outcome:** Verify operations visibility and incident diagnosis. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/OPERATIONAL_CONTROLS.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/verification/BG-26_OPERATIONS_VISIBILITY.md`.

**Output / allowed evidence file:** `docs/verification/R11_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Inspect protected operations views against authoritative jobs/usage/backup records. Exercise synthetic failed/retry_wait/stale/unknown-delivery cases using isolated fixtures. Confirm unavailable account metrics say not measured. Walk incident runbooks with request/job IDs.

**Acceptance, validation and failure assertions:** Counts/states are truthful; retry never bypasses eligibility; unknown delivery cannot be blindly resent; each incident yields a safe next action and no secret/content logs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Authoritative job/usage/delivery state -> operations page -> safe operator action
```

**Owning integration references to inspect:** `docs/OPERATIONAL_CONTROLS.md`, `apps/worker-api/src/jobs/operations-summary.routes.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                     | Check before continuing              |
| ---- | -------------------------------------------------------------------------- | ------------------------------------ |
| 1    | Prepare isolated failed, pending, retry_wait and unknown-delivery fixtures | Every row has known source state     |
| 2    | Open protected operations UI and compare against API                       | Counts/units/time windows agree      |
| 3    | Check absent measurements                                                  | Not measured instead of zero         |
| 4    | Exercise eligible retry and ineligible retry                               | Server decides eligibility           |
| 5    | Inspect uncertain delivery without sending again                           | Safe reconciliation route documented |
| 6    | Walk one incident from request ID to next action                           | No raw content needed                |

### Testing and expected results

| Case    | Assertion that must hold                       | Evidence level                                                                |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| R11-T01 | Not-measured data cannot render zero headroom  | Local regression plus actual environment evidence where the scope requires it |
| R11-T02 | Unknown delivery offers no blind resend        | Local regression plus actual environment evidence where the scope requires it |
| R11-T03 | Nonfailed retry rejected without duplicate job | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/operations-summary.d1.spec.ts
npm run browser:operations:test
```

### Failure handling and completion handoff

If any assertion fails, record `R11` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R11_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r12"></a>

## R12 — Verify deletion and privacy freshness across surfaces

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-247; OPE-228.

**Readiness / dependencies:** READY preparation; isolated approved fixtures.

**Goal and user outcome:** Verify deletion and privacy freshness across surfaces. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R12_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Trace synthetic edit, soft-delete, privacy restriction, grace restore and confirmed purge through canonical/detail/FTS/attachments/projection/digests. Test partial external deletion and stale worker result. Preserve raw originals until the authorized purge state permits deletion.

**Acceptance, validation and failure assertions:** Deleted/restricted content does not leak through stale derived surfaces; partial purge remains visible and resumable; no premature canonical deletion; failed checks create bounded repair packets.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Item lifecycle/privacy -> FTS/originals/projection/digests -> freshness
```

**Owning integration references to inspect:** `apps/worker-api/src/recovery/restore.routes.ts`, `scripts/recovery-bundle.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                           | Check before continuing                    |
| ---- | ---------------------------------------------------------------- | ------------------------------------------ |
| 1    | Create isolated synthetic item with source marker and attachment | Record every derived surface               |
| 2    | Edit and restrict privacy while a job is pending                 | New generation recorded                    |
| 3    | Try stale result and search/projection read                      | Old content cannot reappear                |
| 4    | Soft-delete and restore within existing grace contract           | Intended reversible behavior verified      |
| 5    | Confirm purge for exact fixture only                             | Record per-step receipts and partial state |
| 6    | Retry partial purge and verify all required surfaces             | Canonical record not deleted prematurely   |

### Testing and expected results

| Case    | Assertion that must hold                               | Evidence level                                                                |
| ------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| R12-T01 | Stale worker result rejected                           | Local regression plus actual environment evidence where the scope requires it |
| R12-T02 | Restricted/deleted item absent from forbidden surfaces | Local regression plus actual environment evidence where the scope requires it |
| R12-T03 | Partial external failure retains resumable state       | Local regression plus actual environment evidence where the scope requires it |
| R12-T04 | Wrong confirmation/version cannot purge                | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R12` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R12_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r13"></a>

## R13 — Prove browser capture and recovery on the deployed core

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-22/33; OPE-248.

**Readiness / dependencies:** R07; approved synthetic writes.

**Goal and user outcome:** Prove browser capture and recovery on the deployed core. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/API.md`, `docs/verification/BG-18_BROWSER_UPLOAD.md`.

**Output / allowed evidence file:** `docs/verification/R13_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Exercise URL/text/note/PDF/image, replay with same key, new share with new reason, upload session expiry and same-operation recovery. Reload detail, inspect raw retrieval and private originals. Verify anonymous denial and no-store response behavior.

**Acceptance, validation and failure assertions:** One canonical result per same-key retry; intentional history retained; file hashes match; failed network/auth preserves draft and truthful status; desktop proof is not iPhone acceptance.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Web form -> authenticated capture/upload -> D1/R2 -> detail/recovery
```

**Owning integration references to inspect:** `apps/web/src/App.tsx`, `apps/worker-api/src/app.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                              | Check before continuing                    |
| ---- | ------------------------------------------------------------------- | ------------------------------------------ |
| 1    | Log into authorized test target and prepare unique synthetic marker | Record fixture ownership                   |
| 2    | Save URL/text/note and file through UI                              | Raw result available before enrichment     |
| 3    | Retry same operation key then intentionally new share key           | Replay and new event differentiated        |
| 4    | Interrupt upload/session and recover same draft                     | Same operation/reservation retained        |
| 5    | Reload detail and download original                                 | Hash and owner fields agree                |
| 6    | Repeat actual original URL without authentication                   | Denial and private cache behavior recorded |

### Testing and expected results

| Case    | Assertion that must hold                     | Evidence level                                                                |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| R13-T01 | Same-key retry creates no extra event/object | Local regression plus actual environment evidence where the scope requires it |
| R13-T02 | New-key same URL preserves new reason/event  | Local regression plus actual environment evidence where the scope requires it |
| R13-T03 | Expired session retains draft                | Local regression plus actual environment evidence where the scope requires it |
| R13-T04 | Anonymous original download denied           | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run browser:capture:test
npm run browser:file-upload:test
npm run browser:recovery:test
npm run browser:download:test
```

### Failure handling and completion handoff

If any assertion fails, record `R13` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R13_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r14"></a>

## R14 — Prove source acquisition and lexical recall

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-22/33; OPE-225/223.

**Readiness / dependencies:** R13; approved public sources.

**Goal and user outcome:** Prove source acquisition and lexical recall. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/URL_ACQUISITION_CONTRACT.md`, `docs/TESTING_AND_ACCEPTANCE.md`, `docs/OPE-225_COMPLETION_TASKS.md`.

**Output / allowed evidence file:** `docs/verification/R14_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use distinctive internal website/PDF phrases, exact/combined filters and deleted items; confirm source coverage and no-AI recall. Exercise unavailable URL and retry with current generation. Record time to visibility rather than inventing immediate-search SLO.

**Acceptance, validation and failure assertions:** Internal phrase found from acquired text; URL-only Instagram remains honest; stale retries cannot overwrite current generation; title-only match never substitutes for source indexing.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Acquired webpage/PDF text -> extraction evidence -> FTS -> filtered results
```

**Owning integration references to inspect:** `apps/worker-api/src/app.ts`, `docs/URL_ACQUISITION_CONTRACT.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                    | Check before continuing              |
| ---- | --------------------------------------------------------- | ------------------------------------ |
| 1    | Choose phrase inside source body, not title               | Test cannot pass from metadata alone |
| 2    | Capture approved webpage and text PDF                     | Exact source revision recorded       |
| 3    | Search phrase after processing and record visibility time | No invented instant-search promise   |
| 4    | Combine source/project/date filters and stable pagination | No cross-fixture accidental match    |
| 5    | Use inaccessible URL and inspect coverage/retry           | URL-only state honest                |
| 6    | Edit/delete/restrict and repeat search                    | Current authority reflected          |

### Testing and expected results

| Case    | Assertion that must hold                      | Evidence level                                                                |
| ------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| R14-T01 | Internal phrase becomes searchable without AI | Local regression plus actual environment evidence where the scope requires it |
| R14-T02 | Unavailable source does not fabricate text    | Local regression plus actual environment evidence where the scope requires it |
| R14-T03 | Stale retry cannot replace current source     | Local regression plus actual environment evidence where the scope requires it |
| R14-T04 | Deleted item excluded                         | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/search.d1.spec.ts apps/worker-api/test/source-acquisition.d1.spec.ts
npm run browser:source-recovery:test
```

### Failure handling and completion handoff

If any assertion fails, record `R14` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R14_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r15"></a>

## R15 — Prove approved AI modality, privacy and quota boundaries

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-22/33; OPE-222/223/227.

**Readiness / dependencies:** R07/R14; approved provider/model and bounded fixture packet.

**Goal and user outcome:** Prove approved AI modality, privacy and quota boundaries. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R15_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Prepare public text and screenshot fixtures separately, exact model provenance, expected facts and forbidden claims. Verify structured output/owner overrides and same deferred job recovery. Prove restricted routing using instrumented synthetic boundaries; never send sensitive content to test rejection. Verify hard quota admission and actual usage.

**Acceptance, validation and failure assertions:** Text and vision are independently evidenced; malformed output cannot corrupt fields; provider outage preserves raw capture; no silent paid/private fallback; quality and schema validity separately judged.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Privacy/capacity admission -> approved AI -> validated derived fields
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `apps/worker-api/src/jobs/job.service.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                         | Check before continuing           |
| ---- | ------------------------------------------------------------------------------ | --------------------------------- |
| 1    | Freeze public text/image fixtures and expected facts                           | Modalities tested independently   |
| 2    | Record approved provider/model/call ceilings                                   | No silent fallback                |
| 3    | Run actual public processing and inspect provenance/usage                      | Real execution distinct from mock |
| 4    | Send malformed synthetic model output through isolated boundary                | No invalid field persistence      |
| 5    | Edit a derived field then retry the same deferred job                          | Owner override retained           |
| 6    | Exercise restricted/unknown/personal-without-consent routing with outbound spy | Zero unauthorized calls           |
| 7    | Exercise quota exhaustion/outage and recovery                                  | Capture/search remain available   |

### Testing and expected results

| Case    | Assertion that must hold                              | Evidence level                                                                |
| ------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| R15-T01 | Valid JSON with unsupported fact fails quality review | Local regression plus actual environment evidence where the scope requires it |
| R15-T02 | Text success cannot certify vision                    | Local regression plus actual environment evidence where the scope requires it |
| R15-T03 | Restricted marker never reaches hosted adapter        | Local regression plus actual environment evidence where the scope requires it |
| R15-T04 | Hard threshold blocks new optional calls              | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/enrich.d1.spec.ts apps/worker-api/test/capacity-core-continuity.d1.spec.ts
npx vitest run --config vitest.node.config.ts apps/worker-api/test/bg29-privacy-matrix.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R15` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R15_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r16"></a>

## R16 — Prove Notion projection, outage and recreation

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-34; OPE-221.

**Readiness / dependencies:** R15 and approved synthetic Notion destination.

**Goal and user outcome:** Prove Notion projection, outage and recreation. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/NOTION_INFORMATION_ARCHITECTURE.md`, `docs/OPERATIONAL_CONTROLS.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R16_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Inspect schema/access then project one item and repeat sync. Use isolated 429/outage, save/search while unavailable, resume due attempt and inspect human-owned fields. Remove only approved synthetic page; explicitly recreate through supported admin action.

**Acceptance, validation and failure assertions:** One intended projection; canonical data/originals survive outage/page loss; user fields retained; purged item cannot recreate; live and mocked outage evidence separately labeled.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Canonical D1 item -> sync attempt -> Notion projection -> safe recreation
```

**Owning integration references to inspect:** `docs/NOTION_INFORMATION_ARCHITECTURE.md`, `apps/worker-api/src/sync/notion-sync.service.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                        | Check before continuing              |
| ---- | ------------------------------------------------------------- | ------------------------------------ |
| 1    | Validate synthetic destination property mapping and access    | Token existence alone insufficient   |
| 2    | Project one item and inspect actual page                      | Record item/page mapping             |
| 3    | Repeat sync and compare page count/human-owned fields         | No duplicate or overwrite            |
| 4    | Introduce isolated outage/429 and capture/search another item | Canonical workflow remains available |
| 5    | Resume due retry after restoration                            | Same intended page converges         |
| 6    | Remove/deny only fixture page and explicitly recreate         | Canonical data survives              |

### Testing and expected results

| Case    | Assertion that must hold             | Evidence level                                                                |
| ------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| R16-T01 | Repeated sync keeps one page         | Local regression plus actual environment evidence where the scope requires it |
| R16-T02 | Outage does not roll back capture    | Local regression plus actual environment evidence where the scope requires it |
| R16-T03 | Recreation forbidden for purged item | Local regression plus actual environment evidence where the scope requires it |
| R16-T04 | Human-owned fields retained          | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/notion-sync.service.test.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/notion-source-of-truth.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R16` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R16_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r17"></a>

## R17 — Audit actual client gaps before device testing

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-219/246; BG-35/36.

**Readiness / dependencies:** READY.

**Goal and user outcome:** Audit actual client gaps before device testing. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R17_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare installed/exported templates with current form contract. Correct obsolete endpoint instructions from frozen current origin. Identify absent durable queue and Quick Save optional-prompt conflict. Produce exact Shortcut action-level implementation packets and file permission/storage design. Carry the November 10 owner decision forward: runnable local Ollama processing is mandatory in V1, owned by R50–R52.

**Acceptance, validation and failure assertions:** Online/queue implementation gaps have concrete contracts before device session; no claim that existing templates already support offline; local-worker API is not called a runnable client.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Installed Shortcut + current form API -> action-level build contracts
```

**Owning integration references to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `apps/worker-api/src/shortcut/shortcut.routes.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                      | Check before continuing             |
| ---- | --------------------------------------------------------------------------- | ----------------------------------- |
| 1    | Compare sanitized template to actual installed version                      | Missing actions listed, not assumed |
| 2    | Replace obsolete origin in proposed client contract from frozen deployment  | No guessed hostname                 |
| 3    | Map each accepted input and mode to form fields                             | Quick Save avoids optional prompts  |
| 4    | Specify persistent queue record/write/acknowledge behavior                  | Token never in queue                |
| 5    | Write separate online and queue action sheets with screenshots/placeholders | Junior can construct exact actions  |
| 6    | Hand local-AI requirement to R50–R52                                        | It is mandatory V1, not deferred    |

### Testing and expected results

| Case    | Assertion that must hold                           | Evidence level                                                    |
| ------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| R17-T01 | Form HTTP 200 error still retains queue            | Contract review now; implementation regression after prerequisite |
| R17-T02 | Temporary file loss has explicit recovery behavior | Contract review now; implementation regression after prerequisite |
| R17-T03 | No exported credential                             | Contract review now; implementation regression after prerequisite |
| R17-T04 | Missing queue actions block device acceptance      | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/shortcut.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R17` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R17_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r18"></a>

## R18 — Complete the online Shortcut artifact

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-219; BG-35.

**Readiness / dependencies:** R17 approved action-level contract.

**Goal and user outcome:** Complete the online Shortcut artifact. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R18_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Implement sanitized current-origin template, input classification and form submission. Quick Save avoids optional questions; separate reason/privacy/reminder modes preserve required fields. Interpret shortcut_action, not HTTP 200 alone. Keep token installation private on device.

**Acceptance, validation and failure assertions:** All supported online types have exact actions and expected envelope handling; failure never displays Saved; exported artifact contains no credentials; device success remains R20.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Share Sheet -> input classification -> form POST -> truthful UI
```

**Owning integration references to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `apps/worker-api/src/shortcut/shortcut.routes.ts`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                          | Check before continuing                   |
| ---- | --------------------------------------------------------------- | ----------------------------------------- |
| 1    | Build sanitized template using R17 action sheet                 | Correct accepted types and current origin |
| 2    | Implement Quick Save and optional reason/privacy/reminder modes | Defaults preserved                        |
| 3    | Preserve actual input text/bytes and stable UUID                | No regeneration during retry              |
| 4    | Submit exact form fields with scoped token stored privately     | No admin credential                       |
| 5    | Interpret shortcut_action before deleting queue                 | Saved only on durable acknowledgement     |
| 6    | Export secret-free artifact and install test copy               | Runtime credential excluded               |

### Testing and expected results

| Case    | Assertion that must hold              | Evidence level                                                                |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| R18-T01 | DELETE_QUEUE acknowledges save/replay | Local regression plus actual environment evidence where the scope requires it |
| R18-T02 | KEEP_RETRY/KEEP_FIX preserve payload  | Local regression plus actual environment evidence where the scope requires it |
| R18-T03 | KEEP_STOP retains payload and stops   | Local regression plus actual environment evidence where the scope requires it |
| R18-T04 | Network failure never displays Saved  | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/shortcut.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R18` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R18_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r19"></a>

## R19 — Implement durable queue and stable retry artifact

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-219; BG-36.

**Readiness / dependencies:** R17/R18 action contract.

**Goal and user outcome:** Implement durable queue and stable retry artifact. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R19_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Persist queue record and original bytes before network with stable UUID/kind/reason/privacy. Retry oldest first with same identity; DELETE_QUEUE alone removes acknowledged record, KEEP_STOP stops, other actions retain. Define atomic persistence/interrupted-write handling and exact file-reselection behavior in action contract before build.

**Acceptance, validation and failure assertions:** Restart/offline cannot lose an acknowledged local queue payload; no token in queue; partial file persistence cannot claim retained success; unrelated entries survive cleanup.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Source bytes + metadata -> durable queue -> same-key retry -> acknowledged removal
```

**Owning integration references to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `apps/worker-api/src/shortcut/shortcut.routes.ts`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                    | Check before continuing                         |
| ---- | --------------------------------------------------------- | ----------------------------------------------- |
| 1    | Build durable record before any network call              | UUID/kind/reason/privacy/bytes persisted        |
| 2    | Make persistence interruption detectable per R17 contract | Incomplete record cannot claim retained success |
| 3    | Build oldest-first retry and preserve field values        | No token persisted                              |
| 4    | Handle each shortcut_action independently                 | Only DELETE_QUEUE removes record                |
| 5    | Stop/restart and inspect pending entry                    | Payload survives memory loss                    |
| 6    | Test inaccessible/missing file and recovery selection     | No silent replacement with wrong original       |

### Testing and expected results

| Case    | Assertion that must hold                    | Evidence level                                                                |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| R19-T01 | Interrupted write cannot appear complete    | Local regression plus actual environment evidence where the scope requires it |
| R19-T02 | Accepted-but-response-lost retries same key | Local regression plus actual environment evidence where the scope requires it |
| R19-T03 | Restart retains file hash                   | Local regression plus actual environment evidence where the scope requires it |
| R19-T04 | Cleanup removes only acknowledged entry     | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/shortcut.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R19` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R19_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r20"></a>

## R20 — Run one prepared online physical-iPhone session

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-35; OPE-219.

**Readiness / dependencies:** R18/R19; authorized target and installed device.

**Goal and user outcome:** Run one prepared online physical-iPhone session. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R20_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Agent prepares fixtures/expected outcomes and safe evidence sheet first. Owner privately installs token and grants permissions. Run Safari, Instagram, YouTube, LinkedIn, Notes/text, manual note, Photos and Files, supported modes, repeated tap/new reason. Agent correlates server IDs and hashes.

**Acceptance, validation and failure assertions:** Every required source/type row has actual device/iOS/client/build evidence and PASS or a repair ticket; no simulator/desktop substitution; no repeated setup questions within unchanged session.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Actual iPhone Share Sheet -> deployed capture -> Web original
```

**Owning integration references to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `apps/worker-api/src/shortcut/shortcut.routes.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                     | Check before continuing           |
| ---- | -------------------------------------------------------------------------- | --------------------------------- |
| 1    | Prepare all source fixtures and expected result sheet before owner session | No ad-hoc test design on device   |
| 2    | Record iPhone/iOS/client/target and privately install token                | No sensitive screenshots          |
| 3    | Run Safari/Instagram/YouTube/LinkedIn/Notes/manual text                    | Source-specific coverage recorded |
| 4    | Run Photos and Files PDF/supported file                                    | Compare original hashes           |
| 5    | Run modes, repeated tap and intentional new reason                         | Replay/new event correct          |
| 6    | Record each result and precise repair handoff                              | Never substitute desktop viewport |

### Testing and expected results

| Case    | Assertion that must hold                    | Evidence level                                                              |
| ------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| R20-T01 | Every required app/type has actual evidence | Actual device/operator observation required; local test is supporting proof |
| R20-T02 | Quick Save has no forced reason question    | Actual device/operator observation required; local test is supporting proof |
| R20-T03 | Unicode/reason/privacy survive              | Actual device/operator observation required; local test is supporting proof |
| R20-T04 | No token in exported template               | Actual device/operator observation required; local test is supporting proof |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/shortcut.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R20` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R20_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r21"></a>

## R21 — Run prepared offline, restart and rotation session

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-36; OPE-219.

**Readiness / dependencies:** R20; approved isolated failure/credential scenarios.

**Goal and user outcome:** Run prepared offline, restart and rotation session. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut-device-qa.md`, `docs/TOKEN_ROTATION.md`.

**Output / allowed evidence file:** `docs/verification/R21_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Airplane-mode note/file, terminate/restart, reconnect same key; simulate accepted-but-response-lost, interrupted/expired upload and slow network. Verify invalid/rotated credential guidance, retained queue and retry after repair. Test unsupported/oversize and inaccessible iCloud storage.

**Acceptance, validation and failure assertions:** Exactly one logical event after replay; reason/privacy/time/bytes retained or honest reselection; no false Saved; credential overlap/compromise behavior matches contract; queue deletes only on durable acknowledgement.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Offline queue -> restart -> reconnect -> token handover -> one durable capture
```

**Owning integration references to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `apps/worker-api/src/shortcut/shortcut.routes.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                     | Check before continuing                  |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | Enter airplane mode before note and file capture                           | No false server Saved                    |
| 2    | Terminate/reopen and inspect queue/bytes                                   | Persistence proved                       |
| 3    | Reconnect and retry retained key                                           | One logical capture                      |
| 4    | Simulate response loss after server commit                                 | Replay acknowledgement without duplicate |
| 5    | Exercise slow/expired upload and invalid/rotated dedicated test credential | Retained content and actionable message  |
| 6    | Correct fault and retry then inspect cleanup                               | Only completed entry removed             |

### Testing and expected results

| Case    | Assertion that must hold                         | Evidence level                                                              |
| ------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| R21-T01 | Mac/desktop test cannot replace iOS proof        | Actual device/operator observation required; local test is supporting proof |
| R21-T02 | Rotation preserves key and payload               | Actual device/operator observation required; local test is supporting proof |
| R21-T03 | Unsupported/oversized input uses correction path | Actual device/operator observation required; local test is supporting proof |
| R21-T04 | Unavailable iCloud does not silently lose input  | Actual device/operator observation required; local test is supporting proof |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/shortcut.test.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R21` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R21_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r22"></a>

## R22 — Rehearse independent disaster recovery and anti-resurrection

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-37; OPE-228.

**Readiness / dependencies:** R05; approved isolated purge/recovery fixtures.

**Goal and user outcome:** Rehearse independent disaster recovery and anti-resurrection. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R22_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Restore with only independent artifacts and runbook, without consulting live source for missing data. Include older backup/newer purge receipt, corrupt/missing original, partial purge, owner overrides and derived index rebuild. Record recovery duration and interventions.

**Acceptance, validation and failure assertions:** Recovered records/originals/search match; purged content absent from FTS/objects/projection queues; outbound work stays disabled; missing bytes gives partial recovery, never PASS.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Independent artifacts only -> isolated recovery -> anti-resurrection proof
```

**Owning integration references to inspect:** `apps/worker-api/src/recovery/restore.routes.ts`, `scripts/recovery-bundle.mjs`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                  | Check before continuing          |
| ---- | ------------------------------------------------------- | -------------------------------- |
| 1    | Prepare old snapshot and newer synthetic purge receipt  | Explicit temporal ordering       |
| 2    | Disconnect recovery process from source data dependency | No filling gaps from live source |
| 3    | Restore clean target with outbound disabled             | Application becomes usable       |
| 4    | Verify originals/events/overrides/search                | Match counts and hashes          |
| 5    | Restore old snapshot with newest receipt                | Purged content absent everywhere |
| 6    | Inject one corrupt original and one partial purge       | Honest failure report            |
| 7    | Time recovery and amend missing runbook steps           | Repeat only affected proof       |

### Testing and expected results

| Case    | Assertion that must hold                 | Evidence level                                                                |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| R22-T01 | Purged item never resurrects             | Local regression plus actual environment evidence where the scope requires it |
| R22-T02 | Missing byte yields partial recovery     | Local regression plus actual environment evidence where the scope requires it |
| R22-T03 | No Notion/Telegram send during rehearsal | Local regression plus actual environment evidence where the scope requires it |
| R22-T04 | Recovery usable without source bucket    | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R22` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R22_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r23"></a>

## R23 — Prepare and activate bounded daily/weekly delivery

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** BG-38; OPE-226.

**Readiness / dependencies:** R07/R11/R15/R16/R22; approved private destination and schedule.

**Goal and user outcome:** Prepare and activate bounded daily/weekly delivery. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/OPERATIONAL_CONTROLS.md`.

**Output / allowed evidence file:** `docs/verification/R23_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Freeze eligible-day definition, Asia/Kolkata schedule, stable candidate, exact destination, privacy exclusions and unknown-delivery reconciliation. Prepare one activation packet with cost/disable/stop controls. Verify weekly schedule independently; manual send is separate evidence.

**Acceptance, validation and failure assertions:** Activation has explicit scope and safe stop; no existing disabled flag silently enabled; eligibility and restart rules frozen before first counted day.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Stable candidate + approved destination -> frozen eligibility -> schedule activation
```

**Owning integration references to inspect:** `docs/OPERATIONAL_CONTROLS.md`, `apps/worker-api/src/digests/digest.worker.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                     | Check before continuing                       |
| ---- | ---------------------------------------------------------- | --------------------------------------------- |
| 1    | Write eligibility and reset rules before first observation | No retroactive exclusions                     |
| 2    | Verify actual schedule and timezone against candidate      | Daily and weekly distinct                     |
| 3    | Prepare private destination and synthetic privacy fixtures | Restricted text excluded                      |
| 4    | Prepare bounded activation/disable/recovery packet         | One scoped approval                           |
| 5    | Activate only approved capability and record version       | Other disabled operations remain as specified |
| 6    | Verify uncertain delivery procedure without blind resend   | Recovery action unambiguous                   |

### Testing and expected results

| Case    | Assertion that must hold                  | Evidence level                                                                |
| ------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| R23-T01 | Empty ineligible period suppressed        | Local regression plus actual environment evidence where the scope requires it |
| R23-T02 | Duplicate period not resent               | Local regression plus actual environment evidence where the scope requires it |
| R23-T03 | Unknown delivery needs reconciliation     | Local regression plus actual environment evidence where the scope requires it |
| R23-T04 | Manual send never counts as scheduled run | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/digest-period.test.ts apps/worker-api/test/digest-scheduler.test.ts
npm run browser:digests:test
```

### Failure handling and completion handoff

If any assertion fails, record `R23` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R23_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r24"></a>

## R24 — Observe seven consecutive eligible daily sends and weekly review

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-38; OPE-226.

**Readiness / dependencies:** R23.

**Goal and user outcome:** Observe seven consecutive eligible daily sends and weekly review. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R24_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Record each scheduled opportunity/run/eligibility/outcome/receipt/link/privacy result; reconcile unknown before counting. Observe weekly selection separately. A missed eligible delivery resets sequence; meaningful scheduler/privacy change invalidates affected evidence only with explanation.

**Acceptance, validation and failure assertions:** Seven actual consecutive eligible scheduled deliveries confirmed, empty days truthfully classified, weekly story proved; manual recovery is not scheduled success; elapsed time not simulated.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Scheduled periods -> verified receipts/links -> consecutive-day gate
```

**Owning integration references to inspect:** `docs/OPERATIONAL_CONTROLS.md`, `apps/worker-api/src/digests/digest.worker.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                 | Check before continuing                                    |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------- |
| 1    | Create one row per actual scheduled opportunity        | Missing day visible                                        |
| 2    | Record eligibility before interpreting outcome         | Failed eligible day retained                               |
| 3    | Capture digest/run/message IDs and observed receipt    | Provider response alone insufficient when receipt required |
| 4    | Open exact item links and inspect privacy labels       | Correct authenticated target                               |
| 5    | Record weekly run separately                           | Daily proof does not imply weekly                          |
| 6    | Reset only when pre-agreed failure/change rule applies | Sequence honest                                            |

### Testing and expected results

| Case    | Assertion that must hold                    | Evidence level                                                              |
| ------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| R24-T01 | Seven actual eligible consecutive successes | Actual device/operator observation required; local test is supporting proof |
| R24-T02 | No backfilled manual success                | Actual device/operator observation required; local test is supporting proof |
| R24-T03 | Unknown outcome not counted                 | Actual device/operator observation required; local test is supporting proof |
| R24-T04 | Privacy change respected at delivery        | Actual device/operator observation required; local test is supporting proof |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/digest-period.test.ts apps/worker-api/test/digest-scheduler.test.ts
npm run browser:digests:test
```

### Failure handling and completion handoff

If any assertion fails, record `R24` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R24_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r25"></a>

## R25 — Run the two-week real-use observation

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-39; OPE-229/250.

**Readiness / dependencies:** R09–R22 and R52 required technical gates; R23 eligible; owner trial dates.

**Goal and user outcome:** Run the two-week real-use observation. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R25_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Freeze candidate, normal use mix and incident/restart rules before start. Track daily capture/search/review, backlog, failure, lost-draft/false-Saved/privacy issues and intervention count. Agent prepares concise prompts and aggregates evidence; owner supplies actual usefulness/friction judgments. Include correction/review rates and useful recollections; preserve the personal-beta guide’s recommended first-week 10 captures/day as an adoption target, not fabricated evidence. May share eligible days with R24.

**Acceptance, validation and failure assertions:** At least 14 actual days with required real-device stories; incidents retained; severe defects repaired and affected flows rechecked; observation windows tied to build identity.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Stable technical candidate -> real-device daily use -> friction evidence
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                          | Check before continuing         |
| ---- | --------------------------------------------------------------- | ------------------------------- |
| 1    | Verify technical gates including R52 before trial starts        | No unresolved critical behavior |
| 2    | Freeze start/end/build and incident rules                       | Minimum fourteen real days      |
| 3    | Use ordinary capture/search/review mix                          | Synthetic-only trial rejected   |
| 4    | Record daily failures, backlog, intervention and useful recall  | Safe aggregate evidence         |
| 5    | Fix severe defects through bounded repair and preserve incident | No erased bad day               |
| 6    | Review affected evidence on candidate change                    | Explain restart/extension       |
| 7    | Summarize user friction and usefulness                          | Owner makes actual judgment     |

### Testing and expected results

| Case    | Assertion that must hold                                 | Evidence level                                                              |
| ------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| R25-T01 | Fourteen elapsed days required                           | Actual device/operator observation required; local test is supporting proof |
| R25-T02 | Lost capture/private leakage/false Saved stays blocker   | Actual device/operator observation required; local test is supporting proof |
| R25-T03 | Build change never merges incompatible evidence silently | Actual device/operator observation required; local test is supporting proof |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R25` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R25_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r26"></a>

## R26 — Reconcile real usage and actual cost

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-39; OPE-227.

**Readiness / dependencies:** R25 observation data; account billing access.

**Goal and user outcome:** Reconcile real usage and actual cost. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R26_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare application counters with actual provider/platform period usage and charges. Separate shared-account use, free allowances, estimates and delayed billing. Identify exact evidence still pending; do not extrapolate a partial invoice.

**Acceptance, validation and failure assertions:** Actual $0 criterion supported for required period and hard threshold tests pass; unavailable invoice remains pending; no silent budget relaxation.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
App counters + provider/platform invoices -> attributed actual cost
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                               | Check before continuing        |
| ---- | ---------------------------------------------------- | ------------------------------ |
| 1    | Record exact observation/account billing periods     | Match R25 window               |
| 2    | Collect actual usage and finalized available charges | Separate estimates             |
| 3    | Account for other tools sharing account              | No false attribution           |
| 4    | Compare limits/admission evidence with usage         | No hidden billable path        |
| 5    | List delayed/unavailable billing evidence explicitly | Do not force PASS              |
| 6    | Attach sanitized cost verdict                        | Owner account details excluded |

### Testing and expected results

| Case    | Assertion that must hold                | Evidence level                                                              |
| ------- | --------------------------------------- | --------------------------------------------------------------------------- |
| R26-T01 | Zero internal estimate is not zero bill | Actual device/operator observation required; local test is supporting proof |
| R26-T02 | Partial invoice remains pending         | Actual device/operator observation required; local test is supporting proof |
| R26-T03 | Shared-account costs separated          | Actual device/operator observation required; local test is supporting proof |
| R26-T04 | Hard-stop behavior independently tested | Actual device/operator observation required; local test is supporting proof |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R26` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R26_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r27"></a>

## R27 — Assemble one full-V1 acceptance dossier

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-247; BG-30/40.

**Readiness / dependencies:** R07/R09–R16/R20–R22/R24–R26/R52.

**Goal and user outcome:** Assemble one full-V1 acceptance dossier. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/verification/BG-30_RELEASE_MATRIX.json`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R27_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Map every V1 scenario to latest valid evidence and capability-specific source/runtime/device identity. Include recovery, security, hourly proof, AI modalities, Notion, delivery, costs and local-client applicability. Resolve tracker drift with links, not copied percentages. Prepare the required one-page owner operating guide covering install, capture types, coverage/privacy/status, search/review, retry, rotation, export, deletion and recovery.

**Acceptance, validation and failure assertions:** No required gate omitted or satisfied by wrong environment; each residual blocker has impact/owner/next action; agent can recommend GO only if all mandatory criteria pass.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
All V1 gate results -> requirement matrix -> owner decision packet
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                             | Check before continuing            |
| ---- | ------------------------------------------------------------------ | ---------------------------------- |
| 1    | List every mandatory V1 criterion and owning R ticket              | Local AI included                  |
| 2    | Check environment/source/runtime/device identity of evidence       | No stale blanket CI pass           |
| 3    | Verify recovery/security/hourly/device/AI/Notion/digest/cost gates | Every missing row visible          |
| 4    | Prepare one-page owner operating guide                             | Install through recovery usable    |
| 5    | Summarize remaining user impact and resolving action               | No arbitrary completion percentage |
| 6    | Reconcile parent summaries without closing owner gate              | One current release truth          |

### Testing and expected results

| Case    | Assertion that must hold                  | Evidence level                                                                |
| ------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| R27-T01 | Missing R52 blocks full V1                | Local regression plus actual environment evidence where the scope requires it |
| R27-T02 | Local test cannot substitute live/devices | Local regression plus actual environment evidence where the scope requires it |
| R27-T03 | Required gap cannot be renamed optional   | Local regression plus actual environment evidence where the scope requires it |
| R27-T04 | All evidence links resolve                | Local regression plus actual environment evidence where the scope requires it |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R27` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R27_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r28"></a>

## R28 — Record owner V1 go/no-go

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** BG-40; OPE-229.

**Readiness / dependencies:** R27.

**Goal and user outcome:** Record owner V1 go/no-go. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R28_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Present concise capability results, residual risks, observed usefulness and recommendation. Owner records dated decision for exact release scope. Update current release summary and parent trackers after actual decision.

**Acceptance, validation and failure assertions:** Explicit decision preserved; NO-GO names unresolved packets; V1 GO does not authorize RAG or public productization.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Verified dossier -> explicit owner decision -> release record
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                       | Check before continuing       |
| ---- | ------------------------------------------------------------ | ----------------------------- |
| 1    | Present exact scope/build/dates and meaningful limitations   | Owner understands outcome     |
| 2    | Recommend GO only if mandatory gates passed                  | Explain NO-GO concretely      |
| 3    | Record actual owner answer with date and revision            | No inferred approval          |
| 4    | Update current release summary and appropriate parent states | Historical records retained   |
| 5    | Hand off ongoing operations and later entry gates            | No RAG authorization inferred |

### Testing and expected results

| Case    | Assertion that must hold          | Evidence level                                                              |
| ------- | --------------------------------- | --------------------------------------------------------------------------- |
| R28-T01 | No answer means no GO             | Actual device/operator observation required; local test is supporting proof |
| R28-T02 | NO-GO has resolving packet        | Actual device/operator observation required; local test is supporting proof |
| R28-T03 | GO is bound to exact tested scope | Actual device/operator observation required; local test is supporting proof |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R28` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R28_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r29"></a>

## R29 — Convert measured friction into bounded V1.1 fixes

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** OPE-250.

**Readiness / dependencies:** R28; two-week evidence R25.

**Goal and user outcome:** Convert measured friction into bounded V1.1 fixes. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R29_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse trial evidence rather than demand a second identical two-week run. Rank observed friction by lost data/privacy/false status and user effort. Architect creates exact fix packets with fixtures/contracts; owner only approves new product changes. Rerun affected acceptance.

**Acceptance, validation and failure assertions:** Each proposed improvement has observed demand and acceptance; required serious fixes resolved; speculative expansion stays out; RAG readiness includes usefulness judgment.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Trial friction -> ranked fixes -> independently approved V1.1 scope
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                  | Check before continuing            |
| ---- | ------------------------------------------------------- | ---------------------------------- |
| 1    | Reuse R25 trial records and weekly evidence             | No duplicate identical trial       |
| 2    | Rank loss/privacy/false-status and repeated effort      | Evidence precedes feature ideas    |
| 3    | Map each proposed fix to behavior, files and regression | No generic polish ticket           |
| 4    | Resolve ordinary engineering choices as architect       | Owner only new product commitments |
| 5    | Implement approved fixes under bounded packets          | Recheck affected stories           |
| 6    | Record include/defer/reject for candidate changes       | RAG entry remains separate         |

### Testing and expected results

| Case    | Assertion that must hold                           | Evidence level                                                              |
| ------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| R29-T01 | Unobserved idea is not automatically included      | Actual device/operator observation required; local test is supporting proof |
| R29-T02 | Every P0 resolved or explicit accepted disposition | Actual device/operator observation required; local test is supporting proof |
| R29-T03 | Old evidence reusable only for unchanged behavior  | Actual device/operator observation required; local test is supporting proof |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R29` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R29_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r30"></a>

## R30 — Decide whether RAG should begin

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-230.

**Readiness / dependencies:** R28/R29; at least 100 useful captures and search evidence.

**Goal and user outcome:** Decide whether RAG should begin. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R30_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Count useful captures with safe aggregate evidence; show lexical-search misses and representative questions. Prepare explicit start/hold recommendation, privacy and zero-cost feasibility. Owner decides separately from V1 GO.

**Acceptance, validation and failure assertions:** Entry evidence exists and explicit start recorded, or later RAG packets remain CONDITIONAL; no semantic feature built merely because ticket exists.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Accepted V1 + useful corpus + lexical failures -> RAG start decision
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                              | Check before continuing     |
| ---- | ------------------------------------------------------------------- | --------------------------- |
| 1    | Verify V1 GO and V1.1 friction disposition                          | Actual record required      |
| 2    | Count at least 100 useful captures using safe aggregates            | Raw count alone not utility |
| 3    | Show representative lexical misses and question styles              | RAG solves observed problem |
| 4    | Prepare privacy/cost/maintenance and simpler alternative comparison | Bounded recommendation      |
| 5    | Obtain explicit start/hold decision                                 | No inferred RAG scope       |

### Testing and expected results

| Case    | Assertion that must hold             | Evidence level                                                    |
| ------- | ------------------------------------ | ----------------------------------------------------------------- |
| R30-T01 | Missing 100-useful gate blocks start | Contract review now; implementation regression after prerequisite |
| R30-T02 | V1 GO alone insufficient             | Contract review now; implementation regression after prerequisite |
| R30-T03 | Hold leaves RAG unimplemented        | Contract review now; implementation regression after prerequisite |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R30` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R30_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r31"></a>

## R31 — Freeze evidence-only answer and trust policy

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-230.

**Readiness / dependencies:** R30.

**Goal and user outcome:** Freeze evidence-only answer and trust policy. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R31_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Preserve evidence-only facts, four answer states, factual-block citations, coverage labels, conflicting-source separation and duplicate independence rules. Specify source-trust ordering and staleness behavior with examples. Architect resolves technical details; owner approves changed product guarantees only.

**Acceptance, validation and failure assertions:** Answer/refusal/conflict/trust rules are testable with positive/negative examples; external model knowledge never becomes corpus evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Saved evidence + source trust -> answer-state policy -> assertion fixtures
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                          | Check before continuing                         |
| ---- | --------------------------------------------------------------- | ----------------------------------------------- |
| 1    | List four states with example question/evidence/output          | Answered/partial/conflict/insufficient distinct |
| 2    | Specify every factual-block citation and limited-coverage label | URL-only cannot imply transcript                |
| 3    | Specify duplicate-source and conflict handling                  | Copies do not count as independent proof        |
| 4    | Specify source trust/staleness and user-note interpretation     | Intent not source fact                          |
| 5    | Translate policy into positive/negative fixtures                | Builder receives decisions, not alternatives    |

### Testing and expected results

| Case    | Assertion that must hold                    | Evidence level                                                    |
| ------- | ------------------------------------------- | ----------------------------------------------------------------- |
| R31-T01 | Unsupported outside knowledge rejected      | Contract review now; implementation regression after prerequisite |
| R31-T02 | Conflict retains separate sources           | Contract review now; implementation regression after prerequisite |
| R31-T03 | Unanswerable returns insufficient           | Contract review now; implementation regression after prerequisite |
| R31-T04 | Every factual block cites supplied evidence | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R31` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R31_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r32"></a>

## R32 — Approve gold questions and model evidence before integration

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-240.

**Readiness / dependencies:** R30/R31.

**Goal and user outcome:** Approve gold questions and model evidence before integration. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R32_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Prepare at least 50 versioned cases with expected evidence/claims/answerability: at least 20% partial/unanswerable and 10% changing/conflicting. Owner validates representativeness. Benchmark permitted model candidates under bounded cost/privacy scope; freeze dimensions/context/latency budgets from measured evidence.

**Acceptance, validation and failure assertions:** Gold set and provisional model/config candidates approved from component benchmarks, without claiming end-to-end RAG thresholds before implementation; R46 establishes release quality. Thresholds preserve Recall@5 >=85%, citation precision >=95%, coverage >=90%, insufficient-evidence accuracy >=90%; no guessed provider capability.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Representative gold questions + component model probes -> frozen evaluation inputs
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                       | Check before continuing                                   |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------- |
| 1    | Draft fifty versioned questions with exact expected evidence | Include partial/unanswerable and changing/conflict quotas |
| 2    | Ask owner to review representativeness in one prepared set   | No blank-page curation request                            |
| 3    | Record required/forbidden claims and citation spans          | Objective scoring possible                                |
| 4    | Benchmark permitted candidate components under bounded scope | No claim of finished pipeline quality                     |
| 5    | Freeze provisional model/tokenizer/dimension/context inputs  | R33 can define exact contracts                            |
| 6    | Retain holdout and actual usage records                      | R46 owns final end-to-end thresholds                      |

### Testing and expected results

| Case    | Assertion that must hold                                           | Evidence level                                                    |
| ------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| R32-T01 | At least ten partial/unanswerable and five changing/conflict cases | Contract review now; implementation regression after prerequisite |
| R32-T02 | Restricted corpus never sent externally                            | Contract review now; implementation regression after prerequisite |
| R32-T03 | Component benchmark cannot pass V1.5 launch                        | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R32` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R32_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r33"></a>

## R33 — Publish exact RAG contracts before builders start

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-230/231/236.

**Readiness / dependencies:** R31/R32.

**Goal and user outcome:** Publish exact RAG contracts before builders start. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`.

**Output / allowed evidence file:** `docs/verification/R33_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Architect specifies exact schema/migrations, API request/response/errors/auth, privacy modes, adapters, invalidation epoch, numeric token/chunk/query/concurrency/time budgets, prompt schema and UI states. Resolve legacy /v1/rag/query versus app /api/v1 prefix explicitly. Materialize exact source/test paths and caller maps for R34–R45 against then-current repo.

**Acceptance, validation and failure assertions:** No missing field/type/status/default/limit; migration/recovery and deletion contracts explicit; all downstream implementation packets pass intake with zero FAILs. This design task creates no RAG runtime.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Approved policy/models -> exact storage/API/job/UI contracts -> junior build handoff
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                 | Check before continuing                               |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | Architect reads current source and compares established interfaces     | Paths real, not imagined                              |
| 2    | Write exact schemas/types/keys/defaults/indexes and lifecycle          | Canonical storage authority preserved                 |
| 3    | Write exact route/method/auth/body/envelopes/status/error matrix       | Resolve API prefix inconsistency                      |
| 4    | Freeze numeric sizes/concurrency/timeouts/candidate/token/cache bounds | Units and overflow behavior explicit                  |
| 5    | Write adapter/job/prompt/citation/UI contracts and failure states      | Every producer has matching consumer                  |
| 6    | Create exact per-component file/caller/test map for R34–R45            | No junior architecture task                           |
| 7    | Run intake against examples and dependency graph                       | Zero unresolved required fields before implementation |

### Testing and expected results

| Case    | Assertion that must hold                                | Evidence level                                                    |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| R33-T01 | Absent numeric bound fails intake                       | Contract review now; implementation regression after prerequisite |
| R33-T02 | API consumer mismatch fails intake                      | Contract review now; implementation regression after prerequisite |
| R33-T03 | Privacy/delete/cache lifecycle unspecified fails intake | Contract review now; implementation regression after prerequisite |
| R33-T04 | Future paths clearly marked proposed                    | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R33` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R33_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r34"></a>

## R34 — Implement versioned RAG storage and provenance

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-231.

**Readiness / dependencies:** R33 frozen schema and exact implementation packet.

**Goal and user outcome:** Implement versioned RAG storage and provenance. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/DATA_MODEL.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R34_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Apply approved additive migration for versions/chunks/embedding records/retrieval runs/answers/citations/conversations with uniqueness and ownership. Include export, soft-delete, purge and compatibility behavior. Preserve canonical capture.

**Acceptance, validation and failure assertions:** Local migration/recovery tests prove idempotency, citation lineage and deletion behavior; no orphaned references or capture regression.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Canonical item -> immutable content version -> chunks -> retrieval/answer lineage
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                        | Check before continuing     |
| ---- | ------------------------------------------------------------- | --------------------------- |
| 1    | Start from R33 approved migration and relational definitions  | Do not invent columns       |
| 2    | Add additive storage migration in correct forward order       | Preserve existing captures  |
| 3    | Implement uniqueness/ownership and current-version activation | Repeat ingest idempotent    |
| 4    | Connect export/soft-delete/purge semantics                    | No orphan citations         |
| 5    | Test fresh and populated pre-migration databases              | Existing behavior unchanged |
| 6    | Document compatibility and isolated recovery                  | No unsafe down-migration    |

### Testing and expected results

| Case    | Assertion that must hold                                | Evidence level                                                                |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R34-T01 | Duplicate version/key rejected or replayed as specified | Local regression plus actual environment evidence where the scope requires it |
| R34-T02 | Citation trace resolves to exact item/version/span      | Local regression plus actual environment evidence where the scope requires it |
| R34-T03 | Delete blocks future retrieval                          | Local regression plus actual environment evidence where the scope requires it |
| R34-T04 | Existing capture tests remain green                     | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R34` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R34_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r35"></a>

## R35 — Implement bounded source-aware chunking

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-232.

**Readiness / dependencies:** R34/R33 numeric chunk contract.

**Goal and user outcome:** Implement bounded source-aware chunking. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R35_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Preserve exact source/version/spans, keep short notes intact and split long inputs at source boundaries within hard maximum. Record Unicode/PDF/OCR/transcript/empty/boilerplate handling and coverage; rechunk only changed configuration/content.

**Acceptance, validation and failure assertions:** Every span resolves; no silently dropped text; stable rerun identity; URL/summary-only evidence cannot masquerade as full source.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Extracted source version -> structural segments -> bounded chunks with spans
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                    | Check before continuing         |
| ---- | ------------------------------------------------------------------------- | ------------------------------- |
| 1    | Read approved tokenizer and maximums from R33                             | No guessed size/overlap         |
| 2    | Segment headings/paragraphs/pages/timestamps while preserving coordinates | Span remains exact              |
| 3    | Keep short notes intact and split oversize input deterministically        | Hard maximum enforced           |
| 4    | Record coverage and boilerplate exclusions with reasons                   | No silent text loss             |
| 5    | Version chunk configuration and rerun unchanged input                     | Stable identities               |
| 6    | Exercise Unicode/PDF/OCR/transcript/empty fixtures                        | Source-specific errors explicit |

### Testing and expected results

| Case    | Assertion that must hold                          | Evidence level                                                                |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| R35-T01 | Every chunk <= approved maximum                   | Local regression plus actual environment evidence where the scope requires it |
| R35-T02 | Unicode spans resolve correctly                   | Local regression plus actual environment evidence where the scope requires it |
| R35-T03 | URL-only source yields no invented text           | Local regression plus actual environment evidence where the scope requires it |
| R35-T04 | Rerun unchanged version does not duplicate chunks | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R35` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R35_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r36"></a>

## R36 — Implement approved embedding/index lifecycle

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-233.

**Readiness / dependencies:** R35/R37; R33 provider/index contract.

**Goal and user outcome:** Implement approved embedding/index lifecycle. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R36_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use existing job/admission patterns; dedupe by content/model/version, validate dimensions and retry partial batches safely. Build replacement index before explicit activation; exclude superseded/deleted chunks. Use deterministic fake adapters first.

**Acceptance, validation and failure assertions:** No duplicate embeddings on retry; pending on quota; old index recoverable during migration; restricted content never enters hosted vector provider.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Eligible chunk -> capacity reservation -> embedding -> vector+metadata lifecycle
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                           | Check before continuing               |
| ---- | ---------------------------------------------------------------- | ------------------------------------- |
| 1    | Use R33 approved adapter contracts and model dimension           | No provider chosen by builder         |
| 2    | Select only current eligible chunks and dedupe key               | Content/model/version identity stable |
| 3    | Reserve capacity before external call                            | Pending on exhaustion                 |
| 4    | Validate batch dimension/count then persist recoverable progress | Partial failure replay safe           |
| 5    | Build new model index alongside old index                        | No premature cutover                  |
| 6    | Activate only after approved integrity checks                    | Recoverable previous index            |

### Testing and expected results

| Case    | Assertion that must hold                                | Evidence level                                                                |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R36-T01 | Retry does not double-charge/embed same successful unit | Local regression plus actual environment evidence where the scope requires it |
| R36-T02 | Dimension mismatch fails safely                         | Local regression plus actual environment evidence where the scope requires it |
| R36-T03 | Deleted/superseded chunk excluded                       | Local regression plus actual environment evidence where the scope requires it |
| R36-T04 | Quota stop leaves raw capture/search available          | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R36` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R36_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r37"></a>

## R37 — Implement privacy and invalidation before serving retrieval

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-231/233/241/242.

**Readiness / dependencies:** R34/R33 lifecycle contract.

**Goal and user outcome:** Implement privacy and invalidation before serving retrieval. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R37_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Apply current visibility/deletion/version checks at every retrieval boundary. Invalidate embeddings/retrieval/answer caches and citation access on edits/restrictions/purge; reject stale worker commits. Include local/hosted separation and export/purge audit behavior.

**Acceptance, validation and failure assertions:** Concurrent delete/restrict versus retrieval/result commit cannot expose old evidence; stale cache/vector entry cannot bypass canonical check; failures fail closed.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Current item privacy/deletion/version -> every retrieval/cache/result boundary
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                           | Check before continuing                 |
| ---- | ---------------------------------------------------------------- | --------------------------------------- |
| 1    | Enumerate all derived read/write paths in R33 map                | None bypass current authority           |
| 2    | Implement eligibility check before candidates leave storage      | Restricted data never reaches generator |
| 3    | Version invalidation on edit/restrict/delete/model/policy change | Old cache key cannot revive data        |
| 4    | Reject stale in-flight index/result completion                   | Generation guard authoritative          |
| 5    | Propagate purge/export behavior to local and hosted stores       | No orphan private artifacts             |
| 6    | Run race fixtures against real DB boundary                       | Not just mocked boolean helpers         |

### Testing and expected results

| Case    | Assertion that must hold                                   | Evidence level                                                                |
| ------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R37-T01 | Delete between retrieval and answer rejects stale evidence | Local regression plus actual environment evidence where the scope requires it |
| R37-T02 | Cached answer invalid after restriction                    | Local regression plus actual environment evidence where the scope requires it |
| R37-T03 | Stale vector ID cannot bypass D1 check                     | Local regression plus actual environment evidence where the scope requires it |
| R37-T04 | Restricted hosted egress is zero                           | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R37` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R37_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r38"></a>

## R38 — Implement hybrid retrieval with lexical fallback

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-234.

**Readiness / dependencies:** R36/R37/R33 retrieval contract.

**Goal and user outcome:** Implement hybrid retrieval with lexical fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R38_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Run bounded lexical/vector candidates with approved filters and deterministic fusion; retain scores/provenance and stable search pagination. Timeout/backend failure degrades per contract without changing privacy mode.

**Acceptance, validation and failure assertions:** Exact names/URLs/phrases and paraphrases covered; no-result explicit; unauthorized chunks filtered before generation; one failed backend retains permitted results.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Query + filters -> lexical/vector candidates -> deterministic fused results
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                | Check before continuing  |
| ---- | --------------------------------------------------------------------- | ------------------------ |
| 1    | Validate normalized intent/filter contract without losing exact names | Quoted phrase preserved  |
| 2    | Run bounded backend requests with approved timeouts                   | No unbounded wait        |
| 3    | Apply privacy/deletion checks before candidate export                 | Forbidden chunks removed |
| 4    | Fuse scores deterministically and retain provenance                   | Stable tie behavior      |
| 5    | Return bounded top-k or search pagination per mode                    | Different modes explicit |
| 6    | Exercise single-backend outage and no results                         | Safe degraded state      |

### Testing and expected results

| Case    | Assertion that must hold                       | Evidence level                                                                |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| R38-T01 | Exact identifier retained by lexical path      | Local regression plus actual environment evidence where the scope requires it |
| R38-T02 | Vector outage yields permitted lexical results | Local regression plus actual environment evidence where the scope requires it |
| R38-T03 | Filter combination cannot leak hidden source   | Local regression plus actual environment evidence where the scope requires it |
| R38-T04 | Stable pagination has no duplicates/skips      | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R38` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R38_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r39"></a>

## R39 — Implement diversity, conflicts and deterministic reranking fallback

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-235.

**Readiness / dependencies:** R38/R31.

**Goal and user outcome:** Implement diversity, conflicts and deterministic reranking fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R39_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Collapse duplicate clusters without losing provenance; apply frozen trust/diversity budgets, preserve contradictory evidence, record inclusion/exclusion reasons. Use approved reranker with deterministic fallback.

**Acceptance, validation and failure assertions:** Reposts cannot inflate support; conflicts survive; one-source corpus works; reranker failure preserves stable permitted ordering.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Fused candidates -> duplicate clusters -> trust/diversity -> evidence selection
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                      | Check before continuing                  |
| ---- | ----------------------------------------------------------- | ---------------------------------------- |
| 1    | Group duplicate/near-duplicate evidence using approved rule | Provenance retained                      |
| 2    | Apply item/domain/source budgets from R33                   | One repost cluster cannot dominate       |
| 3    | Apply frozen trust/staleness rule                           | No invented confidence boost             |
| 4    | Preserve relevant opposing evidence                         | Contradiction not averaged away          |
| 5    | Invoke approved reranker or deterministic fallback          | Failure does not lose permitted evidence |
| 6    | Record selected/dropped reasons for trace                   | Reproducible review                      |

### Testing and expected results

| Case    | Assertion that must hold                         | Evidence level                                                                |
| ------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| R39-T01 | Many reposts do not become independent agreement | Local regression plus actual environment evidence where the scope requires it |
| R39-T02 | Conflicting source survives selection            | Local regression plus actual environment evidence where the scope requires it |
| R39-T03 | Single-source corpus remains usable              | Local regression plus actual environment evidence where the scope requires it |
| R39-T04 | Reranker failure gives deterministic order       | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R39` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R39_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r40"></a>

## R40 — Implement bounded context and query orchestration

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-236.

**Readiness / dependencies:** R39/R33 exact API contract.

**Goal and user outcome:** Implement bounded context and query orchestration. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/API_SPEC.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R40_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Validate query/filter/conversation/privacy inputs and auth; persist retrieval trace; build exact citation IDs and bounded context before provider call. Treat source text as untrusted; offer retrieval-only output and explicit timeout/no-evidence states.

**Acceptance, validation and failure assertions:** Overflow/malicious text cannot change instructions or exceed approved limits; citation IDs resolve; unauthorized/stale conversations rejected; failure retains safe evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Authenticated query -> current retrieval -> bounded citation context -> response
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                  | Check before continuing                      |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 1    | Implement exact R33 request schema/auth/error envelope                  | Malformed input rejected early               |
| 2    | Resolve conversation references without treating old answer as evidence | Fresh retrieval every turn                   |
| 3    | Persist retrieval trace and exact citation map                          | IDs identify source spans                    |
| 4    | Assemble context under fixed budgets and record truncation              | Check before provider call                   |
| 5    | Wrap source text as untrusted evidence                                  | Source cannot call tools/change instructions |
| 6    | Return retrieval-only/no-evidence/timeout result per contract           | Input and safe evidence retained             |

### Testing and expected results

| Case    | Assertion that must hold                      | Evidence level                                                                |
| ------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| R40-T01 | Token overflow cannot reach model unchecked   | Local regression plus actual environment evidence where the scope requires it |
| R40-T02 | Injected source instructions remain data      | Local regression plus actual environment evidence where the scope requires it |
| R40-T03 | Unknown conversation inaccessible             | Local regression plus actual environment evidence where the scope requires it |
| R40-T04 | Every citation maps to included current chunk | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R40` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R40_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r41"></a>

## R41 — Implement grounded answer validation and fallback

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-237.

**Readiness / dependencies:** R40/R31/R33 answer schema.

**Goal and user outcome:** Implement grounded answer validation and fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/PROMPTS_AND_SCHEMAS.md`.

**Output / allowed evidence file:** `docs/verification/R41_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Generate structured answer states; validate citations against supplied current context and reject unsupported claims according to policy. Preserve provenance/model/prompt/context hash. Provider or schema failure returns safe evidence/refusal, never fabricated success.

**Acceptance, validation and failure assertions:** Answerable/partial/conflict/insufficient cases and prompt injection tested; unknown citations rejected; limited coverage labeled; owner judgments included in quality eval.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Context + answer prompt -> structured output -> validation -> answer/evidence fallback
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                 | Check before continuing              |
| ---- | ---------------------------------------------------------------------- | ------------------------------------ |
| 1    | Use frozen answer schema/prompt and approved provider                  | No ad-hoc fields                     |
| 2    | Require allowed state and cited factual blocks                         | Validate unknown fields/IDs          |
| 3    | Check support/coverage policy using approved eval/validation boundary  | JSON validity alone insufficient     |
| 4    | Preserve separate conflicting claims/citations                         | No averaging                         |
| 5    | Persist model/prompt/context/version provenance after validation       | Invalid answer not stored as success |
| 6    | On timeout/malformed/unsupported response return safe evidence/refusal | Query not lost                       |

### Testing and expected results

| Case    | Assertion that must hold                      | Evidence level                                                                |
| ------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| R41-T01 | Fabricated citation rejected                  | Local regression plus actual environment evidence where the scope requires it |
| R41-T02 | Unsupported factual block downgraded/rejected | Local regression plus actual environment evidence where the scope requires it |
| R41-T03 | Limited coverage labeled                      | Local regression plus actual environment evidence where the scope requires it |
| R41-T04 | Model outage retains source cards             | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R41` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R41_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r42"></a>

## R42 — Implement evaluation before enabling answers

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-239.

**Readiness / dependencies:** R32/R33 evaluation schema.

**Goal and user outcome:** Implement evaluation before enabling answers. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R42_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Build deterministic fixture runs and bounded approved model evaluations; report retrieval ranking separately from groundedness/citations, privacy/deletion, latency and actual cost. Version cases/config/baseline; preserve holdout failures.

**Acceptance, validation and failure assertions:** Harness detects intentionally bad citations, missing relevant items, restricted leakage and false answers; no existence-only tests counted; repeatable comparison artifacts.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Versioned gold fixtures -> deterministic pipeline/model evaluation -> release regression signal
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                     | Check before continuing            |
| ---- | ---------------------------------------------------------- | ---------------------------------- |
| 1    | Implement R33 case schema and fixture loader               | Reject malformed expected evidence |
| 2    | Run deterministic retrieval tests without real credentials | Reproducible baseline              |
| 3    | Score retrieval separately from answer citations/grounding | Failure location visible           |
| 4    | Add deliberate bad answer/index mutations                  | Harness catches real regressions   |
| 5    | Run permitted bounded model eval and human sample          | Judge model is secondary signal    |
| 6    | Emit machine-readable and human-readable reports           | Config/version/usage attached      |
| 7    | Wire approved critical-regression thresholds into checks   | No flaky existence-only gate       |

### Testing and expected results

| Case    | Assertion that must hold                                        | Evidence level                                                                |
| ------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R42-T01 | Unknown citation must fail evaluator                            | Local regression plus actual environment evidence where the scope requires it |
| R42-T02 | Missing relevant item lowers recall                             | Local regression plus actual environment evidence where the scope requires it |
| R42-T03 | Privacy leak is critical failure                                | Local regression plus actual environment evidence where the scope requires it |
| R42-T04 | Identical fixture/config rerun reproducible where deterministic | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R42` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R42_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r43"></a>

## R43 — Implement accessible conversational evidence UI

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-238.

**Readiness / dependencies:** R40/R41/R42/R33 UI/API contract.

**Goal and user outcome:** Implement accessible conversational evidence UI. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R43_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Build approved Ask surface: query/filters/privacy, loading/empty/error and four answer states, source/citation inspection and follow-ups. Retrieve fresh each turn; history resolves references only. Preserve input on failure and keyboard/screen-reader access.

**Acceptance, validation and failure assertions:** User can inspect exact evidence/limitations/conflicts; stale session/network/double submit/navigation scenarios covered; previous assistant answers never used as evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Ask form -> query API -> answer states -> exact citation inspector
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                  | Check before continuing           |
| ---- | ----------------------------------------------------------------------- | --------------------------------- |
| 1    | Build approved UI states using existing app/router/API patterns         | No second auth mechanism          |
| 2    | Submit query/filters/privacy and preserve draft                         | Loading and retry accessible      |
| 3    | Render all answer states and limitation labels                          | Empty is not success              |
| 4    | Render each source/citation link to exact evidence                      | Wrong source cannot silently open |
| 5    | Follow-up uses current retrieval and existing conversation contract     | Old answer not evidence           |
| 6    | Test keyboard/focus/screen-reader, double-submit, expiry and navigation | No lost input or duplicate action |

### Testing and expected results

| Case    | Assertion that must hold                                      | Evidence level                                                                |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R43-T01 | Insufficient evidence cannot display confident answer styling | Local regression plus actual environment evidence where the scope requires it |
| R43-T02 | Expired session preserves query                               | Local regression plus actual environment evidence where the scope requires it |
| R43-T03 | Citation opens exact span/item                                | Local regression plus actual environment evidence where the scope requires it |
| R43-T04 | Follow-up after deletion excludes old source                  | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R43` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R43_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r44"></a>

## R44 — Implement approved private local RAG worker

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-241.

**Readiness / dependencies:** R33/R34/R37; R51/R52 runnable V1 local worker verified.

**Goal and user outcome:** Implement approved private local RAG worker. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R44_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Implement approved local embeddings/answers/index using scoped leases, heartbeat, bounded one-job concurrency, output validation and safe shutdown. No cloud localhost calls. Verify Mac-off, model unavailable, low memory, partial index, lease loss, stale result and local quota/outage behavior. Use encrypted transport, parallel private index migration and same item/chunk citation model; hosted-to-local fallback requires the approved privacy policy, never local-to-hosted leakage.

**Acceptance, validation and failure assertions:** Restricted bytes never leave approved boundary; Mac-off yields pending/lexical-only state; no hosted fallback; recovery preserves operation identity and provenance.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
V1 local worker -> private chunks/index -> local retrieval/answer -> shared citations
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                             | Check before continuing                 |
| ---- | ------------------------------------------------------------------ | --------------------------------------- |
| 1    | Reuse R51 worker lifecycle and scoped transport                    | No second worker architecture           |
| 2    | Implement R33 local embedding/index contracts                      | Restricted vectors stay approved local  |
| 3    | Use same version/chunk/citation IDs as hosted path                 | Evidence model consistent               |
| 4    | Build parallel local index on model change                         | Old index retained until validated      |
| 5    | Exercise low-memory/model-unavailable/partial-index/offline states | Clear pending/private-unavailable state |
| 6    | Verify encrypted transport and no prompt logging                   | No hosted fallback for restricted input |

### Testing and expected results

| Case    | Assertion that must hold                         | Evidence level                                                                |
| ------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| R44-T01 | Mac off never sends restricted prompt externally | Local regression plus actual environment evidence where the scope requires it |
| R44-T02 | Local citations resolve same source spans        | Local regression plus actual environment evidence where the scope requires it |
| R44-T03 | Interrupted lease cannot commit stale result     | Local regression plus actual environment evidence where the scope requires it |
| R44-T04 | Model migration preserves recoverability         | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R44` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R44_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r45"></a>

## R45 — Complete RAG quota, cache and operational controls

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-242.

**Readiness / dependencies:** R37/R40/R41/R44; R33 numeric budgets.

**Goal and user outcome:** Complete RAG quota, cache and operational controls. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/OPERATIONS_RUNBOOK.md`.

**Output / allowed evidence file:** `docs/verification/R45_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse capacity/operations patterns with separate embedding/vector/rerank/generation accounting; cache only complete version/policy/filter/model identity. Enforce bounded lifetimes and invalidation, redacted traces, safe degraded states and kill switches. Include the required protected admin view for index freshness, embedding backlog, quota status, quality feedback and failed RAG jobs.

**Acceptance, validation and failure assertions:** Concurrent admission cannot overspend; stale/private results cannot hit cache; provider outage preserves lexical/evidence-only; operators can diagnose without prompt/content logs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
RAG operations -> capacity/cache/circuit state -> admin diagnosis
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                          | Check before continuing                                |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Use existing capacity framework with separate operation budgets | Generation cannot consume embedding allowance silently |
| 2    | Create exact version/policy/filter/model cache key              | Current authority still checked                        |
| 3    | Implement bounded cache expiry/invalidation and safe fallback   | No stale private answer                                |
| 4    | Record stage timings/usage/source IDs/errors without content    | Safe audit trail                                       |
| 5    | Add protected index/backlog/quota/feedback/failure view         | Actual unavailable metrics labeled                     |
| 6    | Exercise concurrent admission and circuit recovery              | No double-spend or retry storm                         |

### Testing and expected results

| Case    | Assertion that must hold                     | Evidence level                                                                |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| R45-T01 | Quota races never exceed approved admission  | Local regression plus actual environment evidence where the scope requires it |
| R45-T02 | Source restriction invalidates cached answer | Local regression plus actual environment evidence where the scope requires it |
| R45-T03 | Half-open probes bounded                     | Local regression plus actual environment evidence where the scope requires it |
| R45-T04 | Admin dashboard leaks no source text         | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R45` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R45_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r46"></a>

## R46 — Run independent V1.5 acceptance

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent coverage:** OPE-243.

**Readiness / dependencies:** R34–R45; approved live/device/model packet.

**Goal and user outcome:** Run independent V1.5 acceptance. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R46_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Run gold/holdout and real user recall with exact/paraphrase/comparison/synthesis/timeline/follow-up, duplicate/conflict/stale/limited coverage. Exercise edits/deletes/privacy, vector/generation/local outages, restart and actual cost. Human samples citation support.

**Acceptance, validation and failure assertions:** All approved metrics and zero-cost/privacy/deletion guarantees pass; no critical unsupported-claim defect; reproducible evidence tied to model/prompt/index/source.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Implemented RAG + frozen gold/holdout -> real acceptance -> V1.5 dossier
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                          | Check before continuing         |
| ---- | --------------------------------------------------------------- | ------------------------------- |
| 1    | Freeze source/model/prompt/index/config and approved live scope | Comparable run identity         |
| 2    | Run gold/holdout and report metrics separately                  | No selective case removal       |
| 3    | Run real exact/paraphrase/comparison/timeline/follow-up stories | User usefulness compared to FTS |
| 4    | Change/delete/restrict sources and interrupt providers/Mac      | Safety/fallback paths evidenced |
| 5    | Human-inspect citation support and misleading claims            | Automatic score insufficient    |
| 6    | Reconcile actual usage/cost and remaining defects               | No launch with critical gap     |

### Testing and expected results

| Case    | Assertion that must hold                                                                                                    | Evidence level                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| R46-T01 | Recall@5 >=85%, citation precision >=95%, coverage >=90%, insufficient accuracy >=90% unless explicitly superseded contract | Local regression plus actual environment evidence where the scope requires it |
| R46-T02 | No critical privacy/deletion/paid-use defect                                                                                | Local regression plus actual environment evidence where the scope requires it |
| R46-T03 | Outage keeps permitted evidence usable                                                                                      | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R46` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R46_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r47"></a>

## R47 — Record owner V1.5 go/no-go

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent coverage:** OPE-243.

**Readiness / dependencies:** R46.

**Goal and user outcome:** Record owner V1.5 go/no-go. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R47_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Present retrieval and answer quality separately, actual costs, privacy/recovery, usefulness and known limits. Owner decides exact candidate. Preserve NO-GO with resolving packets when any required gate remains.

**Acceptance, validation and failure assertions:** Explicit dated V1.5 decision; no automatic expansion authorization.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
V1.5 dossier -> actual owner decision -> retained release configuration
```

**Owning integration references to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING_AND_ACCEPTANCE.md`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                       | Check before continuing               |
| ---- | ------------------------------------------------------------ | ------------------------------------- |
| 1    | Present exact configuration and acceptance metrics           | Retrieval and answer quality separate |
| 2    | Explain usefulness, latency, privacy and actual cost         | No score hides critical failure       |
| 3    | Obtain dated GO/NO-GO for candidate                          | No inferred approval                  |
| 4    | Retain reproducible release config and unresolved packet IDs | Future rerun possible                 |
| 5    | Update trackers within authorization                         | V2 remains separately gated           |

### Testing and expected results

| Case    | Assertion that must hold                                    | Evidence level                                                              |
| ------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| R47-T01 | Missing owner decision keeps launch open                    | Actual device/operator observation required; local test is supporting proof |
| R47-T02 | Critical citation/privacy defect prevents recommendation GO | Actual device/operator observation required; local test is supporting proof |
| R47-T03 | Decision does not authorize V2                              | Actual device/operator observation required; local test is supporting proof |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npm run contracts:check
npm run typecheck
```

RAG runtime/tests do not exist merely because these baseline commands pass. R33 must name the exact new test files. Implement the case assertions above using the detected Vitest Node/D1/Web conventions, and register new test locations in the actual package/CI configuration if discovery does not include them. R42 adds independent gold/holdout evaluation.

### Failure handling and completion handoff

If any assertion fails, record `R47` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R47_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r48"></a>

## R48 — Evaluate V2 candidates individually from demand

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-244.

**Readiness / dependencies:** R47 GO; measured demand.

**Goal and user outcome:** Evaluate V2 candidates individually from demand. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R48_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** For each existing candidate (browser, context/calendar, multimodal/transcription, secondary client), show demand, smallest usable scope, maintenance/privacy/cost and alternatives. Owner includes/defers/rejects each independently; architect creates exact contracts only for included candidates.

**Acceptance, validation and failure assertions:** Every candidate has explicit disposition; no bundled approval, speculative build, background scraping or new account access.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Measured post-V1.5 demand -> separate candidate options -> scoped expansion
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                     | Check before continuing                            |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| 1    | Enumerate existing V2 candidates individually                              | No bundled browser/calendar/transcription approval |
| 2    | Attach actual demand and simpler alternatives                              | Speculative idea stays deferred                    |
| 3    | Estimate privacy/hardware/cost/maintenance obligations                     | Real operating model                               |
| 4    | Present independent include/defer/reject choice per candidate              | One answer cannot imply another                    |
| 5    | For included candidate produce exact PRD/contracts/acceptance before build | New junior ticket fully specified                  |

### Testing and expected results

| Case    | Assertion that must hold                       | Evidence level                                                    |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| R48-T01 | No demand means no automatic build             | Contract review now; implementation regression after prerequisite |
| R48-T02 | One approved candidate leaves others unchanged | Contract review now; implementation regression after prerequisite |
| R48-T03 | External account access separately scoped      | Contract review now; implementation regression after prerequisite |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R48` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R48_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r49"></a>

## R49 — Evaluate V3 and public productization separately

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent coverage:** OPE-245.

**Readiness / dependencies:** R47; at least 1000 useful captures and stable retention/value evidence.

**Goal and user outcome:** Evaluate V3 and public productization separately. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R49_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Assess evidence relationships, project briefings and proactive/spaced recall from measured use. Treat multi-user/public product as separate PRD covering tenancy/security/deletion/billing/support and legal inputs. Preserve independent candidate decisions.

**Acceptance, validation and failure assertions:** Personal expansion decisions and public-product decision separate; no V3 implementation until exact approved contracts; no implicit SaaS scope.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

### How this connects to the system

```text
Mature personal value -> active knowledge / public product decisions
```

**Owning integration references to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/tickets/REMAINING_WORK_COVERAGE.csv`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                | Check before continuing                         |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | Verify 1000 useful captures and accepted V1.5/approved V2 evidence    | Maturity gate real                              |
| 2    | Assess each relationships/briefings/resurfacing idea from usage       | No automatic feature bundle                     |
| 3    | Separate personal expansion from public SaaS decision                 | Different trust boundaries                      |
| 4    | Validate external demand before public-product PRD                    | No assumed customers                            |
| 5    | Require tenancy/auth/retention/billing/legal/support/migration design | Personal bearer-token design not reused blindly |
| 6    | Record each owner disposition and next prerequisite                   | No code by implication                          |

### Testing and expected results

| Case    | Assertion that must hold                           | Evidence level                                                    |
| ------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| R49-T01 | Under threshold remains conditional                | Contract review now; implementation regression after prerequisite |
| R49-T02 | Personal feature approval cannot authorize SaaS    | Contract review now; implementation regression after prerequisite |
| R49-T03 | Missing tenant/security design blocks public build | Contract review now; implementation regression after prerequisite |

**Validation method:** inspect each required artifact and evidence row against the assertions above; verify referenced dates, identities, counts and parent states. Do not run unrelated application tests to manufacture evidence for a documentary or owner-decision gate.

### Failure handling and completion handoff

If any assertion fails, record `R49` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R49_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r50"></a>

## R50 — Freeze the V1 local-processing client contract

### Requirement, prerequisites and scope

**Responsible role:** Architect prepares; engineer implements only after contract signoff.

**Parent:** OPE-246/OPE-247/OPE-229. **Readiness:** READY for architect work. Owner explicitly requires runnable local AI in V1 on November 10. R17 client inventory and the existing worker API are inputs; RAG is not a prerequisite.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API.md`, `docs/tickets/OPE-246.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/repo_context.md`. Discover current lease/content/result/heartbeat routes with the graph, verify source at the working SHA, and attach exact owning files and tests to the implementation handoff. The existing graph is not trusted as a fresh runtime contract.

**Allowed output:** new `docs/tickets/V1_LOCAL_WORKER_CONTRACT.md` and a scoped current-context addendum. No runtime modification in this packet.

**Work:** specify the runnable Mac entry point, existing Node/toolchain reuse, explicit start/stop, scoped credential storage, permitted-content fetch, Ollama text model invocation, schema/provenance validation and result submission. Freeze one-job concurrency, exact lease/heartbeat/timeouts, request/response/error shapes, retry ownership, output limits, redaction and shutdown behavior from actual server contracts. Select an installed compatible model after bounded local capability inspection; ask only for unavailable hardware/model input or a new download/resource commitment. Keep embeddings/vector/RAG out of this V1 client. Do not permit hosted fallback for restricted content. Include exact new/existing source/test paths and a complete builder packet before R51 starts.

**Acceptance:** no missing route, field, model capability, numeric bound or credential handling decision; server lease duration and client timeout/heartbeat are compatible; a model failure leaves canonical capture untouched. Owner's V1 applicability decision is not asked again. Any actual API incompatibility is returned to the architect with a minimal contract change proposal before coding.

### How this connects to the system

```text
Existing worker API + actual Mac capabilities -> exact local-client integration contract
```

**Owning integration references to inspect:** `apps/worker-api/src/jobs/job.routes.ts`, `apps/worker-api/src/jobs/job.schema.ts`, `apps/worker-api/src/jobs/job.service.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                                              | Check before continuing                       |
| ---- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| 1    | Read current job routes/schema/service and actual tests                             | Ignore stale graph line ranges                |
| 2    | Trace lease response to the required input content                                  | Prove a scoped authorized content path exists |
| 3    | Trace result receipt to item-derived-field materialization and FTS refresh          | Job complete alone is insufficient            |
| 4    | Specify missing server contract work explicitly if either connection is absent      | Junior never borrows admin credentials        |
| 5    | Freeze local model, output schema and numeric lifecycle budgets using server limits | One-job concurrency                           |
| 6    | Specify exact client/server/test file changes and safe secret storage               | Complete R51 build handoff                    |
| 7    | Review privacy, owner override and generation guards end to end                     | No unresolved integration decision            |

### Testing and expected results

| Case    | Assertion that must hold                                                | Evidence level                                                    |
| ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| R50-T01 | Leased job must supply or authorize only its allowed content            | Contract review now; implementation regression after prerequisite |
| R50-T02 | Result must update intended item fields/index, not only job_result JSON | Contract review now; implementation regression after prerequisite |
| R50-T03 | Model missing fails before lease                                        | Contract review now; implementation regression after prerequisite |
| R50-T04 | Restricted data cannot reach external provider                          | Contract review now; implementation regression after prerequisite |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/job.service.test.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/job-and-sync.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R50` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R50_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r51"></a>

## R51 — Implement the runnable V1 Mac worker

### Requirement, prerequisites and scope

**Responsible role:** Engineer; live operations require the named operator scope.

**Parent:** OPE-246/OPE-229. **Readiness:** BLOCKED_DEPENDENCY on R50 exact contract and approved model/access. **Inputs:** `docs/tickets/V1_LOCAL_WORKER_CONTRACT.md` (future R50 output), `docs/AI_AND_RAG_SPEC.md`, plus R50's verified source/test handoff.

**Allowed files:** exact source/tests named by R50; `docs/verification/R51_RESULT.md` and the local-worker runbook named there. Do not change schema, server authorization or add an unapproved provider.

**Work:** implement explicit startup configuration validation, single-job lease loop, scoped permitted-content read, local inference, strict result validation and provenance, heartbeat, bounded failure/release and graceful stop. Reuse server job ownership/generation rules. Protect credential storage; never log prompts or original content. Startup with missing credentials/model must fail clearly before leasing. Run deterministic adapter/server tests before a real local inference.

**Acceptance/tests:** no eligible job is harmless idle; duplicate/stale result is rejected; malformed model output cannot overwrite fields; timeout/lease loss prevents late commit; shutdown releases only owned work; Mac-off leaves work pending; no external model request for restricted fixture; canonical raw record and owner edits survive every failure. Relevant Vitest/Node tests and existing job regressions pass. Record actual executable command and installation steps, not just endpoints or pseudocode.

### How this connects to the system

```text
Scoped lease -> permitted input -> local Ollama -> validated result -> visible item
```

**Owning integration references to inspect:** `apps/worker-api/src/jobs/job.routes.ts`, `apps/worker-api/src/jobs/job.schema.ts`, `apps/worker-api/src/jobs/job.service.ts`. These are existing references, not blanket permission to edit them.

**Implementation handoff required:** use the exact source/test path list, frozen request/response/data/UI contracts and numeric limits supplied by this chapter’s architect prerequisite. No frontend/backend/schema/provider decisions are delegated to the junior. If the named future contract is absent, do not start implementation. Add or change only its named files plus this chapter’s result/runbook updates.

### Step-by-step procedure

| Step | Action                                                                     | Check before continuing               |
| ---- | -------------------------------------------------------------------------- | ------------------------------------- |
| 1    | Implement configuration validation and explicit start/stop from R50        | Never lease on invalid config/model   |
| 2    | Implement one-job lease and scoped content retrieval                       | No admin token or arbitrary item read |
| 3    | Start heartbeat before inference and enforce bounded timeout               | Lease loss aborts work                |
| 4    | Validate structured output/provenance and preserve submission identity     | Repeated submission safely replayed   |
| 5    | Submit via approved materialization contract and verify item/search effect | Result JSON storage alone not done    |
| 6    | Implement failure/release/shutdown and safe diagnostics                    | Only owned job affected               |
| 7    | Run isolated integration and real local inference                          | Actual runnable command documented    |

### Testing and expected results

| Case    | Assertion that must hold                          | Evidence level                                                                |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| R51-T01 | No job yields harmless idle                       | Local regression plus actual environment evidence where the scope requires it |
| R51-T02 | Wrong owner/expired lease cannot commit           | Local regression plus actual environment evidence where the scope requires it |
| R51-T03 | Malformed output leaves owner fields intact       | Local regression plus actual environment evidence where the scope requires it |
| R51-T04 | Timeout/restart cannot duplicate result           | Local regression plus actual environment evidence where the scope requires it |
| R51-T05 | A user sees valid derived result in detail/search | Local regression plus actual environment evidence where the scope requires it |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/job.service.test.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/job-and-sync.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R51` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R51_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

<a id="r52"></a>

## R52 — Verify local AI on the actual Mac and join V1 acceptance

### Requirement, prerequisites and scope

**Responsible role:** Engineer with operator/owner participation for actual observation or decision.

**Parent:** OPE-246/OPE-247/OPE-229. **Readiness:** BLOCKED_DEPENDENCY on R51, recoverability and approved target/scoped worker access. **Inputs:** R50 contract, R51 runbook/result, `docs/TESTING_AND_ACCEPTANCE.md`. **Allowed output:** `docs/verification/R52_RESULT.md` and affected runbook corrections.

**Work:** agent prepares synthetic private text and expected grounded fields. Run the client on the intended Mac; inspect actual permitted job, local provider/model provenance and validated result. Stop/restart worker, make Ollama unavailable, exhaust configured local resources safely, interrupt heartbeat/lease and revoke a dedicated test credential under approved scope. Verify no restricted source enters external model requests or logs. Use an isolated test target for disruptive scenarios; do not revoke the owner's working credential.

**Acceptance:** real local inference works; private source never reaches hosted AI; startup/shutdown/restart and Mac-off behavior are truthful; stale results cannot overwrite newer state; operator can run and diagnose the client from the runbook. R25 and R27 require this evidence. R44 later extends this existing client for RAG instead of treating local processing as a new foundation.

### How this connects to the system

```text
Actual Mac process -> approved job -> local output -> V1 device/ops proof
```

**Owning integration references to inspect:** `apps/worker-api/src/jobs/job.routes.ts`, `apps/worker-api/src/jobs/job.schema.ts`, `apps/worker-api/src/jobs/job.service.ts`. These are existing references, not blanket permission to edit them.

**Allowed change boundary:** result/evidence and the named current instructions only. This verification/design chapter does not authorize an application rewrite. A demonstrated runtime defect gets a separate bounded repair under the same parent, with exact source paths and regression assertions supplied by the architect.

### Step-by-step procedure

| Step | Action                                                              | Check before continuing                 |
| ---- | ------------------------------------------------------------------- | --------------------------------------- |
| 1    | Prepare synthetic private source and expected derived result        | No real sensitive test content required |
| 2    | Install/configure private scoped token and selected model           | Secrets outside artifacts               |
| 3    | Run executable and inspect actual local model/job/result provenance | Not mock-only success                   |
| 4    | Stop/restart Mac client and Ollama; interrupt heartbeat             | Clear pending/failure/recovery          |
| 5    | Use approved dedicated test credential revocation                   | Owner access untouched                  |
| 6    | Inspect forbidden outbound boundaries and safe logs                 | No restricted text sent/logged          |
| 7    | Run from documented instructions without hidden setup               | R25/R27 receive final proof             |

### Testing and expected results

| Case    | Assertion that must hold                           | Evidence level                                                              |
| ------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| R52-T01 | Mac unavailable leaves pending/private-unavailable | Actual device/operator observation required; local test is supporting proof |
| R52-T02 | Expired lease refuses late result                  | Actual device/operator observation required; local test is supporting proof |
| R52-T03 | Local model output materializes correctly          | Actual device/operator observation required; local test is supporting proof |
| R52-T04 | Operator can recover using runbook alone           | Actual device/operator observation required; local test is supporting proof |

**Existing supporting checks** (run in disposable local environment; these do not substitute for live/device acceptance):

```bash
npx vitest run --config vitest.node.config.ts apps/worker-api/test/job.service.test.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/job-and-sync.d1.spec.ts
```

### Failure handling and completion handoff

If any assertion fails, record `R52` and the failed case ID, preserve safe diagnostics and stop dependent operations. Retain the last valid data/artifact and continue independent preparation. Never loosen privacy/cost/auth rules, delete evidence, or rerun a destructive operation to make the row green.

Before handing off:

- [ ] Every chapter requirement and test assertion has a result, including failures and conditional applicability.
- [ ] Actual output is usable by the next dependency; proposed files are not claimed as implemented.
- [ ] Record source/runtime/device/model identity as applicable, and distinguish observed, owner-reported and historical proof.
- [ ] Update `docs/verification/R52_RESULT.md` and the named runbook/contract when execution occurs; keep private originals and credentials outside Git.
- [ ] Reviewer confirms acceptance, relevant tests and scoped diff; parent receives one current evidence link.
- [ ] No dependent implementation starts on an unresolved required contract; no live release is inferred from documentation or CI.

## Appendix A — Current local-worker wire contract and the missing connections

Inspected owning source: `apps/worker-api/src/jobs/job.routes.ts`, `job.schema.ts`, `job.service.ts`. These are existing endpoints, not a complete local AI product.

All endpoints below are under `/api/v1`, use POST and `requireLocalWorkerToken`. Successful JSON is `{data, meta:{request_id}}`; errors follow the existing safe error envelope. Invalid JSON is 400 `INVALID_JSON`; schema violations are 422 `VALIDATION_ERROR`. Authentication follows the existing scoped guard; do not introduce a client-side bypass.

| Route                        | Required/request fields                                                                                                  | Observed response/constraint                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `/worker/jobs/lease`         | `job_type` string 1–80; `owner_id` string 8–128; `ttl_minutes` integer 1–60 default 10; `limit` integer 1–100 default 10 | `data.jobs`; V1 client explicitly requests `limit:1`; server defaults are not client concurrency policy                 |
| `/worker/jobs/:id/heartbeat` | `owner_id`; optional `ttl_minutes` 1–60                                                                                  | `data:{job_id,heartbeat:"accepted"}`; 409 `JOB_NOT_LEASABLE` on missing/expired/wrong-owner lease                       |
| `/worker/jobs/:id/release`   | `owner_id`; same owned-action schema                                                                                     | `data:{job_id,status:"pending"}`; 409 if lease not releasable                                                           |
| `/worker/jobs/:id/fail`      | `owner_id`, uppercase `error_code` 3–80, `retryable`; optional `retry_after_seconds` 1–86400 only when retryable         | retry status response; service owns retry/max-attempt decisions; inspect actual resulting job, not response label alone |
| `/worker/jobs/:id/result`    | `owner_id`, UUID `submission_id`, `input_hash` string 8–128, `result_version` string 1–80, `result` object               | `data:{job_id,status:"complete",replayed}`; 409 `VERSION_CONFLICT` for rejected submission                              |

Result JSON is capped at 64 KiB and rejects credential-like keys recursively. Exact same job/submission/input/version/result supports replay subject to current-item/generation rules. Persist the submission UUID and exact serialized result across retry; creating a new UUID after an ambiguous response changes the operation identity.

The inspected generic result handler inserts `processing_job_results`, completes the processing job and audits acceptance. That is not evidence that it materializes enrichment fields or updates FTS. The inspected job router also does not provide a job-scoped input-content GET route. R50 must trace any existing alternate path and either reuse it with exact proof or specify the missing secure server integration before R51 begins. The junior must not substitute an admin token, arbitrary item GET, direct production SQL, or a client-only “complete” flag.

R50's finished handoff must include a sequence diagram covering current privacy/generation checks at input read and result commit, owner override preservation, actual materialization and index refresh. Include one end-to-end test where a private synthetic note receives local enrichment visible in Web detail/search, plus a restriction/delete/lease-loss race where late output is rejected.

## Appendix B — Future-contract intake checklist

This applies to R17, R33 and R50 outputs. The architect, not the junior, fills these fields before a build packet becomes READY:

1. Exact input/output types, names, required/optional fields, defaults and validation/error messages.
2. Exact route/method/auth/envelope/status code, or exact Shortcut action interface / local process command.
3. Every storage field/key/index/uniqueness/lifecycle and migration compatibility rule.
4. Numeric limits with units: sizes, batch/concurrency, deadlines, retries, lease/heartbeat, retention and cache boundaries.
5. Producer/consumer and caller map, including raw capture, derived fields, FTS, privacy/deletion and failure propagation.
6. Exact existing and proposed files, allowed edits, exported interfaces and no-change boundaries.
7. Loading/empty/success/error/partial/retry states for each user-visible path, including accessibility and retained input.
8. Concrete fixture input -> observable assertion for success, validation, auth, race, retry, partial failure and recovery.
9. Targeted command/test path, integration proof and relevant final CI checks.
10. Stop/recovery plan and owner-only decisions already answered or explicitly blocked.

Any missing required entry means BLOCKED_CONTRACT. The architect completes it from current source and accepted requirements. Do not send the junior to read the whole repository and invent the answer. Later RAG vendor/model/runtime choices remain conditional on the accepted entry gate; this handbook does not fabricate those approvals.

## Appendix C — Final reviewer checklist

Ask the engineer to demonstrate the actual user outcome with a synthetic fixture. Follow it across every system boundary. Inspect the test that would fail if the bug returned. Check error and retry behavior, data/permission boundaries, current-version guards and cleanup. Confirm documentation explains the final behavior and the next ticket receives complete inputs. Approve completion only at the evidence level actually achieved: source implementation, local verification, deployed behavior, physical-device acceptance and owner release decision are separate.
