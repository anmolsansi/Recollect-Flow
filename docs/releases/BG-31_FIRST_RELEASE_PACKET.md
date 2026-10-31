# BG-31 first-release candidate — owner review

**Decision:** NO-GO until exact packet review and required release-gate resolution.
This is preparation for the explicitly requested fresh Cloudflare release;
creation of the D1/R2 targets was separately authorized and completed.
Metered R2 risk is accepted. No Workers plan upgrade, provider sends, paid AI,
production migration, secret upload or Worker deployment has been performed.

## Scope and observed targets

| Target                     | Value                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Account                    | `a9482fbfb91ace26dee097cbd41293f9`                                                    |
| Worker                     | `recollect-flow`; authenticated inventory currently shows it absent                   |
| D1                         | `recollect-flow-prod-v2`, UUID `76bd35c6-c833-4987-a47e-6aa8238bb832`                 |
| R2                         | `recollect-flow-attachments-prod-v2`, private Standard, APAC                          |
| Intended origin            | `https://recollect-flow.openclawneutron.workers.dev`                                  |
| Observed account subdomain | `openclawneutron`, refreshed through authenticated metadata                           |
| New D1 baseline            | Only internal `_cf_KV`; no app tables or migration ledger; query reported zero writes |

Core scope: capture notes/URLs/files, search, edits, private original downloads
and exports. Start with an empty app; no local/old data import. Processing jobs
can remain pending: URL fetching, extraction/enrichment, Notion sync, Telegram
and hosted backup scheduling are not enabled by this first-release candidate.
The AI binding remains declared but the enabled provider list is empty and the
implementation map is empty. No AI invocation or mock result is claimed.

All hosted scheduled/external/HTTP dispatch and automatic-backup flags are
explicitly false; digest AI is false and Cron absent. Optional Notion/Telegram
credentials are absent, not dummy strings. Notion recovery clients now reject
missing/blank credentials before network calls; Telegram already did so.
Core required secrets are `CAPTURE_TOKEN`, `ADMIN_TOKEN`, `LOCAL_WORKER_TOKEN`
and `WEB_INBOX_BASE_URL`. Fresh private values are prepared in an ignored
mode-0600 file; source and public artifacts contain no values. Secret installation
is part of the later approved atomic deploy using `--secrets-file`.

## Immutable packet location and approval identity

The actual frozen source SHA, exact-head CI URL, Worker/Web artifact hashes,
release ID, configuration/SQL hashes and local file paths are written after
source commit/build to the ignored local file:

`.wrangler/bg31-cloudflare-candidate/release-packet.json`

That receipt is the exact-build approval identity; this tracked preparation
chapter is not a substitute. Artifacts are preserved below a source-SHA directory,
separately from the mutable working `apps/web/dist`. Do not rebuild a different
candidate after approval or substitute a later checkout. Source manifest candidate
slots remain unpromoted until the release decision; target observations are
recorded there separately from artifact/release authorization.

## Ordered SQL and recovery review

All 22 files were inspected against the authenticated fresh baseline. Numbering
gaps 0011–0013 are intentional. Exact filenames and SHA-256 values are retained
in the immutable packet and existing lexical impact report. Runtime requires
the complete schema through 0025; do not expose traffic after partial migration.

| File | Reviewed effect and first-release consideration                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0001 | Creates items, attachments, jobs, sync, usage and audit tables with indexes/foreign keys.                                                                                                                                        |
| 0002 | Adds capture events/deduplication; backfills existing items. Fresh target has no source items.                                                                                                                                   |
| 0003 | Rebuilds attachments via copy/drop/rename; installs linkability/link triggers. Zero legacy rows expected, not a safe down-migration.                                                                                             |
| 0004 | Adds privacy/provider/policy snapshots to jobs.                                                                                                                                                                                  |
| 0005 | Rebuilds processing jobs with hosted policy fields and indexes; deferred foreign-key handling.                                                                                                                                   |
| 0006 | Adds capture request fingerprints and index.                                                                                                                                                                                     |
| 0007 | Adds job/sync leases and indexes.                                                                                                                                                                                                |
| 0008 | Rebuilds sync attempts with availability; repairs missing processing leases.                                                                                                                                                     |
| 0009 | Adds item projection/review fields, results/control structures, duplicate-work closure, Notion queue backfill, uniqueness/indexes and projection trigger. Seeds processing-control metadata; this does not permit provider work. |
| 0010 | Adds enrichment/override fields/table/indexes and usage metadata.                                                                                                                                                                |
| 0014 | Rebuilds job policy/results while preserving child references; remaps legacy provider eligibility.                                                                                                                               |
| 0015 | Creates extraction records with attachment/item foreign keys.                                                                                                                                                                    |
| 0016 | Creates/backfills FTS5 and insert/update/delete synchronization triggers.                                                                                                                                                        |
| 0017 | Adds edit-version/deletion state and feedback events.                                                                                                                                                                            |
| 0018 | Adds duplicate target reference/index.                                                                                                                                                                                           |
| 0019 | Creates digest runs/deliveries/audit tables and indexes; no schedule is enabled.                                                                                                                                                 |
| 0020 | Creates AI quota/reservation/breaker structures; schema is not provider approval.                                                                                                                                                |
| 0021 | Creates backup, purge/receipt, restore and integrity structures with standalone receipt ledger.                                                                                                                                  |
| 0022 | Adds immutable URL evidence/source generations, rebuilds FTS with source text and replaces/adds triggers; code rollback cannot restore the prior table.                                                                          |
| 0023 | Adds processing generations/indexes and current-epoch triggers; old historical evidence remains nullable.                                                                                                                        |
| 0024 | Creates current processing views and four status triggers; requires preceding generation/evidence schema.                                                                                                                        |
| 0025 | Creates weekly backup-period metadata/index; does not activate backups.                                                                                                                                                          |

