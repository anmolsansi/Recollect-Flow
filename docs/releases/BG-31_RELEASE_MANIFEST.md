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
