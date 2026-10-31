# BG-31 progress checklist and small-step completion guide

**Updated:** October 31, 2026 (America/New_York).

**Latest owner direction:** Prepare a reviewed Cloudflare deployment plan with
metered R2 billing risk accepted. See
[BG31-CF-REVIEW-2026-10-31.1](BG-31_CLOUDFLARE_REVIEW_2026-10-31.md).
This supersedes the local-only choice below for plan preparation; execution
awaits review of the concrete scope. No hosted action is checked by this decision.
**Canonical progress:** **78/100 complete; 22 deferred.**
**Owner choice:** Strict additional-$0, local operation only. Hosted completion
is deferred; production remains NO-GO. A request to finish quickly does not
change that choice or authorize deployment.

Use this file as the single day-to-day tracker. The
[canonical checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-31--100-executable-microtasks)
remains the authority for the 100 action states. The
[accepted fresh-install addendum](BG-31_FRESH_INSTALL_APPLICABILITY.md)
defines how first-release evidence can satisfy the affected actions. Do not
count the local checklist below as extra canonical actions or mark a deferred
action complete without its evidence.

## 1. Local work — reuse the completed evidence

- [x] Checkout and preserve the existing work; original preservation stash remains untouched.
- [x] Establish the persistent local app with external dispatch and paid AI disabled.
- [x] Verify note/URL/file capture, search, edits, protected original downloads and JSON/CSV exports.
- [x] Verify an isolated local restore without overwriting the working app.
- [x] Prepare a fresh recovery bundle with original bytes and separately read current local purge receipts.
- [x] Create and unlock an AES-256 encrypted disk image; calculate its SHA-256.
- [x] Owner reports uploading to Google Drive and downloading a separate copy; that downloaded file matches the recorded original checksum.
- [x] Restore from the downloaded encrypted copy into another isolated target; verify records, search, integrity, file hash and anonymous-download rejection.
- [x] Accept the fresh-install criteria and record the explicit local-only deferral.
- [x] Merge PR #135. Its [PR CI passed](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41113864650); merge SHA `711204003ac22bcd0becdd81818431f673cced5b`.
- [x] Owner confirmed password/account recovery works on October 31, 2026 (“Recovery works”). Owner-confirmed, not independently inspected; no password was shared with the agent.
- [x] Merge PR #136. Its [PR CI passed](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41212948339); merge SHA `dba812142bfc95fc078107751a8d812e18ec570a`.

**Local follow-up complete:** No local acceptance or backup task remains in this tracker. Continue local use/development; full BG-31 remains deferred at 78/100. The remaining sequence below is conditional on later resuming hosted work.

Evidence: [local acceptance](../verification/BG-31_LOCAL_ACCEPTANCE_2026-10-30.md),
[initial restore](../verification/BG-31_LOCAL_RESTORE_2026-10-30.md), and
[downloaded-backup/local handoff](../verification/BG-32_LOCAL_ONLY_HANDOFF_2026-10-30.md).
The latter includes the safe image checksum and private evidence locations.
Drive metadata and off-Mac password recovery were not independently inspected.
The purge ledger was empty; a nonempty anti-resurrection drill is not claimed.

## 2. What the owner should do now — no new hosting decision

### Step A: Secure the recovery password

1. Open your existing password manager. Use one you can recover or access without this Mac; do not buy a new service for this task.
2. Create an entry named `RecollectFlow backup — 2026-10-30`.
3. Copy the password from the separate private local file at `.wrangler/bg31-upload/keys/2026-10-30T16-50-23-857Z.txt` into that entry. Do not paste it into chat or a ticket.
4. Record which Google account/folder holds the encrypted backup, without putting the password in that Drive folder.
5. On another device or an independently recoverable session, confirm you can access both the Drive account and the password entry. Account access that depends only on this Mac is insufficient for loss-of-Mac recovery.
6. Tell the agent only: “The backup password and Google Drive account are recoverable without this Mac.” The agent can then check the owner-confirmation item above, labeling it owner-confirmed rather than independently observed.
7. Keep the local password file until the independent entry is confirmed. Do not delete any backup or the only usable password to tidy up.

If no independently recoverable password manager is available, leave the item
open and choose a separate secure existing recovery method. Do not claim this
step is done merely because the disk image unlocked on this Mac.

### Step B: Keep using the local app

1. If the app is stopped, open Terminal.
2. Run the existing launcher:

   ```bash
   /Users/mac/Documents/Projects/Recollect-Flow/.wrangler/bg31-local/start.sh
   ```

3. Open `http://127.0.0.1:8787/`.
4. Use the existing local login. Do not upload local credentials or simulator configs to Cloudflare.
5. Keep the persistent `.wrangler/bg31-local/state` directory intact.
6. After meaningful data changes, request a fresh dated encrypted backup. Retain the previous verified set until its replacement has been downloaded and verified.

### Step C: Stop repeating completed preparation

The local workflow is ready for continued local use. No new packaging framework,
backup script, browser rehearsal or documentation-only milestone is needed to
pretend the remaining hosted checks have progressed. Continue a concrete local
feature or bug task when requested. BG-31 remains deferred, not completed.

## 3. All 22 remaining canonical checks

**Every row is currently DEFERRED under the local-only decision.** These are the
release-readiness actions that still need evidence. They are not steps to run
now. Owner supplies policy/approvals and private access; engineer gathers safe
evidence and prepares changes. New deployments/live smoke are BG-32 work.

