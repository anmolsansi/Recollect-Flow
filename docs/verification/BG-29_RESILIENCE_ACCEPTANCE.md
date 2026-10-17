# BG-29 — Resilience, capacity and performance acceptance

**Status:** In progress. No production or remotely hosted performance acceptance is claimed.
**Tracking:** [GitHub #99](https://github.com/anmolsansi/Recollect-Flow/issues/99), [Linear OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance).
**Base:** `main` at `e4785b28b2f9a7af7077c0bbf6af3f473d7251ae`, immediately after merged BG-28 PR #98.
**Environment:** isolated local Wrangler Worker, disposable D1 and R2 fixtures, mock optional providers. The local browser fixture may use a Vite proxy. Remote Cloudflare services, provider quotas, production data, real billing and notifications are outside this authorized exercise.

## Contract and prior evidence

Build Guide §35, the 100 canonical BG-29 microtasks, [Testing and Acceptance](../TESTING_AND_ACCEPTANCE.md), [Operations Runbook](../OPERATIONS_RUNBOOK.md), and the current schemas define acceptance. Capture P95 target is **2,000 ms or less excluding uploads** under documented personal load. Capture acknowledgment, upload, enrichment, Notion sync and backlog drain are **different measurements**; none substitutes for another.

BG-28 was merged on the baseline. The inherited `capacity.d1.spec.ts`, `circuit-breaker.d1.spec.ts`, `capacity-core-continuity.d1.spec.ts`, `manual-retry-capacity.d1.spec.ts`, `source-fetcher.d1.spec.ts` and search/recovery tests already cover narrow guards. They are valuable _prior_ coverage, not a BG-29 load-run result.

## Input/privacy fixture matrix

Each input must use synthetic content with a unique marker, stable idempotency key, and known expected raw text or original byte SHA-256. The four columns are **privacy classes**, not hosted-provider approval. The server's `PolicyService` is authoritative for actual routing.

| Input    | Unknown                  | Public                   | Personal                 | Sensitive                | Special precondition                                                                   |
| -------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ | -------------------------------------------------------------------------------------- |
| URL      | Capture + private source | Capture + private source | Capture + private source | Capture + private source | URL required, acquisition may be unavailable                                           |
| Text     | Capture + lexical query  | Capture + lexical query  | Capture + lexical query  | Capture + lexical query  | Non-empty shared_text                                                                  |
| Note     | Capture + lexical query  | Capture + lexical query  | Capture + lexical query  | Capture + lexical query  | Non-empty shared_text                                                                  |
| Image    | Attachment + capture     | Attachment + capture     | Attachment + capture     | Attachment + capture     | Finalized image attachment required; OCR is optional                                   |
| PDF/file | Attachment + capture     | Attachment + capture     | Attachment + capture     | Attachment + capture     | Finalized file attachment required; indexed PDF contents require successful extraction |

**Do not claim** an image or PDF has searchable internal text merely because capture succeeds. A missing attachment cannot be used as an image/file capture. A URL-only result must not claim acquired content. Unicode, tracking URLs, wrong MIME, conflicting source text, injection attempts, near-limit bytes, canceled transfers and empty/invalid inputs are separate negative fixtures.

For provider routing, `ALLOWED_DATA_MATRIX` permits Public across eligible providers, Unknown only through Cloudflare or no-provider, Personal through eligible OpenRouter/Gemini only with required consent/credential controls (not Cloudflare), and Sensitive only through no-provider. Additional policy checks may further restrict each case, and an allowlist entry alone is **not** a grant of consent. Use only the current route decision. Unknown/Personal/Sensitive fixture content must not appear in provider calls or logs without explicit corresponding authorization. Local mock fixtures do not prove a hosted provider's privacy practices.

## Evidence standards

- A passing unit test establishes behavior under its fixture only.
- A local Worker bench establishes the named local runtime, rate, size, duration, counts, failures and latency distribution. It cannot establish production latency or real free-tier cost.
- P50/P95 are nearest-rank statistics. Record count, failures, warmup, observation duration and whether acknowledgment excludes upload.
- Search scale needs actual seeded count, composition, phrase/filter/tie-pagination correctness, observed duration and D1 row metrics if available. An unmeasured 10k/100k proposal is **not** a pass.
- Backlog recovery needs before/peak/after counts, oldest eligible age, effective service rate and drain time with optional work restored.
- All injected failures must demonstrate originals and owner overrides remain intact, bounded retries, and no raw error/provider payload exposure.
- Account-limit revalidation against official provider documentation and actual production billing are separate release gates; do not silently change configured ceilings.
- Never deploy, migrate, rotate secrets, switch cron cadence or contact live providers as part of this test.

## Provider and database ceiling revalidation (2026-10-16)

These are **published account-level constraints**, not evidence that a particular account was checked or that production spent no money:

| Source                                                                                          | Published constraint                                                                                                                 | Engineering implication                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | Free allocation of 10,000 neurons/day, reset at 00:00 UTC; usage above this requires a paid plan and can be billed                   | Preserve hard no-cost admission; check deployed plan, model eligibility and dashboard before launch                         |
| [OpenRouter pricing](https://openrouter.ai/pricing)                                             | Free models 20 requests/min, 50/day on a free account; free-model daily allowance rises to 1,000 with at least $10 purchased credits | Existing configured free-pool request bounds remain conservative, but verify account tier and model details                 |
| [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)                 | Workers Free tier 5,000,000 rows read/day, 100,000 rows written/day and 5 GB total storage                                           | Rows read/written belong in scale evidence and actual dashboard verification; 10,000 inserts are disposable D1 testing only |

Publication pages are moving targets. Source review does not verify actual free-tier account state, billing, Worker memory, 100k-item scale or hosted production latency. No production policy/configuration was changed.

## Execution and exceptions

The BG-29 scripts and D1 test fixtures must use only disposable resources. Log no content, token or private URL. Stop on non-2xx acknowledgments or mismatched IDs, and preserve failures in the evidence report. The accompanying code and source checklist are reconciled only after exact-head CI. Operational defects or absent performance numbers remain unchecked in the canonical checklist and issue until proven.

### Initial gap register

1. **Measurement pending:** No BG-29 capture P50/P95 sampled workload, 10,000-/100,000-item scale run, Worker resources or full backlog drain result at the starting SHA.
2. **External boundary:** Production-like hosted origin, provider rate/cost actuals and real Cloudflare D1 rows-read are not supplied by prior unit tests.
3. **Long-running proof:** Multi-stage hourly-cron time to drain and interrupted Worker recovery require their own measured environment and timestamps.
4. **Release policy:** Any resulting capacity/cadence change needs separate evidence and review, not an unapproved production adjustment.

## Measured isolated CI checkpoint

[Run #38967786493](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38967786493)
passed at source head `af84b6e965efea4c221e201cd81ee6624941b5a4`.
The full quality, D1, package and browser suite passed. Its local
Worker benchmark used 20 synthetic Sensitive text/note captures,
concurrency 2, one-second spacing between pairs, and no warmup.
All 20 acknowledgments succeeded, with no duplicate replay.

| Metric                      |        Observed | Scope                            |
| --------------------------- | --------------: | -------------------------------- |
| Capture P50                 |        13.25 ms | Acknowledgment only              |
| Capture P95                 |        24.47 ms | Acknowledgment only              |
| Min/max                     | 8.43 / 36.04 ms | Same 20 samples                  |
| Total interval              |     9,190.47 ms | Includes batch spacing           |
| Verify one saved raw phrase |         5.37 ms | Admin lexical search             |
| FTS phrase query            |           17 ms | 10,000-row isolated D1           |
| D1 search service DB timing |           15 ms | Same phrase                      |
| Indexed matches             |             769 | `bg29needle` every 13th row      |
| FTS count-query rows read   |             769 | Count query only, not search API |

The 10,000-row fixture alternates text/note, rotates four privacy
levels, sets `work` on each third item and gives every item one tied
timestamp to exercise stable pagination. The 10,000-item tests,
privacy matrix and raw-continuity tests passed with the previous head.

**Verdict:** The **isolated** P95 capture target passed, and the
10,000-item lexical search checks passed. The measured search-count
row metric is not total API rows read. This does **not** establish
100,000-item throughput, uploaded-byte timing, provider completion,
hourly backlog drain, physical device experience, production Worker
resource limits, hosted billing or real provider cost. Newer commits
must be tested on their own exact head before any source checklist
completion is attributed to those changes.

## October 16 expanded local scale and resilience checkpoint

[CI #38970278063](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38970278063)
ran the new D1/FTS 100,000-record suite successfully, while the
overall run failed on separately reported test-fixture errors.
The source fixture alternates text/note, four privacy levels,
work/home projects, and identical timestamps to exercise keyset ties.
It indexed **100,000 canonical items** through real D1 triggers,
found **5,263 matching documents**, returned 25 correct filtered
results, and verified four consecutive pages without duplicates.
Observed combined query wall time was **38 ms**; the search service
reported **35 ms** DB time. The separate FTS count query recorded
**5,263 rows read**, not the complete search API query's rows read.
No hosted or live-account measurements are implied.

The 25,000,000-byte PDF upload path was exercised in the same
isolated run. The fixture received the expected 413 rejection
for 25,000,001 bytes, then a 201 reservation, 200 upload, and
200 finalize for exactly 25,000,000 bytes. Two later checks used
the wrong test-only D1 column name and failed; the following
fix uses the authoritative `object_key`. Do not claim full
file-bound acceptance until the corrected exact-head suite passes.
The canceled-before-PUT case covers an abandoned reservation only,
not a midstream cancellation or browser interruption.

The shared `AiProviderRegistry` now validates every extracted
structured result before capacity accounting and canonical writes.
Dedicated unit tests reject missing fields, wrong types/ranges,
non-objects, and unexpected fields, without echoing raw model
output. The D1 failure/override integration fixture had an
incorrect expected job-service return value in its first run;
the test now checks the actual durable pending transition.
The required full latest-head regression run is separate proof.

### Current hourly background service limits

The repository's existing `wrangler.toml` invokes background
work at minute 17 of every hour. Its Worker entrypoint calls
source acquisition, extraction, enrichment and Notion sync using
separate bounded leases. Inspection of current source yields:

| Stage                 | Jobs admitted per scheduled attempt |
| --------------------- | ----------------------------------: |
| URL acquisition       |                                  10 |
| Attachment extraction |                                  10 |
| AI enrichment         |                                  10 |
| Notion sync           |                                  25 |

Under a hypothetical healthy, instantaneous worker model,
a backlog of 100 eligible items at a ten-item stage needs
**at least 10 hourly sweeps** to drain that stage. Three dependent
ten-item stages may add up to one scheduler interval per transition,
depending on processing order. This is only a capacity floor:
provider retries, AI hard stops, full upload/processing durations,
worker limits and downstream jobs can increase real drain times.
The previous 15-job fixture used an accelerated logical clock;
it was **not** measured hosted throughput or actual cron lag.
No cadence or concurrency change is authorized without new
measurement and lease/zero-cost review.

### FTS drift recovery acceptance

The new `npm run bg29:fts:smoke` script uses a fresh temporary
`--local --persist-to` D1 database with migrations, deliberately
removes an indexed row, runs the repository's actual
`scripts/rebuild-item-search-index.sql` twice, and checks the
returned missing/orphan/duplicate counters plus phrase search.
It never executes `--remote` and deletes only its own disposable
fixture. Its CI result remains pending until an exact-head run
finishes.

### Unresolved acceptance distinction

An explicit completed scenario with measured isolated data is
different from a deferred operational acceptance gate.
Hosted Worker CPU/memory, real D1 billed rows, real provider
plan and zero-cost status, live Notion outage/recreation and
the multi-stage hourly backlog drain still require appropriate
authorized staging/operator evidence. Browser interrupted-upload
and parser timeout/memory behavior must be separately evaluated,
not inferred from a canceled-before-PUT fixture.

## Verified implementation and exact-scope CI

The [complete passing CI #38970501080](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38970501080)
at `709776caa72ff77f05314ea4357aa0bfa4f58f5b` covers
the 100,000-item D1/FTS suite, 25 MB PDF path, AI schema-invalid
rejection, owner-override failure isolation, existing provider quota
and recovery suites, Wrangler packaging and browser acceptance.
The 100,000-item synthetic query in that run took **28 ms** wall
time (25 ms reported by search D1), with 5,263 matching rows
returned by the separate FTS count query. These are local measurements,
not hosted D1 billable rows or production Worker performance.

The 25,000,000-byte upload was reserved, stored, checksummed,
finalized, and checked in the temporary R2 bucket. An over-limit
reservation failed with HTTP 413. A canceled-before-PUT reservation
could not be finalized and created no R2 original. This still does
not replace a midstream-cancellation or physical-device test.

The actual FTS rebuild script was exercised twice in
[CI #38970984338](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38970984338)
against a new disposable local Wrangler D1, with corruption,
idempotent rebuild and phrase-search assertions. Its focused step
passed. Final CI and browser acceptance on that revision must also
be reviewed; passing one step alone is not full-head approval.

## October 16 focused outage and stage-timing acceptance

[Focused CI #38973261642](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38973261642)
passed the isolated D1 coupled AI/Notion outage test, strict model
schema tests and upload-pressure fixtures. It intentionally disabled
the real AI adapter without the test-mode mock fallback and used
synthetic Notion HTTP 503 responses. The acknowledged original
remained retrievable and searchable throughout. After logical retry
eligibility, the **same** AI job completed with a locally restored
mock adapter, and the deferred Notion projection recovered with
two deterministic fixture requests. The final item was complete,
its original remained intact, and no processing jobs were outstanding.
This verifies local recovery state, **not** a live Notion account outage.

The same focused workerd run measured **436 ms** for a
25,000,000-byte synthetic PDF upload, excluding capture acknowledgment
and optional AI work. After recovery, one mock AI enrichment job
took **10 ms**, excluding upload and capture acknowledgment.
These single-case isolated measurements cannot establish hosted
provider latency, device upload speed, production CPU/memory or
sustainable real-world throughput. Per-run timing may change.

The interrupted-stream fixture injected a transport error after
partial PDF bytes arrived. The request was not acknowledged as a
successful upload. D1 retained a pending attachment and R2 had no
original object. This is server-side partial-stream resilience
evidence, not a real mobile network disconnect and not a complete
browser retry demonstration.

The malformed AI adapter tests confirm schema-invalid responses are
rejected without leaking raw provider payloads, and the bounded-call
test proves exactly **one** adapter call in that scenario. The
operational backlog summary remains visible during the coupled
outage. Focused CI is not a substitute for final exact-head full CI.

### Remaining blockers to full BG-29 signoff

- **Worker runtime resource evidence:** obtain CPU time and memory
  under the actual bundled Worker at the configured near-limit file
  workload, preferably authorized non-production Cloudflare preview.
  An isolated D1 test and bundle size do not prove Worker memory/CPU
  limits or paid/free account behavior.
- **Measured multi-stage backlog drain:** run the real hourly
  scheduler against a representative isolated/authorized staging
  backlog, collect oldest eligible age, stage delays and time to zero
  for acquisition → extraction → enrichment → Notion. The 15-job
  logical lease test proves ownership/recovery but not full pipeline
  service time or provider-dependent drain.
- **External cost account gate:** verify live provider and Cloudflare
  quotas/billing within authorized staging before launch. Published
  provider limits are not an account-specific charge guarantee.

These remain explicit outstanding work and cannot be marked passed
by the previous local or mocked measurements.

## October 17 isolated queue drain and resource profiling checkpoint

**Exact source and configuration:** `bg29-multistage-drain.d1.spec.ts`
uses real `JobService` lease/transition paths, production
`SourceAcquisitionService` and `EnrichService`, real D1 migrations
and local test bindings, mocked external source/AI/Notion responses,
and a logical 60-minute scheduling interval. The user authorized
local-only measurements, **not** hosted deployment.

[Focused CI #39009820971](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39009820971)
passed the _queue test step_ but failed a separate local inspector step.
The queue run measured:

| Property                                      | Recorded value |
| --------------------------------------------- | -------------: |
| Synthetic originals, all retained             |             24 |
| URL acquisition track / file extraction track |        12 / 12 |
| Acquisition/extraction/enrichment lease batch |             10 |
| Notion sync-attempt batch                     |             25 |
| Logical hourly sweeps to clear all queues     |              4 |
| Logical elapsed arrival-to-clear              |        3 hours |
| Real isolated test execution wall time        | 24.179 seconds |
| Acquisition stage processing wall time        |          69 ms |
| Extraction stage processing wall time         |          31 ms |
| Enrichment stage processing wall time         |         160 ms |
| Notion sync stage processing wall time        |      23,834 ms |
| Remaining pending/processing or failed jobs   |              0 |

Notion had additional projection synchronization attempts as data was
enriched; Notion is independently scheduled and not necessarily
last in a strict four-step pipeline. `24` originals remained
after simulated queue clearance. Observed pending totals were
24, 14, 4 and 0 at the end of successive sweeps.
These are **accelerated logical-clock intervals**, not three
hours of elapsed wall time or a real hosted Cron drain.
The external network and expensive providers were never called.
BG-29.078 still requires actual scheduled-worker timing or an
explicitly accepted staging substitute.

**BG-29.075 local V8/CPU profiling attempt:** The safe
`npm run bg29:resource:profile` harness starts the real
bundled Worker through `wrangler dev --local`, initializes
fresh local D1/R2 and attempts to obtain V8 heap usage and
CPU samples via the workerd inspector during a 25 MB upload.
This test is **not** an account resource measurement.
Early CI attempts failed because the static release bundle
was missing, then because the inspector websocket endpoint
could not be established. The harness was modified to use
loopback DevTools discovery, but until its exact-head CI
emits actual numerical V8 heap and CPU samples,
BG-29.075 remains **not verified**.

**Staging-only preparation:** See
[BG-29_STAGING_ONLY_PLAN.md](BG-29_STAGING_ONLY_PLAN.md) and
`wrangler.bg29-staging.example.toml`. Both are preparation
artifacts only. Their staging placeholder is intentionally
not deployable; no Cloudflare production changes, provider
charges or real scheduled events have been authorized.

## Final decision

BG-30 remains locked until every required BG-29 scenario is verifiably passed, relevant defects are resolved, CI is green at the accepted head, and the source checklist/issue/Linear record are reconciled. An implemented harness alone is insufficient.