Before applying anything, reconfirm target UUID and fresh schema. Stop for
unexpected app data, ledger rows, hash drift or conflicting target identity.
Use the existing migration tool in source order, record each durable outcome,
and inspect the actual ledger/schema after any interruption. Never run all SQL
again blindly; table rebuilds and backfills are not generally idempotent.

Pre-change state is the authenticated empty new installation, with no old Worker
artifact. Preserve that metadata and exact first-release artifacts. The existing
encrypted local backup and downloaded-copy restore cover the local source;
they are not a remote pre-change D1 backup. No import is included. Once remote
captures exist, refresh exports/originals/newest receipts and independent copies
before recovery work. Owner password/account recovery is owner-confirmed.

On failure: stop ingress to the new Worker using its account dashboard route/
workers.dev controls, keep dispatch/Cron off, preserve D1/R2, logs and backups.
Do not delete the Worker/database/bucket or touch old/staging/unrelated resources.
No previous app exists to roll back to. Code rollback never undoes schema;
choose reviewed forward repair or separately authorized isolated restore.

## Proposed exact execution sequence — not executed

After exact-build approval and release-gate resolution, the operator will:

1. Validate every hash against the immutable packet, account/Worker absence,
   current private bucket and unchanged fresh D1 baseline. Stop on mismatch.
2. Apply the packet's 22 reviewed migrations with the frozen configuration and
   pinned account, using `wrangler d1 migrations apply DB --remote --config ...`.
   Reconfirm the actual UUID resolved by `DB` before mutation. Record ledger and
   integrity results before any application traffic.
3. Deploy the preserved bundled entry with `--no-bundle`, the frozen canonical
   configuration and preserved Web assets, and provide the private four-key
   JSON using `--secrets-file`. This supported flag installs secrets with the
   Worker version; no placeholder Worker or separate dummy-secret deployment is
   needed. Exact absolute paths/arguments are in the immutable packet.
4. Record actual deployment/version, bindings and HTTPS origin. Confirm homepage,
   direct routes, health, session, anonymous denial and no provider dispatch.
5. Perform only the reviewed synthetic smoke: at most one note, one URL record
   without fetching, and one small PDF, with replay/search/private readback. No
   load test, provider delivery or automatic purge. Inspect safe logs and usage.
6. Record each outcome; do not mark BG-31/BG-32/V1 complete from upload success.

## Cost controls and remaining review items

R2 is metered; included allowances are not a hard cap. The proposed $1 warning,
$5 stop/review and 1 GB upload-pause thresholds remain manual operating controls,
not guaranteed invoice limits. They have not been configured as billing alerts.
Do not upgrade Workers or enable paid AI. The CLI's account-subscription read
returned 403; current Workers plan requires owner confirmation or independent
billing read before a deployment GO. See the
[detailed cost/operation review](BG-31_CLOUDFLARE_REVIEW_2026-10-31.md).

BG-29.078 and OPE-247 remain independent release prerequisites in the canonical
manifest. Their proof is not created by this candidate or by accepting metered
R2 for this installation. An exact-build deployment approval cannot silently
waive them. Resolve the required gate disposition explicitly before execution.
The private contact/notification prerequisites also must not be assumed from a
password recovery confirmation; no email or provider test is authorized here.

## Small steps for the owner after preparation

1. Review the source PR and its exact-head CI result; merge only after checks
   pass. Merging alone does not authorize deployment.
2. Confirm the current Workers plan name in the verified account; share no
   billing details. No upgrade will be made automatically.
3. Review the immutable packet's source SHA, targets, hashes, narrow core-only
   scope, cost thresholds, recovery procedure and unresolved prerequisite list.
4. Resolve any prerequisite decisions; then give a dated approval naming that
   exact packet revision/source/artifacts and operations. Do not approve an
   unspecified “latest build”.
5. The agent can then perform only the unblocked authorized operations. Log in
   on the verified deployed origin after live checks; keep local data/backups.
