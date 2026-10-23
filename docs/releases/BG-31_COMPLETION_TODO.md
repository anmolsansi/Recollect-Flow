# BG-31: Ordered completion to-do list

**As of:** 2026-10-23.
**State:** 76/100 canonical steps supported; 24 remain unchecked. Production **NO-GO**.
**Branch:** `feat/bg-31-release-manifest`.
**Tracking:** [GitHub issue #119](https://github.com/anmolsansi/Recollect-Flow/issues/119), [draft PR #120](https://github.com/anmolsansi/Recollect-Flow/pull/120), [Linear OPE-345](https://linear.app/openclaw-neutron/issue/OPE-345/bg-31-prepare-the-v1-release-manifest-without-production-changes).

## Rules before starting

- Strict **$0 additional spend**. No deployment, remote mutation, R2 object operations, provider calls, messaging, or billing-risk testing.
- The owner's BG-29.078 downstream exception permits **development**, not an acceptance waiver or release authorization.
- Never share tokens, full credentials, private Telegram chat IDs, personal URLs, attachment bytes, or source content in this issue.
- An unknown check stays open. Approval must name an immutable exact release, not a branch label or general permission.
- Read-only account inventory is a *separate proposed step*. It has **not** been authorized by this to-do list.

## Work in this order

### 01. Confirm release operator and direct emergency contact

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Owner.
- **Checklist:** `BG-31.079`, `BG-31.081`.
- **Provide or verify:** Named execution operator, direct emergency contact and fallback channel, acknowledgement protocol. No telephone numbers or secrets in GitHub.
- **Current blocker:** No channel chosen or tested.

### 02. Authorize metadata-only inventory

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Owner + operator.
- **Checklist:** `BG-31.021`, `BG-31.024`, `BG-31.025`, `BG-31.026`.
- **Provide or verify:** Account/Worker revision; D1 UUID; R2 bucket identity, without listing or reading objects; current HTTPS Web origin and timestamp.
- **Current blocker:** Explicit scoped read-only permission required; no live calls yet.

### 03. Inspect D1 applied migrations without writing

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Owner + engineer.
- **Checklist:** `BG-31.022`, `BG-31.023`, `BG-31.031`, `BG-31.032`, `BG-31.033`, `BG-31.034`, `BG-31.035`, `BG-31.036`.
- **Provide or verify:** Applied filenames ordered from verified D1 account/UUID with UTC timestamp, then run offline `node scripts/bg31-migration-ledger.mjs` and review only actual pending SQL for tables, indexes, data backfills and code compatibility.
- **Current blocker:** Read-only live ledger currently prohibited until separately authorized; no remote migration.

### 04. Confirm configured destinations, secrets and approved features

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Owner + operator.
- **Checklist:** `BG-31.027`, `BG-31.028`, `BG-31.042`, `BG-31.044`, `BG-31.045`, `BG-31.046`.
- **Provide or verify:** Notion destination label/fingerprint; Telegram destination description only; secret *name/presence* matrix, Web origin, enabled providers and model/permission status. Never paste secret values, provider tokens or chat IDs.
- **Current blocker:** Presence/permission checks only after separate owner read authorization; no AI, Notion or Telegram sends.

### 05. Prove previous-artifact and schema rollback safety

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Engineer + operator.
- **Checklist:** `BG-31.076`, `BG-31.077`.
- **Provide or verify:** Exact last-known-good immutable Worker/Web asset identity; hash and config; recorded compatibility against the *actual* applied D1 ledger. If no safe old build exists, document tested forward repair/restore and keep GO blocked.
- **Current blocker:** Historic Git commit alone is not a preserved deployable artifact.

### 06. Freeze exact mutation scope and approval reference

- [ ] **Status:** awaiting required evidence.
- **Responsible:** Owner.
- **Checklist:** `BG-31.082`, `BG-31.089`.
- **Provide or verify:** Dated authorization reference explicitly naming final release SHA, Worker/Web hashes, target account/DB/bucket, reviewed migration delta, backup receipt proof, approved commands, emergency owner/operator, financial guard and allowed messages (if any).
- **Current blocker:** The existing BG-29 $0 development exception is NOT production authorization.

## Independent recovery and release blockers

- [ ] A current D1 export and an **independent** verified copy of original R2 attachment bytes with newest anti-resurrection purge receipts. Store in approved protected storage. A JSON export alone is insufficient. **No copy or restore has been performed here.**
- [ ] An authorized isolated restore dry run, source-compatible code fallback, and measured recovery evidence. This is a separately authorized BG-28/BG-37 operation, not a source-only check.
- [ ] BG-29.078 real-hosted multistage hourly proof remains **DEFERRED / NOT VERIFIED**. Do not incur R2 charges for it without a guaranteed $0 procedure.
- [ ] OPE-247 consolidated operational hardening remains **In Progress**. BG-31 source work does not close it.
- [ ] BG-32 release operation requires an **independent** signed-off manifest and cost proof. This plan does not authorize BG-32.

## Completed preparation (do not repeat)

- [x] Human and machine-readable NO-GO release manifests with full source migration order, required binding names, stop/smoke stages, recovery plan and missing live proof.
- [x] Offline `npm run bg31:manifest:test`, `npm run bg31:ledger:test`, `npm run bg31:readiness:test` integrated into `npm run check`.
- [x] [Source-only exact-head CI #39882760894](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39882760894) passed at `8d4836a769edf58c18af4b6849b6ef111bee90aa` before this planning addendum.

## The first action for the owner

Confirm **who** will act as the future release operator and restore operator, and identify a direct emergency contact method privately. Then decide whether to grant **metadata-only, read-only** Cloudflare inventory authorization, with no D1/R2 writes, no object downloads, no provider calls and no spending risk. No owner response is treated as blanket deploy permission.

## Evidence receipt per action

Record the task ID, observer, UTC timestamp, source account/resource identity in a **private** record, command or source used, exact nonsecret result, whether cost risk was excluded, and the immutable evidence reference. Recheck against the final candidate SHA before claiming a step verified.

**Close BG-31 only when every canonical required action is actually evidenced or the task's acceptance scope is explicitly revised by the owner.** A source-complete draft can be reviewed earlier, but it must not claim operational acceptance or unlock deployment.
