<!-- prettier-ignore-start -->

# R03 — Independent recovery operation packet

**Status:** PREPARED, EXECUTION BLOCKED_INPUT. **Recorded:** 2026-11-13 UTC.
**Source baseline:** repository `main` at `d8c0de06f762b494a27ae029e6ec13d0469c8094`. **Deployed source (historical):** `81e82806700519b90b6fbd5c1ebb233ed5def9d2`.
**Parent:** [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141); recovery procedure [BG-28 #97](https://github.com/anmolsansi/Recollect-Flow/issues/97), Linear OPE-228 (referenced by the packet contract).
**Authority:** [November 9 Scope B/C/D packet](BG-32_BACKUP_AUTHORIZATION_PACKET_2026-11-09.md), [operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md), [R03 contract](../tickets/REMAINING_WORK_PACKETS.md#r03--prepare-one-independent-recovery-operation-packet). This document **is not permission** to access production, incur cost, or restore data.

## Scope and exact source identity

| Resource | Frozen expected identity | Verification before access |
| --- | --- | --- |
| Account | `a9482fbfb91ace26dee097cbd41293f9` | Owner's authorized Cloudflare session; abort on drift |
| Worker | `recollect-flow`, `ff5ba1ce-32b0-499c-ae67-f561ec09c93a` | Record current deployed version; do not infer from Git HEAD |
| Origin | `https://recollect-flow.openclawneutron.workers.dev` | Exact HTTPS origin, no redirect |
| D1 | `recollect-flow-prod-v2`, `76bd35c6-c833-4987-a47e-6aa8238bb832` | Exact ID plus migration state (historical: 22/22) |
| R2 | Private Standard bucket `recollect-flow-attachments-prod-v2` | Read-only owner account and full source listing |

## Accepted earlier preparation versus missing proof

The [November 9 issue #141 progress comments](https://github.com/anmolsansi/Recollect-Flow/issues/141) report the owner's **Scope B-only selection**, an **encrypted Mac disk image**, and a plan to retain the **unmounted encrypted image** in private Google Drive. This defines the proposed failure-domain separation without publishing actual paths, passwords, or object keys. The comments report one existing hosted archive, one portable export, an original PDF and empty local receipt-ledger preflight. These are owner-reported historical observations, **not** current S3 listing completeness, verified encryption strength, key-recovery proof, Drive byte-for-byte readback, or a fresh owner authorization for a changed operation. The November 9 public packet still labels approval pending; reconcile the dated owner approval and limits in a private operator record before resuming, not by silently changing its status.

**Independent destination and custody requirements:** Copy the sealed, encrypted disk image outside Cloudflare (private Google Drive with independently controlled retention), retain a recoverable key/password separately in owner-controlled secure storage, verify an authorized operator can unlock the local image, and verify the downloaded off-device encrypted image's size and SHA-256 match the local sealed file. Do not record its private path, token, passphrase, or actual contents in GitHub. If the Google Drive copy shares credentials/failure domain with the only key copy, independence is **not proved**. Keep the prior good set.

## Exact bounded Scope B workflow (no new hosted writes)

1. Reconcile the existing owner's **dated Scope B approval** with this unchanged source, operation ceilings and $0-additional-spend boundary. Confirm current source identities, private destination and key access in the owner's environment. Record safe UTC preflight time. If approval is not specific or authority is unavailable, **STOP**.
2. Inspect current Cloudflare R2 usage, remaining free allowances, class A/B operation headroom, any charges and potential overage. Free-tier inclusion is **not** a hard $0 spending cap. If zero additional charge cannot be ensured, **STOP** before further R2 operations.
3. From an already authorized authenticated session, list `GET /api/v1/backups` and choose one actually `complete`, `verifiedAt`-populated, not expired backup ID. Download at most **one** existing archive with `GET /api/v1/backups/<verified-id>/download`. Do not assume the historical November 6 artifact is still current or suitable.
4. If necessary under the same approved read-only scope, request at most **one** `GET /api/v1/export?format=json`. Confirm `format=recollectflow-portable-export`, `schemaVersion=2026-09-19.1`, `itemCount=len(items)`, `generatedAt`, byte length and SHA-256. The export is metadata, **not attachment bytes**.
5. With an already authorized, *read-only* R2 access method, enumerate all still-needed object keys and **every** `purge-receipts/v1/*.json` mirror, recording page tokens/pages and a complete-listing termination signal privately. Do not infer global completeness from an empty Cloudflare browser folder view. Limit to **10 listing pages**, **20 R2 HEAD/GET operations**, and **10 MiB total downloaded bytes** across approved retrieval. If these limits are insufficient, **STOP without omitting objects** and request a revised operation packet. No additional credential creation is authorized.
6. Place exact original bytes under private `objects/<original object key>` paths, preserving item ownership, expected byte counts and content SHA-256. For each newest purge receipt mirror, validate R2-recorded hash, provenance and ordering, then assemble protected `independent-receipts.json`; use `[]` only after proving current source prefix completeness **and** agreement with current export.
7. Run `node scripts/recovery-bundle.mjs <private-portable.json> <private-objects-dir> <private-independent-receipts.json> <new-private-manifest.json>`. The canonical verifier must reject missing or tampered originals. Do not commit generated manifests or owner data.
8. Close and encrypt the owner-local image; copy the **unmounted encrypted image** off device. Read back the remote copy, compare length/hash with the source image, and prove key recovery/ability to mount the copy under owner control. Preserve the previous verified set.
9. Record only non-sensitive timestamps, counts, hashes, access/independence proof classifications, listing completeness and verifier status in `R04_RESULT.md`. A local PASS does not prove independent isolated application restore.

## Permission separation, rollback, stop and follow-up

- **Scope B only:** existing backup GET, at most one portable JSON GET, read-only R2 list/HEAD/GET within limits, offline verify and owner-controlled encrypted retention. Never POST a backup, POST a restore (even `dry_run=true` writes a status record), issue D1 SQL, modify R2, activate Cron/providers, deploy, change access/billing, or spend money.
- **Scope C:** one new hosted backup `POST /api/v1/backups`, only after a **separate explicit** scoped approval and cost check.
- **Scope D:** isolated restore into an explicitly identified **empty nonproduction** D1/R2/Worker target, separately authorized. Target resource IDs remain **undecided**, so **no restore or dry run is executable**. Production rollback, traffic cutover and purge are prohibited.
- **Failure:** stop dependent operations on missing approval, changed IDs, expired archive, incomplete listing, stale receipt, hash/size mismatch, key-access failure, ambiguity about costs, or unbounded pagination. Preserve originals, last-known-good encrypted copy and safe evidence. Never delete, regenerate or silently exclude missing objects.
- **Post-R04 handoff:** [R05](../tickets/REMAINING_WORK_PACKETS.md#r05--prove-isolated-restore-without-touching-production) still requires its own isolated target, exact approval and verified application-level restore.

## Acceptance evidence and outcomes

| Assertion | Current finding | Status |
| --- | --- | --- |
| R03-T01: listing/object/byte ceilings cannot silently expand | Existing packet explicitly caps 10 pages, 20 R2 object HEAD/GET and 10 MiB; STOP on overflow | PASS (contract review only) |
| R03-T02: same failure-domain copy is insufficient | Encrypted owner Mac plus off-device encrypted Drive image is the selected pattern; actual Drive readback and key custody remain unproved | PASS (design), NOT_EXECUTED (durability) |
| R03-T03: Scope B cannot authorize POST backup/restore | Separate Scope C and D remain mandatory and excluded from this handoff | PASS (contract review) |
| Current cost-free operation and current access approval | No fresh billing/headroom/access receipt independently inspected in this session | BLOCKED_INPUT |
| Fully verified independent recovery copy | Refer to R04, still missing source completeness and off-device proof | NOT_EXECUTED here |

**Validation:** Repository documentation and historical issue comments were inspected through the GitHub connector. No private Cloudflare access, production API call, local recovery verifier, CI run or physical-device inspection was performed in this session. No application or operational state was changed by preparing this packet.

**Responsible next actor:** Owner/operator verifies dated approval, free-operation headroom, private key custody and off-device storage. Architect reviews exact identity/scope and issues a new packet if any ceiling or operation changes. **R03 is prepared but live execution remains blocked. BG-32 and V1 remain NO-GO.**

<!-- prettier-ignore-end -->
