# BG-29 staging-only verification plan (not executed)

**Status:** Prepared for authorization, NOT deployed. This runbook is specifically
for BG-29.075 (Worker CPU and memory at a 25,000,000-byte upload) and BG-29.078
(actual scheduled multi-stage backlog throughput and delay).

The production Wrangler configuration names `recollect-flow`, D1
`recollect-flow-prod` (ID `5fcba514-d0f7-45e7-a632-d4c59233af71`),
and R2 bucket `recollect-flow-attachments-prod`. **Never** run this staging
plan using the normal `wrangler.toml`. The production names/ID are listed
here only as safeguards against accidental reuse.

## Strict $0 cost gate (October 17, 2026)

**Current decision: NO-GO for hosted deployment.** This exercise may
use Cloudflare's existing free allowances only. The account plan,
remaining Workers/D1/R2 usage, R2 subscription status and billing
configuration have not been independently verified. No Cloudflare
account connection was available during the cost review. Do not
create staging resources or run a remote migration until these
conditions have been verified with read-only account access.

- **Workers Free:** 100,000 requests/day, up to five account-wide
  Cron triggers and **10 ms of CPU per scheduled invocation**.
  Failure or termination at this CPU limit is possible. Never
  upgrade the plan to pass the test.
- **D1 Free:** 5 million rows read/day, 100,000 rows written/day
  and 5 GB storage. Free-tier queries stop when a limit is reached.
- **R2 Standard:** 10 GB-month storage, 1 million Class A operations
  and 10 million Class B operations included per month. R2 is a
  usage-billed subscription with charges beyond those allowances.
  A free allowance is **not a hard $0 spending cap**. Do not start
  an R2 checkout or activate a new billable subscription as part
  of this task.
- **Cost alerts are not hard stops.** Cloudflare budget alerts are
  informational and do not pause usage. An alert cannot satisfy
  the user's zero-dollar condition.
- **Hard stop:** If any usage balance is unknown, a paid subscription
  or payment authorization is required, any resource is shared with
  production, or real providers cannot be disabled, do not deploy.
  Staging source preparation and local validation remain permitted.
  Do not substitute manual guesses for the actual account bill.

Run `node scripts/bg29-zero-cost-preflight.mjs` to validate that
the supplied staging *template* is isolated, uses mock providers,
has no Cron enabled and cannot deploy because its D1 ID is a
placeholder. This preflight does **not** check Cloudflare account
billing and deliberately never authorizes a deploy.

Official pricing and billing references:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/billing/manage/budget-alerts/

## Authorization and scope gates

1. Obtain explicit approval for **one** isolated Cloudflare staging Worker,
   separate staging D1 database and R2 bucket, their billing/free-tier scope,
   maximum test traffic and cleanup authorization. No resources are created
   merely by approving this source-code PR.
2. Choose an isolated account if possible. Verify Wrangler is authenticated
   to the expected account and compare every binding to the production
   exclusion list above. Never pass production credentials, D1 IDs or R2
   bucket names. Use only the dedicated example config after replacing its
   deliberately invalid placeholder IDs.
3. Before any hosted request, ensure no real Notion, OpenRouter, Telegram,
   Cloudflare AI, or other paid/externally visible providers can be invoked.
   The test harness must use deterministic local stubs and no real tokens.
   No production web origin, webhook or user data.
4. Set hard limits: at most 25,000,000 synthetic bytes per file, a
   24–48-item synthetic backlog, a maximum of 10 manual scheduled sweeps,
   a single test Worker, and zero automatic Cron triggers until isolated
   provider stubs are verified. Stop on an unexpected outbound request,
   unknown billing status, or any shared production binding.
5. Do not deploy, turn on a Cron, provision billed resources, use live
   provider tokens, or run remote migrations without **separate explicit
   approval**. This checklist grants no such authority.

## Nonproduction preparation

- Start from `wrangler.bg29-staging.example.toml`, not the default
  production `wrangler.toml`. Keep `workers_dev=false` and
  `preview_urls=false` until exposure/access controls are reviewed.
- Substitute only a new staging D1 ID and staging R2 bucket after
  confirming they exist and are isolated.
- Migrate a **local** D1 first. A hosted staging migration would be an
  additional approval-gated step, never implicit in this plan.
- Create a staging-only deployment version with the exact validated
  Git SHA. Verify the original production Worker version is unchanged.
- Stage fixtures with synthetic source URLs/text and synthetic PDF bytes,
  no customer data, personal data or live notifications.

## BG-29.075 measurement

Run the deployed staging Worker bundle under two workloads: normal
synthetic text/note capture and the 25 MB exact-limit PDF upload/finalize.
Capture the response/error codes, upload latency, Worker per-invocation
CPU time, **V8 isolate memory** (including P50/P90/P99 when available),
request counts and crash/OOM counts. Cloudflare's metrics dashboard
can report isolate memory, while local workerd DevTools can capture
CPU profiles and heap snapshots. Do not label Node/CI process RSS as
isolate usage, and do not label a CPU startup profile as upload CPU time.

Compare resource measurements with the account's actual limits and
document whether p95/peak measurement is representative; isolate
memory has a published 128 MB limit. Repeat at least twice to check
for growth, respecting the synthetic traffic cap.

Official reference:
https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/
https://developers.cloudflare.com/workers/observability/dev-tools/memory-usage/
https://developers.cloudflare.com/workers/observability/metrics-and-analytics/

## BG-29.078 measurement

Seed a 24–48-item **staging-only** backlog containing:

- URLs undergoing bounded acquisition -> enrichment
- Files undergoing attachment extraction -> enrichment
- Notion projection attempts scheduled independently, including
  subsequent updates after enrichment

The URL and file paths are alternatives, **not** the same four-stage
linear pipeline. Capture the actual production scheduler behavior,
which calls its worker stages in parallel.

For each hourly `17 * * * *` sweep, collect exact UTC invocation time,
oldest eligible queued item age, pending/processing/retry counts per
job type, stage completion timestamps, number of Notion attempts,
and final time when **all** queues reach zero. Include bounded retry
and lease recovery samples, preserving originals and disabled cost
routes. Compare observed drain to the local accelerated-clock model.
Use only approved staging Cron schedules and explicitly authorized
synthetic requests. Do not silently increase concurrency or Cron rate.

## Outcome, blockers and cleanup

- Attach immutable run URL, Worker version/Git SHA, nonproduction
  account/binding identifiers, sample count, graph of queue age/depth,
  memory/CPU evidence, error output and final cost/quota observation.
- If either scenario fails, create a specific defect and keep BG-29.075
  or BG-29.078 unchecked. Never substitute the logical-hour local
  simulation for elapsed hosted Cron time.
- Tear down **only** BG-29-owned staging fixtures/resources after
  approval and retain sanitized evidence. Never change production.
- After both steps are genuinely accepted, run full exact-head CI,
  review changes and merge PR #100 only after approval. Then update
  GitHub #99, Linear OPE-344 and BG-30 gate.
