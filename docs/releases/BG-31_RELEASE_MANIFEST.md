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
