# BG-28 — Backup, restore and purge closeout

Status: **implementation and local-isolated acceptance candidate**. Close only after exact-head CI passes on the final evidence/checklist revision and the merged-main check is reviewed.

Tracking: [GitHub #97](https://github.com/anmolsansi/Recollect-Flow/issues/97), [PR #98](https://github.com/anmolsansi/Recollect-Flow/pull/98), [Linear OPE-343](https://linear.app/openclaw-neutron/issue/OPE-343/bg-28-backup-restore-and-purge-operator-procedures).

## Acceptance boundary

BG-28 delivers executable backup, restore and purge procedures with synthetic proof. It does **not** authorize production purging, Time Travel, new Cloudflare resources, account secrets, schedule activation or traffic switching. [BG-37](../RECOLLECTFLOW_BUILD_GUIDE.md) owns the larger independently hosted recovery drill. Approval of this code must never be mistaken for proof that an actual production R2 bucket or independent offline copy survived an outage.

## Contract outcomes

- Portable export retains versioned JSON for restore and CSV for reading. JSON records item/capture/job/URL evidence and attachment references only, with a disclosure that original bytes and credentials are absent.
- Original-byte backup is separate. The local recovery bundle verifier requires matching owner, unique R2 keys, matching sizes and SHA-256, and an independently preserved purge receipt list. It treats incomplete uploads as non-durable and rejects missing or tampered originals.
- Hosted JSON backups preserve immutable unique keys, verified R2 readback before complete, and ADR-031's 30-day retention. Cleanup never deletes unexpired verified bytes and never changes canonical item data in response to an R2 failure.
- Weekly hosted JSON creation is available on the existing Monday 02:15 UTC Cron only with an explicit `HOSTED_BACKUP_AUTOCREATE_ENABLED=true` and the `0025` migration. Failed periods remain visible and are not misreported as verified. It is **disabled by default**, and is not independent original-byte replication.
- Portable restore rejects missing `dry_run` or invalid mode with 422. Dry run reports missing/short originals. Real apply requires an intentionally clean target with adequate R2 originals and merges current purge receipts before inserting data.
- Permanent purge requires prior soft deletion, current edit version, a workflow-bound short-lived phrase and per-step confirmation. R2 or required Notion failure leaves a partial retryable workflow rather than reporting global completion.
- URL-acquisition evidence travels with portable JSON, is reindexed on restore and disappears during canonical purge. A missing Notion projection does not become canonical deletion authority.

## Test evidence

The complete [implementation-head CI #38961562402](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38961562402) passed on `0bfade0f87802203a4fda31a90a36e11f1087526`. It ran the repository check gate, workerd D1 migrations/tests, recovery-bundle Node checks, browser acceptance and Wrangler dry-run packaging.

Relevant isolated tests:

- `scripts/recovery-bundle.test.mjs`: nine independent-byte/receipt, corruption, ownership and traversal cases.
- `apps/worker-api/test/restore-explicit-mode.d1.spec.ts`: missing/invalid mode rejection.
- `apps/worker-api/test/restore-originals.d1.spec.ts`: missing/short R2 preflight, blocked apply and populated target preservation.
- `apps/worker-api/test/backup-schedule.d1.spec.ts`: Monday boundary, replay deduplication and visible failed backup creation.
- `apps/worker-api/test/backup-cleanup-bg28.d1.spec.ts`: expired-only cleanup, unexpired preservation and retryable R2 failure.
- Existing `backup-recovery.d1.spec.ts`, `purge-partial.d1.spec.ts`, `purge-r2-partial.d1.spec.ts`, `restore-purge-ledger.d1.spec.ts`, `restore-roundtrip.d1.spec.ts` and `source-acquisition.d1.spec.ts`: corruption, partial failures, anti-resurrection, FTS and URL-evidence recovery.

Subsequent documentation-only reconciliations also require an exact-head CI result. Some browser gate attempts have been intermittent on unrelated BG-16/BG-17 recovery scripts. Treat failures as failures and re-run the exact revision before final acceptance. Do not turn an earlier green run into a false later-head success claim.

## Independent replica and production exceptions

The only object copy exercised here is synthetic: an isolated worker test bucket and ephemeral `bg28-bundle-*/independent-objects` directory. The operator [recovery procedure](../RECOVERY_OPERATOR_PROCEDURE.md) specifies rclone bulk copy and separate newest purge-ledger preservation. No actual source/destination Cloudflare account IDs, credentials, independent R2 bucket contents or owner offline storage were inspected, created or modified by this task.

External acceptance must separately prove independent object listing, correct per-object hashes, complete independent receipt ledger, owner-approved retention, authorized migration/schedule activation, clean staging target identity, FTS/original read-back and safe traffic-switch/rollback. Those belong to operator rollout and BG-37, not evidence manufactured for BG-28.

## Final decision rule

For BG-28's **source-controlled implementation gate**: require all 100 checklist items to be truthfully supported by current isolated evidence, a green exact-head CI and an accepted PR. Only then close GitHub #97 / Linear OPE-343 and unlock planning for BG-29. Keep the operational Cloudflare account and independent disaster-recovery gates separately blocked until authorized evidence exists. Never merge a failing head or call BG-37 done.
