<!-- prettier-ignore-start -->

# R04 — Acquire and verify an independent recovery set

**Status:** IN_PROGRESS, **BLOCKED_INPUT** for complete source and independent readback proof. **Recorded:** 2026-11-13 UTC.
**Parent:** [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141), legacy BG-32.021–.030, Linear OPE-228 reference.
**Scope owner:** [R03 operation packet](R03_RESULT.md); [recovery operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md).
**Repository baseline:** `main` `d8c0de06f762b494a27ae029e6ec13d0469c8094`. **Frozen deployed source:** `81e82806700519b90b6fbd5c1ebb233ed5def9d2`. Do not treat this repository SHA as a deployed backup identity.
**Environment:** historical owner Mac Terminal outputs and a historical authenticated Cloudflare UI inspection, as captured in [issue #141](https://github.com/anmolsansi/Recollect-Flow/issues/141); GitHub connector inspection in this session. No owner Mac drive or private bucket bytes were accessed now.

## Reused, source-qualified November 9 evidence

The following was reported in historical issue comments, not independently re-executed by this PR.

| Material | Owner-reported or UI-observed value | Evidence class | Limitation |
| --- | --- | --- | --- |
| Existing hosted November 6 backup | 11,746 bytes; SHA-256 `67c5eea50dc2db379979fad3c1ea4e919d88bb12f3379c956b9922117fbc2c6f`; expires December 6, 2026 | OWNER_REPORTED local download + HISTORICAL hosted metadata | Hosted JSON is not original-byte recovery |
| Current November 9 portable export | `format=recollectflow-portable-export`; `schemaVersion=2026-09-19.1`; `itemCount=3`; `generatedAt=2026-11-09T17:59:19.443Z`; 11,746 bytes; SHA-256 `08f6e3cab98992ff1ab6a0ab5b6c666218fff252dba6b611a39be05516b65f49` | OWNER_REPORTED Mac local parsing and hash | Different hash from hosted artifact is not by itself a failure or proof of semantic equivalence |
| Original PDF | 639 bytes; SHA-256 `b9e46d9bb5dda15caef690fcda522cc286ce7c0d32e39c3d654be187eb34842a` | OWNER_REPORTED local exact-byte hash | Full source-bucket listing absent |
| Current export receipts | 0 in owner-local parsed JSON | OWNER_REPORTED | Must compare with complete current R2 receipt-prefix enumeration |
| Private R2 receipt prefix | Cloudflare UI showed `purge-receipts/v1/` empty on November 9 | HISTORICAL_OBSERVED UI | Browser listing is **not** full paginated S3 enumeration |
| Local independent receipt ledger | `independent-receipts.json` created with `[]`; local preflight `RECEIPT_PREFLIGHT_PASS` | OWNER_REPORTED | Ledger freshness and source completeness remain unproved |
| Offline Mac helper | `BG32_ScopeB_Mac_Inspector_2026-11-09.sh verify` passed | OWNER_REPORTED | Different helper, **not** canonical `scripts/recovery-bundle.mjs` proof |
| Owner-controlled destination | Encrypted Mac image reported ready, proposed encrypted image copy to private Google Drive | OWNER_REPORTED preparation | No confirmed encryption parameters, copied image hash/readback, key-recovery test |

No private content, object key, receipt body, local path, token or passphrase is copied into this repository.

## R04 acceptance matrix

| Criterion | Test/action | Actual result | Status | Required next evidence |
| --- | --- | --- | --- | --- |
| R04-C01 | Verify portable export schema, count, age and hash | Owner reported valid schema/count/hash on November 9 | HISTORICAL_PASS_ONLY | Confirm this is the latest approved recoverable snapshot and record immutable source/time |
| R04-C02 | Enumerate all referenced original bytes and source bucket object pages | One local original matches 639 bytes/SHA-256, but full R2 object enumeration not recorded | NOT_EXECUTED (full enumeration) | Complete paginated listing with termination proof, compare every active reference |
| R04-C03 | Enumerate newest independent purge receipts without stale/partial pages | Empty UI prefix and empty owner-local ledger agree but S3 pagination is not proved | NOT_EXECUTED (complete listing) | Complete read-only source prefix listing under approved ceilings, compare export and receipt mirror hashes |
| R04-C04 | Run canonical recovery-bundle verifier and retain manifest | Historical Mac inspector passed; canonical manifest success not recorded | NOT_EXECUTED | Run local `scripts/recovery-bundle.mjs` on privately held approved bytes; record exit and sanitized manifest counts/hashes |
| R04-C05 | Encrypted independent retention/readback and key recovery | Local encrypted volume reported ready, off-device Drive copy/readback not established | NOT_EXECUTED | Confirm encryption, seal/eject image, upload encrypted image, download/readback, byte/hash compare, key-access exercise |
| R04-T01 | Remove an original: verifier rejects bundle | Expected by existing verifier design, not run in this session | NOT_EXECUTED | Run synthetic negative test in isolated environment |
| R04-T02 | Change an original byte: checksum rejects bundle | Expected by existing verifier design, not run in this session | NOT_EXECUTED | Run synthetic negative test in isolated environment |
| R04-T03 | Incomplete or stale receipt listing cannot pass acceptance | Contract requires fail-closed external pagination audit | PASS (policy review), NOT_EXECUTED (live proof) | Document complete current source enumeration and stop on discrepancy |
| R04-T04 | Metadata-only export cannot count as full recovery | JSON references original object keys but excludes bytes | PASS (contract review) | Preserve separate full-original and receipt evidence before upgrade |

**No R04 acceptance PASS was inferred from merely preparing documents.** Missing evidence is a dependency, not an invitation to regenerate production material or expand owner authorization.

## Exact safe continuation

1. Recheck [R03](R03_RESULT.md) authorization, identities and $0 operation limits immediately before any private source access. **Stop** if absent or expired. Scope B only; no production mutation, no new hosted backup, no new Cloudflare credential.
2. Use the owner's existing private files; enumerate remaining source objects/receipts read-only only where still necessary, with **10 pages, 20 HEAD/GET operations, 10 MiB** combined download ceiling, one existing hosted backup download and one portable export maximum. Do not redo already consumed allowance. Capture complete pagination termination and current receipt provenance without leaking keys.
3. Reconcile `items[].attachments[].object_key`, `size_bytes`, `content_hash` and referenced ownership against the exact bytes under private `objects/` paths. Reconcile current receipt prefix with newest independent receipt JSON mirror and export. Stop on overflow or disagreement.
4. Run the canonical **local-only** verification command with private paths (never Git-tracked):
   `node scripts/recovery-bundle.mjs <portable-json> <objects-directory> <independent-receipts-json> <new-manifest-json>`.
   Report exit, expected counts and non-sensitive hashes. Manifest must be mode-0600 and retained encrypted. Never overwrite an existing manifest.
5. On disposable synthetic fixtures, run `npm run recovery:bundle:test` and the existing D1 restore regression suites where an actual repository runner is available. A suite pass does not replace live source completeness or off-device readback.
6. Seal and eject the local encrypted image. Independently retain the sealed image off device, **read back** the encrypted copy and compare exact size/SHA-256. Confirm owner can recover the encryption key and access the readback copy. Retain the prior good set.
7. Only after every required piece passes should the operator change R04 to `VERIFIED`. R05 application-level isolated restore remains separate and requires Scope D approval and an exact nonproduction target.

## Current validation and stop decision

**Performed for this PR:** authenticated GitHub connector read of ticket contracts, November 9 authorization packet, runbook and historical issue comments. **Not performed:** Cloudflare private access, source object reads, direct Mac inspection, canonical recovery-bundle execution, negative fixture tests, full npm/CI tests, actual Drive upload/readback, or isolated restore.

**Stop:** Do not mark BG-32.021–.030 as completed from this record. Preserve all owner files and the older valid set. No new production operation, deployment, restore, SQL/R2 write, provider send or billable action is authorized. **R04 remains BLOCKED_INPUT, BG-32 and V1 remain NO-GO.**

<!-- prettier-ignore-end -->
