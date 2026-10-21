# BG-29.078 — Steps 13–14 approval gate and isolated staging manifest

**Status (2026-10-21):** PREPARED FOR REVIEW ONLY — FINANCIAL NO-GO. No hosted staging action is authorized.
**Decision source:** [Step 12 financial gate](BG-29_078_STEP12_FINANCIAL_DECISION_2026-10-21.md) and [frozen AC-01..AC-17](BG-29_078_ACCEPTANCE_CONTRACT.md).
**Baseline:** `55f1de22837a883f151731e7104b033601a17c9e` on `main`; later implementation changes require exact-head re-review.

## Step 13 — owner's explicit staging authorization: NOT GRANTED

The owner's standing condition remains **$0 additional charges and no production changes**. The instruction to work on Steps 12–14 does not waive that condition or establish the account's current R2 headroom. A usage-billed R2 subscription without a hard spending cutoff cannot be certified as absolute $0. Consequently **Step 13 fails its prerequisite until the financial gate genuinely passes**. Do not convert this document, a PR approval, or a code merge into hosted R2 authorization.

### Scope that would require a separate approval after clearance

| Category | Maximum permitted proposal | Current decision |
| --- | --- | --- |
| Target Worker | `recollect-flow-bg29-multistage-staging`, with dedicated staging entry only | Not deployed / current hosted presence unverified |
| Staging D1 | `recollect-flow-bg29-staging` / `b5cbeccc-92fb-4bbc-9597-f0174b84e57d` | Exists in prior owner-reported probe; reverify before any operation |
| Staging R2 | One *new distinct* **Standard** bucket, never production | NO-GO creation, name not assigned, current absence not independently checked |
| Source originals | Exactly 12 allowlisted URL fixtures + 12 SHA-pinned valid PDFs | Local fixtures available, **not** remotely seeded |
| Worker ingress | `workers_dev = false`, `preview_urls = false`, no routes/custom domains | Prepared only |
| Provider interactions | Mock URL, mock AI, durable mock Notion; no real Notion/OpenRouter/Telegram/notifications | Fail-closed preparation only |
| Cron | `[triggers]` with `crons = []` | Config disabled; remote trigger state not rechecked |
| Test length | 10 maximum *real* eligible hourly sweeps **only after later separate Step 16 approval** | Not activated |
| Billing | Strict **$0 additional charge** across all services | No enforceable R2 cutoff demonstrated |
| Cleanup | Preserve D1 evidence; disable any owned Cron; delete only expressly approved synthetic fixtures | No hosted artifacts created here |

**Prohibited always:** production Worker `recollect-flow`; production D1 `5fcba514-d0f7-45e7-a632-d4c59233af71`; production R2 `recollect-flow-attachments-prod`; live providers; billing/plan upgrades; real account secrets; production route changes.

### Owner approval record (unsigned; do not infer approval)

- Owner identity/dated authorization: **NOT PROVIDED**
- Current account-wide usage and billing evidence: **NOT AVAILABLE**
- Proof of enforceable financial policy: **NOT AVAILABLE**
- Exact staging Worker/D1/R2 resource IDs verified against production: **PARTIAL CONFIG-ONLY**
- Independent review of zero-egress and scheduled runtime feasibility: **LOCAL-ONLY**
- Authorization decision: **WITHHELD — NO-GO**
- Separate future allowance for any nonzero billing risk: **NOT GRANTED**
- Hosted migration/provision/deploy authorization: **NOT GRANTED**

Any later approval must document a reviewed identity, dated account evidence, exact proposed resources and operations, maximum duration and rollback, and precisely whether the absolute $0 rule still applies. It cannot be backdated. A change to the $0 requirement, if ever desired, must be a separate explicit decision.

## Step 14 — isolated staging preparation: prepared, remote execution BLOCKED

### Existing code/config assets

1. Dedicated, staging-only config: `wrangler.bg29-multistage-staging.toml`.
2. Staging entry point: `apps/worker-api/src/bg29-staging-entry.ts`. Production entry remains `apps/worker-api/src/index.ts`.
3. Fail-closed preflight: `scripts/bg29-multistage-config-check.mjs` with Node negative tests.
4. Safe 24-original local seed: `apps/worker-api/test/fixtures/bg29-24-capture-seed.ts`.
5. Real extraction tests: `apps/worker-api/test/bg29-real-pdf.d1.spec.ts`; local complete pipeline in focused BG-29 tests.
6. Durable mock Notion, failure/retry evidence, CPU review and acceptance validator: see merged PR #113 and frozen acceptance contract.

**Important:** The staging TOML names a deliberately **UNCREATED placeholder** bucket `bg29-multistage-r2-not-created-do-not-deploy`. It is not a real binding target and must not be auto-created. Its preflight intentionally returns `deploymentAuthorized: false`; do not bypass it, silently replace the bucket, or run a hosted Wrangler command merely because local CI is green.

### Preflight and possible staged release order — NOT commands to execute yet

**Preparation permitted:** read existing GitHub sources, run unit/integration suites, run the config negative tests, validate Wrangler config with a local dry-run, inspect proposed source/manifest and SHA without any remote account operation.

**After a separately documented financial GO and owner's specific approval (both missing), the authorized operator would:**

1. Re-read the exact current account, quota/billing, Worker triggers, staging D1 and production resource inventory. Stop on any mismatch.
2. Pick a new staging R2 Standard bucket name known not to exist and verify no production overlap before requesting permission for creation.
3. Create only the approved bucket, and verify the account charge/usage change. Immediately stop on unexpected costs or missing metrics.
4. Validate only the approved staging D1 migrations, never default `wrangler.toml` and never an unspecified remote D1 target.
5. Upload and SHA-verify 12 synthetic PDFs exactly once, record sizes and Class A/B usage.
6. Seed the 12 deterministic URL fixture records, D1 processing jobs and Notion mock sync attempts, and reconcile exactly 24 originals and no extra jobs.
7. Update a new explicitly approved staging config to the verified bucket identity; keep `crons = []` and provider/network isolation. Run lint, negative tests, and exact-source dry-run again.
8. Deploy only the dedicated staging Worker **with Cron disabled** after confirming the full financial and isolation scope. Verify deployed version, binds and event counters; stop on unexpected route, external call, resource limit or bill.

**Steps 15–17 are separate later gates:** a disabled-Cron deployment alone is not hosted BG-29.078 proof; real hourly Cron activation and repeated execution require their own independent approval and authenticated logs.

### No-op checkpoint

| Staging resource/action | Verified result of this turn |
| --- | --- |
| Cloudflare account read-only dashboard inspection | Login redirected; no authenticated usage available |
| Production Worker/D1/R2 | Not operated on |
| Existing staging D1 | Not operated on; previous existence historical |
| Dedicated new staging R2 | Not created or accessed |
| Hosted staging Worker | Not deployed or changed |
| Staging remote migrations/fixture upload | Not performed |
| Hourly Cron | Not enabled or modified |
| Provider network calls | None initiated |
| Billable Cloudflare operations | None initiated by this work |
| Owner financial signoff | Absent; Step 13 and Step 14 blocked |

This is a truthful stop at the financial gate, not a partial hosted deployment. Retain GitHub #99 OPEN, Linear OPE-344 IN PROGRESS, BG-29.078 unchecked and BG-30 LOCKED.
