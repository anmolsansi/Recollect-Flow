# BG-29.078 — Frozen multi-stage backlog acceptance contract

**Prospective revision 2.0 for the separately authorized October 31 run:**
[BG29-078-2026-10-31](BG-29_078_HOSTED_RUN_2026-10-31.md) records the owner's
explicit staging-specific acceptance of metered R2 risk. Only that run's
financial conditions are superseded; historical NO-GO decisions and every
technical acceptance requirement below remain attributable and unchanged.

**Contract version:** 1.0 (October 18, 2026)  
**Scope:** BG-29.078 — Measure multi-stage backlog delay  
**Decision:** Criteria defined and technically reviewed; **execution NOT accepted**.  
**Ticket status:** BG-29 remains 99/100, GitHub #99 open, Linear OPE-344
In Progress, BG-30 locked.  
**Change control:** Any change to workload, timing budget, zero-cost
requirement or stage coverage requires an explicit documented revision.
Never reinterpret a failed run as a pass by weakening thresholds afterward.

## 1. Basis and boundaries

Repository-derived requirements (not new):

- `docs/RECOLLECTFLOW_BUILD_GUIDE.md` §35: measure the **actual hourly**
  multi-stage queue, arrival rate, oldest eligible work, retries, backlog
  growth and drain delay, preserving originals and zero-cost limits.
- `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`:
  `BG-29.076` and `BG-29.077` are checked; `BG-29.078`
  ("Measure multi-stage backlog delay") is the only unchecked BG-29 item.
- `docs/verification/BG-29_STAGING_ONLY_PLAN.md`: isolated synthetic
  URL/file workloads, actual `17 * * * *` UTC Cron, mock providers,
  bound the workload and scheduling, verify lease/retry recovery,
  independent Notion projection and preserved originals.
- `apps/worker-api/src/index.ts`: the background Cron launches URL
  acquisition, R2 file extraction, enrichment and Notion sync using
  parallel `context.waitUntil` calls. URL and PDF pipelines are
  alternatives; Notion sync may occur independently of enrichment.
- `apps/worker-api/test/bg29-multistage-drain.d1.spec.ts`: 12 URL and
  12 file D1 jobs, but the hour clock is **accelerated** and the file
  extraction results and network providers are injected fixtures.
- `docs/verification/BG-29_RESILIENCE_ACCEPTANCE.md`: real hourly
  D1-only synthetic probe (24 originals; 16 → 8 → 0 pending) has
  **already passed**, its Cron is disabled and owner confirmed no
  additional charges. This proof must not be repeated or reclassified
  as full hosted pipeline acceptance.

**Explicit new acceptance-budget choices** for this bounded test, not
preexisting product SLAs: exactly 12 URL and 12 PDF originals, at most
10 consecutive eligible real hourly background Cron invocations for
the drain, and a 24-item final-integrity target. The repository runbook
already limits synthetic workloads and hosted attempts; the precise
10-hourly-invocation pass/fail bound is frozen here for this test only.
If the product needs a different SLA, open a separate decision instead
of silently moving this target after seeing results.

## 2. Frozen workload and operating rules

- **Exactly 24 unique synthetic items:** 12 URL captures and 12
  file/PDF captures in the isolated staging D1. Stable item IDs and
  idempotency keys; no actual user content or private addresses.
- **PDFs:** 12 nonempty, valid, small PDF files with deterministically
  known text, sizes and SHA-256 hashes. Only an isolated staging R2
  **Standard** bucket may store the source objects; the real
  `ExtractionService`, R2 `ATTACHMENTS.get`, signature/hash checks
  and `PdfExtractor` / `unpdf` must execute on hosted Worker.
  Injected or pre-written extraction results do **not** count.
- **URLs:** 12 safe, deterministic synthetic responses handled by the
  real `SourceAcquisitionService` and bounded parser. A test-only
  fetch transport may return fixture HTTP responses, but production
  `SourceFetcher` behavior/policies must be preserved and no real
  internet targets may be requested.
- **Enrichment:** Real `processEnrichJobs` / `EnrichService`
  execution with the existing mock AI adapter, producing the expected
  derived records. No external AI bindings/tokens or paid inference.
