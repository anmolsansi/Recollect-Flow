# BG-29.078 — sequenced microcommit ledger

**Status:** Preparation only. Work in this file is **planned**, except the
documentation bootstrap commits. No staged or production Cloudflare
resources are authorized by this ledger.

**Related:** [Branch and safety gates](BG-29_078_IMPLEMENTATION_BRANCH.md),
[frozen AC-01..AC-17](BG-29_078_ACCEPTANCE_CONTRACT.md),
[GitHub #99](https://github.com/anmolsansi/Recollect-Flow/issues/99),
[Linear OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance).

## Microcommit contract

- Commit one scoped capability or review artifact at a time.
- Before committing, run its stated focused test; after the commit,
  run existing relevant checks and validate the diff contains no
  production config/secrets.
- Keep every commit independently reviewable and do not leave known
  regressions to be fixed in later unrelated commits.
- New tests and scripts named below are **proposed files**; they do not
  exist yet unless a later commit explicitly creates them.
- Record the exact SHA and CI URL for each executed microcommit.
- The owner’s guaranteed $0 policy overrides proposed hosted stages;
  never interpret a plan item as authorization.

## Step 0 — Git branching and planning (current task)

**MC-00A:** Add the implementation scope/safety-gate document.
Verification: compare branch start SHA with current `main` baseline;
review the file for no remote commands or production edits.

**MC-00B:** Add this stepwise ledger with atomic diff, test and gates.
Verification: inspect the two documentation-only commit diffs and the
draft PR base/head; confirm neither commit alters runtime/config.

**Gate:** Branch and draft PR exist, link GitHub #99 / Linear OPE-344,
remain unmerged, and are suitable for follow-on microcommits.

## Step 1 — Preserve the real scheduler with injected test hooks

**MC-01:** Isolate scheduled background stage launch dependencies,
retaining the existing parallel `context.waitUntil` behavior and
production default implementations.

**Verification (planned):** Unit tests for stage dispatch and
production/staging parity; deny accidental execution of daily/weekly
digest routes in a background-only acceptance run.

**Gate:** Existing scheduled handler tests and new dispatch tests pass.

## Step 2 — Fail-closed external boundaries

**MC-02:** Staging-only outbound deny guard and deterministic URL fetch
adapter. Preserve real `SourceAcquisitionService` parsing/evidence.

**Verification (planned):** URL acquisition service tests prove
12 valid responses, retryable failure recovery and zero real egress.

**MC-03:** Inject an HTTP transport into `processNotionSyncJobs`
without changing the projection/idempotency business logic.

**Verification (planned):** Mock Notion create/update and 429
retry-after tests, plus a test that any live Notion URL is blocked.

**MC-04:** Configure actual `EnrichService` with the already
available mock AI adapter; assert no external AI binding/token.

**Verification (planned):** Enrichment job/result parity tests for
all 24 items and a negative outbound-call test.

**Gate:** Mock URL/AI/Notion paths use actual production services but
zero network access or real provider credentials.

## Step 3 — Genuine PDF extraction, locally

**MC-05:** Generate 12 small deterministic, valid PDFs with
manifested SHA-256 and known extracted-text sentinel strings.

**Verification (planned):** PDF signature/parser and integrity tests,
including a wrong-hash negative test.

**MC-06:** Use only local R2 emulation for the actual
`ExtractionService` read, SHA check and `PdfExtractor` path.

**Verification (planned):** D1/Miniflare integration test proves
12 nonempty `extraction_records`, no injected bypass and
no Cloudflare R2 network operations.

**Gate:** Real file processing is exercised locally without hosted
R2 usage; no file source is lost or replaced.

## Step 4 — Repeat-safe queue setup

**MC-07:** Add an idempotent seeder for 12 URLs and 12 PDF files with
stable job IDs, attachment IDs and original source fingerprints.

**Verification (planned):** Running the local seeder twice leaves
exactly 24 unique originals, no duplicate jobs and matching hashes.

**Gate:** Manifest and local D1 counts reconcile before first sweep.

## Step 5 — Real-stage metrics and recovery

**MC-08:** Record per-stage timestamps, queued/processing/retry/
failed counts, oldest eligible age and actual source/derived IDs.

**Verification (planned):** Telemetry integration test validates
start, intermediate and terminal snapshots without fabricated data.

**MC-09:** Add bounded failure injection for transient URL error,
mock Notion 429 and stale lease through existing job policies.

**Verification (planned):** Recovery tests assert actual attempt
transitions, retry-after and no duplicate terminal projection.

**Gate:** Audit ledger can prove the actual queue handoffs and
bounded recovery without hiding terminal failures.

## Step 6 — Complete offline acceptance proof

**MC-10:** Create a full-pipeline local workerd integration suite
using actual queue workers with deterministic providers, D1 and
emulated R2; separately preserve the real-hour hosted scheduling
proof already obtained (do not simulate it as new evidence).

**Verification (planned):** 24-item end-to-end assertions,
no live egress, zero lost originals and all applicable queues drain.

**MC-11:** Extend the evidence bundle generator and checker for
the frozen 17 criteria. Keep its fail-closed signoff guard.

**Verification (planned):** Positive structural tests and
negative tests for missing R2 reads, missing Notion updates,
unverified real Cron timestamps and unverified $0 cost.

**MC-12:** Profile resource usage under the Workers Free scheduled
CPU bound, and run full exact-head CI.

**Verification (planned):** Relevant local benchmark and
existing focused/full CI pass; failure blocks hosted deployment.

**Gate:** No incomplete local tests, unsupported memory/CPU claims,
or remaining external-call paths.

## Step 7 — Owner-controlled financial and deployment review

**MC-13:** Document actual account-wide R2 free allowances,
remaining usage and bounded worst-case operations. Stage a reviewed
deployment config that binds _only_ isolated D1/R2 and starts
with `crons = []`; include explicit rollback and no-cost guards.

**Verification (planned):** Config-negative tests, Wrangler
`--dry-run`, source SHA/bindings review, owner’s dated billing
snapshot and a written **GO/NO-GO** decision.

**Gate:** Without an enforceable absolute $0 R2 cost ceiling or
separately approved financial-risk exception, **STOP HERE**.
Passing local tests cannot override the financial gate.

## Step 8 — Hosted multi-stage proof (only after separate approval)

**MC-14:** Provision a distinct staging R2 bucket, upload/verify
only 12 synthetic PDFs, seed 24 items and deploy staging Worker with
Cron disabled. Verify all bindings and mock network isolation.

**Verification (planned):** Hosted canary results plus explicit
staging names/IDs and initial D1/R2 integrity ledger.

**MC-15:** Activate only the dedicated `17 * * * *` UTC Cron and
observe real consecutive hourly events, up to ten, including stage
handoffs, retries and independently mocked Notion projections.

**Verification (planned):** Cloudflare event IDs/logs, Worker SHA,
complete per-sweep queue and oldest-age metrics, proof of 24/24
final outcomes and zero duplicate/lost originals.

**MC-16:** Remove Cron with explicit `crons = []`, independently
verify shutdown and final $0 usage, preserve authentic evidence,
complete AC-01..AC-17 review and exact-head CI.

**Verification (planned):** Cloudflare trigger state, billing
reconciliation, evidence export and signoff records.

**Gate:** Only on independent PASS of every frozen acceptance
criterion may GitHub #99 / Linear OPE-344 be closed and BG-30
unlocked. A financial or technical NO-GO keeps 99/100 open.

## Tracking fields (append per execution)

For each implementation microcommit, record:

- Microcommit ID / SHA / linked PR or CI URL.
- Files changed and exact test command.
- Observed pass/fail result and follow-up defect, if any.
- Whether local-only or hosted approval was separately granted.
- Which AC-01..AC-17 evidence items the change supports.
