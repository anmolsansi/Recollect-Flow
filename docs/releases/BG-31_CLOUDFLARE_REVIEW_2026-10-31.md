# BG-31 Cloudflare deployment and cost-control review

**Revision:** `BG31-CF-REVIEW-2026-10-31.1`.
**Status:** Stage A explicitly authorized, executed and verified on October 31. Production deployment remains NO-GO.

See the [stage-A creation evidence](../verification/BG-31_STAGE_A_PROVISIONING_2026-10-31.md). D1 UUID: `76bd35c6-c833-4987-a47e-6aa8238bb832`; the private Standard R2 bucket is created with public development access disabled and no custom domains. Stage B remains unexecuted. Earlier access/creation statements below describe the pre-creation review checkpoint.
**Owner decision, October 31:** “Allow metered R2 billing risk; prepare the exact deployment and cost-control plan for my review.” This supersedes local-only/strict-$0 for preparation of this R2-backed release plan. It does not approve a Workers Paid upgrade, paid AI, provider messages, resource creation or deployment before review. Other acceptance and billing constraints are not waived.

The original deployment request authorizes preparing a fresh installation. The later cost-policy answer expressly requests review of the concrete plan first. No BG-31 action is checked merely because that policy changed. BG-31 remains 78/100.

## 1. Verified source and immediate access blocker

Application/source checkout: `dba812142bfc95fc078107751a8d812e18ec570a`.
[Exact merged-main CI passed](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41214933664).
There is a local tracker edit recording owner-confirmed backup recovery; preserve it. This is not a frozen deployment candidate because the final target configuration has not been prepared.

The initial Wrangler 4.116.0 `whoami` attempt failed because OAuth credentials had expired. The owner subsequently completed login; a new `whoami` on October 31 confirmed account `a9482fbfb91ace26dee097cbd41293f9`. Authenticated D1 inventory contains only `recollect-flow-bg29-staging`; R2 bucket metadata contains only `propertyos-media`. Neither proposed fresh resource exists in those inventories. No bucket objects were listed or read. Current Workers subscription, Worker inventory and subdomain still need separate verification before creation. The login command below is retained for recovery only; it does not need repeating now:

```bash
cd /Users/mac/Documents/Projects/Recollect-Flow
./node_modules/.bin/wrangler login
```

Sign in with the accessible account owner and approve the normal Cloudflare OAuth screen. Do not paste credentials or tokens into chat. After login, the engineer must confirm account identity before every remote command. Stop if it differs from the proposed account below. CLI login recovery is not permission to mutate resources.

## 2. Proposed exact target scope — identities not yet refreshed

| Resource | Intended value                                              | Current certainty                                                              |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Account  | `a9482fbfb91ace26dee097cbd41293f9`                          | Verified by authenticated `whoami` October 31                                  |
| Worker   | `recollect-flow`                                            | Name proposed; check absence/collision before creation                         |
| D1       | `recollect-flow-prod-v2`, binding `DB`                      | Not created; actual UUID must come from successful creation                    |
| R2       | `recollect-flow-attachments-prod-v2`, binding `ATTACHMENTS` | Not created; private Standard bucket proposed                                  |
| Origin   | `https://recollect-flow.openclawneutron.workers.dev`        | Proposed from historical account subdomain; current subdomain must be verified |
| Web/API  | One Worker with `ASSETS` from `apps/web/dist`               | Existing repository pattern                                                    |

Do not touch the old account/Worker, `recollect-flow-bg29-d1-cron-probe`, BG-29 staging D1, or `propertyos-media`. No custom domain, DNS change, public R2 access, old-data import, local-data import or unrelated resource deletion is included. Start the fresh app empty; existing local data and encrypted recovery copies remain intact.

## 3. Cost exposure and proposed controls

Official documentation checked October 31:

