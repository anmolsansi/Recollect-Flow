# BG-29.078 — Step 12 account-wide financial and isolation decision

**Checked:** 2026-10-21, initial read-only browser attempt followed by authenticated Opera inspection; source baseline `main` at `55f1de22837a883f151731e7104b033601a17c9e`.
**Frozen policy:** no additional Cloudflare/provider charges, no production mutation, and no external-provider calls. The 17 frozen acceptance conditions in `BG-29_078_ACCEPTANCE_CONTRACT.md` remain unchanged.

## Decision: NO-GO for hosted R2 or staging deployment

The financial assessment and a read-only attempt have been performed. **AC-02 is BLOCKED**, not PASS: authenticated account-wide usage is now observable (see latest snapshot below), but no enforceable `$0` upper spending bound exists for usage-billed R2. Steps 13 and 14 are not authorized. No resource provisioning, R2 request, hosted deployment, Cron update, or remote migration was performed.

A 2026-10-17 prior read-only inspection (see `BG-29_STAGING_ONLY_PLAN.md`) reported Workers Free, R2 **Paid** usage-billed subscription, 0.02 GB-month Standard and 5 Class B operations, $0.00 current/projected spending, and **unavailable Class A usage**. It is **historical only**; do not use it as the current usage baseline. A previous D1-only Cron test and its owner-confirmed no-charge shutdown are also historical evidence, not this full-pipeline proof.

**2026-10-21 earlier inspection:** an isolated read-only Cloudflare dashboard browser run was redirected from https://dash.cloudflare.com/ to https://dash.cloudflare.com/login. It did not access account data. Workers plan, D1 usage, Standard R2 storage, Class A/B operations, billing, and current BG-29 staging resources are **unavailable in that first browser session**. No login or mutation was performed. A subsequent signed-in Opera inspection is documented below and supersedes the missing-metrics finding.

## Published pricing and risk

- **Workers Free:** Official published free allowance or bound: 100,000 requests/day; five account-wide Cron triggers; **10 ms CPU per scheduled invocation**; Consequence: Hosted extraction may exceed CPU; that is a FAIL, not permission to upgrade
- **R2 Standard storage:** Official published free allowance or bound: 10 GB-month/month included, then $0.015/GB-month; Consequence: Current usage is observed below; no absolute $0 cap
- **R2 Standard Class A:** Official published free allowance or bound: 1,000,000 operations/month included, then $4.50/million; Consequence: Account-wide operations now directly observed as 0 in R2 Overview; creation and PUT count; no hard cost cap
- **R2 Standard Class B:** Official published free allowance or bound: 10,000,000 operations/month included, then $0.36/million; Consequence: Reads/HEADs count; account usage currently 5; future shared traffic unknown
- **R2 Standard egress:** Official published free allowance or bound: Free; Consequence: Does not eliminate storage/operation charges
- **Billing alerts:** Official published free allowance or bound: Notifications only; do not pause or cap usage; Consequence: Not a $0 enforcement mechanism

Cloudflare rounds billable overage units upward. Remaining free allowances may change independently during the test. Even a very small overage may therefore produce a bill.

Official references (checked October 21, 2026):

- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/billing/manage/budget-alerts/

## Bounded synthetic _incremental_ workload estimate — NOT a financial guarantee

The frozen contract permits **12 synthetic PDFs, 12 synthetic URL responses, 24 unique originals, and at most 10 genuine eligible hourly sweeps**. Each PDF must remain strictly under the 25,000,000-byte application limit.

- Absolute source PDF payload upper envelope: less than `12 × 25,000,000 = 300,000,000` bytes (about 0.3 decimal GB of new data). The actual deterministic PDFs are much smaller. This is **not** account-wide R2 total storage, nor an estimate of how long objects are retained.
- Initial R2 puts: approximately 12 successful `PutObject` (Class A), plus bucket setup and any metadata/list/retry operations. A repeated or interrupted seed could cause more unless independently prevented.
- Successful extraction: at least 12 `GetObject` reads (Class B). Repeated scheduled sweeps, checksum probes, retries, smoke tests, and post-run integrity checks add more. The code does **not** supply a hard account-wide upper bound on requests.
- A planning-only envelope of **100 Class A and 500 Class B incremental operations** would be comfortably below the _published total free allowance_, **but is NOT proven as an enforced limit, an exact implementation bound, or remaining account headroom**. Do not treat this envelope as approval or a statement of worst-case financial liability.
- Other account workloads may consume the shared free allowances while BG-29 runs. Cloudflare budget alerts cannot halt that exposure.

Under an absolute `$0` rule, **estimated $0 is not guaranteed $0**. Thus the decision remains NO-GO regardless of theoretical headroom in isolation.

## Owner/account verification checklist

Authenticated Opera read-only verification completed for the current visible fields; retain the following requirements when reconsidering deployment:

1. Account identity (record internal match only), billing cycle boundaries, Workers plan and current Cron quota.
2. R2 Standard subscription status, current account-wide GB-month usage, **both Class A and Class B** used/remaining, and current concurrent R2 workloads.
3. Current and projected Billable Usage and any delayed/unbilled operations; separate R2 storage and A/B from D1/Workers.
4. D1 Free/Paid plan, current usage/quotas, current dedicated staging D1 existence and migrations.
5. Current Worker, D1, R2 binding/resource inventory. Compare against production IDs and names using `wrangler.toml`; confirm ownership/isolation and currently installed triggers.
6. A dated independent basis showing the owner’s required **enforceable** $0 condition can be met. If that is impossible with usage-billed R2, the owner would have to explicitly _change_ the financial policy before hosted work. A mere free-tier balance, positive budget-alert balance, or casual request to continue does not change it.