- **Notion:** Real `processNotionSyncJobs` / projection and
  idempotency logic, with injected deterministic HTTP responses.
  It must prove initial projection and at least one meaningful
  post-enrichment update. Notion is an **independent** queue, not a
  forced fourth sequential stage. No live Notion API calls or token.
- **Cron:** Only dedicated staging Worker; `17 * * * *` in UTC.
  Capture actual consecutive scheduled invocations and wall-clock
  elapsed time. Do not accelerate the clock or use direct
  `scheduled()` calls as evidence of hourly behavior.
- **Failure cases:** Intentionally inject one retryable URL-provider
  failure and one mocked Notion 429 with retry-after, plus one stale
  processing or sync lease. Verify these recover by the documented
  job-type retry/lease policies without unbounded attempts, lost
  originals or duplicate terminal projections.
- **Resource cap:** At most 24 items, 12 short PDF objects and
  10 consecutive eligible hourly sweeps. Each PDF stays far below
  the configured 25,000,000-byte file limit. No workload expansion,
  paid Workers upgrade, production routing, live notification,
  backup automation or unapproved outbound network.

## 3. Binary checklist — every item mandatory

Mark these `PASS` only after examining the specified evidence.
`FAIL` (measured violation) or `BLOCKED` (missing evidence/approval)
keeps BG-29.078 open. `N/A` does not qualify.

- [ ] **AC-01 — Isolated target.** Worker name, version and 40-character
      source Git SHA are recorded. D1 and R2 bindings resolve **only** to
      dedicated staging objects; no production D1 ID, bucket, secrets,
      route, custom domain or worker trigger has changed.
      **Evidence:** diff of both Wrangler configs, account/Worker identity,
      deploy manifest and resource IDs.
- [ ] **AC-02 — Financial go/no-go before any R2 access.** Owner reviews
      current plan and **account-wide** R2 Standard storage and Class A/B
      consumption, remaining allowances, billing status, shared traffic
      and a bounded worst-case operation estimate. If strict $0 risk
  cannot be assured (R2 free tier is **not** a hard billing cap),
  record **NO-GO**; no R2 deployment, write or scheduled run.
  Any relaxation of the absolute $0 requirement requires separate
      explicit approval **before** exposure. An informational budget
      alert cannot satisfy this condition.
      **Evidence:** dated usage snapshot, documented worst-case estimate,
      explicit owner authorization if needed, and a zero-spend gate result.
- [ ] **AC-03 — Correct fixture inventory.** Exactly 12 URL and 12 PDF
      originals, with 24 unique IDs and input hashes, are seeded once in
      staging. Original counts are 24 throughout the run.
      **Evidence:** manifest plus D1 count and identity query at start,
      each sweep and end.
- [ ] **AC-04 — R2 originals genuinely readable.** All 12 staging
      PDF objects exist as valid bytes, are read via hosted R2 binding,
      and match initial size/SHA-256; there are zero missing, corrupt,
      wrong-bucket or silently replaced source objects.
      **Evidence:** per-file manifest, R2 read/extraction trace and
      beginning/end hash reconciliation.
- [ ] **AC-05 — Real URL acquisition.** All 12 `acquire_url` jobs
      execute the real acquisition and parsing service using approved
      deterministic responses; all expected text/evidence records are
      persisted. One injected retryable failure recovers.
      **Evidence:** per-job attempts, status transitions, acquisition
      evidence IDs, content hashes and sanitized parser results.
- [ ] **AC-06 — Real PDF extraction.** All 12 `extract` jobs use
      `ExtractionService` to read R2, checksum and parse actual PDF
      bytes, persisting nonempty extraction records. No direct
      `submitExtractionResults` fixture bypass counts as proof.
      **Evidence:** extractor/version, R2 read, extracted text sentinel,
      `extraction_records` IDs and completion timestamps.
- [ ] **AC-07 — Mocked but real enrichment logic.** Each of the
      24 originals produces the intended enrichment job and derived
      result via `EnrichService` with deterministic mock AI; none
      are silently skipped or marked complete without a result.
      **Evidence:** processing job transitions, result rows,
      mock-provider identity and no real AI invocations.