- [R2 pricing](https://developers.cloudflare.com/r2/pricing/): Standard includes 10 GB-month storage, 1 million Class A and 10 million Class B operations monthly. Beyond included usage: $0.015/GB-month, $4.50/million Class A and $0.36/million Class B, with billing-unit rounding. Egress is free. The allowance is not a separate guaranteed allocation for this new bucket; other account activity matters. No zero-dollar invoice is promised.
- [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/): notifications do not pause or cap usage.
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): Free versus Paid quotas/prices differ. The plan intends to retain Workers Free; inspect the actual account plan before proceeding. Stop for review if a Paid upgrade is needed.

| Control                   | Proposed setting/action                                                                                                   | Guarantee/limit                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Account plan              | Retain existing Workers Free if verified; no plan upgrades                                                                | Account state not yet refreshed; upgrade requires review                                          |
| R2 storage                | Standard only; private bucket; no public/custom-domain endpoint                                                           | Avoids Infrequent Access retrieval/minimum-duration exposure; not a charge cap                    |
| Integrations              | No paid AI, Notion/Telegram delivery, URL acquisition dispatch or email tests                                             | Must verify actual source/config/secret requirements before candidate freeze                      |
| Scheduling                | No Cron; all four hosted work/dispatch/backup flags false; digest AI false                                                | Prevents automatic application work; not a cap on account operations/storage                      |
| Attachment size           | Keep existing 25,000,000-byte per-file limit                                                                              | Per-file validation only, not a total-storage or operation budget                                 |
| Initial acceptance writes | At most one clearly labeled synthetic note, one URL record (no fetch) and one small PDF, with protected readback          | Scoped smoke only; no import or load testing                                                      |
| Initial operating scope   | Personal owner use; no bulk uploads, public rollout or benchmarks                                                         | Operator procedure, not an enforced total-usage quota                                             |
| Alerts                    | Propose account-wide warning at $1 and stop/review at $5 of usage-based spend                                             | Values require owner review; informational, not a hard spending limit or approved invoice maximum |
| Usage inspection          | Owner checks account-wide usage after smoke and daily during the first week                                               | Manual procedure; no monitor/automation has been scheduled                                        |
| Storage review            | Pause new uploads at 1 GB in this app or unexplained operation growth                                                     | Proposed manual threshold; no new aggregate enforcement implemented                               |
| On unexpected cost        | Contain the new Worker ingress, keep all dispatch off, preserve DB/R2 and backups, inspect usage; do not auto-delete data | Stopping traffic does not stop accrued or ongoing storage charges; metrics/alerts can lag         |

No arbitrary account-wide hard cap is claimed. The owner has accepted metered R2 risk for plan preparation; the $1/$5 thresholds and narrow first-release feature scope remain proposals to review. Unrelated resources may continue generating usage and are not modified by this plan.

## 4. Review stage A — named provisioning only

After login, refresh account/plan/subdomain, Worker inventory, D1 list and R2 bucket metadata. Do not list/read bucket objects. Stop on a resource-name collision; never silently adopt an existing resource.

The exact proposed creation commands, **not run**, are:

```bash
CLOUDFLARE_ACCOUNT_ID=a9482fbfb91ace26dee097cbd41293f9 \
  ./node_modules/.bin/wrangler d1 create recollect-flow-prod-v2 --update-config=false

CLOUDFLARE_ACCOUNT_ID=a9482fbfb91ace26dee097cbd41293f9 \
  ./node_modules/.bin/wrangler r2 bucket create recollect-flow-attachments-prod-v2 \
  --storage-class Standard --update-config=false
```

Installed CLI help was checked for both command shapes. Account identity, existing subscription and resource-name availability must be verified before executing. If creation prompts for a paid subscription, payment method or plan change, stop for review. No Worker upload, SQL migration, secret write, alert creation, object operation or deployment is included in stage A. Preserve creation responses privately and record only safe returned IDs/account/time. Inspect the new D1 schema and ledger read-only; do not assume an empty target from its name.

**Stage-A approval packet:** This revision, the account, the two names, Standard/private R2, metered R2 risk and no plan upgrade. Once that concrete scope is accepted and current metadata is confirmed, creation can produce the actual D1 UUID required by the exact deployment configuration.