## GO/NO-GO record

- Step 12 **review and decision:** COMPLETE as a documented **NO-GO**, not a successful financial authorization.
- AC-01 **isolated target:** only the existing D1 probe Worker, D1 database, and current R2 bucket inventory were observed. Dedicated multi-stage Worker/R2 bucket still do not exist in the dashboard inventory; future binding isolation must be verified after explicit permission.
- AC-02 **financial clearance:** BLOCKED (current plan/usage and $0 observed billing now verified in Opera; no enforceable $0 cap or authorization to expose usage-billed R2).
- Step 13 **explicit owner authorization:** NOT GRANTED by this record; strict $0 remains binding.
- Step 14 **hosted provisioning/seeding/deployment:** **NOT STARTED** under the mandatory stop condition.
- BG-29.078 **acceptance:** OPEN; canonical BG-29 99/100; BG-30 LOCKED.

Preserve this negative decision and its provenance. Do not record unknown usage as zero. The staging Wrangler preflight intentionally returns `deploymentAuthorized: false`.

## Subsequent 2026-10-21 signed-in Opera inspection — CURRENT AUTHENTICATED SNAPSHOT

This read-only snapshot **supersedes** the earlier unauthenticated browser attempt for current billing and account resources. An authenticated Opera Browser Connector session was open on the existing account matching BG-29's staging D1. The inspection used only existing dashboard navigation. No billing, Worker, R2, D1, Cron, secret, account, or production mutation occurred. The following is an authenticated UI observation, not a promise of future consumption or final invoice.

### Billing / subscriptions

- **Billing period:** Sep 25 through Oct 24, 2026. Dashboard says 27 of 30 cycle days observed through October 21; R2 overview labels its monthly usage period Sep 25 through Oct 25.
- **Observed total cost:** **$0.00**.
- **Projected cycle cost:** **$0.00**.
- **Average daily cost:** **$0.00**.
- The billable usage table shows R2 Standard stored usage **0.03 GB-month**, **0 GB-month billable**, **$0.00** storage cost.
- The billable usage table shows **5 R2 Class B operations**, **0 billable**, **$0.00** Class B cost.
- The R2 Overview independently shows **0 Class A operations**. Class A was absent from the displayed Billable Usage table, so the R2 overview is the source for that counter.
- Subscription list: **Workers Free Active**; **R2 Paid**, next renewal **Oct 25, 2026**.

### R2 bucket inventory and operations

- R2 overview reports **0 Class A**, **5 Class B**, **30.45 MB total current stored bytes**, and **$0.00 current-period billable cost**.
- R2 inventory contains **one existing bucket: `propertyos-media`**, with **22 objects**, **30.45 MB**. This bucket belongs to a distinct workload and must not be used for BG-29.
- No dedicated BG-29 multi-stage R2 bucket was listed. The deliberately uncreated placeholder in `wrangler.bg29-multistage-staging.toml` remains unsuitable for deployment.
- Published Standard allowances: 10 GB-month, 1 million Class A and 10 million Class B per month. As of the snapshot, displayed usage was well below these allowances. **This is headroom, not a hard cap or an account-wide guarantee against concurrent traffic.**

### Workers and D1 inventory

- Workers Free account usage widget: **0/100,000 requests today**, **7 requests** in the separate usage graph and **35.63 ms** displayed CPU usage; no Worker plan upgrade made.
- Exactly **one Worker** appears in the Worker list: `recollect-flow-bg29-d1-cron-probe`. It has **no active routes**, `workers.dev` disabled, and only one D1 binding to `recollect-flow-bg29-staging`.
- That Worker's Settings → Trigger events explicitly says **"No cron triggers configured"**. The prior D1-only probe remains disabled. No new BG-29 multi-stage Worker appears.
- Exactly **one D1 database** listed: `recollect-flow-bg29-staging`, ID `b5cbeccc-92fb-4bbc-9597-f0174b84e57d`, **610.3 kB** stored.
- D1 usage widget: **1/10 databases**, **0/5 million rows read today**, **0/100,000 rows written today**, **610.3 kB/5 GB** stored. The UI separately reports **6.78 kB-month** metered storage and **$0.00** billable usage.
- No remote D1 migration was attempted, and the staging D1's application migration state was not re-audited in this read-only pass.

### Interpretation and unchanged decision

1. **Current-account usage visibility is resolved.** Unlike the earlier session, this inspection directly confirmed both R2 operation classes, storage, current/projected charges, Workers Free, D1, staging-resource identities and the disabled Cron.
2. **Financial authorization is NOT resolved.** R2 Paid is metered; its published free tier does not implement a hard $0 spending cutoff. Budget alerts notify but do not stop usage. Current and projected $0 are not a guaranteed post-test invoice.
3. **Step 12's read-only investigation is complete.** Its AC-02 deployment gate remains **NO-GO** under the owner's absolute $0 rule. If that requirement is retained, do not provision R2, seed remote fixtures, deploy the Worker, or enable any Cron. Steps 13–14 remain blocked.
4. No production binding was touched or changed. A future hosted rollout would need another fresh check of the account plus independently approved, enforceable risk controls or an explicitly revised spending policy.

The dashboard account-specific pages were inspected in Opera at:

- Cloudflare **Billing → Subscriptions** and **Billing → Billable usage**.
- **R2 Object Storage → Overview**.
- **Workers & Pages → Overview** and the existing probe's **Settings → Trigger events**.
- **D1 SQLite Database → Overview**.

No account credentials, payment details or billing identity were recorded in this document.
