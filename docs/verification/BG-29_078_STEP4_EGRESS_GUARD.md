# BG-29.078 — Step 4 staging provider isolation

**Scope:** Source, AI, Notion and notification egress isolation **implemented locally** on PR #108. This is **not** full BG-29.078 hosted acceptance. BG-29 remains 99/100 and BG-30 remains locked.

## What is wired

- `apps/worker-api/src/bg29-staging-scheduler.ts` composes **only** the existing deterministic `createBg29StagingSourceFetcher`, D1-backed `createBg29StagingEnrichmentHarness`, and `createBg29StagingNotionHarness`. The production `apps/worker-api/src/index.ts` entry point is unchanged and is not imported by the staging module.
- A closed binding list rejects any live OpenRouter, Notion, Telegram or Workers AI binding; unexpected hidden and symbol bindings; non-mock implementations; enabled digest AI/backup; real inbox URLs; and altered safety limits.
- The staging scheduler accepts **only** the background Cron `17 * * * *`. Daily/weekly digest and notification execution is not dispatched. It does not create HTTP endpoints, run real Telegram delivery, call a real Notion API, or accept a live provider token.
- Source acquisition uses the real worker and bounded parser, with exact-URL synthetic HTTP responses. Mock AI uses the real enrich worker with registered `MockAiAdapter` instances. The Notion sync worker uses a synthetic token and an in-memory deterministic Notion transport for create/adopt/update and 429.
- Until a subsequent roadmap step supplies genuine R2/PDF extraction, any queued extract jobs produce an explicit `BG29_STAGING_EGRESS_DENIED` failure, remaining pending. **This guard cannot be interpreted as passing the extraction stage.**

## Negative safety evidence

Focused Vitest tests cover:

1. Rejection of live OpenRouter, Notion and Telegram secrets or non-mock AI implementations.
2. Rejection of any unreviewed binding (including nonenumerable or symbol properties), unexpectedly enabled digest AI/backups, or a changed D1 binding.
3. Rejection of unapproved daily/weekly Cron before any `waitUntil` service is queued.
4. Real D1 URL acquisition → mock AI enrichment → offline mock Notion projection with `globalThis.fetch` trapped. The test fails on **any** real fetch and verifies source provenance, original preservation, mock enrichment, Notion creation and completed jobs.
5. Outstanding R2 extraction jobs **must not** be silently completed or marked as passing.

Focused workflow: `.github/workflows/bg29-focused.yml`; node + D1 test cases are included. Full CI also runs tests, typecheck, lint and formatting.

## Security boundaries / unresolved work

This is an **application-level, dependency-injected egress guard**, **not** a Worker-platform global network firewall. A new unrelated module that directly calls global fetch would need a separate review and test. A proper staging-only deployable Worker entry point, immutable cross-isolate mock Notion state, staging R2 binding and quota gate are required in later roadmap steps. No hosted execution, resource provisioning, Cron enabling, real provider calls, or charges are performed by Step 4.

**Do not merge Step 4 as evidence of BG-29.078 completion.** Full acceptance requires real hosted hourly elapsed-time, genuine R2 extraction, independent provider mock projection, integrity/retry proof and approved cost evidence. Maintain GitHub #99 open and Linear OPE-344 In Progress.