## 5. Review stage B — prepare exact deployment artifacts

After approved creation, the engineer must complete these before asking for final release approval:

1. Replace the old canonical D1 name/UUID and R2 bucket with actual new identities and explicitly pin the account. Never deploy a local simulator config.
2. Observe the new D1 schema/ledger. Use existing BG-31 ledger/impact tooling to produce the exact pending delta. Review affected tables, indexes, data backfills and interruption/compatibility assumptions. Repository contains 22 SQL files through `0025_bg28_scheduled_backups.sql`; use the observed baseline, not an invented empty fixture.
3. Keep `HOSTED_SCHEDULED_WORK_ENABLED`, `HOSTED_EXTERNAL_DISPATCH_ENABLED`, `HOSTED_HTTP_DISPATCH_ENABLED`, `HOSTED_BACKUP_AUTOCREATE_ENABLED` and `DIGEST_AI_ENABLED` explicitly false and Cron absent. Verify manual dispatch rejects provider calls.
4. Resolve startup/required-secret behavior for the narrow first-release scope. Current canonical `[secrets].required` includes Notion and Telegram, the source declares a Notion database, and real AI provider implementations/AI binding remain configured. Do not deploy it unchanged or install dummy secrets to declare integrations ready. Either prove a tested disabled-integration configuration without those credentials, including any necessary reviewed source changes, or present the real integration requirement for owner decision. Do not enable outbound providers in this plan.
5. Generate new private app credentials; record required names only. Resolve `WEB_INBOX_BASE_URL` from the verified target subdomain and approved route. No local/old tokens reused. Stage secret provisioning explicitly; version upload itself may mutate the new Worker and belongs in the reviewed sequence.
6. Reuse the verified encrypted local backup and downloaded-copy restore for their actual scope. Record the empty new target as the pre-change state, the operator, private recovery location and owner's independent-password confirmation. No local-data import is part of this release. Complete any additional release-contract recovery/notification prerequisite; no unsolicited messages.
7. Freeze the source/config, matched Worker/Web artifacts and hashes with the existing release tooling. Check Worker size/startup against the verified Free plan before any upload. Stop rather than upgrade automatically. Run focused checks and exact-candidate CI. Any changed artifact requires renewed identity/CI reconciliation.
8. Record the exact deployment commands, actual D1 UUID, immutable artifact paths/hashes, safe credential presence evidence, ordered migration filenames, first-release containment/forward-repair plan and smoke scope in the canonical human/JSON manifest. Do not fill unobserved fields with guessed values.
9. Review BG-29.078 and OPE-247 independently. Their acceptance remains open; metered R2 permission does not establish their proof or waive the release contract. Resolve actual blocking prerequisites before a production GO.

**Why no final deploy command is authorized here:** Current UUID, candidate hashes, secret behavior and inventory are unresolved. This packet specifies a concrete provisioning scope plus the exact preparation sequence; it is not falsely labeled an immutable deployment packet. Present the completed stage-B manifest for owner review before executing.

## 6. Approved deployment sequence, once stage B is genuinely ready

1. Reconfirm target/account/artifact identities and authorization reference; abort on mismatch.
2. Preserve/verify the agreed pre-change state and recovery evidence. If unexpected data exists, stop.
3. Apply only the reviewed pending forward migrations to the actual new D1 target in order. Record durable results; do not blindly retry data-changing SQL.
4. Upload the frozen Worker and matching Web assets using the canonical reviewed config and fresh secret provisioning sequence. No rebuild from a different dirty checkout.
5. Verify actual version, HTTPS origin, homepage/direct route, health, session, anonymous denial, scoped note/URL/file capture, replay/search and private original readback. Confirm URL record capture caused no fetch and no external delivery or AI occurred.
6. Inspect safe logs and usage. Contain the new Worker on identity, privacy, migration, data loss or cost anomalies; preserve data. There is no old compatible version in a fresh installation. Code rollback never reverses SQL; use reviewed forward repair or isolated restore.
7. Record actual outcomes. Close BG-31 only when all required accepted criteria and exact authorization are evidenced. BG-32 owns actual deployment/basic live acceptance. Neither a successful upload nor this plan supports fabricated checklist passes or a V1 GO.

