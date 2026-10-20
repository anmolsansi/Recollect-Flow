# BG-29 local acceptance follow-up: roadmap Steps 9–11

**Date:** 2026-10-20  
**Issue:** [BG-29 #99](https://github.com/anmolsansi/Recollect-Flow/issues/99) / [Linear OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance)  
**Scope:** local-only engineering and CI verification; no hosted deployment or R2/billing activity.

## Step 9 — Full local pipeline acceptance

The repository already contains the actual staged scheduled handler,
`bg29-staging-24-items.d1.spec.ts`, and the separate durable recovery
suite `bg29-staging-durable-recovery.d1.spec.ts`. This follow-up closes
a verification gap by checking terminal job counts **by stage** rather
than relying only on broad failed/pending counters.

Expected isolated local results:

- 12 URL acquisitions through the real acquisition worker and bounded
  deterministic source transport.
- 12 PDFs read from emulated R2, verified and parsed by actual
  `ExtractionService` / `unpdf`.
- 24 complete enrichment jobs with 24 persisted derived-item summaries and
  24 successful mock-AI usage entries with **zero estimated AI cost**.
  `EnrichService` persists results in `items` and `provider_usage`, not
  `processing_job_results`. The staging evidence ledger now checks this
  actual persistence contract instead of falsely reporting zero results.
- 24 complete Notion sync attempts and 24 durable mock projections,
  including at least one post-enrichment PATCH; one create per original.
- 24 original items unchanged, 12 original PDF R2 SHA-256 hashes
  unchanged, all original URL values intact, no unexpected network calls.
- No pending, processing, retrying or terminal failed application
  processing/sync jobs at final local drain.

The separate durable recovery test demonstrates one retryable URL 503,
one mocked Notion 429 with five-second Retry-After, and stale processing
and sync lease recovery with an independent scheduler instance and no
duplicate terminal projection. Test clocks are **logical local sweeps**,
not authenticated hourly Cloudflare events.

## Step 10 — Resource measurements and limits

The local Workerd inspector harness `scripts/bg29-worker-resource.mjs`
profiles a **25,000,000-byte synthetic upload** in the isolated local
Worker. A previously recorded [focused CI measurement](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39013728568)
reported 280.59 ms upload wall time; a peak *sampled* V8 used heap of
7,383,656 bytes; 7 heap and 20 CPU samples; and 312.56 ms **sampled
non-idle activity**. These metrics reflect that earlier local run.
They are **not** billed Worker CPU, full isolate memory, or a hosted
scheduled invocation measurement. Sampled peaks can miss brief spikes.

The new `scripts/bg29-local-resource-review.mjs` validates the
measurement shape, the exact 25 MB workload and sample consistency,
and explicitly returns
`hosted_cron_cpu_budget_verified: false` and
`hosted_memory_limit_verified: false`. A required Node test checks
this fail-closed distinction; the inspector execution remains an
isolated, optional CI diagnostic because debugger connection support
has intermittently failed.

**Unresolved hosted risk:** the frozen contract references the 10 ms
Workers Free Cron CPU budget. No local 25 MB upload sample establishes
whether the full multi-stage hosted scheduled invocation fits that
budget. Treat any real hosted CPU breach as a failure, never an
automatic paid-tier upgrade. Existing bounded retry/lease tests do not
substitute for real hosted quota evidence.

## Step 11 — Evidence checker, negative tests and CI

`scripts/bg29-hourly-evidence-check.mjs` retains its absolute
`bg29_078_verified: false` guard. Structural improvements require:

1. Exactly 24 originals, no more than ten eligible sweeps and unique
   Cloudflare event IDs.
2. For `scope: 'full'`, actual counts for 12 URL acquisition, 12
   hashed/extracted R2 PDFs, 24 enrichment results and 24 Notion
   projections, with a post-enrichment update and no corruption or
   duplicate pages.
3. Explicit bounded recovery of URL 503, Notion 429 and stale lease.
4. Per-sweep stage-by-stage queue counts and attributable event-log URLs,
   plus oldest eligible age and stage-handoff evidence.
5. Zero Worker resource-limit breaches (or an explicitly stated
   unavailable CPU measurement), isolated bindings, Cron shutdown and
   complete account-wide R2/Workers $0 billing reconciliation.

Positive *synthetic schema* tests must **never** count as authentic
Cloudflare acceptance. Negative tests reject missing R2 reads,
missing Notion update, missing retry or billing evidence, duplicate
events, over-budget sweeps, pending work, or CPU limit breaches.

Run focused offline checks:

```sh
node --test scripts/bg29-hourly-evidence-check.test.mjs
node --test scripts/bg29-local-resource-review.test.mjs
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-24-items.d1.spec.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-durable-recovery.d1.spec.ts
npm run check
```

The pull request runs the repository's focused BG29 workflow and full
CI to verify the exact final source SHA. Record actual results before
calling this change CI-verified. A cloud-simulator or CI pass does not
complete AC-01 through AC-17.

## Acceptance boundary

**BG-29.078 remains unchecked, 99/100 canonical actions, 49/50 paired
GitHub actions, OPE-344 In Progress, BG-30 locked.** The merged earlier
PRs do not provide authentic full-stage elapsed hourly hosted proof.
Hosted R2 provisioning remains **NO-GO** under the owner's strict $0
financial policy without a reviewed authorization and acceptable
enforceable cost boundary. Production resources must remain untouched.
