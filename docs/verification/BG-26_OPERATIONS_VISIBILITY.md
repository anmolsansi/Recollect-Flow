# BG-26: Operational Visibility Evidence

## Scope and baseline

- Base: `main` at `3006c1e4425bf262e8b6516871bb099a468d1b2f` (BG-25 merged).
- Branch: `feat/bg-26-operations-visibility`.
- Main GitHub issue: [#92](https://github.com/anmolsansi/Recollect-Flow/issues/92).
- Draft pull request: [#93](https://github.com/anmolsansi/Recollect-Flow/pull/93).
- Source contract: [Build Guide §32](../RECOLLECTFLOW_BUILD_GUIDE.md#32-bg-26--show-usage-backlog-and-recovery-state-truthfully) and [100 canonical source steps](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-26--100-executable-microtasks).

## Implemented contracts

1. The existing admin-protected `GET /api/v1/usage` remains authoritative for policy version, scope, window start/end, thresholds, circuits and deferred reasons. Consumption and active reservations are exposed separately without changing quota arithmetic.
2. New admin-protected `GET /api/v1/operations/summary` returns D1-only aggregate state, safe-error codes, distinct Notion and processing work, partial-purge/backup/integrity/digest counts and stored attachment metadata. The response does not contain source content, credentials, prompts or attachment object keys.
3. Processing group queries count only non-deleted current item generations; both job kinds have bounded groups and a truncation marker. Deferred pending records are displayed as `retry_wait`, not falsely persisted under that status.
4. The authenticated Web `/operations` screen distinguishes unavailable provider-account readings from D1 metadata, shows server measurement times, refreshes once per minute, aborts requests on unmount and marks preserved data stale after fetch errors. The narrow layout uses a responsive CSS grid.
5. Partial purge workflows have read-only inspection links to existing `GET /api/v1/purges/:id`. The screen does not invent a generic retry or a manual override of hard quota stops.

## Evidence and validation

- `capacity.utilization.test.ts`: 70%, 90%, hard-stop, reservation math and unavailable dimensions.
- `operations-summary.d1.spec.ts`: admin-only response, non-admin denial, no-store, empty/unknown readings, grouped retries, safe error codes, partial purges, failed backup, unknown digest and query failure.
- `capacity-core-continuity.d1.spec.ts`: synthetic capture, original retrieval, lexical search and visible backlog under hard AI quota stop.
- GitHub Actions [run 38940550599](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38940550599) passed on commit `93255149667f4a569424098607997425b784595e`. This includes full `npm run check`, packaging, Worker deploy dry-run, local migration, and all existing browser gates plus the BG-26 operations-browser suite. It is a historical passing head, not proof for subsequent commits.
- Isolated Chrome verified live authenticated state, 70%/90%/hard warning presentation, open breaker, stale last-good snapshot during a simulated network outage, resumed refresh and 375px mobile width. No live third-party provider actions.
- `operations-query-plan.d1.spec.ts` used `EXPLAIN QUERY PLAN` and measured **4 D1 rows read** for each processing/sync aggregate on an isolated minimal fixture (0 returned groups). Processing used `idx_processing_jobs_lease`; sync used `idx_sync_attempts_ready`; both joined items by primary key and used a temporary B-tree for grouping. **These numbers are not representative-load benchmarks or provider-account counters.**
- `capacity-core-continuity.d1.spec.ts` passed a hard AI quota fixture: capture/original/lexical search remained operational, deferred enrichment was visible, and a later quota window admitted and leased work.
- `operations-summary.d1.spec.ts` verifies distinct error-code groups without emitting private source text; the public browser route and API require appropriate authentication. [PR #93 checks](https://github.com/anmolsansi/Recollect-Flow/pull/93/checks) is the authoritative exact-head acceptance source.

## Provenance and limitations

The quota measurements are application-side policy windows, not a provider billing ledger. `recorded_objects`, `recorded_bytes` and orphan counts are D1 **attachment metadata**, not an independent R2 inventory. R2 actual storage and D1 provider capacity, rows read and rows written remain `null`; source-authoritative Cloudflare account metrics are not available to this dashboard. Zero returned active windows does not mean zero lifetime activity or unlimited quota.

This work makes no remote Cloudflare mutation, no production deploy, no external digest send and no data migration. Full performance/rows-read acceptance and provider dashboard comparisons require a separately authorized Cloudflare staging or operator session. Production-readiness must not be inferred from mocked D1 tests alone.

## Operational boundaries and follow-ups

- The isolated D1 query-plan proof is small-fixture evidence, not a performance warranty for populated production D1. Representative workload rows-read, latency and provider billing are separate preproduction operational checks. The BG-26 API deliberately caps returned groups at 100 per job kind with a truncation flag.
- Provider-account R2 totals and D1 storage/rows-read/write totals are **not available** from the application binding. The UI explicitly labels them unavailable, not zero. Real account dashboard verification is an operator task when Cloudflare access is authorized. The implementation does not depend on inventing those metrics.
- Browser states are verified in isolated Chrome. Production HTTPS response behavior, Cloudflare quota dashboards and real provider failures are not independently witnessed here, and no remote production mutation was requested.
- No production deployment, remote D1 writes, R2 deletion, unauthorized provider spending or automatic messaging occurred. Final acceptance is for branch implementation and local isolated proof, not for a deployed release.
- The canonical checklist and [issue #92](https://github.com/anmolsansi/Recollect-Flow/issues/92) must point to the exact-head passing CI. No BG-27 implementation, live digest delivery or resource-consuming deployment is included in BG-26.
