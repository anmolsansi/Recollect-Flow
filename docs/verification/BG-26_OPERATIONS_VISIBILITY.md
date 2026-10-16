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
- Full build/CI and browser suites: consult [PR #93 checks](https://github.com/anmolsansi/Recollect-Flow/pull/93/checks) and the exact head revision. Do not use an older passing run to claim a newer commit was verified.

## Provenance and limitations

The quota measurements are application-side policy windows, not a provider billing ledger. `recorded_objects`, `recorded_bytes` and orphan counts are D1 **attachment metadata**, not an independent R2 inventory. R2 actual storage and D1 provider capacity, rows read and rows written remain `null`; source-authoritative Cloudflare account metrics are not available to this dashboard. Zero returned active windows does not mean zero lifetime activity or unlimited quota.

This work makes no remote Cloudflare mutation, no production deploy, no external digest send and no data migration. Full performance/rows-read acceptance and provider dashboard comparisons require a separately authorized Cloudflare staging or operator session. Production-readiness must not be inferred from mocked D1 tests alone.

## Review notes and unresolved acceptance

- Validate actual D1 query plans and rows-read for representative workload sizes. Group-count bounding limits returned rows but does not itself guarantee low D1 rows-read at scale.
- Browser-check the operations page loading, stale, hard-stop, error, long-record and narrow-screen states against a representative isolated staging fixture. Existing broad browser suites do not automatically prove all new page states.
- Verify R2 bucket inventory and D1 account capacity separately in Cloudflare dashboards if this release requires authoritative provider-account figures.
- No production deployment, remote D1 writes, R2 deletion or automatic messaging is authorized as part of BG-26.

Track any incomplete canonical checklist steps in [GitHub issue #92](https://github.com/anmolsansi/Recollect-Flow/issues/92). BG-27 must remain gated until BG-26 completion evidence meets the canonical acceptance boundary.
