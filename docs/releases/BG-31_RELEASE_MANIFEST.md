# BG-31 — RecollectFlow V1 release manifest

**Manifest revision:** `BG31-DRAFT-2026-10-22.1`  
**Decision:** **NO-GO for production. REVIEWABLE DEVELOPMENT DRAFT ONLY.**  
**Prepared:** 2026-10-22 UTC (repository evidence reviewed).  
**Tracking:** [GitHub #119](https://github.com/anmolsansi/Recollect-Flow/issues/119) · [Linear OPE-345](https://linear.app/openclaw-neutron/issue/OPE-345/bg-31-prepare-the-v1-release-manifest-without-production-changes).  
**Change class:** $0 local/source/CI preparation. No production deployment, hosted resource operation, remote D1/R2 query/write, provider call, external message or billing change was made.

This is the owner-review packet for the **future** BG-32 production operation, not its approval. Any later release authorization must identify this exact revision and its subsequently frozen artifact identities. GitHub PR review, a passing local test, a green CI run and this document never grant deployment authorization.

## 1. Candidate identity and evidence

| Field | Candidate or status | Proof / next action |
| --- | --- | --- |
| Repository | `anmolsansi/Recollect-Flow` | Repository metadata |
| Source baseline | `195fcd65f6a75667228c718411a95b1c20a70679` on `main` | [Merged BG-30 final closeout](https://github.com/anmolsansi/Recollect-Flow/commit/195fcd65f6a75667228c718411a95b1c20a70679) |
| Exact baseline CI | [#39752503664](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39752503664), **PASS** on baseline SHA | GitHub workflow status 2026-10-22 |
| Work branch | `feat/bg-31-release-manifest` | Documentation/preflight changes only, not a deploy candidate |
| Release source SHA | **NOT FROZEN** | Freeze exact future review/approved head and verify its own CI |
| Worker entry | `apps/worker-api/src/index.ts` | `wrangler.toml` `main` |
| Worker configuration | `wrangler.toml` | Source review only; runtime/deployed version **NOT VERIFIED** |
| Web assets | `apps/web/dist` bundled into Worker | `npm run release:package` produces versioned assets |
| Web release ID / hashes | **NOT BUILT OR RECORDED for BG-31** | `apps/web/dist/release-manifest.json` must match approved source SHA and bundle |
| Worker bundle hash/version | **NOT FROZEN** | Capture dry-run bundle hash and deployable artifact identity without deploying |
| CI at final work head | **PENDING** | Require exact-head full GitHub CI, not baseline CI |
| Runtime toolchain | CI Node 22; `package.json` requires Node >=22; Wrangler declared `^4.116.0` | Record actual `node --version`, `npm --version`, `npx wrangler --version` from packaging runner |
| Browser gate | Historical isolated Chrome/local bundled Worker acceptance | [BG-21](../verification/BG-21_WEB_HOSTING.md) and [BG-30 matrix](../verification/BG-30_RELEASE_MATRIX.json); current hosted HTTPS acceptance **NOT VERIFIED** |

**Artifact pairing invariant:** the Worker entry, `wrangler.toml`, lockfile and generated Web file hashes must agree with the release ID emitted by `scripts/web-release.mjs`. Its `source_revision`, `worker_entry_sha256`, `worker_config_sha256`, `lockfile_sha256`, individual `web_files[].sha256` and `release_id` belong in the frozen, owner-approved packet. The release ID is deterministic from these inputs, but **is not a deployed Worker version**. Build locally in an isolated checkout; do not silently rebuild a different candidate for deployment.

The strict $0 [BG-29.078 exception](../verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md) permits documentation and safe CI only. BG-29.078 is **DEFERRED/NOT VERIFIED** (99/100). [OPE-247](https://linear.app/openclaw-neutron/issue/OPE-247/complete-v1-security-observability-and-operational-hardening) remains In Progress; V1 launch and BG-32 deployment are **NOT AUTHORIZED**.

## 2. Live inventory and identity reconciliation

| Target | Source-declared identifier | Live observation | Required before BG-32 |
| --- | --- | --- | --- |
| Cloudflare Worker | `recollect-flow` | **NOT VERIFIED** | Read-only deployment/version inspection, record account and exact version |
| D1 binding | `DB`; configured name `recollect-flow-prod`, configured UUID `5fcba514-d0f7-45e7-a632-d4c59233af71` | **NOT VERIFIED** | Compare target account, binding UUID, actual database and migration ledger |
| R2 binding | `ATTACHMENTS`; configured bucket `recollect-flow-attachments-prod` | **NOT VERIFIED** | Compare bucket/account identity and access controls; **no hosted R2 read/write** under current $0 rule |
| Web origin | Single Worker-served asset origin plus secret `WEB_INBOX_BASE_URL` | **NOT VERIFIED** | Observe actual production HTTPS origin, domain route, deep links, cookie origin and exact assets |
| Notion | `NOTION_DATABASE_ID` in `wrangler.toml` | Destination membership/capabilities **NOT VERIFIED** | Compare approved database by a safe fingerprint/owner attestation, without exposing credentials |
| Telegram | Secret `TELEGRAM_CHAT_ID`; `TELEGRAM_BOT_TOKEN` | Private destination **NOT VERIFIED** | Owner identifies approved private destination, separate approval for any send |
| AI | `AI` binding and configured OpenRouter/Cloudflare provider routing | Provider account access, quota and terms **NOT VERIFIED** | Verify explicit approved capabilities and no unexpected metered path |

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

### High-risk portions of the chain

| Source migration | Schema effects | Backfill/compatibility question |
| --- | --- | --- |
| 0020 | New AI capacity windows, reservations, circuit breakers, expiration and probe indexes | Historical capacity is not inferred from new tables; verify runtime behavior at upgraded schema |
| 0021 | Backup artifacts, purge workflows and steps, independent anti-resurrection purge receipts, restore/integrity runs and indexes | Receipt preservation is a release integrity gate; code rollback is not database rollback |
| 0022 | URL acquisition evidence structures | Confirm old/new URL fetch and search behavior before deciding mixed-version compatibility |
| 0023–0024 | Processing generation and materialized current status | Validate any backfill/trigger and generation constraints on a **restored isolated copy**, never assume additive-only safety |
| 0025 | `scheduled_backup_periods` table and state index | Table creation does not activate scheduled backup; `HOSTED_BACKUP_AUTOCREATE_ENABLED` remains off unless separately approved |

**Source-only migration evaluation:** the chain is forward-only. Applied SQL, schema additions, triggers, table/index changes and data backfills may be irreversible by deploying an older Worker. No production compatibility claim is possible without seeing the actual remote ledger, reviewing *all* pending SQL, replaying the transition against an isolated backup and checking old-code compatibility.

**Stop before migration** on unknown or out-of-order ledger rows, a source checksum/name mismatch, wrong account/UUID, missing backup/readback, unreviewed data backfill, absent compatible previous artifact, or a cost/authorization conflict. **Stop after an interrupted migration:** inspect the actual D1 ledger and schema before attempting any retry. Never blindly replay SQL or run production `npm run db:migrate:remote` from this document.

## 4. Configuration, capabilities and privacy

**Required secret names declared by `wrangler.toml`:** `CAPTURE_TOKEN`, `ADMIN_TOKEN`, `LOCAL_WORKER_TOKEN`, `NOTION_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WEB_INBOX_BASE_URL`. Conditional external-provider credentials, including `OPENROUTER_API_KEY` if that provider is actually enabled, require a separate source/config inventory. **Secret presence: NOT VERIFIED.** Do not print values or store fingerprints derived from weak tokens.

**Nonsecret source configuration:** `NOTION_DATABASE_ID`, `MAX_ATTACHMENT_BYTES=25000000`, `UPLOAD_TTL_SECONDS=3600`, `AI_PROVIDER_DEFAULT=openrouter`, `AI_PROVIDERS_ENABLED=openrouter,cloudflare`, `AI_PROVIDER_IMPLEMENTATIONS`, `OPENROUTER_FREE_ACCOUNT_TIER=standard`, `CLOUDFLARE_AI_FREE_DAILY_NEURONS=10000`, `DIGEST_AI_ENABLED=false`. Wrangler has bindings `DB`, `ATTACHMENTS`, `AI`, `ASSETS`, `LOGIN_RATE_LIMITER`; published `workers_dev=true`, `preview_urls=false`. Three source-defined Cron expressions exist. These are **intended values**, not an observed live configuration.

`HOSTED_BACKUP_AUTOCREATE_ENABLED` is an opt-in switch documented in [BG-28](../RECOVERY_OPERATOR_PROCEDURE.md), not enabled in this committed `[vars]` block. Keep it **off**. No new environment var, secret, provider access, account upgrade, Cron activation, route change or billing method is authorized by BG-31.

Policy [`2026-07-31.2`](../SECURITY_PRIVACY_GOVERNANCE.md) governs Unknown/Public/Personal/Sensitive routing. Unknown fails closed, Sensitive never leaves the approved local boundary, and Personal requires the documented explicit consent and provider contract. Optional AI/Notion/Telegram failure cannot erase canonical captures. Confirm the production version actually enforces this rather than trusting a source default. Public-host requests remain subject to SSRF protections and retention controls.

**Hard $0 check:** free-tier names and soft alerts do not guarantee no spend. The standing decision prohibits account/provider operations that expose the owner to additional charges. Do not enable pay-as-you-go, run billable remote probes, perform outbound AI/Notion/Telegram calls or activate hosted Cron based on this manifest. If an enforced $0 ceiling cannot be proved, retain **NO-GO**.

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

| Stage | Expected result | Mandatory stop |
| --- | --- | --- |
| S01: identity/config/ledger | Exact approved Worker build, Web release ID, correct D1 UUID, R2 binding, migrations and HTTPS origin | Any mismatch or missing identity |
| S02: homepage/static files | Root loads correct hashed Web assets without private cache exposure | Missing bundle, stale asset or secret leak |
| S03: direct deep link | New browser session loads `/items/<id>` route correctly | Missing/broken SPA route |
| S04: login/session/logout | Correct cookie flags, session persistence, logout invalidation | Login failure, session leak, insecure cookie |
| S05: anonymous denial | Protected item/export/download/API routes reject unauthenticated access | Any protected data exposure |
| S06: capture + same-key replay | Synthetic owner capture returns durable canonical ID; retry never loses or duplicates source unexpectedly | Lost item, inconsistent event, wrong ID |
| S07: original attachment | Authenticated original bytes match expected hash; anonymous retrieval denied, private cache disabled | Missing originals, hash mismatch, public/private leak |
| S08: search + reopening | Known distinctive fixture phrase resolves to correct item and evidence; privacy/deletion filters hold | Missing or wrong-private item |
| S09: privacy and optional degradation | Unknown/Sensitive disallow unauthorized external dispatch; failed optional provider never unsaves item | Unexpected outbound route or lost canonical save |
| S10: permitted integrations | Only separately approved neutral Notion/Telegram/AI fixtures reach their intended destinations | Wrong external destination, surprise charge, missing provider permission |
| S11: operational inspection | Safe job backlog, D1 migration, auth, capture, error, external quota and log review | Unexplained elevated errors, raw secret/content log or unexpected billing exposure |

**No external test message is included in the current authorization.** If provider test scope is not approved, record S10 **NOT EXECUTED** and do not silently send. Hosted proof, iPhone, two-week use, seven-day digest and BG-29.078 remain later independent acceptance gates.

### Immediate response to a stop trigger

1. Halt further migration/deploy, optional processing, scheduled jobs or traffic **only through an approved, environment-specific operating procedure**. Never improvise destructive toggles.
2. Preserve incident UTC timestamp, safe IDs, immutable artifact and ledger state, operation logs without raw content, and the last known good build/backup identities.
3. If schema remains compatible, use the **verified** previous Worker/Web artifact and matching configuration to restore compatible code, then repeat auth/capture/private-download and consistency checks. **Previous artifact: NOT YET IDENTIFIED OR PROVED COMPATIBLE.**
4. If migration changed schema incompatibly, **do not deploy old code blindly**. Prefer reviewed forward repair and re-verify. If that is unsafe, restore a verified independent backup into an isolated database/bucket, reconcile newer purge receipts and captured writes, and seek explicit owner approval before traffic cutover.
5. Notify the owner through the pre-agreed **non-Telegram operational channel**. Escalation contact/channel **NOT DESIGNATED**. Do not send a live Telegram bot message as a substitute for approval.

Auth failures, persistent capture loss, private route leak, migration inconsistency, deep-link failure, corruption/hash mismatch, missing backup/receipt evidence or any possible additional charge all block GO. No change to production or external messaging is authorized by writing these steps.
