# BG-31 isolated local restore rehearsal — October 30, 2026

**Result:** PASS for the three synthetic records and one original PDF in the
October 30 local bundle. This is local recovery evidence, not production
recovery acceptance, independent storage proof or a BG-37 completion claim.

## Scope and identities

The owner requested the next local step after merging PR #132. Application
source: `48920093556ba398a44712de2c84086af379dac0` (documentation merge;
runtime unchanged from `e7f95af`). PR #132 CI passed before merge.
The rehearsal ran at approximately **08:27–08:30 UTC** on October 30, 2026.

| Role                | Local identity                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Source app          | `http://127.0.0.1:8787`, `.wrangler/bg31-local/state`                                         |
| Bundle              | `.wrangler/bg31-local/acceptance-2026-10-30T08-02-52.642Z/`                                   |
| Isolated target     | `http://127.0.0.1:8788`, `.wrangler/bg31-restore-20261030/state`                              |
| Target D1           | `recollect-flow-bg31-restore-20261030`, simulator UUID `00000000-0000-4000-8000-000000000032` |
| Target object store | `recollect-flow-bg31-restore-20261030-attachments`, local simulation                          |
| Private result      | `.wrangler/bg31-restore-20261030/evidence.json`                                               |

The target was newly created in a separate persistence directory. All 22
repository migrations through `0025_bg28_scheduled_backups.sql` applied
successfully with explicit `--local`. The config binds D1/R2 with `remote=false`,
contains no AI binding or Cron, mocks AI, and disables scheduled/HTTP/external
dispatch and backup auto-creation. Target tokens were regenerated privately;
no values are in this record. No hosted resource or provider was called.

## Observed checks

| Check                            | Observed result                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Preview before copying originals | HTTP 200, three planned items, one attachment problem with reason `missing`                                               |
| Apply while original missing     | HTTP 409, `RESTORE_ATTACHMENTS_UNAVAILABLE`                                                                               |
| Target after rejected apply      | SQL item count zero                                                                                                       |
| Original copy                    | Existing verified PDF copied with the identical object key into local target R2                                           |
| Preview after copy               | HTTP 200, three planned items, one checked attachment, no problems, zero skipped purged IDs                               |
| Explicit apply                   | HTTP 200, run state `complete`, restored count three                                                                      |
| Repeat apply                     | HTTP 409, `RESTORE_TARGET_NOT_EMPTY`                                                                                      |
| Integrity                        | `PRAGMA foreign_key_check` returned zero violations; canonical item count three                                           |
| Search                           | FTS `MATCH 'persistent'` returned the known note (one match)                                                              |
| Readback                         | All three IDs and their project, review date, privacy level, source URL, raw text and lifecycle status matched the export |
| Processing leases                | No restored processing job had an active lease owner or expiry                                                            |
| Private original                 | Authenticated download HTTP 200, 51 bytes, matching SHA-256; anonymous download HTTP 401                                  |
| Receipt ledger                   | Target SQL receipt count zero, consistent with the previously separately verified empty local source ledger               |
| Source preservation              | Source app still exported exactly its original three IDs after the rehearsal                                              |

Original PDF SHA-256:
`904636248025ad20fb9c6bd8b700179a2a42edb5df3636e926c7e09055ee3f75`.
The source bundle hashes and acquisition evidence remain in the
[local acceptance record](BG-31_LOCAL_ACCEPTANCE_2026-10-30.md).

## Procedure and preservation

Used the existing [recovery operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md),
Wrangler 4.116.0 local migrations/object upload, and the existing authenticated
`POST /api/v1/restore?dry_run=true|false` route. Each assertion was executed
against actual HTTP/SQL responses. No application change was necessary.
The temporary target server was stopped after verification; its database,
objects, config and private evidence remain ignored on this Mac. The original
local server and data were preserved. Never deploy either simulator config.

## Limits and next boundary

This exercise used only synthetic content and an empty purge ledger. It did
not exercise a nonempty newest-receipt anti-resurrection scenario, missing-byte
size mismatch, remote D1 behavior, provider delivery, browser interaction with
the restored target, or recovery after loss of this Mac. Independent encrypted
off-device storage and operator access remain unverified. The earlier browser
acceptance applies to the source app, not this restored target.

BG-31 remains **78/100**, production **NO-GO**, and BG-32 is not unlocked.
Use the [fresh-install applicability proposal](../releases/BG-31_FRESH_INSTALL_APPLICABILITY.md)
to review the remaining contract and evidence requirements.