| Done | ID        | Evidence needed under the accepted fresh-install criteria                                                                   |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| [ ]  | BG-31.021 | Authenticated target Worker version, or observed absence before a first release; never invent a previous version.           |
| [ ]  | BG-31.022 | Actual target D1 schema/ledger, UUID and observation time.                                                                  |
| [ ]  | BG-31.023 | Comparison of the observed ledger against the candidate migrations.                                                         |
| [ ]  | BG-31.024 | Actual production D1 account/name/UUID.                                                                                     |
| [ ]  | BG-31.025 | Actual private production R2 identity and accepted cost controls.                                                           |
| [ ]  | BG-31.026 | Approved intended origin/routing under the accepted split; BG-32 later verifies the live origin.                            |
| [ ]  | BG-31.027 | Verified Notion destination, or explicitly accepted disabled scope supported by runtime/config evidence.                    |
| [ ]  | BG-31.028 | Verified Telegram destination, or explicitly accepted disabled scope supported by runtime/config evidence.                  |
| [ ]  | BG-31.031 | Exact pending forward migration filenames from the observed baseline.                                                       |
| [ ]  | BG-31.032 | Verified order of those pending migrations.                                                                                 |
| [ ]  | BG-31.033 | Review of tables affected by the actual pending delta.                                                                      |
| [ ]  | BG-31.034 | Review of indexes affected by that delta.                                                                                   |
| [ ]  | BG-31.035 | Review of backfills/data rewrites in that delta.                                                                            |
| [ ]  | BG-31.036 | Runtime/schema compatibility and interruption assumptions.                                                                  |
| [ ]  | BG-31.042 | Required deployment secret-name presence, without values; no placeholder readiness.                                         |
| [ ]  | BG-31.044 | Canonical origin/configuration verification and matched packaging.                                                          |
| [ ]  | BG-31.045 | Approved provider configuration for the actual first-release scope.                                                         |
| [ ]  | BG-31.046 | Evidence that enabled/disabled implementations match that approved scope.                                                   |
| [ ]  | BG-31.076 | Compatible preserved prior artifact, or accepted first-release absence evidence plus preserved candidate and recovery plan. |
| [ ]  | BG-31.077 | Schema-compatible rollback boundary or reviewed containment/forward-repair/isolated-restore plan.                           |
| [ ]  | BG-31.082 | Exact production mutation packet with actual targets, commands, artifacts and stop conditions.                              |
| [ ]  | BG-31.089 | Dated owner release authorization naming the exact packet, targets and artifact hashes.                                     |

## 4. Small steps for full BG-31 completion — only if hosted work resumes

There is no honest local-only sequence that turns the 22 deferred release checks
into passes under the current contract. If the owner later chooses to resume,
follow this sequence; none of it is authorized by this guide alone.

1. **Resolve cost protection first.** Review a concrete arrangement against strict $0. Follow the [cost-gate guide](BG-31_COST_GATE_2026-10-30.md). Existing allowances and alerts are not the verified cutoff required by the current policy. Do not create resources to experiment with billing.
2. **Approve a precise provisioning scope.** Engineer presents the account, new resource names and operations; owner approves that concrete scope. This is not deployment approval.
3. **Establish actual new targets.** Engineer records authenticated account/Worker/D1/R2/origin identities. Do not reuse unrelated resources, old account IDs by assumption, or local simulator UUIDs.
4. **Inspect and compare the actual D1 baseline.** Engineer reads schema/ledger, computes the pending delta, orders it and reviews every affected table/index/backfill and compatibility assumption. Local migrations do not substitute for this target observation.
5. **Set the first-release integration scope.** Owner decides which providers, if any, are enabled; engineer verifies runtime requirements and config. Disabled integrations must truly be disabled, rather than using dummy credentials to claim readiness. Outbound tests require their own scope.
6. **Prepare fresh credentials and recovery.** Engineer verifies secret names privately and records the applicable independent backup/operator/containment evidence. Reuse the downloaded local restore only for what it actually demonstrated; refresh data/receipts if an import is proposed. Code rollback does not undo SQL.
7. **Freeze the exact candidate.** Engineer updates canonical config/manifests using actual identities, builds matching Worker/Web artifacts, records hashes/toolchain and obtains green exact-candidate CI. No deploy yet.
8. **Review and authorize the packet.** Owner reviews the immutable artifacts, target identities, exact mutations, stop/recovery plan and remaining independent gates. Record the dated decision. Approving this tracker or merging its PR is insufficient.
9. **Reconcile the 22 rows.** Engineer links each row to its accepted criterion and observed proof, updates the canonical checklist/manifests consistently and runs their focused checks. Close BG-31 only when its required evidence exists; otherwise keep the exact blocker visible.
10. **Hand off to BG-32.** Actual migrations/deployment and live acceptance follow separately only when authorized and unblocked. BG-29.078, OPE-247 and V1 launch gates are not waived by BG-31 planning or local success.

## 5. Tracking rules

For each changed row, record evidence link/private identifier, date, observer,
source/target identity and result. Update the canonical checklist in the same
change. Keep user-confirmed facts distinct from independently observed facts.
A merge, green test, local emulator pass or checklist acceptance is not a live
release observation. Reuse valid evidence; do not rerun it to create activity.
