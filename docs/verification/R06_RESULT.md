<!-- prettier-ignore-start -->

# R06 — Historical migration exit and current hosted index proof

**Status:** IN_PROGRESS / BLOCKED_INPUT for the original process-exit artifact and authorized, current read-only hosted D1 schema inventory. **Recorded:** 2026-11-14 UTC.
**Parent:** [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141), BG-32.035/.037/.039, Linear OPE-346.
**Source inspected:** `main` `9c29f421b2501f7281528e450eff82aaf082d257`. **Frozen deployed source:** `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, Worker version `ff5ba1ce-32b0-499c-ae67-f561ec09c93a`. These are different identities and neither is a fresh production schema observation.
**References:** [R06 contract](../tickets/REMAINING_WORK_PACKETS.md#r06--resolve-historical-migration-evidence-and-current-index-proof), [Nov 3 release](../releases/BG-31_CORE_RELEASE_2026-11-03.md), [BG-32 evidence](BG-32_RELEASE_GATE_2026-11-06.md), [migration ledger comparator](../../scripts/bg31-migration-ledger.mjs).

## Original November 3 migration event, no replay

The [Nov 3 core release](../releases/BG-31_CORE_RELEASE_2026-11-03.md) records a fresh D1 target, exactly **22 applied migrations** in approved order and post-apply ledger, foreign-key and quick checks. Subsequent authenticated D1 Studio observations in the [BG-32 gate](BG-32_RELEASE_GATE_2026-11-06.md) independently identified all 22 ordered `d1_migrations` filenames, from `0001_initial.sql` through `0025_bg28_scheduled_backups.sql`, with recorded application timestamps **2026-11-03 11:11:57–11:12:05 UTC**. File numbers 0011–0013 do not exist in this approved chain and are not missing applications.

**BG-32.035:** A separately verifiable actual command process **exit code is not present** in the inspected historical release/evidence records. The 22-row ledger and success narrative strongly support an applied schema, but neither can reconstruct the lost command exit value. **Historical process-exit criterion remains NOT_EXECUTED (artifact not located)**; if the original command log/exit artifact cannot be recovered, its disposition requires an explicit release-criterion decision by the authorized owner/architect. Do **not** rerun `wrangler d1 migrations apply --remote` to manufacture a success exit.

**BG-32.037:** No migration failure was recorded. Post-failure schema inspection was a *conditional* branch and is **NOT_TRIGGERED**, not a performed or passing inspection. This does not satisfy the separate required index comparison in BG-32.039.

**BG-32.039:** Current hosted index names, definitions, indexed column order, uniqueness and partial predicates were **not** fetched in this documentation session. Passing local migrations/CI or viewing `d1_migrations` does not prove the live index schema. It remains **NOT_EXECUTED**, with an exact read-only inspection plan below.

## Acceptance matrix

| Case | Necessary proof | What was actually reviewed | Disposition |
| --- | --- | --- | --- |
| R06-T01 / no invented exit | Original process exit must be from the original execution record | 22-row ledger and successful release narrative, but no exit artifact | PASS (evidence classification), historical exit still missing |
| R06-T02 / index definition mismatch | A same-name index with wrong column order, uniqueness or WHERE predicate must fail comparison | Source SQL definitions reviewed; no current D1 `sqlite_master` output or executed negative test | NOT_EXECUTED |
| R06-T03 / conditional failure | Without an actual failure, do not claim post-failure schema inspection ran | No migration failure documented | NOT_TRIGGERED for .037; PASS (classification) |
| R06-C01 / source chain | Approved exact migration list and definitions | 22 local migration files identified and source inspection performed | PASS (source-only) |
| R06-C02 / current D1 indexes | Exact account + D1 identity, read-only index inventory and source comparison | Current hosted query not performed | NOT_EXECUTED |
| R06-C03 / historical disposition | Original exit artifact or owner-approved exception with explicit release consequence | No original exit / exception in inspected records | BLOCKED_INPUT |

**Authority boundary:** No production SQL was submitted here. A read-only `sqlite_master` query still requires an authorized authenticated session on the exact approved D1. No CREATE/DROP/ALTER, `PRAGMA` writes, migration replay or account/billing change is part of R06. No hosted mutation or cost-bearing operation is inferred from a GitHub PR.

<!-- prettier-ignore-end -->
