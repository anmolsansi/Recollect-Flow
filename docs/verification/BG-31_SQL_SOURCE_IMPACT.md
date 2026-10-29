# BG-31 — Offline migration impact and rollback preflight

**Scope:** Source-only analysis on the current repository migration chain.
**Disposition:** `NO_GO`. No production migration ledger, previous deployable
Worker/Web artifact, exact pending migrations, D1 backup, or independent
attachment/purge-receipt restore has been verified.

This record supplements [the BG-31 release manifest](../releases/BG-31_RELEASE_MANIFEST.md)
and [BG-31 completion plan](../releases/BG-31_COMPLETION_TODO.md).
It is **not** authorization to create a production D1/R2 resource, deploy,
run remote SQL, read hosted R2 objects, send provider requests or incur charges.

## Source-level assessment

The repository contains **22** versioned SQL migration files with source head
`0025_bg28_scheduled_backups.sql`. The numbering gap 0011–0013 is intentional
in this repository; the exact filename order, not arithmetic suffixes, controls
the preflight comparison.

| Source | SQL-supported impact | Migration / compatibility concern |
| --- | --- | --- |
| `0016` | Creates `item_search_fts` and fills it from existing items, then installs synchronization triggers | Existing-data index copy and trigger changes must be tested on representative isolated data |
| `0020` | Creates AI capacity windows, reservation and breaker tables, with indexes | New capacity state does not automatically establish the prior provider's quota state |
| `0021` | Creates backup, purge, anti-resurrection receipt, restore and integrity tables/indexes | Independent newest purge receipts and original bytes must survive a restore and old-code fallback |
| `0022` | Adds `items.source_revision`, URL acquisition evidence, indexes and triggers; rebuilds `item_search_fts` using a copied projection and table replacement | Table drop/rename and FTS rebuild are **not** safely reversed by rolling back Worker code |
| `0023` | Adds `processing_generation` columns and indexes, plus generation triggers | Historical job/extraction generations remain intentionally `NULL`, not inferred or backfilled |
| `0024` | Creates current-processing views and four status triggers | The status update occurs on future writes; no global historical data repair is performed here |
| `0025` | Creates `scheduled_backup_periods` and its state index | Creating a table does **not** enable scheduled backups or hosted Cron work |

**Review scope:** These are highlighted risks, not the full migration delta and
not a statement that any migration is pending in production. Review **every**
filename returned by the verified ledger comparison, including earlier SQL,
against the actual prior schema and the prior Worker/Web artifact. The old
artifact must be a preserved deployable package, not merely a Git commit.

## Repeatable source-only inventory

```bash
npm run bg31:impact
npm run bg31:impact:test
```

The offline utility emits a SHA-256 for every **source SQL file**, together
with names of created tables/indexes/triggers/views, added columns, renamed or
dropped objects, and top-level `INSERT`/`UPDATE`/`DELETE`/`REPLACE`
candidates. It conservatively flags data rewrites and trigger compatibility.
It is a lexical source inspection, **not a complete SQL parser** or a
confirmation of migration safety.

When and only when the intended production D1 target has been **separately
authorized for read-only ledger inspection**, the operator can preserve
the ordered observed migration filenames in a secure local JSON file and
run the same report with that file:

```bash
node scripts/bg31-migration-impact.mjs /secure/release/read-only-ledger.json
```

This invokes the existing strict-prefix comparator. Reordered, missing,
unknown, duplicate or out-of-order filenames stop the audit. Its
`pending_from_supplied_ledger_unverified` result is **not** production proof:
the tool cannot authenticate the ledger's source account, D1 UUID, time,
SQL checksums, backup, or operator authorization. A synthetic or empty list
must never be represented as the actual production ledger.

## Stop, compatibility and rollback rules

1. **No matching live resource:** The last authorized account overview found
   only BG-29 staging Worker/D1 and an unrelated PropertyOS R2 bucket. Never
   reuse them for release evidence or assume a fresh production ledger.
2. **No independently authenticated applied filenames:** Pending migrations,
   affected production tables/indexes and precise runtime compatibility stay
   `NOT_VERIFIED` (BG-31.022–.023 and .031–.036).
3. **No compatible old deployable bundle:** A historical commit or CI
   fingerprint is not an executable rollback package. Preserve and hash the
   old Worker and Web artifacts, then test them against the **actual proposed**
   migrated schema on an authorized isolated copy (BG-31.076–.077).
4. **No verified recovery:** Before any migration, validate a restorable D1
   snapshot, independently retained original attachment bytes, newest
   external purge receipts, read-back hashes, and an anti-resurrection restore
   rehearsal. Reverting code does **not** revert SQLite schema or backfills.
5. **No enforceable zero-additional-cost boundary or exact owner approval:**
   Leave BG-31/BG-32 `NO_GO`. Do not provision R2, migrate D1, deploy
   Worker/Web, turn on Cron, or dispatch AI/Notion/Telegram.

**Outcome:** Source-risk documentation and offline automated negative checks
may pass while all eight production-ledger/compatibility checklist items,
the prior-artifact rollback gate, BG-29.078, OPE-247 and BG-32 authorization
stay unverified.
