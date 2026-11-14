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

<!-- prettier-ignore-end -->
