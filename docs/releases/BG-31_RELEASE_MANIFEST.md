# BG-31 — RecollectFlow V1 release manifest

**Manifest revision:** `BG31-DRAFT-2026-10-22.1`  
**Decision:** **NO-GO for production. REVIEWABLE DEVELOPMENT DRAFT ONLY.**  
**Prepared:** 2026-10-22 UTC (repository evidence reviewed).  
**Tracking:** [GitHub #119](https://github.com/anmolsansi/Recollect-Flow/issues/119) · [Linear OPE-345](https://linear.app/openclaw-neutron/issue/OPE-345/bg-31-prepare-the-v1-release-manifest-without-production-changes).  
**Change class:** $0 local/source/CI preparation. No production deployment, hosted resource operation, remote D1/R2 query/write, provider call, external message or billing change was made.

The [ordered owner action plan](BG-31_COMPLETION_TODO.md) maps the **22
remaining canonical actions** to the existing evidence packages and a
gated **missing-resource / strict $0 preparation** sequence. The owner
confirmed the Cloudflare target account and granted a scoped read-only
account-overview inspection; neither action grants production operations.

This is the owner-review packet for the **future** BG-32 production operation, not its approval. Any later release authorization must identify this exact revision and its subsequently frozen artifact identities. GitHub PR review, a passing local test, a green CI run and this document never grant deployment authorization.

## October 24 account confirmation: production resources not listed

The owner confirmed account `a9482fbfb91ace26dee097cbd41293f9` as the intended production Cloudflare account, and authorized read-only metadata inspection. The three owner-opened account overview pages showed:

- **Workers:** only `recollect-flow-bg29-d1-cron-probe` (1/1 listed). Intended production `recollect-flow` not listed.
- **D1:** only `recollect-flow-bg29-staging` (1/1 listed), UUID `b5cbeccc-92fb-4bbc-9597-f0174b84e57d`. Intended production `recollect-flow-prod` not listed.
- **R2:** only `propertyos-media` listed. Intended production `recollect-flow-attachments-prod` not listed. No R2 object was opened.

The staging Worker, staging D1 and PropertyOS R2 are **not production substitutes**. The source-declared D1 UUID `5fcba514-d0f7-45e7-a632-d4c59233af71` is not independently verified as an actual resource in this account. The production Worker version, applied D1 migration ledger and HTTPS Web origin are unverified. Do not fabricate a database, applied migration history or deployment from these source bindings.

**Strict $0 / NO-GO:** The standing [BG-29 exemption](../verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md) prohibits hosted R2 provisioning. R2 Standard has metered usage above its free allocation; free quotas, budget alerts and a $0 past bill are not enforceable cost ceilings. At the October 24 account review, the source still declared three Cron triggers and default AI provider `openrouter`. [Merged PR #128](https://github.com/anmolsansi/Recollect-Flow/pull/128) removed the default Cron declarations and tests that no hosted-egress opt-in is enabled; this still does **not** establish a deployable zero-cost Worker, eliminate every possible provider path, or justify a deployment. No creation, migration, hosted R2 read/write, deployment, Cron activation, provider calls, billing changes or email send is authorized by the inspection consent.

Continue only local/source CI, safe configuration work and offline evidence preparation under the [completion plan](BG-31_COMPLETION_TODO.md). Preserve BG-31's **78/100** canonical checked actions and **22** open steps. Require separately proven cost controls and operation-specific authorization before any future provisioning or BG-32 release activity. **Production remains NO-GO.**

## 1. Candidate identity and evidence

| Field                      | Candidate or status                                                                                             | Proof / next action                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                 | `anmolsansi/Recollect-Flow`                                                                                     | Repository metadata                                                                                                                                           |
| Source baseline            | `195fcd65f6a75667228c718411a95b1c20a70679` on `main`                                                            | [Merged BG-30 final closeout](https://github.com/anmolsansi/Recollect-Flow/commit/195fcd65f6a75667228c718411a95b1c20a70679)                                   |
| Exact baseline CI          | [#39752503664](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39752503664), **PASS** on baseline SHA | GitHub workflow status 2026-10-22                                                                                                                             |
| Work branch                | `feat/bg-31-release-manifest`                                                                                   | Documentation/preflight changes only, not a deploy candidate                                                                                                  |
| Release source SHA         | **NOT FROZEN**                                                                                                  | Freeze exact future review/approved head and verify its own CI                                                                                                |
| Worker entry               | `apps/worker-api/src/index.ts`                                                                                  | `wrangler.toml` `main`                                                                                                                                        |
| Worker configuration       | `wrangler.toml`                                                                                                 | Source review only; runtime/deployed version **NOT VERIFIED**                                                                                                 |
| Web assets                 | `apps/web/dist` bundled into Worker                                                                             | `npm run release:package` produces versioned assets                                                                                                           |
| Web release ID / hashes    | **CI checkpoint only; NOT FROZEN**                                                                              | Earlier generated Web ID below; artifact not archived                                                                                                         |
| Worker bundle hash/version | **NOT FROZEN**                                                                                                  | Capture dry-run bundle hash and deployable artifact identity without deploying                                                                                |
| CI at final work head      | **PASS at checkpoint; see below**                                                                               | Re-run CI for any newer work head                                                                                                                             |
| Runtime toolchain          | CI Node 22; `package.json` requires Node >=22; Wrangler declared `^4.116.0`                                     | Record actual `node --version`, `npm --version`, `npx wrangler --version` from packaging runner                                                               |
| Browser gate               | Historical isolated Chrome/local bundled Worker acceptance                                                      | [BG-21](../verification/BG-21_WEB_HOSTING.md) and [BG-30 matrix](../verification/BG-30_RELEASE_MATRIX.json); current hosted HTTPS acceptance **NOT VERIFIED** |

**Verified branch CI checkpoint (not a release freeze):** GitHub Actions
[run #39758159109](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39758159109)
passed at commit `2649603a8f8f83fca997c6e115c1338b8afb88d4` with six BG-31
manifest tests, full quality and browser checks, local migrations, Web packaging
and Wrangler **dry-run only**. Packaging at the GitHub PR merge checkout (parents main and branch),
`d045e14ac0cb9c1c530f9830d96de46faebc34da`, reported Web release ID
`4d71d3b8e237b8f32bc5d79a471b6c872132c0845c0d24ccc010677a728b7c0e`
and five public files. Runner setup selected Node `22.23.3`;
Wrangler reported `4.116.0` and Google Chrome `155.0.8059.39`.
The exact npm minor/patch was not logged in the cited run. No immutable matching
Worker bundle or Web manifest was uploaded. These records are **not** the
future owner-approved candidate. Re-run CI against the final changed head.

**Source-level CI validation:** [run #39780508581](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39780508581)
passed the then-current branch head `f0f96cc277e5674edf9a9472bd6423d89f097da3`:
format, lint, typecheck, Node/D1 suites, Web package, Wrangler dry-run,
local migrations, focused tests, and local/browser hosting, capture, upload,
recovery, private download, search/workflow and digests. No hosted URL,
physical-device or approved provider smoke was exercised. Subsequent changes
require new exact-head green CI before review.

**Verified exact-head CI fingerprint checkpoint (not archived or approved):**
[run #39783592918](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39783592918)
passed at source SHA `a8063204f15158aac5f7da5ef00ddc53820c7796`,
rechecking out that exact source after PR-merge acceptance. Its offline
`npm run release:package` and Wrangler dry-run recorded Web `release_id`
`bd71d34b551d37eb0c5887d8d1b37d1f01ab874fa7beab48752f9c1978c05ee6`,
Web `release-manifest.json` SHA-256
`4a7cfc430adfda9cf3242f8170a6ee39d7c2c022fcf9c69b2e1ab134675648b1`,
and Worker dry-run `index.js` SHA-256
`97c6bbc88bb4c6c440871c9038e7580001c8ba6f5d52617c7ad4a74db2adb500`.
The actual runner versions were Node `22.23.3`, npm `10.9.9` and
Wrangler `4.116.0`. These values are also in the machine manifest's
`ci_fingerprint_checkpoint` section. **No deployable bundle was uploaded,
no immutable approved release candidate was frozen, and no Worker was deployed.**
The source at a later documentation commit has a distinct Git SHA and requires
its own verification rather than silently inheriting the checkpoint identity.

**Artifact pairing invariant:** the Worker entry, `wrangler.toml`, lockfile and generated Web file hashes must agree with the release ID emitted by `scripts/web-release.mjs`. Its `source_revision`, `worker_entry_sha256`, `worker_config_sha256`, `lockfile_sha256`, individual `web_files[].sha256` and `release_id` belong in the frozen, owner-approved packet. The release ID is deterministic from these inputs, but **is not a deployed Worker version**. Build locally in an isolated checkout; do not silently rebuild a different candidate for deployment.

The strict $0 [BG-29.078 exception](../verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md) permits documentation and safe CI only. BG-29.078 is **DEFERRED/NOT VERIFIED** (99/100). [OPE-247](https://linear.app/openclaw-neutron/issue/OPE-247/complete-v1-security-observability-and-operational-hardening) remains In Progress; V1 launch and BG-32 deployment are **NOT AUTHORIZED**.

## 2. Live inventory and identity reconciliation

| Target            | Source-declared identifier                                                                          | Live observation                                          | Required before BG-32                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cloudflare Worker | `recollect-flow`                                                                                    | **NOT VERIFIED**                                          | Read-only deployment/version inspection, record account and exact version                              |
| D1 binding        | `DB`; configured name `recollect-flow-prod`, configured UUID `5fcba514-d0f7-45e7-a632-d4c59233af71` | **NOT VERIFIED**                                          | Compare target account, binding UUID, actual database and migration ledger                             |
| R2 binding        | `ATTACHMENTS`; configured bucket `recollect-flow-attachments-prod`                                  | **NOT VERIFIED**                                          | Compare bucket/account identity and access controls; **no hosted R2 read/write** under current $0 rule |
| Web origin        | Single Worker-served asset origin plus secret `WEB_INBOX_BASE_URL`                                  | **NOT VERIFIED**                                          | Observe actual production HTTPS origin, domain route, deep links, cookie origin and exact assets       |
| Notion            | `NOTION_DATABASE_ID` in `wrangler.toml`                                                             | Destination membership/capabilities **NOT VERIFIED**      | Compare approved database by a safe fingerprint/owner attestation, without exposing credentials        |
| Telegram          | Secret `TELEGRAM_CHAT_ID`; `TELEGRAM_BOT_TOKEN`                                                     | Private destination **NOT VERIFIED**                      | Owner identifies approved private destination, separate approval for any send                          |
| AI                | `AI` binding and configured OpenRouter/Cloudflare provider routing                                  | Provider account access, quota and terms **NOT VERIFIED** | Verify explicit approved capabilities and no unexpected metered path                                   |

Source configuration is **not** live proof. These values describe committed configuration only. Never infer the Cloudflare account, provisioned resource state, deployed version, environment secret presence, hosted Web origin, current DB schema, or provider permission from `main`.

### Read-only inventory worksheet (NOT EXECUTED)

A later authorized operator records: inspection timestamp (UTC), account identifier in a private operations vault, Worker deployment ID, D1 UUID and remote applied migration names, binding list, actual Web origin and certificate/auth properties, R2 bucket identity without object access, Notion database identity via nonsecret owner reference, Telegram private destination confirmation **without sending**, and safe evidence links. Preserve no secret values or message contents. The D1 check must be explicitly read-only and targeted to the confirmed UUID. If any account, origin, binding or ID differs from this manifest, **STOP** and issue a new candidate revision.

The required production schema delta is **UNKNOWN** until read-only live `d1_migrations` inventory is obtained. Do not claim that migrations 0020/0021/0025, or any other migration, are either present or pending based solely on source or a past local migration log.

## 3. Ordered migration inventory and compatibility gate

The source-controlled migration chain uses `migrations_dir = "migrations"` and applies in filename order. The complete current source order is:

```text
0001_initial.sql
0002_add_duplicate_of.sql
0003_add_attachments_table.sql
0004_add_policy_routing.sql
0005_update_hosted_ai_policy.sql
0006_add_capture_request_fingerprint.sql
0007_add_job_leases.sql
0008_add_sync_available_at.sql
0009_complete_jobs_and_notion_projection.sql
0010_add_enrichment_fields.sql
0014_allow_cloudflare_provider.sql
0015_add_extraction_records.sql
0016_add_item_search_fts.sql
0017_add_item_review_contract.sql
0018_add_item_duplicate_target.sql
0019_add_digest_jobs.sql
0020_add_ai_capacity_controls.sql
0021_add_recovery_workflows.sql
0022_add_url_acquisition_evidence.sql
0023_add_processing_generation.sql
0024_materialize_current_processing_status.sql
0025_bg28_scheduled_backups.sql
```

The deliberate numbering gap 0011–0013 is present in the repository and is **not** permission to invent replacement SQL. Last source migration: `0025_bg28_scheduled_backups.sql`. Do not calculate the pending list by subtracting migration numbers. Compute the **exact ordered filename difference** between this source list and the read-only live D1 ledger, after confirming database UUID, account and SHA.

### Safe offline pending-ledger comparison (no remote commands)

After a separately approved **read-only** inspection, the operator must
save the observed `d1_migrations` filenames to a protected local JSON file,
in actual applied order. Use this minimal **normalized** format (the example
is synthetic and does not represent any production ledger):

```json
{
  "applied_migrations": ["0001_initial.sql", "0002_add_duplicate_of.sql"]
}
```

Run only the offline comparator, which reads repository SQL filenames and the
supplied local JSON; it never connects to Cloudflare:

```bash
node scripts/bg31-migration-ledger.mjs /secure/release/read-only-ledger.json
npm run bg31:ledger:test
```

The result is an exact ordered **source minus supplied-ledger prefix** and
exits nonzero on missing, duplicated, unknown, reordered or gapped rows.
An empty applied list is valid only when the operator independently proves
that the inspected target is a **fresh** database. The utility does **not**
authenticate the input, confirm account/D1 UUID, check SQL checksums, prove
backup completeness or authorize migration; record source snapshot SHA,
account identity and inspected D1 UUID separately, privately.

**Confirmed source-only impact examples:** migration `0022` adds
`items.source_revision`, a `url_acquisitions` evidence table and indexes,
rebuilds the FTS table, and replaces/adds FTS triggers. Migration `0023`
adds `processing_generation` columns to `items`, `processing_jobs` and
`extraction_records`, indexes and epoch triggers; it deliberately does not
backfill historical job generations. Migration `0024` creates two processing
views and four triggers that project current status on writes, with no source
SQL data backfill. Migration `0025` adds `scheduled_backup_periods` and
its state index; no schedule is activated by SQL alone. These effects are
from the SQL files, **not** a claim that the migrations are pending or safe
against the current live schema. Test the actual delta against an isolated
approved backup before performing BG-32.

### High-risk portions of the chain

| Source migration | Schema effects                                                                                                                | Backfill/compatibility question                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0020             | New AI capacity windows, reservations, circuit breakers, expiration and probe indexes                                         | Historical capacity is not inferred from new tables; verify runtime behavior at upgraded schema                              |
| 0021             | Backup artifacts, purge workflows and steps, independent anti-resurrection purge receipts, restore/integrity runs and indexes | Receipt preservation is a release integrity gate; code rollback is not database rollback                                     |
| 0022             | URL acquisition evidence structures                                                                                           | Confirm old/new URL fetch and search behavior before deciding mixed-version compatibility                                    |
| 0023–0024        | Processing generation and materialized current status                                                                         | Validate any backfill/trigger and generation constraints on a **restored isolated copy**, never assume additive-only safety  |
| 0025             | `scheduled_backup_periods` table and state index                                                                              | Table creation does not activate scheduled backup; `HOSTED_BACKUP_AUTOCREATE_ENABLED` remains off unless separately approved |

**Source-only migration evaluation:** the chain is forward-only. Applied SQL, schema additions, triggers, table/index changes and data backfills may be irreversible by deploying an older Worker. No production compatibility claim is possible without seeing the actual remote ledger, reviewing _all_ pending SQL, replaying the transition against an isolated backup and checking old-code compatibility.

**Stop before migration** on unknown or out-of-order ledger rows, a source checksum/name mismatch, wrong account/UUID, missing backup/readback, unreviewed data backfill, absent compatible previous artifact, or a cost/authorization conflict. **Stop after an interrupted migration:** inspect the actual D1 ledger and schema before attempting any retry. Never blindly replay SQL or run production `npm run db:migrate:remote` from this document.

## 4. Configuration, capabilities and privacy

**Required secret names declared by `wrangler.toml`:** `CAPTURE_TOKEN`, `ADMIN_TOKEN`, `LOCAL_WORKER_TOKEN`, `NOTION_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WEB_INBOX_BASE_URL`. Conditional external-provider credentials, including `OPENROUTER_API_KEY` if that provider is actually enabled, require a separate source/config inventory. **Secret presence: NOT VERIFIED.** Do not print values or store fingerprints derived from weak tokens.

**Nonsecret source configuration:** `NOTION_DATABASE_ID`, `MAX_ATTACHMENT_BYTES=25000000`, `UPLOAD_TTL_SECONDS=3600`, `AI_PROVIDER_DEFAULT=openrouter`, `AI_PROVIDERS_ENABLED=openrouter,cloudflare`, `AI_PROVIDER_IMPLEMENTATIONS`, `OPENROUTER_FREE_ACCOUNT_TIER=standard`, `CLOUDFLARE_AI_FREE_DAILY_NEURONS=10000`, `DIGEST_AI_ENABLED=false`. Wrangler has bindings `DB`, `ATTACHMENTS`, `AI`, `ASSETS`, `LOGIN_RATE_LIMITER`; published `workers_dev=true`, `preview_urls=false`. The source-only BG-31 $0 follow-up **removes all default `[triggers]` Cron expressions** from `wrangler.toml`. This is an offline source choice, not an observation of a deployed Worker or an authorization to activate schedules.

`HOSTED_BACKUP_AUTOCREATE_ENABLED` is an opt-in switch documented in [BG-28](../RECOVERY_OPERATOR_PROCEDURE.md), not enabled in this committed `[vars]` block. Keep it **off**. No new environment var, secret, provider access, account upgrade, Cron activation, route change or billing method is authorized by BG-31.

Policy [`2026-07-31.2`](../SECURITY_PRIVACY_GOVERNANCE.md) governs Unknown/Public/Personal/Sensitive routing. Unknown fails closed, Sensitive never leaves the approved local boundary, and Personal requires the documented explicit consent and provider contract. Optional AI/Notion/Telegram failure cannot erase canonical captures. Confirm the production version actually enforces this rather than trusting a source default. Public-host requests remain subject to SSRF protections and retention controls.

**Hard $0 check:** free-tier names and soft alerts do not guarantee no spend. The standing decision prohibits account/provider operations that expose the owner to additional charges. Do not enable pay-as-you-go, run billable remote probes, perform outbound AI/Notion/Telegram calls or activate hosted Cron based on this manifest. If an enforced $0 ceiling cannot be proved, retain **NO-GO**.

### October 29 source-only strict-$0 hardening (merged, not deployed)

The default `wrangler.toml` is now deliberately **Cron-free** on the new
merged `main`. Existing `handleScheduled` and `handleFetch`
entry points still refuse background or enumerated manual outbound dispatch
without two explicit independent opt-in flags. New offline BG-31 manifest
assertions prevent reintroducing default Cron triggers or enabling any of
`HOSTED_SCHEDULED_WORK_ENABLED`, `HOSTED_EXTERNAL_DISPATCH_ENABLED`,
`HOSTED_HTTP_DISPATCH_ENABLED`, or `HOSTED_BACKUP_AUTOCREATE_ENABLED`
in the default Worker configuration. The direct HTTP admission guard was
merged in [PR #127](https://github.com/anmolsansi/Recollect-Flow/pull/127)
and `main` passed [CI #40167287305](https://github.com/anmolsansi/Recollect-Flow/actions/runs/40167287305).

This intentionally **does not mark** any of the 22 remaining live/approval
microtasks complete: no intended production Worker, D1 or R2 resource was
observed in the confirmed account, and R2 Standard cost exposure and
independent backup/restore proof remain unresolved. The Cron-free change passed [PR #128 exact-head CI #40292490848](https://github.com/anmolsansi/Recollect-Flow/actions/runs/40292490848) on `049de09c09c235a58aafc93d59927b7553192b0b` and merged as `2360407efce5879b224dce92ec785c269571fb68`. No post-merge CI run is established by that PR-head result. No email, AI, Notion, Telegram, Cloudflare deployment, Cron activation, or spending was performed by the source change.

### October 29 read-only billing evidence and strict-$0 release decision

A read-only owner-account billing inspection showed the Workers Free plan, an
active metered R2 subscription, no current billable usage charges and a
configured budget alert. These observations establish the account's state
**at inspection time only**. Budget alerts do not disable operations or cap
charges. R2 Standard bills storage and operations beyond monthly free usage.
Private payment, recipient and invoice details are not included here.

**Decision: strict additional-$0 enforcement is NOT VERIFIED.** No
account-level R2 hard-stop control was demonstrated. An alert and zero-cost
invoices cannot substitute for that requirement. BG-31 P1 stays unchecked.
The 22 outstanding canonical actions remain open, and the machine manifest
remains `NO_GO`. Do not provision the intended R2 bucket, deploy, migrate,
enable Cron or activate provider calls.

Evidence and policy: [BG-31 completion plan](BG-31_COMPLETION_TODO.md),
[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
and [Cloudflare budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/).

## 5. Backup, originals, purge receipts and recovery prerequisite

**This section is a plan, not a completed production backup.** The authoritative instructions are [BG-28 recovery procedure](../RECOVERY_OPERATOR_PROCEDURE.md). They require a separately authorized isolated target and distinguish hosted JSON, independently retained original attachment bytes, and independent purge receipts.

1. **Freeze source identity:** record source account/Worker, D1 UUID, R2 bucket, UTC time and migration ledger. Confirm an approved protected destination outside the source failure domain.
2. **Capture D1 snapshot/export:** only under separate BG-32 authorization export the correct D1 and take the portable owner JSON `GET /api/v1/export?format=json`. Record `schemaVersion`, `generatedAt`, `itemCount`, byte count, SHA-256 and success. CSV is **not** a restore payload.
3. **Copy original bytes independently:** enumerate all required attachment object keys with complete pagination, copy original unmodified bytes into encrypted owner-controlled independent storage, and verify expected byte size/SHA-256. Hosted backup JSON **does not** contain originals.
4. **Preserve newest anti-resurrection receipts:** independently copy and hash `purge-receipts/v1/*.json` mirrors, verify completeness and ordering, produce `independent-receipts.json`. Old embedded receipts alone are insufficient. Missing or stale receipts **STOP** any restore.
5. **Verify bundle offline:** after authorized download, run `node scripts/recovery-bundle.mjs <portable.json> <independent-objects-dir> <independent-receipts.json> <verified-manifest.json>`. This requires an offline local copy and does **not** fetch Cloudflare resources. Require a fresh output file and protect it (mode 0600/encrypted storage). Independently verify source listing completeness and target isolation.
6. **Rehearse on a clean isolated target:** only with separate approval restore original objects/receipts, submit `POST /api/v1/restore?dry_run=true`, inspect planned/skipped counts and `attachmentReadiness`. `dry_run=false` may run **only** after explicit approval and zero mismatches.
7. **Check restoration:** item/child counts, attachment SHA-256 and private authorization, canonical privacy, URL/search evidence, receipt exclusions, no purged resurrection, indexes, and exact Worker/schema compatibility. Owner must approve traffic switch separately.

**Current evidence:** backup identifier **NOT PROVIDED**, backup timestamp **NOT VERIFIED**, independently copied object count **NOT VERIFIED**, verified SHA-256 manifest **NOT AVAILABLE**, newest purge receipts **NOT VERIFIED**, restore dry run **NOT RUN**, recovery destination/operator **NOT ASSIGNED**. These are blocking prerequisites, not assumed successful nightly copies.

**Recovery target:** no committed recovery point objective or restore-time measurement is proved for this candidate. Before approval, owner/operator must choose an acceptable recovery window, run an isolated timed rehearsal and record actual results. Rolling application code backward never reverses a D1 migration. If old code is schema-incompatible, keep traffic stopped and use a reviewed forward repair or verified isolated restore, including any post-snapshot data-loss implications.

## 6. Post-deploy smoke stages and mandatory stops

Execute **only after** BG-32 grants operation-specific authorization, takes the verified backup and applies the approved exact candidate. Record stage timestamp, target origin, request ID, actual result and operator. An incomplete stage is neither PASS nor implicit permission to continue.

| Stage                                 | Expected result                                                                                           | Mandatory stop                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| S01: identity/config/ledger           | Exact approved Worker build, Web release ID, correct D1 UUID, R2 binding, migrations and HTTPS origin     | Any mismatch or missing identity                                                   |
| S02: homepage/static files            | Root loads correct hashed Web assets without private cache exposure                                       | Missing bundle, stale asset or secret leak                                         |
| S03: direct deep link                 | New browser session loads `/items/<id>` route correctly                                                   | Missing/broken SPA route                                                           |
| S04: login/session/logout             | Correct cookie flags, session persistence, logout invalidation                                            | Login failure, session leak, insecure cookie                                       |
| S05: anonymous denial                 | Protected item/export/download/API routes reject unauthenticated access                                   | Any protected data exposure                                                        |
| S06: capture + same-key replay        | Synthetic owner capture returns durable canonical ID; retry never loses or duplicates source unexpectedly | Lost item, inconsistent event, wrong ID                                            |
| S07: original attachment              | Authenticated original bytes match expected hash; anonymous retrieval denied, private cache disabled      | Missing originals, hash mismatch, public/private leak                              |
| S08: search + reopening               | Known distinctive fixture phrase resolves to correct item and evidence; privacy/deletion filters hold     | Missing or wrong-private item                                                      |
| S09: privacy and optional degradation | Unknown/Sensitive disallow unauthorized external dispatch; failed optional provider never unsaves item    | Unexpected outbound route or lost canonical save                                   |
| S10: permitted integrations           | Only separately approved neutral Notion/Telegram/AI fixtures reach their intended destinations            | Wrong external destination, surprise charge, missing provider permission           |
| S11: operational inspection           | Safe job backlog, D1 migration, auth, capture, error, external quota and log review                       | Unexplained elevated errors, raw secret/content log or unexpected billing exposure |

**No external test message is included in the current authorization.** If provider test scope is not approved, record S10 **NOT EXECUTED** and do not silently send. Hosted proof, iPhone, two-week use, seven-day digest and BG-29.078 remain later independent acceptance gates.

### Immediate response to a stop trigger

1. Halt further migration/deploy, optional processing, scheduled jobs or traffic **only through an approved, environment-specific operating procedure**. Never improvise destructive toggles.
2. Preserve incident UTC timestamp, safe IDs, immutable artifact and ledger state, operation logs without raw content, and the last known good build/backup identities.
3. If schema remains compatible, use the **verified** previous Worker/Web artifact and matching configuration to restore compatible code, then repeat auth/capture/private-download and consistency checks. **Previous artifact: NOT YET IDENTIFIED OR PROVED COMPATIBLE.**
4. If migration changed schema incompatibly, **do not deploy old code blindly**. Prefer reviewed forward repair and re-verify. If that is unsafe, restore a verified independent backup into an isolated database/bucket, reconcile newer purge receipts and captured writes, and seek explicit owner approval before traffic cutover.
5. Follow the owner-approved **email-only** procedure: after separate authorization to send, email the privately verified owner inbox with the safe incident facts. An explicit reply acknowledging the incident is required; if no reply arrives within **15 minutes**, send **one** separately authorized follow-up email. Keep release activity **HALTED** until the owner acknowledges and explicitly approves the appropriate next action. There is no phone, SMS or Telegram fallback; delivery and acknowledgment have **not been tested** and no email or provider messaging is authorized by this plan.

Auth failures, persistent capture loss, private route leak, migration inconsistency, deep-link failure, corruption/hash mismatch, missing backup/receipt evidence or any possible additional charge all block GO. No change to production or external messaging is authorized by writing these steps.

### BG-31.078 — Traffic stop plan (not executed)

**Default state:** Predeployment hold. Do not run production commands until the
approved source/artifact fingerprints, live account, D1 ledger, R2 target,
independent backup, previous compatible Worker, owner permission and strict $0
controls agree with the frozen manifest.

**Before the first write:** Abort the release on a missing/mismatched field.
Record `STOPPED_PREDEPLOY`, the exact candidate, failed condition and
confirmation that no traffic or production state changed. Record the
non-sensitive decision in GitHub issue #119.

**After a partly applied migration:** Stop all further migration and deployment
steps. Record every applied SQL migration, running Worker identity, schema
version, observed health and independent backup/receipt evidence. Do not rerun
the whole release or assume the database rolled back.

**Traffic containment:** Only the named operator can use a previously reviewed,
account-specific route/version control procedure. If no such mechanism has been
tested and authorized, do not improvise DNS changes, Worker disablement,
credential rotation or deletion. Code rollback is safe only when a known-good
immutable Worker/Web artifact is compatible with the schema already applied.

**Privacy or data loss:** Stop additional synthetic capture and outbound
integration tests. Preserve content-free incident facts. Resume only after an
approved isolation or forward-repair plan passes live auth, replay,
private-download, search and stored-status verification.

**Notification:** The owner selected **email only** on October 23, 2026,
and provided the intended receiving address in the private conversation.
The literal address is intentionally **not in the repository, Linear, or CI**.
It must be transferred by the owner to an operator-accessible private
operational record and independently verified before use. Once sending is
separately authorized, the operator should email the verified owner inbox
with the safe incident ID, UTC timestamp, stop trigger, and response needed.
The owner explicitly approved this escalation procedure on October 23, 2026:

1. Require the owner to acknowledge by **replying to the first incident email**.
2. If there is **no acknowledgment after 15 minutes**, send **one follow-up
   email** to the same verified private destination, but only if that external
   send is separately authorized. Do not automatically schedule or send it.
3. **Keep the release halted** if the email is undelivered or remains
   unacknowledged. Resume only after owner acknowledgment **and** the
   separately required operation-specific clearance; acknowledgment alone
   does not override failed backup, privacy, security, cost or migration gates.

There is **no phone, SMS, or Telegram fallback**. The sender's access,
recipient delivery, and reply flow are **NOT TESTED**. Logging to GitHub
#119 does not substitute for urgent notification. No emails were sent or
scheduled by this source-only procedure.

Record `PARTIALLY_APPLIED` for any durable partial change. An unsafe code
rollback requires reviewed forward repair or isolated restore using verified
originals and up-to-date purge receipts. Never declare restored production
until the actual version, schema and privacy tests are verified.

### Offline readiness check

Run `npm run bg31:readiness` to list currently missing release evidence from
the local manifest. This command has no Cloudflare, D1, R2, provider, messaging,
migration or deployment side effects. It always reports `decision: NO_GO`
and `external_verification_performed: false`, even if a person manually fills
the manifest fields. Run `npm run bg31:readiness:test` for the fail-closed
regression. Neither a self-reported field nor this report replaces independent
account, backup, cost or owner authorization evidence.

## 7. BG-32 owner approval packet

| Requested action                                                               | Current approval status                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Review BG-31 manifest source and CI                                            | $0 documentation/CI permitted                          |
| Approve exact candidate SHA, Worker and Web release hashes                     | **NOT GRANTED: artifact not frozen**                   |
| Approve target Cloudflare account, D1 UUID, R2, Web origin and migration delta | **NOT GRANTED: read-only inventory unverified**        |
| Approve independent backup destination and verified restore evidence           | **NOT GRANTED: no verified backup**                    |
| Approve D1 forward migration / Worker deploy / hosted smoke                    | **NOT GRANTED**                                        |
| Approve any Notion/AI/Telegram test or notification                            | **NOT GRANTED separately for each destination/action** |
| Approve financial exposure or alter strict $0 rule                             | **NOT GRANTED; strict $0 remains**                     |
| Approve BG-32 production operation                                             | **NO-GO**                                              |
| Approve V1 release GO                                                          | **NO-GO**                                              |

**Release owner:** repository owner, approval needed in an explicit dated record referencing the immutable completed manifest revision, exact artifact hashes, approved targets, intended commands, maximum scope and rollback plan.  
**Intended execution operator:** repository owner (@anmolsansi), self-designated October 23, 2026. This nomination does **not** verify live access or authorize any release command.  
**Intended restore operator:** repository owner (@anmolsansi), self-designated October 23, 2026. Independent backup read access, restore rehearsal, and recovery authority are **NOT VERIFIED**.  
**Approval evidence/reference:** **NONE**.  
**Next release action:** only review this draft and safely complete source/CI/manifest checks. Missing operator capability proof, live migration diff, independent backup, candidate Web/Worker artifacts, provider/billing capacity and operational gates keep BG-32 blocked.

### Acceptance and handoff

BG-31's documentation can be reviewable without executing BG-32. It cannot be represented as a fully approved or production-ready manifest while release identity, live target inventory, verified recovery copy or authorization are absent. Status is **SOURCE PREPARED, RELEASE NOT READY, BG-32 PRODUCTION BLOCKED**. Keep source CI, deployed versions, physical-device evidence, elapsed-hour resilience and billing proof in separate records.

See [BG-31 evidence](../verification/BG-31_RELEASE_MANIFEST_EVIDENCE.md), [release roadmap](../RELEASE_ROADMAP.md), [Build Guide §37](../RECOLLECTFLOW_BUILD_GUIDE.md#37-bg-31--prepare-a-concrete-release-manifest) and the [canonical 100-step checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-31--100-executable-microtasks).
