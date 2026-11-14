<!-- prettier-ignore-start -->

# R05 — Prove isolated restore without touching production

**Status:** BLOCKED_DEPENDENCY (R04 independent-set sign-off) and BLOCKED_INPUT (separately approved Scope D and exact isolated target). **Prepared:** 2026-11-14 UTC. This is an evidence reconciliation, **not** a newly executed restore.
**Parent:** [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141), BG-32.075–.077, Linear OPE-228.
**Source reviewed:** repository `main` at `9c29f421b2501f7281528e450eff82aaf082d257`. **Historical deployed source:** `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, Worker `ff5ba1ce-32b0-499c-ae67-f561ec09c93a`. This PR does not assert a current deployment check.
**Authority:** [R05 packet](../tickets/REMAINING_WORK_PACKETS.md#r05--prove-isolated-restore-without-touching-production), [operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md), [R03 operation packet](R03_RESULT.md), [R04 result](R04_RESULT.md). No new Cloudflare or private Mac access was performed.

## Reused historical local restore, with limits

On **November 6, 2026**, the owner supplied console output for a local-only real-bundle rehearsal using `bg32-local-isolated-restore.sh` and `apps/worker-api/test/bg32-owner-real-bundle.d1.spec.ts`. The [dated parent issue comment](https://github.com/anmolsansi/Recollect-Flow/issues/141#issuecomment-6694674211) records **1 passing Vitest test** and `BG32_LOCAL_RESTORE_PASS items=3 originals=1 bytes=639 receipts=0 foreign_keys=ok fts_count=ok`. The comment describes a temporary local D1/R2 target, application dry run then apply, checksum verification, and unrelated dispatch flags disabled. This is **OWNER_REPORTED_HISTORICAL**, not an independently repeated inspection or a verified restore of the later independently retained Google Drive copy.

The existing [BG-28 implementation closeout](BG-28_FINAL_CLOSEOUT.md) also identifies source-controlled synthetic checks for populated targets, missing/short originals, an explicit dry-run mode, anti-resurrection, restored search, and URL evidence. CI/test existence is evidence of implemented guards, **not** proof that this packet's externally retained bytes or newly named target passed.

On **November 13**, the owner attested that the R04 acquisition steps had been done. The [R04 owner attestation](https://github.com/anmolsansi/Recollect-Flow/issues/141#issuecomment-6860482724) explicitly says that the acceptance outputs for complete R2 pagination, canonical recovery-bundle verifier, encrypted Drive readback and key recovery had **not** been supplied. `R04_RESULT.md` therefore remains `IN_PROGRESS / BLOCKED_INPUT` until those already-produced safe results are reviewed. A verbal completion statement cannot substitute for that sign-off or authorize Scope D.

## Authority and environment boundary

| Identity or prerequisite | Verified for this packet? | Required evidence |
| --- | --- | --- |
| Production account / Worker / D1 / R2 | Frozen identifiers in R03 and release manifest, **historical** only | No source mutation or production traffic switch |
| Verified independently retained export, original bytes and newest purge receipts | **No**, R04 owner attestation only | R04 signed acceptance, including independently read-back sealed off-device image |
| Isolated nonproduction Worker + clean D1 + separate R2 target | **No** | Exact account, Worker version, D1 UUID and R2 bucket; prove cannot serve production |
| Scope D authorization for dry run and apply | **No** | Dated, explicit operation-specific approval, target identities and stop limits |
| Original payload/credentials | **Not accessed** | Keep private in owner-controlled encrypted storage, never in repository or issue |

**Important:** `POST /api/v1/restore?dry_run=true` creates a `restore_runs` record. It is write-bearing even though it does not insert canonical items. Neither dry run nor apply is authorized by the previous Scope B backup retrieval, a merged PR, or this documentation.

## R05 acceptance as of this audit

| Criterion | Expected | Actual evidence | Disposition |
| --- | --- | --- | --- |
| R05-T01 / populated target | Apply rejects `RESTORE_TARGET_NOT_EMPTY` without canonical mutation | Existing `restore-originals.d1.spec.ts` describes this regression | HISTORICAL_SOURCE_ONLY, no fresh execution |
| R05-T02 / missing original | Dry run reports missing/short original and apply rejects `RESTORE_ATTACHMENTS_UNAVAILABLE` | Existing `restore-originals.d1.spec.ts` contains both cases | HISTORICAL_SOURCE_ONLY |
| R05-T03 / original hash and search | Independently recovered original hash and approved internal FTS phrase round-trip in target | Nov 6 owner-reported local pass: 1 original/639 bytes, FKs and FTS count; no post-Drive readback rehearsal | OWNER_REPORTED_HISTORICAL, NOT_EXECUTED for current target |
| R05-T04 / no external send | No Notion/Telegram/provider/digest dispatch, before or after restore | Nov 6 test says background/provider flags disabled; no current target inspection | OWNER_REPORTED_HISTORICAL, NOT_EXECUTED for current target |
| R05-C01 / clean target and preview | Explicit target identity, migrations, no canonical rows and preview exclusions/readiness | No approved target; no fresh dry run | NOT_EXECUTED |
| R05-C02 / real apply | Separate approval and correct preview; compare counts/children/FKs/FTS/originals/leases/purged-item exclusion | No approved apply | NOT_EXECUTED |
| R05-C03 / first-install recovery | Containment, preserve exact release, separately reviewed forward repair, not invented old binary/SQL rollback | [BG-32 gate](BG-32_RELEASE_GATE_2026-11-06.md) records no previous compatible binary | PASS (documentary decision); no actual incident or rollback |

**Stop decision:** Do not mark BG-32.075–.077, R05 or BG-32 as verified. Do not delete/replace the R04 recovery set or attempt a production rollback. The next action is R04 evidence sign-off followed by an independently approved, precisely named, **nonproduction-only** Scope D rehearsal.

## Scope D execution handoff (not executed)

The operator may resume **only after** R04 passes with source snapshot identity, full paginated object/receipt listing, a canonical `recovery-bundle.mjs` manifest, independent encrypted Drive readback and recoverable key. The named Scope D approval must state *both* isolated Worker/D1/R2 identities, whether both restore calls are included, no production exposure, disabled outbound destinations, an operation ceiling and explicit stop/recovery steps. If any identity or approval is missing, **STOP**. A previously approved local test does not authorize a new hosted target.

1. **Identity and containment:** Record source and target identities side-by-side in the private operator log. Confirm fresh nonproduction D1 with intended schema through `0025`, no canonical items, a separate R2 bucket, a route that cannot receive production traffic, and disabled scheduled/provider/Notion/Telegram/digest effects. Never copy live secrets, repoint DNS, or use production D1/R2 bindings.
2. **Independent input:** Unlock the verified off-device copy under owner control. Compare export count/hash, independently preserved receipt prefix and original per-object size/SHA-256 against the accepted R04 manifest. Copy original bytes and newest receipt mirrors into the explicitly named isolated R2 target only if the approved Scope D operation includes that preparation. Reject missing, stale or mismatching objects, and preserve the source backup.
3. **Dry run (write-bearing):** In the approved target only, submit the portable JSON with admin authentication and exact `POST /api/v1/restore?dry_run=true`. Record response status, `plannedItemCount`, `skippedPurgedItemIds` and `attachmentReadiness.checked/problems`. Do not paste the raw response or private item IDs into GitHub. `attachmentReadiness` verifies R2 existence and byte size, not full SHA-256.
4. **Stop/checkpoint:** Do not apply if target is populated, schema is incompatible, purge receipts are incomplete, planned counts differ, `attachmentReadiness.problems` is nonempty, key custody fails, or any external dispatch is enabled. Preserve safe failure codes and do not attempt to repair production.
5. **Approved apply:** Only after a clean preview and an explicit authorization covering the separate apply, submit `POST /api/v1/restore?dry_run=false` to the same isolated target. A 409 `RESTORE_TARGET_NOT_EMPTY` or `RESTORE_ATTACHMENTS_UNAVAILABLE` is a stop, not a reason to delete rows or weaken validation.
6. **Independent readback:** In the isolated target only, run read-only `PRAGMA foreign_key_check` (expect zero rows), compare canonical item/event/child counts to the approved plan, count active items versus `item_search_fts`, search a privately approved phrase through the application, and retrieve the original using the application's authenticated private download flow. Hash the returned bytes against R04. Verify purge exclusions, processing/sync lease safety, URL/source links, and no external send or unexpected side-effect.
7. **Recovery decision:** Record exact test output, target identity, UTC observation, failed checks and reviewer approval. Preserve isolated fixtures and source evidence under the agreed retention policy. **No traffic switch.** This was a first installation: there is no known compatible earlier Worker to roll back to, and code rollback never undoes schema changes. In an incident, contain ingress, preserve D1/R2 and exact release bytes, then use a separately reviewed forward repair or authorized isolated recovery.

### Existing local regressions to rerun on a disposable environment

```bash
npm run recovery:bundle:test
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-roundtrip.d1.spec.ts apps/worker-api/test/restore-purge-ledger.d1.spec.ts
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/restore-originals.d1.spec.ts apps/worker-api/test/restore-explicit-mode.d1.spec.ts
```

These commands were **not run in this documentation-only session**. They are local source gates and cannot replace actual Scope D target/independent-copy acceptance. No write-bearing restore request, DNS change, new resource, migration or production operation was performed.

**Review handoff:** R04 evidence reviewer/owner for off-device sign-off; authorized operator for target/Scope D; independent reviewer for R05 readback. Only after all R05 criteria pass may the parent [#141](https://github.com/anmolsansi/Recollect-Flow/issues/141) receive a verified R05 link. R07 remains separately gated.

<!-- prettier-ignore-end -->
