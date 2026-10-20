# BG-29.078 — Steps 4 and 5: durable mock Notion and bounded recovery

**Scope:** Isolated synthetic staging/local acceptance only. The canonical BG-29.078 hosted hourly requirement remains OPEN; no production deployment, hosted R2 operation or billing is authorized.

## Step 4: durable mock Notion

- The normal `processNotionSyncJobs` / `NotionSyncService` logic is unchanged.
- The staging scheduler injects `createBg29StagingNotionHarness({ db })` with a strict tokenless mock transport. Page IDs, final projection hashes/versions, create/update counters and a sanitized request ledger persist in **isolated staging D1**, rather than a Worker-local Map.
- `bg29_mock_notion_pages`, `bg29_mock_notion_requests` and `bg29_mock_failure_injections` are **staging-only** tables. They are created only through `provisionBg29StagingNotionSchema(db)`, invoked by local test setup or an **explicit, separately approved isolated staging schema provisioning step**. They are NOT part of the production migrations or deployment.
- The scheduler's Notion stage refuses to run without those tables (`BG29_STAGING_DURABLE_SCHEMA_REQUIRED`); a different injected D1 binding is rejected.
- The existing memory-only harness remains available for small transport unit tests, but cannot be used by the staging scheduler.
- Local 24-item D1 tests rebuild the scheduler on each synthetic sweep, verify exactly one created mock page per capture, real subsequent PATCH requests, and final projection version/hash parity.

## Step 5: deterministic failure and recovery

The staging scheduler accepts a **reviewed test-only fault plan**:
`{ url503For, notion429For, now? }`. With an empty plan, normal staged behavior is unchanged. The failure target must match one of the exact synthetic source URLs or 24 synthetic capture IDs. Never accept actual internet destinations.

- A deterministic source 503 (`Retry-After: 1`) is claimed once using the D1 `bg29_mock_failure_injections` ledger, even across independent Worker isolates. The actual source acquisition service applies its retry policy.
- A deterministic mock Notion 429 (`Retry-After: 5`) is claimed once in the same durable ledger. The actual Notion worker stores and honors `retry_after_at` before retrying.
- A synthetic stale processing lease and stale Notion sync lease use the existing `JobService` expiry/reacquisition path, with `stale_recovery` audit evidence.
- The focused D1 test asserts failure codes, retries, attempt counts, no early retry, full terminal drain, original integrity and no calls to global `fetch`.
- The injected clock is permitted **only in local tests**; a hosted hourly acceptance run must use actual elapsed UTC Cloudflare Cron timestamps.

## Verification and limits

Run:

```sh
npx vitest run --config vitest.node.config.ts apps/worker-api/test/bg29-staging-notion.test.ts apps/worker-api/test/bg29-staging-egress.test.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-24-items.d1.spec.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-durable-recovery.d1.spec.ts
npm run check
```

The focused BG29 GitHub Actions workflow also runs the durable-recovery test. Require successful exact-PR-head CI before calling either local step fully verified.

These checks do **not** establish hosted R2 extraction, real elapsed Cron, hosted Worker CPU/quotas, or a hard $0 spending guarantee. BG-29.078 remains unchecked, Linear OPE-344 In Progress, and BG-30 locked. Do not reopen the completed D1-only hosted hourly probe.
