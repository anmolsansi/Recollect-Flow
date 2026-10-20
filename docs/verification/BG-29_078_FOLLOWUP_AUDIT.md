# BG-29.078 follow-up: Step 3 code and evidence audit

**Status:** Static implementation audit **COMPLETE**. This is a review artifact, **not** hosted acceptance or a claim that the gaps are fixed.  
**Baseline:** `main` at `9ead8c8e8c7dcea54ee8cb86aaaf95c9e458d990` (merged PR #109).  
**Issue:** [GitHub #99](https://github.com/anmolsansi/Recollect-Flow/issues/99), [Linear OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance).  
**Contract:** [BG-29.078 AC-01..AC-17](BG-29_078_ACCEPTANCE_CONTRACT.md).  
**Methods:** Read the actual merged Worker entry/scheduler/worker services, staging transports, isolated Wrangler config, preflight, D1 tests and evidence checker; compare their behavior to the frozen contract. No Cloudflare account, hosted logs, remote D1/R2 or provider endpoints were accessed.

## 1. Source-to-stage map (current implementation)

| Stage                         | Actual implementation                                                                                                                                                                                                              | Merged local proof                                                                                             | Assessment                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dedicated staging entry       | `apps/worker-api/src/bg29-staging-entry.ts` exports `stagingFetch` (HTTP 404) and `stagingScheduled`; it constructs a new scheduler per invocation                                                                                 | `apps/worker-api/test/bg29-staging-entry.test.ts`                                                              | Entry isolation implemented; hosted entry not invoked                                    |
| Hourly dispatch               | `apps/worker-api/src/scheduled-handler.ts` accepts a full injected dependency set, uses independent `context.waitUntil` for eight background services; `apps/worker-api/src/bg29-staging-scheduler.ts` rejects non-background Cron | `apps/worker-api/test/bg29-staging-24-items.d1.spec.ts`                                                        | Real scheduled service dispatch locally, not elapsed Cloudflare hours                    |
| URL source acquisition        | `processSourceAcquisitionJobs` → real `SourceAcquisitionService` and `SourceFetcher` via strict 12-URL `createBg29StagingSourceFetcher` offline transport                                                                          | `apps/worker-api/test/bg29-staging-24-items.d1.spec.ts`, `apps/worker-api/test/bg29-staging-egress.d1.spec.ts` | Real parser/evidence path local; hosted retry proof missing                              |
| PDF extraction                | `processExtractionJobs` → `ExtractionService`/unpdf, with strict staged `bg29-078/` R2 object and attachment gates                                                                                                                 | `apps/worker-api/test/bg29-real-pdf.d1.spec.ts`, `apps/worker-api/test/bg29-staging-extraction.d1.spec.ts`     | 12 real local PDF bytes via emulated R2; no hosted R2 read                               |
| AI enrichment                 | `processEnrichJobs` → `EnrichService`, `AiProviderRegistry` and verified `MockAiAdapter` instances                                                                                                                                 | `apps/worker-api/test/bg29-staging-24-items.d1.spec.ts` and previously merged mock AI tests                    | Real service/worker with deterministic mock, not paid inference                          |
| Notion projection             | `processNotionSyncJobs` → `NotionSyncService` via injected tokenless `createBg29StagingNotionHarness` transport                                                                                                                    | `apps/worker-api/test/bg29-staging-egress.d1.spec.ts`, `apps/worker-api/test/bg29-staging-24-items.d1.spec.ts` | Real projection logic; mock's external page state is NOT durable across Cron invocations |
| Provider and config isolation | `assertBg29StagingBindings`, `wrangler.bg29-multistage-staging.toml`, `scripts/bg29-multistage-config-check.mjs`                                                                                                                   | Staging entry/egress tests, config-check tests and Wrangler offline dry-run from merged PR #109                | Safety controls locally tested; live bindings/account and billing not verified           |
| Evidence validator            | `scripts/bg29-hourly-evidence-check.mjs`; intentionally returns `bg29_078_verified: false`                                                                                                                                         | `scripts/bg29-hourly-evidence-check.test.mjs`                                                                  | Historic D1-only/structural checker; does not yet validate the frozen full contract      |

**Production isolation:** `apps/worker-api/src/index.ts` uses its own `createScheduledHandler` instance, preserving real production service bindings and dispatch; the staging entry and config are separate. The staging scheduler replaces cleanup/backup/purge with inert functions and denies digest/notification work, deliberately diverging only in safety-related services.

**Concurrency semantics:** All eight `waitUntil` calls begin independently. Source acquisition and PDF extraction are alternate input paths; Notion is **not** a forced fourth sequential stage. The acceptance harness must tolerate later enrichment and Notion re-projection rather than manufacturing serial handoffs.

## 2. Code-level gaps to fix in subsequent steps

### P0 — Cross-isolate mock Notion page state (roadmap Step 4)

- `createBg29StagingNotionHarness` allocates `new Map()` for pages and an in-memory request ledger.
- `stagingScheduled` constructs `createBg29StagingScheduler(env)` afresh for **every Cron invocation**.
- The existing 24-item D1 test constructs **one** scheduler outside its loop, preserving that Map across its logical sweeps. Thus it does not exercise the actual entry's per-invocation reset.
- After a mocked page is created, its page ID persists in D1 `items.notion_page_id`. A later Cron invocation's fresh mock Map has no matching page, while the fake `PATCH /v1/pages/:id` refuses pages absent from the Map. Independent projection update after a Cron boundary can therefore fail or retry indefinitely.
- **Required:** isolated durable mock page projection state and immutable/sanitized request ledger keyed by the same 24 fixture IDs, with cross-invocation/restart integration tests. Never send a real Notion request or require a live token.
- **Contract impact:** AC-08, AC-09, AC-11, AC-12, AC-15.

### P0 — Frozen failure scenarios are not enabled by the staging scheduler (roadmap Step 5)

- `createBg29StagingSourceFetcher` supports `failOnceFor`, but the scheduler calls it with **no options**; the required one retryable URL failure is therefore absent from the 24-item scheduled proof.
- `createBg29StagingNotionHarness` supports `rateLimitOnceFor`, but the scheduler also calls it with **no options**; its mock 429/Retry-After is absent from the scheduled 24-item proof.
- Both optional injected-failure flags are memory-scoped. Reconstructing the harness every Cron can repeat the intended _one-time_ failure unless failure state is durable.
- No integrated staged hourly stale-lease injection/transition evidence is recorded.
- **Required:** once-only D1-backed fixture failure control, existing retry/backoff/lease policies unchanged, and tests showing each failure recovers after re-instantiation with bounded attempts.
- **Contract impact:** AC-05, AC-08, AC-11, AC-15.

### P0 — No hosted sweep ledger or matching evidence schema (roadmap Steps 8 and 11)

- `bg29-staging-24-items.d1.spec.ts` constructs a local scheduler and invokes `scheduled()` manually with logical sweep counts. It logs `hosted: false` and `clock: 'logical-stage-sweeps-no-real-hour-claim'`.
- It counts aggregate pending/processing/failed rows but does not persist authentic Cloudflare event IDs, consecutive UTC Cron timestamps, oldest eligible queue age per job type, per-stage handoff duration, R2 source hash reconciliation by sweep, or hosted CPU/quota metrics.
- `scripts/bg29-hourly-evidence-check.mjs` expects `worker_name === 'recollect-flow-bg29-staging'`, but the merged dedicated config names `recollect-flow-bg29-multistage-staging`. Even legitimate future logs from this Worker would currently fail the validator.
- The historical checker also permits 24–48 originals while frozen AC-03 specifies **exactly 24**, and it checks only broad queue counters, not all AC-01..AC-17 full-stage evidence.
- **Required:** append-only, staging-only evidence ledger, strict per-sweep stage/lease/retry/original snapshots, checked matching Worker identity, exactly 24 fixtures, fail-closed validator, and independent original Cloudflare log authentication.
- **Contract impact:** AC-03..AC-17, especially AC-09, AC-10 and AC-15.

### P0 — Hosted seed/deploy/cost gate is not met (roadmap Steps 12–18)

- The 24-item `seedBg29TwentyFour` lives in `apps/worker-api/test/fixtures/` only; it is **not** wired to a deployable hosted seeding path. The local acceptance proves workerd + emulated R2, not remote staging initialization.
- The dedicated Wrangler config intentionally names an **uncreated** R2 bucket and explicitly has `[triggers] crons = []`. This is correct for the current no-deploy policy.
- Its current offline preflight intentionally requires that placeholder bucket and always returns `deploymentAuthorized: false`. Authorized hosted config, provisioning, and Cron activation must have a separate reviewed and explicit opt-in gate; simply editing the placeholder to a live bucket must **not** bypass preflight.
- `assertBg29StagingBindings` restricts binding names and object shapes but does not establish actual Cloudflare **account/bucket identity**; hosted resource identity must be independently documented.
- No account-wide R2 hard $0 stop, current billing authorization, hosted deployment, actual hourly multi-stage event logs or final additional-cost reconciliation has been provided.
- **Required:** finish all offline controls before requesting dated read-only account/billing verification and separate owner permission; until then **NO-GO** for hosted changes.
- **Contract impact:** AC-01, AC-02, AC-03, AC-04, AC-09, AC-13, AC-14, AC-16, AC-17.

### P2 — Stale documentation in staging entry

The `stagingScheduled` comment says a future stage must add real R2 extraction; real local R2 extraction is now integrated by PR #109. Revise wording in a subsequent focused documentation commit, **without** implying hosted proof.

## 3. Proof already established / not to repeat

- [PR #109](https://github.com/anmolsansi/Recollect-Flow/pull/109) was merged on `main` at `9ead8c8e8c7dcea54ee8cb86aaaf95c9e458d990`.
- Its source head `b5f307762d655abef731113680d6d21ed72c4c68` passed [full CI #39333669257](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39333669257) and [focused CI #39333669301](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39333669301). These are **prior-source, local** results, not current-branch runs or hosted proof.
- Current local fixture integration uses 12 URLs + 12 true PDFs, repeat-safe seed, actual URL parsing and PDF extraction, mock AI and Notion via real service code, and a global-fetch negative assertion.
- Previous separate hosted D1-only hourly probe finished, was disabled, and owner confirmed no additional charge; its D1-only proof does **not** cover real PDF/R2, AI and Notion paths and must not be rerun.

## 4. Frozen AC gate mapping at this checkpoint

| Criterion                                      | Current assessment                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AC-01 (isolated hosted target)                 | Local config verified; hosted Worker/R2 identity **BLOCKED**                             |
| AC-02 (account-wide $0 R2 authorization)       | **BLOCKED**, no enforceable absolute $0 bound or separate approval                       |
| AC-03–04 (24 real hosted originals/R2 hashes)  | Local proof only; hosted **BLOCKED**                                                     |
| AC-05–08 (URL, PDF, AI, Notion)                | Local services partially proven; hosted and durable Notion/failure injection **BLOCKED** |
| AC-09–11 (real-hour scheduling/drain/recovery) | **BLOCKED**: no full hosted multi-stage run or all required recoveries                   |
| AC-12–13 (integrity/isolation)                 | Locally tested; hosted **BLOCKED**                                                       |
| AC-14 (hosted resource viability)              | **BLOCKED**: hosted CPU/runtime not measured                                             |
| AC-15 (authenticated full evidence)            | **BLOCKED**: validator and logs incomplete                                               |
| AC-16 (Cron shutdown/final $0)                 | **BLOCKED** for future multi-stage run (older D1-only shutdown does not count)           |
| AC-17 (exact-head closure)                     | **BLOCKED** until all preceding criteria pass                                            |

**No AC is accepted as fully PASS in this audit.** Do not check `BG-29.078` or pair 39/50, close #99 / OPE-344 or unlock BG-30.

## 5. Next ordered microcommits (not included in Steps 1–3)

1. Durable isolated mock Notion page store + cross-invocation negative/positive tests (Step 4).
2. Once-only URL/Notion failures and stale-lease recovery through actual queue paths (Step 5).
3. Extend fail-closed egress checks to all new transports and config changes (Step 6).
4. Validate fixture manifests, local replay and PDF identity (Step 7; reuse PR #109 tests).
5. Persist and validate stage/retry/lease/oldest-age evidence with exact Worker config identity (Steps 8, 11).
6. Run real local full-pipeline/resumption/resource checks and exact-head full/focused CI (Steps 9, 10, 11).
7. Stop at the explicit account-wide $0 financial gate before any hosted R2/Worker/Cron operation (Step 12 onward).

## 6. Audit exit criteria and signoff

- [x] Audited current merged entry, scheduler, real source/extraction/enrichment/Notion services and fixture tests.
- [x] Identified unchanged production entry and parallel waitUntil semantics.
- [x] Identified persistent Notion, fault-injection, telemetry and validator gaps with file references.
- [x] Compared current proof with all frozen AC groups without converting local tests into hosted acceptance.
- [x] Recorded concrete next steps and strict $0 / no-hosted-action boundary.
- [ ] Subsequent implementation fixes (out of scope for roadmap Step 3).
- [ ] Authenticated hosted 24-item hourly evidence (separately authorized; not yet performed).

**Result:** Roadmap **Step 3 audit is complete**, but `BG-29.078` acceptance remains OPEN.
