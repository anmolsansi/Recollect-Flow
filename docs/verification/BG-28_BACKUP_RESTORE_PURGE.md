# BG-28 — Backup, restore and purge acceptance evidence

**Tracking:** [GitHub #97](https://github.com/anmolsansi/Recollect-Flow/issues/97), [draft PR #98](https://github.com/anmolsansi/Recollect-Flow/pull/98), [Linear OPE-343](https://linear.app/openclaw-neutron/issue/OPE-343/bg-28-backup-restore-and-purge-operator-procedures).

## Scope and provenance

- Starting source: BG-27 merged main `bde4a3b70f0cb419e24c6a2dc72b82e44fac2f7b`. Main may have advanced while BG-28 work occurred.
- Work branch: `feat/bg-28-backup-restore-purge-operations`, target `main`.
- Environment: source-controlled Worker API + synthetic Node/isolated workerd D1/R2 fixtures. Production, external Cloudflare accounts, actual independent R2 copy jobs, and physical devices were **not** modified or tested in BG-28.
- Existing prerequisites: OPE-228 export/backup/restore/purge services and R2 receipts; BG-27 merged and verified. These are inherited, not new proof of disaster recovery.

## Changes and boundaries

| Area                  | Implementation                                                                                                                                                                             | Verification and limitation                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portable JSON and CSV | Existing `export.service.ts` retains portable JSON schema version, item counts, attachment manifest references and URL acquisition evidence; CSV remains a lossy owner-friendly projection | Existing OPE-228 unit/D1 coverage is reused. Neither format includes original R2 bytes or credentials                                                                                                                                                       |
| Independent originals | New `scripts/recovery-bundle.mjs` verifies an **already downloaded** owner-controlled set of original bytes by object key, size and SHA-256, plus a separately supplied receipt array      | Six synthetic offline Node tests prove success, absent/short/tampered object, path traversal and stale receipt subset rejection. Tool does not collect from Cloudflare                                                                                      |
| Hosted backup         | Existing `BackupService` creates private immutable verified JSON with R2 readback; 30-day expiry cleanup remains                                                                           | Existing `backup-recovery.d1.spec.ts` and retention tests cover readback, mismatch and failed attempt retaining live item                                                                                                                                   |
| Weekly creation       | New `migrations/0025_bg28_scheduled_backups.sql` and `backup-schedule.ts` implement an idempotent weekly creation claim using the existing Monday UTC 02:15 digest Cron                    | **Disabled by default**. `HOSTED_BACKUP_AUTOCREATE_ENABLED=true` requires explicit authorization and migration on chosen environment. Only JSON metadata artifact, not independent original-byte replication. A failed period does not automatically re-run |
| Restore               | Admin route rejects omitted/invalid `dry_run` (422). Dry run shows R2 attachment preflight `checked`/missing/size-mismatch; apply refuses those errors before item insertion               | `restore-explicit-mode.d1.spec.ts`, `restore-originals.d1.spec.ts`, existing `restore-roundtrip.d1.spec.ts` and `restore-purge-ledger.d1.spec.ts` validate local behavior. Head/size check is not a SHA-256 download                                        |
| Purge                 | Existing two-stage version-bound confirmation, resumable ordered steps, durable non-content D1/R2 receipts; URL evidence tied to canonical item                                            | Existing `purge-partial.d1.spec.ts`, `purge-r2-partial.d1.spec.ts`, `restore-purge-ledger.d1.spec.ts` and `recovery-integrity.d1.spec.ts` are reused                                                                                                        |
| Operator steps        | [Recovery operator procedure](../RECOVERY_OPERATOR_PROCEDURE.md), API, Operations and Build Guide link exact controls and manual rollback boundaries                                       | Documentation is not evidence of a performed live backup or deployed scheduler                                                                                                                                                                              |

## Current local/CI evidence

- Initial BG-28 exact-head CI [#38956698297](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38956698297) failed at Prettier. Its six isolated offline Node bundle tests **passed**. Do not treat this as a green gate.
- Full implementation-head CI [#38961562402](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38961562402) **passed** on `0bfade0f87802203a4fda31a90a36e11f1087526`, including the repository check gate, isolated D1 migration/test suite, browser suite and Wrangler deployment dry-run. This is local code acceptance, not a production recovery drill.
- Follow-up checklist reconciliation is checked by [#38961878988](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38961878988); inspect its completed status before treating the documentation/head as accepted.
- Scheduler integration test checks UTC Monday bucket, one verified artifact per replayed period, and failed period without a falsely complete artifact.
- New D1 restore tests must be run with workerd-based Vitest and migrations, not only Node unit tests.

## External exception register

1. Independent account/bucket or offline storage **not provisioned or copied**. The offline checksum tool is not evidence that actual production originals were replicated.
2. Owner-approved weekly automatic backup switch is **not enabled**. The existing hourly Cron still runs expiry cleanup; the weekly trigger creates JSON only when explicitly configured and migrated. Activation and ongoing monitoring need operator authorization.
3. No complete clean recovery D1/R2 deployment, restore of real attachments, or production traffic switch was performed. BG-37 owns fully independent disaster recovery and physical incident handling.
4. No destructive purge of production data or cloud Time Travel restore was attempted. Existing isolated tests are the only relevant deletion evidence.
5. End-to-end source bucket listing/receipt mirror freshness, backup copy protection and operator-access verification remain environment-specific. Never report an absent external permission check as successful.

## Isolated synthetic acceptance mapping

- Corrupt hosted JSON: `backup-recovery.d1.spec.ts` rechecks read-back SHA-256/size and refuses tampered hosted objects without changing canonical items.
- Populated restore target: `restore-originals.d1.spec.ts` rejects real apply with `RESTORE_TARGET_NOT_EMPTY` and confirms the existing item remains.
- Missing/short original: restore dry run reports `attachmentReadiness.problems`, and apply returns `RESTORE_ATTACHMENTS_UNAVAILABLE` without insertion.
- Wrong owner, duplicate key, modified or absent independent original: the nine offline `recovery-bundle.test.mjs` cases fail safely before generating a success manifest.
- Partial purge: `purge-r2-partial.d1.spec.ts` and `purge-partial.d1.spec.ts` preserve canonical D1 while R2 or required Notion work fails; steps remain independently retryable.
- Old-backup anti-resurrection: `restore-purge-ledger.d1.spec.ts` restores against a newer private R2 receipt and skips the permanently purged item.
- URL evidence: `source-acquisition.d1.spec.ts` contains a single URL evidence export, clean restore, FTS query and canonical purge round trip.
- Hosted expiry: `backup-cleanup-bg28.d1.spec.ts` proves expired-only R2 deletion, preservation of unexpired bytes and no false expiry on a failed delete.

**Synthetic artifact identity:** source data and R2 objects are controlled `cloudflare:test` bindings or Node fixture bytes, not actual production. The offline Node fixture writes an independent-object tree at an ephemeral OS path shaped like `bg28-bundle-*/independent-objects/uploads/synthetic/original.pdf`. Its manifest is checked in memory and test files are removed after the test. No actual owner-held backup, Cloudflare account ID, hosted independent bucket, provider permissions or remote traffic route is represented by that path.

**Further operator evidence needed before deployment or BG-37:** independently retained original objects with owner-approved retention, complete external purge receipts (including newer-than-export receipts), source and destination account/bucket identities, signed-off replica byte hashes, migration+target binding verification, explicit schedule activation/monitoring decision and independent recovery drill.

## Release decision

Treat source/CI acceptance independently of operational rollout. Any CI failure or unresolved code concern keeps PR #98 draft. Operator-account and production recovery gates remain blocked until separately authorized evidence exists. Do not mark BG-29 unlocked based solely on this document.
