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

## Execution and exceptions

The BG-29 scripts and D1 test fixtures must use only disposable resources. Log no content, token or private URL. Stop on non-2xx acknowledgments or mismatched IDs, and preserve failures in the evidence report. The accompanying code and source checklist are reconciled only after exact-head CI. Operational defects or absent performance numbers remain unchecked in the canonical checklist and issue until proven.

### Initial gap register

1. **Measurement pending:** No BG-29 capture P50/P95 sampled workload, 10,000-/100,000-item scale run, Worker resources or full backlog drain result at the starting SHA.
2. **External boundary:** Production-like hosted origin, provider rate/cost actuals and real Cloudflare D1 rows-read are not supplied by prior unit tests.
3. **Long-running proof:** Multi-stage hourly-cron time to drain and interrupted Worker recovery require their own measured environment and timestamps.
4. **Release policy:** Any resulting capacity/cadence change needs separate evidence and review, not an unapproved production adjustment.

## Final decision

BG-30 remains locked until every required BG-29 scenario is verifiably passed, relevant defects are resolved, CI is green at the accepted head, and the source checklist/issue/Linear record are reconciled. An implemented harness alone is insufficient.
