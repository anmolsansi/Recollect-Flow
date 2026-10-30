# BG-31 completion roadmap

**Updated:** October 30, 2026.
**Current status:** 78/100 canonical actions; 22 open. Local acceptance and isolated synthetic restore passed. Cloudflare execution deferred by the owner. Production remains NO-GO.

BG-31 produces an evidenced, authorized release packet. BG-32 executes deployment and live acceptance. This roadmap does not authorize hosted operations or change acceptance criteria.

## 1. Confirm the merged source is green

**Owner:** Engineer.

PR #133 merged as `aab88010080b0ad9436b191a695a5436055e6633`.
Its [PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41026842166)
failed with `Timed out waiting for Chrome DevTools endpoint` during BG21 hosting verification.
The preceding static/API route matrix passed. This observation does not establish the root cause or prove the full suite passes.
The [merged-main run](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41051034420)
completed successfully. The merge checkpoint is green; the preceding PR failure does not establish a reproducible application defect.

- [x] Inspect the merged-main result: SUCCESS. If it fails, investigate the failing check; repair a reproducible issue and rerun the appropriate checks.
- [x] Record passing CI for the source used in subsequent preparation (`aab8801`, run `41051034420`). Final release-candidate CI will be needed again after configuration changes.

**Exit:** Verified green source checkpoint. Do not deploy or claim green CI from the merge alone.

## 2. Explicitly settle the fresh-install contract

**Owner:** Repository owner decides; engineer records it.

Review [BG31-APPLICABILITY-2026-10-30.1](BG-31_FRESH_INSTALL_APPLICABILITY.md).
Merging its proposal did not itself accept changed criteria.

- [x] Owner explicitly accepted revision `BG31-APPLICABILITY-2026-10-30.1` in the October 30 chat continuation. A decision can say: “I accept BG31-APPLICABILITY-2026-10-30.1 for the fresh installation. Cloudflare execution stays deferred.”
- [x] Record the decision in the applicability addendum and canonical checklist/human/JSON manifest; run existing consistency tests. Preserve evidence status; do not mark substitutes passed before their evidence exists.
- [ ] Agree whether Notion, Telegram and AI remain disabled for this first release. Verify source/runtime requirements support that scope; placeholders are not provider readiness.

**Exit:** A single accepted set of criteria for the 22 remaining actions, including first-release recovery and intended-origin versus deployed-origin checks.

## 3. Resolve the strict-$0 hosting decision before provisioning

**Owner:** Owner sets the cost policy; engineer verifies a concrete arrangement.

Current approved path is local now, Cloudflare later. Existing R2 included allowances and billing alerts do not establish an enforceable additional-$0 cap.

- [ ] Verify a concrete storage/account arrangement satisfies the strict-$0 requirement before proposing hosted execution.
- [ ] If none can be verified, choose between staying local, separately approving an alternative storage architecture, or explicitly changing the cost policy. No alternative has yet been selected or implemented.
- [ ] Keep Cloudflare execution blocked while this is unresolved. Do not provision resources just to discover whether they are safe to use.

**Exit:** Documented acceptable cost boundary, or a truthful local-only/hosted-blocked disposition. There is no verified shortcut that closes the cloud-ready gate today.

## 4. Establish actual fresh targets and migration evidence

**Owner:** Engineer, after scoped owner authorization and step 3.

Use the [fresh-account manifest](BG-31_FRESH_ACCOUNT_MANIFEST.md). Its names are proposals, not created resources.

- [ ] Prepare the exact provisioning scope for owner approval: account, new D1/private R2 names and operations. Keep deployment approval separate.
- [ ] Once authorized, establish actual target identities without reusing staging/unrelated resources.
- [ ] Record authenticated Worker absence/version evidence and the new D1 schema/ledger with UUID and observation time.
- [ ] Compare the observed ledger with the candidate; list pending SQL in order and review affected tables, indexes, backfills and compatibility. There are 22 repository migration files, but the observed target determines the delta.
- [ ] Record the intended origin/routing and approved integration capability/destination state.

**Exit:** Real evidence for target identity, baseline and migration delta; proposed names and local simulator IDs cannot satisfy this step.

**Action coverage:** BG-31.021–.028, .031–.036, subject to the accepted addendum.

## 5. Finish credentials, recovery and first-release containment

**Owner:** Engineer and designated release/restore operator; owner supplies private storage/access decisions.

- [ ] Generate new deployment credentials; verify required secret names privately. Never upload local simulator credentials or publish values.
- [ ] Verify approved provider settings, disabled dispatch/Cron and canonical origin configuration.
- [ ] Preserve the required export, original bytes and newest purge receipts in verified encrypted owner-controlled storage outside the source failure domain. Verify restore operator access.
- [ ] Reuse the [passing synthetic local restore](../verification/BG-31_LOCAL_RESTORE_2026-10-30.md) for its demonstrated scope. It does not prove independent storage, remote restore or a nonempty purge anti-resurrection scenario; satisfy any remaining recovery requirements explicitly.
- [ ] Record the fresh-install pre-change state and containment procedure. Preserve D1/R2 data on failure; define reviewed forward repair or isolated restore. No previous artifact exists in a genuinely new installation, and rolling back code never reverses SQL.
- [ ] Verify the existing private operational contact/access prerequisites. Any test message requires separate send authorization.

**Exit:** Credential/config evidence and an accepted, operable recovery/containment plan.

**Action coverage:** BG-31.042, .044–.046, .076–.077, plus recovery/operational prerequisites.

## 6. Freeze and approve the exact release packet

**Owner:** Engineer prepares; repository owner authorizes.

- [ ] Review canonical config using actual target identities. Never deploy `.wrangler/bg31-local/` or `.wrangler/bg31-restore-20261030/` configs.
- [ ] Freeze source SHA, matched Worker/Web artifacts, hashes, release ID, toolchain/config identity and passing exact-candidate CI. Use existing `npm run release:package` tooling; do not run the deploy command at this stage.
- [ ] Record exact planned mutations, migration filenames/commands, smoke scope, stop conditions and recovery references in the canonical human/JSON release packet.
- [ ] Reconcile every remaining action to accepted criteria and concrete evidence. Re-run focused manifest/readiness/ledger/impact checks after updates.
- [ ] Obtain dated owner authorization naming the packet revision, target identities and exact artifact hashes. Approval of a roadmap or addendum is insufficient.

**Exit:** BG-31 can close only when its accepted required evidence and authorization exist. If an independent release prerequisite remains open, record the resulting NO-GO; do not imply a launch waiver.

**Action coverage:** BG-31.082 and .089, final artifact/manifest consistency and completion gate.

## 7. Hand off to BG-32

**Owner:** Authorized release operator.

- [ ] Hand the immutable packet and explicit gate status to BG-32.
- [ ] Resolve BG-29.078, OPE-247 and other applicable release prerequisites before a production GO. Their development exception does not waive live acceptance.
- [ ] Only when authorized and unblocked, BG-32 performs forward migrations, deployment and live checks: actual version/origin, authentication, capture/replay, download privacy, search, deep links and logs.
- [ ] Keep any provider tests separately scoped and authorized.

**Exit:** Deployment/live acceptance has its own evidence; completing release planning does not establish a deployed application.

## Immediate next action

Merged-main CI and the explicit applicability decision are complete. Proceed to the [cost-gate decision](BG-31_COST_GATE_2026-10-30.md); stay local until step 3 has an acceptable outcome. Do not repeat the already-passing local capture/export/restore work unless source changes invalidate it.
