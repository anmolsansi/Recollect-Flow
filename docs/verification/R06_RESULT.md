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

## Source-derived index definition checkpoints (not live proof)

The following SQL properties were inspected in the tracked approved migration chain. They are **examples of required comparison points**, not a claim that production has these indexes or that this is the entire final schema. In particular, migrations `0003`, `0005`, `0008`, `0014` and `0022` rebuild tables/indexes; do not naïvely count every historical `CREATE INDEX` statement as an index present today.

| Source migration | Explicit index / FTS object | Required key order and constraints |
| --- | --- | --- |
| `0009`, recreated by `0014` | `idx_processing_jobs_active_unique` | **UNIQUE** `processing_jobs(item_id, job_type)`; partial `status IN ('pending', 'processing')` |
| `0009` | `idx_sync_attempts_active_unique` | **UNIQUE** `sync_attempts(item_id, destination)`; same active-state partial predicate |
| `0009` | `idx_items_lifecycle_processing` | `items(lifecycle_status, processing_status, captured_at DESC)`, not unique |
| `0009` | `idx_items_notion_missing` | `items(notion_missing_at)` with `WHERE notion_missing_at IS NOT NULL` |
| `0021` | `idx_backup_artifacts_retention` | `backup_artifacts(state, expires_at)` |
| `0021` | `idx_purge_workflows_one_active_per_item` | **UNIQUE** `purge_workflows(item_id)`; partial `state IN ('confirmation_pending', 'queued', 'processing', 'partial')` |
| `0021` | `idx_restore_runs_started` | `restore_runs(started_at DESC)` |
| `0020` | `idx_ai_circuit_breakers_probe` | `ai_circuit_breakers(state, next_probe_at, probe_lease_expires_at)` |
| `0022` | `idx_url_acquisitions_item_current` | `url_acquisitions(item_id, source_revision, privacy_level_snapshot, completed_at DESC, id DESC)` |
| `0022` | `idx_url_acquisitions_status` | `url_acquisitions(status, completed_at DESC)` |
| `0023` | `idx_bg13_job_generation` | `processing_jobs(item_id, processing_generation, job_type, created_at DESC)` |
| `0023` | `idx_bg13_extraction_generation` | `extraction_records(item_id, processing_generation)` |
| `0025` | `idx_scheduled_backup_periods_state` | `scheduled_backup_periods(state, claimed_at DESC)` |
| `0016` replaced by `0022` | `item_search_fts` | FTS5 virtual table; final version includes `source_text` in addition to title/raw text/note/summary/topics/project/people/companies; `item_id UNINDEXED` |

A similarly named index with the wrong columns, descending order, `UNIQUE` flag or partial predicate **fails** R06-T02. Auto-generated `sqlite_autoindex_*` rows and FTS shadow tables are not substitutes for tracked explicit definitions.

## Exact read-only schema comparison handoff

1. **Authorize/identify:** An operator with an already approved, read-only D1 session confirms account `a9482fbfb91ace26dee097cbd41293f9`, D1 name `recollect-flow-prod-v2`, UUID `76bd35c6-c833-4987-a47e-6aa8238bb832`, UTC time and observed deployed version. Stop on drift or cost uncertainty. Do not use the current GitHub `main` HEAD as a substitute for source-to-deployed attestation.
2. **Generate expected schema privately:** On a fresh **disposable local** D1 using the exact frozen, ordered 22-file approved migration chain through `0025`, record the complete final `sqlite_master` explicit-index inventory. This handles table rebuilds. Do not run any migration against production. Capture the same source SQL for FTS and compare key column order, descending flags, uniqueness and partial index predicates.
3. **Read current hosted metadata only:** With authorized read-only D1 Studio access to the exact production target, execute only the following non-content SQL. Retain the raw safe schema results in an approved operator evidence location; include only sanitized definition differences in GitHub.

```sql
SELECT name, tbl_name, sql
FROM sqlite_master
WHERE type = 'index'
  AND sql IS NOT NULL
ORDER BY tbl_name, name;

SELECT name, sql
FROM sqlite_master
WHERE type = 'table' AND name = 'item_search_fts';
```

4. **Fail-closed comparison:** Diff **all** expected explicit indexes by `tbl_name`, exact index name, uniqueness, ordered columns, sort direction and partial predicate, not just existence. Inspect `PRAGMA index_list('<literal_table_name>')` and `PRAGMA index_xinfo('<literal_index_name>')` **read-only**, when supported, to resolve uniqueness, partial and column-order ambiguity. Do not interpolate user input into PRAGMA strings. Inspect FTS5 declaration separately; do not equate a table-name match with correct fields. Record missing/extra/mismatched definitions and stop if any are unresolved.
5. **Regression/negative case:** In a disposable fixture only, give a comparer a definition with the *same index name* but a different column sequence or `UNIQUE`/`WHERE` clause; require a **mismatch** result. Do not label this test PASS until actually run, with source and output attached.
6. **Closeout:** Record source and current hosted inventory identity, safe index totals, exact mismatch count, UTC timestamp and independent reviewer. Preserve the historical exit-code gap separately. A successful schema comparison cannot retroactively produce the 2026-11-03 process exit code.

### Narrow existing validation commands (not run here)

```bash
npm run bg32:readonly:test
npm run bg31:manifest:test
npm run bg31:ledger:test
```

The last command checks **supplied filenames/order** against source, not live index definitions or a past process exit. The BG-32 smoke regression is **public-HTTP/offline** and is not an authenticated D1 Studio substitute. A future current read-only D1 comparison must disclose the observed schema and the exact source it was compared to. This documentation did not execute any npm test, hosted query, or remote migration.

## Unresolved release decision and stop condition

- **Owner/operator:** Produce a safe, authorized read-only current D1 index inventory and original process exit artifact if it exists. If the latter is irretrievably lost, the release owner/architect must record an explicit criterion disposition without faking an exit result.
- **Architect/reviewer:** Compare complete final schema (including FTS) from approved migrations against current hosted definitions. Any mismatch is a stop requiring a separately scoped repair ticket and authorization.
- **BG-32 / R07:** Leave `.035` and `.039` open until proven or explicitly accepted according to the release contract. `.037` is conditional `NOT_TRIGGERED`. Neither R06 nor downstream R07/V1 is verified by this PR.

<!-- prettier-ignore-end -->