- [ ] **AC-08 — Independent mock Notion projection.** All 24 items
      reach a completed mock Notion projection with correct final
      projection version/hash. At least one post-enrichment mock
      update is observed, even if another sync happened earlier.
      Retryable mocked 429 respects retry-after; duplicate pages and
      duplicate sync attempts are not produced.
      **Evidence:** `sync_attempts`, projection rows, mock HTTP request
      ledger, attempt count and update trace.
- [ ] **AC-09 — Actual hourly scheduler.** Two or more (and no more
      than ten) consecutive relevant `17 * * * *` UTC Cloudflare
      scheduled event invocations are authenticated; first and final
      sweep use real clock time with at least 55 minutes between
      consecutive observed sweeps. Scheduled timestamps may have
      nonzero seconds. At least one inter-sweep stage handoff is
      demonstrated. Direct manual/test invocations do not count.
      **Evidence:** Cloudflare event IDs, scheduled and observed UTC
      times, Worker version, event outcome and independent log URL.
- [ ] **AC-10 — Backlog/time budget.** All 24 items reach their
      applicable final stage and **all** processing/sync queues become
      empty by the **tenth consecutive eligible hourly sweep**. Record
      first eligible sweep timestamp, last completion timestamp, total
      end-to-end arrival-to-clear duration (seconds/hours), oldest
      eligible queued age at each sweep, throughput per stage and
      duration of every handoff. A run still pending at sweep 10 fails.
      **Evidence:** per-sweep job-type/status matrix and timestamp
      calculations, not only a final count.
- [ ] **AC-11 — Bounded failure recovery.** The injected URL failure,
      Notion 429 and stale lease are each observed as real job
      transitions; all subsequently recover within the existing
      job-type attempts/lease policies (no overriding retry ceilings
      or fast-forwarded recovery). Record exact attempts and elapsed
      retry delay. No double completion, phantom job or stale result.
      **Evidence:** lease owners/expiry, retry-after records,
      state-transition audit and recovered completion IDs.
- [ ] **AC-12 — Terminal queue integrity.** Final per-job-type
      counts satisfy pending=0, processing=0, retry-eligible=0 and
      terminal failed=0 for acquisition, extraction, enrichment and
      Notion sync. All 24 originals survive, are not soft-deleted
      and maintain original SHA-256/input identity; every expected
      derived/projection row is traceable to exactly one original.
      **Evidence:** D1 consistency queries and original manifest
      reconciliation. Historical transient failures may be retained
      in audit logs, not as terminal failed jobs.
- [ ] **AC-13 — Provider/network isolation.** Zero live outbound
      requests to Notion, OpenRouter, Telegram, production webhooks or
      uncontrolled websites; zero real provider tokens, paid AI calls
      or live notifications. Allowed Cloudflare D1/R2 binding operations
      are accounted for separately.
      **Evidence:** deny-by-default transport test, outbound-call
      counters, mock response traces and binding/config inspection.
- [ ] **AC-14 — Hosted resource viability.** Each scheduled
      invocation completes without crash, Worker error, CPU budget
      breach, memory limit, unbounded D1 operation, repeated timeout
      or unexpected paid-tier requirement. Record available hosted
      CPU/memory/quota measurements and any unavailable metrics as
      explicit limitations. The Workers Free Cron CPU budget is
      10 ms; an exhausted budget is a **FAIL**, not a reason to
      silently upgrade.
      **Evidence:** Cloudflare invocation outcome, CPU/memory metrics
      when exposed, quotas, rate and error logs.
- [ ] **AC-15 — Credible evidence bundle.** Include fixture
      manifest/hashes, source SHA, staging Worker version, D1/R2 IDs,
      authentic Cron event IDs/log links, every sweep's queue/age
      observations, stage timestamps, retry and lease traces, final
      integrity query and limitations. Run
      `scripts/bg29-hourly-evidence-check.mjs` against the canonical
      export once its schema supports the full staged evidence.
      Its existing `bg29_078_verified: false` guard is intentional:
      a structurally valid JSON file alone **never** authorizes signoff.
      **Evidence:** immutable run/CI artifacts plus independent
      reviewer cross-check of original Cloudflare logs.
