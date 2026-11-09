<!-- prettier-ignore-start -->

# BG-32 Task 2 — backup authorization and safety-boundary packet

**Status: PREPARED, NOT APPROVED, NOT EXECUTED.** Prepared November 9, 2026. Tracks [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141) and [Linear OPE-346](https://linear.app/openclaw-neutron/issue/OPE-346/bg-32-verify-deployed-core-release-boundaries-and-close-production). This file is a public, non-secret approval template, **not** a permission to execute any hosted operation.

## Objective and existing state

Authorize only the minimum specifically identified operations to preserve an independently recoverable encrypted snapshot of the **already deployed, frozen core-only Recollect-Flow installation**. This is not a second release. Do not replay migrations, redeploy the Worker, create synthetic items, activate optional integrations, or change billing settings.

The November 3 scope was explicitly approved for that **one first install**. It does not carry over to this backup phase. Task 1 and Task 5 were reconciled in merged PR #152. The 100-step BG-32 checklist now has 80 checked and 20 open, including authorization and independent-backup actions.

### Frozen source and production target

| Identity | Approved existing value |
| --- | --- |
| Approved first-install packet | `BG31-CORE-81e828067005-2026-11-03.3` |
| Source commit of **deployed application** | `81e82806700519b90b6fbd5c1ebb233ed5def9d2` |
| Live Worker (recorded, owner-confirmed full UUID) | `recollect-flow`, version `ff5ba1ce-32b0-499c-ae67-f561ec09c93a` |
| Approved origin | `https://recollect-flow.openclawneutron.workers.dev` |
| Cloudflare account | `a9482fbfb91ace26dee097cbd41293f9` |
| Production D1 | `recollect-flow-prod-v2`, UUID `76bd35c6-c833-4987-a47e-6aa8238bb832` |
| Private R2 source | `recollect-flow-attachments-prod-v2`, Standard storage |
| Applied migrations | 22/22 through `0025_bg28_scheduled_backups.sql` |
| Current application doc head | Separate from frozen deployed source. Documentation commits do not change the deployed Worker. |


The last documented hosted state includes **three synthetic items, one original PDF of 639 bytes, zero observed purge receipts, and a hosted JSON backup marked complete and verified November 6** (recorded as 11,746 bytes in the November 7 operational evidence, with expiration December 6). These are **historical observations**, not a freshly retrieved November 9 backup ID, complete export, or independently verified object listing. The earlier local isolated restore test did not establish complete off-device disaster recovery.

## Proposed authorization stages (separate decisions)

### A — Safe preparation: ALREADY PERMITTED BY THIS DOCUMENTATION REQUEST

- Inspect repository history, immutable approval records, runbook, sanitized Cloudflare dashboard metadata and published public health/asset pages.
- Prepare local scripts and test them against synthetic files only.
- Prepare a step-by-step checklist and a no-content evidence template.
- **No actual private export, production R2 list/read, backup creation or restore.**

### B — Owner approval requested: bounded **read-only backup retrieval**

Subject to a fresh owner approval explicitly naming **Scope B**:

1. Confirm the active account, Worker, D1 UUID, R2 bucket and disabled Cron/provider scope match this packet immediately before private access.
2. With the owner's existing session, use the authenticated `GET /api/v1/backups` listing, and **at most one** `GET /api/v1/backups/<verified-id>/download` of an existing successful archive. If the existing archive is stale/incomplete, do not create a new one without separate Scope C approval.
3. If useful for comparison, use **one** `GET /api/v1/export?format=json` to obtain a current portable export. It excludes original attachment bytes. Do not publish the response body or private object keys.
4. Read-only enumerate the exact production R2 source bucket with a narrowly scoped, owner-created read-only credential, then independently download only the still-needed originals and **all** current `purge-receipts/v1/*.json` mirrors. Verify pagination and source snapshot completeness; retain exact original bytes and object-key relative paths in private owner storage.
5. Calculate owner-local byte counts and SHA-256 hashes; compare JSON schema, `itemCount`, listed object keys, original attachment content hash/size, receipt checksums and timestamps. Record only sanitized counts/hashes/timestamps in issues, never content, paths revealing user details, tokens or raw object keys.
6. Place the complete verified set in **owner-selected encrypted storage outside Cloudflare's R2/D1 failure domain**, and retain a second independently recoverable copy if available. Do not write a backup into the production R2 bucket.

**Proposed execution ceilings, not claims of actual usage:** up to 1 existing hosted JSON backup download, 1 portable JSON export, 10 R2 listing pages and 20 R2 object HEAD/GET operations with at most 10 MiB total downloaded data. If source enumeration reveals more data/receipts, any quota/cost uncertainty, or missing hashes, **STOP** and request a revised scoped approval rather than silently skip objects. No R2 writes, SQL writes, item writes, account changes or cloud storage creation under Scope B.

**Cost constraint:** owner requires **zero additional spend**. Cloudflare R2 Standard has monthly included allowances but R2 usage is metered and there is no verified hard dollar-zero ceiling. Before private R2 actions, owner/operator must examine remaining R2 class A/B operation and storage allowances and any existing charges. Do not assert $0 merely because the present objects are small. If remaining free-tier headroom and no-overage behavior cannot be established, stop; do not use a production R2 credential and do not infer approval for charges.

### C — Separate approval, only if necessary: one new hosted JSON backup

The endpoint `POST /api/v1/backups` **mutates production R2**. It may be considered only if the existing complete archive is unsuitable and the owner separately authorizes exactly one new hosted archive, with measured headroom and an explicit stop boundary. A `POST` is never authorized by Scope B. The new archive alone is still insufficient without the independent original bytes and newest purge receipts. Automatic backup, Cron and provider dispatch remain OFF.

### D — Separate approval: isolated restore/recovery (Task 4)

Any restore request, including `POST /api/v1/restore?dry_run=true`, uses a write-bearing API (dry run writes a status record). Only a named, empty, isolated **nonproduction** target with explicit approval may be used. `dry_run=false` requires its own scope and passing proof. Never point production traffic at it as part of this packet. No production restore, rollback, D1 Time Travel restore, purge, traffic cutover or schema change is approved.

## Explicitly prohibited throughout Task 2 and Scope B

- Workers/Web deploy, migration apply or SQL writes, D1 Time Travel restore, or unreviewed account/binding changes.
- R2 PUT/COPY/DELETE, creating buckets, changing bucket public access or billing, resetting secrets/tokens or expanding credential permissions.
- Creating synthetic items, editing/removing existing items, purge operations, provider/AI/Notion/Telegram calls, email sends, Cron enabling or scheduled jobs.
- Posting private JSON exports, attachment bytes, receipt content, cookies, authorization headers, account credentials or encrypted archive passwords to GitHub, Linear or this chat.
- Claiming that passing export/downloads equals application-level isolated restore or full V1 release acceptance.

## Owner's required decisions and actions

1. Review this packet and confirm the **exact account, D1, Worker, R2 source and frozen release** are the intended production resources.
2. Choose an independent, encrypted owner-controlled destination, preferably an encrypted external drive or an encrypted archive stored in an account independent of Cloudflare. **Keep the actual private path and archive passphrase out of GitHub.** A single copy on the Mac is not by itself proof of off-device retention.
3. Check current Cloudflare R2 usage, free allowance headroom and whether any billed overage is possible. If guaranteed zero additional spending cannot be established, stop for a new decision.
4. Decide whether to approve **Scope B only**. Scope C and Scope D remain unapproved until independently requested. Owner may approve less than Scope B.
5. Keep any Cloudflare S3-compatible read-only credentials in local secure storage. Never paste token values in GitHub, Linear or chat; prefer a narrowly scoped read-only R2 token. Any credential creation is a separate account mutation and requires explicit owner consent.
6. Respond with dated explicit authorization referencing this exact packet revision (and ideally commit SHA) and selected scope. Example: “I approve BG-32 Task 2 Scope B only, for existing backup download, one JSON export, read-only R2 original/receipt retrieval, local hashing and encrypted independent storage, under the stated limits. No Scope C/D or production writes. Stop if usage could incur a charge.”
7. Do not mark canonical `BG-32.013` or `.019–.030` complete until corresponding evidence actually exists. Approval is **not** a completed backup.

## Before-execution stop checks

- Confirm account/Worker/D1/R2 IDs exactly, current deployed Worker revision and the 22-file migration ledger; record UTC preflight timestamp.
- Ensure no unreviewed pending production changes, no known source data integrity issue and no existing incident/unsafe backup.
- Reconcile the existing archive ID, completion state, verification hash, expiry and scope; ensure it can be retrieved without exposing credentials.
- Confirm R2 listing includes **every** original and latest receipt mirror, and the export's item and attachment counts agree. The previously observed zero receipts is not a substitute for a current complete listing.
- Confirm isolated destination encryption and independent retention, evidence naming and deletion-protection rules.
- Abort on any mismatch, missing object/receipt, checksum/byte mismatch, unexpected cost/billing prompt, permission ambiguity, version/schema mismatch or unreadable restore material.

## Definition of done for Task 2

**Ready for Scope B** only after the owner selects the storage destination, checks cost/allowance boundaries, approves the exact limited operation, and records a timestamped authorization. This is **not** Task 3 completion.

Until then: **TASK 2 AWAITING OWNER APPROVAL, BG-32 RELEASE NO-GO.** Continue safe documentation and local-test work only.

## Canonical references

- [BG-31 exact deployed core record](../releases/BG-31_CORE_RELEASE_2026-11-03.json).
- [BG-32 evidence ledger](BG-32_RELEASE_GATE_2026-11-06.md).
- [BG-28 recovery operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md).
- [BG-32 source checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-32--100-executable-microtasks).
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

<!-- prettier-ignore-end -->