## 7. Tracking for this review

- [x] Owner accepts metered R2 risk for preparation of a reviewed plan.
- [x] Record current source/CI and proposed cost/operation controls.
- [x] Identify expired Wrangler login and old binding/integration configuration blockers.
- [x] Restore CLI login; verify account and read D1/R2 resource inventories (October 31).
- [ ] Verify current Workers plan, Worker inventory and subdomain read-only before resource creation.
- [ ] Owner reviews narrow first-release scope, proposed alert/review thresholds and stage-A creation packet.
- [x] Execute the explicitly approved two-resource provisioning and record actual identities/privacy evidence.
- [x] Observe the actual new D1 schema/ledger read-only: only internal `_cf_KV`, no ledger or application tables; remote metadata reports zero rows written and `changed_db=false`.
- [x] Run existing offline ledger/impact tools against this authenticated observation: all 22 repository SQL files pending in exact source order; 11 existing ledger/impact tests pass. Full target-specific SQL/compatibility review is still required before execution.
- [ ] Complete candidate configuration/credentials/recovery, exact artifacts/CI and independent gate review.
- [ ] Owner reviews and authorizes the exact stage-B release packet.
- [ ] Execute BG-32 and record live acceptance; reconcile BG-31 with real evidence.

The original planning phase created no resources. The subsequently explicitly approved stage A created only the named D1 database and private Standard R2 bucket. No objects, migrations, credentials, billing alerts or Worker deployments were created. Wrangler's installed CLI reported its own credential-store migration while attempting `whoami`; no token values were printed. No Google Drive or local recovery data was changed.

## October 31 — stage-B read-only baseline result

Reconfirmed `recollect-flow-prod-v2` UUID
`76bd35c6-c833-4987-a47e-6aa8238bb832` in the pinned account. Using a
metadata-only config with that exact account/name/UUID, ran:

```sql
SELECT name, type, sql FROM sqlite_master
WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name;
```

Observed only Cloudflare internal `_cf_KV`, no `d1_migrations` and no application
tables. D1 reported `rows_written=0` and `changed_db=false`. Normalized the
absent ledger to an empty applied list **because this authenticated fresh-target
observation proves the baseline**, not because an empty fixture was convenient.
Existing offline utilities report 22 pending migrations, from `0001_initial.sql`
through `0025_bg28_scheduled_backups.sql` in repository order, including the
intentional 0011–0013 numbering gap. Their built-in unverified-source labels
remain unchanged; the separate account/UUID/schema observation supplies origin
provenance, not authorization to apply SQL.

Private raw schema/identity evidence, normalized ledger, exact pending list
and per-file lexical impact/SHA-256 report are under
`.wrangler/bg31-stage-b-20261031/`. All 11 existing ledger/impact tests passed.
No remote migration, application table, object operation or Worker deployment
was performed. The lexical impact report does not by itself establish complete
SQL compatibility review, rollback safety or a frozen release candidate.

## Candidate preparation checkpoint

Canonical config now pins the actual new account/D1/R2 identities and has empty
provider enablement/implementation settings, blank unconfigured Notion destination,
no Cron and explicit false hosted-work flags. Required secret names are the four
core app settings only. Optional provider types and missing-token guards were
updated; no dummy provider credentials are prepared. Local migration/browser
helpers now use the stable `DB` binding rather than the old database name, and
staging guardrails reject both historical and new production UUIDs.

Full local `npm run check` passed: 337 API/unit, 221 D1, 62 Web tests plus Node
checks and Web build. An additional D1 regression passed capture/export with
all provider credentials absent and no network calls; the canonical manifest,
readiness, ledger and impact tests pass after source/target updates. Final
exact-head CI and immutable build evidence belong to the
[first-release packet](BG-31_FIRST_RELEASE_PACKET.md), not this dated checkpoint.
No remote SQL write, secret upload or Worker deployment was performed.