- [ ] **AC-16 — Shutdown and final $0 reconciliation.** Disable
  staging Cron using explicit `[triggers]` / `crons = []`,
  confirm its removal, retain D1 evidence and safely remove
  only explicitly approved test artifacts. Owner checks
  account billing after the run, including R2 Standard Class A/B,
  storage and any other potentially used product, and confirms
  **additional charge = $0**. Budget notifications are not
      evidence of a hard cap; if billing is delayed, mark BLOCKED
      until acceptable reconciliation evidence exists.
      **Evidence:** Worker trigger screenshot/readout, before/after
      billing snapshot and signed operational outcome.
- [ ] **AC-17 — Exact-head closure review.** Full CI and focused
      verification pass at the exact implementation/release SHA.
      A reviewer compares every numbered criterion with its
      independently attributable artifact, documents any deviation
      or accepted scope change, and verifies production is untouched.
      Only then check `BG-29.078`, change BG-29 from 99/100 to
      100/100, close GitHub #99 and Linear OPE-344, and unlock BG-30.
      **Evidence:** CI run URLs, reviewer signoff, changed checklist
      and issue/Linear reconciliation.

## 4. Mandatory stop conditions

Immediately stop **before provisioning or invoking R2** if billing
headroom, isolation or authorizations are unknown. Stop further
scheduled tests and explicitly remove the Cron if any of these occurs:

- Any real provider call, unexpected external request, credential leak
  or binding to a production resource.
- R2 spending risk without the user's permitted financial policy, any
  nonzero additional charge, or an unexpected plan/paid upgrade prompt.
- Lost original, changed PDF hash, unbounded retries, stuck queues,
  duplicate final projections or failed Worker resource limit.
- More than 10 eligible real hourly Cron sweeps without complete
  queue drain.

Do not delete evidence, pretend a missing result is zero, or mark the
ticket complete from a CI-only, D1-only, direct-trigger or mocked-clock
test. A failed run is documented as failed and needs a new, separately
attributed rerun after remediation.

## 5. Frozen decision rule and reviewer handoff

`BG-29.078 = PASS` **if and only if AC-01 through AC-17 all PASS**
from attributable evidence **and** the $0 safety condition is met.
Otherwise `BG-29.078 = OPEN`. This contract itself is not proof
that the pipeline has run or that any future R2 operation is free.

**Review performed for this contract:** cross-checked against the
canonical microtask, build guide §35, staged-only runbook,
the actual Cron handler and queue service boundaries, local
multi-stage test, evidence validator and prior real-hour D1-only
experiment. New numerical budgets are explicitly labeled as
test-specific decisions above; no existing product SLA has been
silently invented.

**Approval/signoff fields (to fill at execution, not in advance):**

- Implementation SHA / Worker version: **pending**
- 24-item fixture manifest / original hashes: **pending**
- Isolated R2 cost authorization: **not granted**
- Cloudflare hosted run and event URL: **pending**
- Complete AC-01..AC-17 reviewer evidence verdict: **pending**
- Final billing reconciliation: **pending**
- Ticket decision: **OPEN — 99/100; BG-30 locked**

### Reference links

- [Build guide §35](../RECOLLECTFLOW_BUILD_GUIDE.md)
- [Canonical microtask checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md)
- [BG-29 verification report](BG-29_RESILIENCE_ACCEPTANCE.md)
- [BG-29 staging-only plan](BG-29_STAGING_ONLY_PLAN.md)
- [Existing simulated multi-stage test](../../apps/worker-api/test/bg29-multistage-drain.d1.spec.ts)
- [Actual scheduled handler](../../apps/worker-api/src/index.ts)
- [Existing hourly evidence checker](../../scripts/bg29-hourly-evidence-check.mjs)
- [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/)
- [R2 current pricing/free allowances](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare budget alerts do not cap charges](https://developers.cloudflare.com/billing/manage/budget-alerts/)
