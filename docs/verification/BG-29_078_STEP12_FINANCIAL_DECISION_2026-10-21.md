# BG-29.078 — Step 12 account-wide financial and isolation decision

**Checked:** 2026-10-21, 06:47 UTC (read-only browser attempt); source baseline `main` at `55f1de22837a883f151731e7104b033601a17c9e`.
**Frozen policy:** no additional Cloudflare/provider charges, no production mutation, and no external-provider calls. The 17 frozen acceptance conditions in `BG-29_078_ACCEPTANCE_CONTRACT.md` remain unchanged.

## Decision: NO-GO for hosted R2 or staging deployment

The financial assessment and a read-only attempt have been performed. **AC-02 is BLOCKED**, not PASS: no current authenticated account-wide usage/billing snapshot and no enforceable `$0` upper spending bound for usage-billed R2. Steps 13 and 14 are not authorized. No resource provisioning, R2 request, hosted deployment, Cron update, or remote migration was performed.

A 2026-10-17 prior read-only inspection (see `BG-29_STAGING_ONLY_PLAN.md`) reported Workers Free, R2 **Paid** usage-billed subscription, 0.02 GB-month Standard and 5 Class B operations, $0.00 current/projected spending, and **unavailable Class A usage**. It is **historical only**; do not use it as the current usage baseline. A previous D1-only Cron test and its owner-confirmed no-charge shutdown are also historical evidence, not this full-pipeline proof.

**2026-10-21 new inspection:** an isolated read-only Cloudflare dashboard browser run was redirected from https://dash.cloudflare.com/ to https://dash.cloudflare.com/login. It did not access account data. Workers plan, D1 usage, Standard R2 storage, Class A/B operations, billing, and current BG-29 staging resources are **unavailable / not reverified**. No login or mutation was performed.

## Published pricing and risk

- **Workers Free:** Official published free allowance or bound: 100,000 requests/day; five account-wide Cron triggers; **10 ms CPU per scheduled invocation**; Consequence: Hosted extraction may exceed CPU; that is a FAIL, not permission to upgrade
- **R2 Standard storage:** Official published free allowance or bound: 10 GB-month/month included, then $0.015/GB-month; Consequence: Shared usage is unknown; no absolute $0 cap
- **R2 Standard Class A:** Official published free allowance or bound: 1,000,000 operations/month included, then $4.50/million; Consequence: Account-wide consumed operations **unknown**; creation and PUT count
- **R2 Standard Class B:** Official published free allowance or bound: 10,000,000 operations/month included, then $0.36/million; Consequence: Reads/HEADs count; shared concurrent traffic unknown
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

## Missing dated owner/account evidence

Before reconsideration, collect in the owner's authenticated Cloudflare dashboard without exposing payment details/tokens:

1. Account identity (record internal match only), billing cycle boundaries, Workers plan and current Cron quota.
2. R2 Standard subscription status, current account-wide GB-month usage, **both Class A and Class B** used/remaining, and current concurrent R2 workloads.
3. Current and projected Billable Usage and any delayed/unbilled operations; separate R2 storage and A/B from D1/Workers.
4. D1 Free/Paid plan, current usage/quotas, current dedicated staging D1 existence and migrations.
5. Current Worker, D1, R2 binding/resource inventory. Compare against production IDs and names using `wrangler.toml`; confirm ownership/isolation and currently installed triggers.
6. A dated independent basis showing the owner’s required **enforceable** $0 condition can be met. If that is impossible with usage-billed R2, the owner would have to explicitly _change_ the financial policy before hosted work. A mere free-tier balance, positive budget-alert balance, or casual request to continue does not change it.

## GO/NO-GO record

- Step 12 **review and decision:** COMPLETE as a documented **NO-GO**, not a successful financial authorization.
- AC-01 **isolated target:** config design prepared, hosted actual binding inventory NOT verified.
- AC-02 **financial clearance:** BLOCKED (account metrics unavailable; no enforceable $0 cap).
- Step 13 **explicit owner authorization:** NOT GRANTED by this record; strict $0 remains binding.
- Step 14 **hosted provisioning/seeding/deployment:** **NOT STARTED** under the mandatory stop condition.
- BG-29.078 **acceptance:** OPEN; canonical BG-29 99/100; BG-30 LOCKED.

Preserve this negative decision and its provenance. Do not record unknown usage as zero. The staging Wrangler preflight intentionally returns `deploymentAuthorized: false`.
