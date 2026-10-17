# BG-29 D1-only staging probe: manual deployment checklist

**Not full BG-29.078 acceptance.** This is a deliberately reduced, no-R2,
no-provider, free-plan-only proof that the dedicated D1 DB can be migrated
and real Cloudflare scheduled events occur hourly. It does not execute the
application's URL/file -> enrichment -> Notion chain. Do not check BG-29.078
or unlock BG-30 based on this probe.

## Identity / hard spending boundaries

- Account ID from owner-inspected Cloudflare dashboard:
  `a9482fbfb91ace26dee097cbd41293f9`.
- Dedicated, already-created **staging** D1:
  `recollect-flow-bg29-staging`,
  `b5cbeccc-92fb-4bbc-9597-f0174b84e57d`.
- Dedicated Worker: `recollect-flow-bg29-d1-cron-probe`.
- Both configs have `workers_dev=false`, `preview_urls=false`;
  no routes, R2 buckets, `[ai]`, external providers, secrets or production D1.
- **Never run** `npm run deploy`, `npm run db:migrate:remote`,
  `npx wrangler deploy` without a `--config` argument, or
  `npx wrangler d1 migrations apply recollect-flow-prod`.
  Those default commands target the separate production configuration.
- Stop at any upgrade, payment, unexpectedly non-Free Workers plan,
  unexpected account, unknown resource or error. Do not add credentials
  to source control or paste them into ChatGPT.

## Prerequisites on your Mac (repository checkout)

Use the BG-29 branch, not arbitrary `main`:

```bash
git clone --branch feat/bg-29-resilience-capacity-performance https://github.com/anmolsansi/Recollect-Flow.git
cd Recollect-Flow
node --version       # >=22
npm ci
npx wrangler login   # browser OAuth, no tokens shared in chat
npx wrangler whoami  # VERIFY account matches the one above
```

For an existing checkout, use `git fetch origin` and
`git switch feat/bg-29-resilience-capacity-performance` instead of cloning,
provided your local changes are preserved. Do not discard unrelated work.

## Phase 1: migrate only staging D1

Check the new, dedicated Wrangler config. It is intentionally different
from the production `wrangler.toml`. List the pending migrations:

```bash
npx wrangler d1 info recollect-flow-bg29-staging
npx wrangler d1 migrations list DB \
  --config wrangler.bg29-d1-probe.toml --remote
```

The repository currently has **22** versioned files in `migrations/`,
including `0001_initial.sql` through `0025_bg28_scheduled_backups.sql`
(with numbering gaps). If the target database ID is different, stop.
Apply only after confirming the list is for the staging DB:

```bash
npx wrangler d1 migrations apply DB \
  --config wrangler.bg29-d1-probe.toml --remote
```

This writes to the staging D1 only. Confirm after applying:

```bash
npx wrangler d1 migrations list DB \
  --config wrangler.bg29-d1-probe.toml --remote
```

There should be no pending migrations. The newly created D1 originally
had 0 tables and 0 queries; after migrating it should have application
tables. Cloudflare D1 Free enforces hard daily read/write and storage
limits rather than charging for exceeding those limits.

## Phase 2: deploy isolated Worker with **no Cron**

```bash
node --test scripts/bg29-d1-cron-probe.test.mjs
npx wrangler deploy --config wrangler.bg29-d1-probe.toml --dry-run
npx wrangler deploy --config wrangler.bg29-d1-probe.toml
```

The Worker exposes HTTP 404 only. Its no-Cron configuration explicitly
sets `[triggers]` / `crons = []`, which also disables an existing Cron
on later redeployment (merely omitting `[triggers]` does **not** disable
an existing trigger).
Confirm it appears by the exact name
`recollect-flow-bg29-d1-cron-probe` in Cloudflare Workers & Pages.
Do not select or modify `recollect-flow` or any other Worker.

## Phase 3: opt into real hourly Cron

Only after the free-plan, staging-only and no-R2 checks above pass:

```bash
npx wrangler deploy --config wrangler.bg29-d1-probe-cron.toml --dry-run
npx wrangler deploy --config wrangler.bg29-d1-probe-cron.toml
```

That second config changes **only the dedicated probe Worker's** triggers
to `17 * * * *` UTC. It runs a no-network synthetic 24-record D1
heartbeat, processes up to 8 records per hour, retains originals and
writes observed UTC sweep times to `bg29_d1_probe_sweeps`. It has a
10 ms per-trigger CPU ceiling on Workers Free; if execution fails, do
not upgrade. Newly added scheduled triggers may take up to 15 minutes
to propagate. The schedule fires at minute 17 of every **UTC** hour;
deploying does not execute it immediately. The probe tables
`bg29_d1_probe_jobs` and `bg29_d1_probe_sweeps` are created by the
**first successful scheduled invocation**, not by the 22 application
migrations. Until then, querying `bg29_d1_probe_sweeps` returns
`no such table`; that alone is not evidence of a broken migration.

Inspect the deployed Worker's scheduled event outcome and error logs,
or tail **only this staging Worker**:

```bash
npx wrangler tail recollect-flow-bg29-d1-cron-probe \\
  --config wrangler.bg29-d1-probe-cron.toml --format pretty
```

A `bg29_d1_only_hourly_probe` JSON log with 24 originals and
successful hourly event outcome confirms that the handler ran. If
no scheduled invocation appears after the next full hourly opportunity
and propagation period, inspect the Worker's **Settings > Triggers**
and **Observability** before making any changes. Do not re-run migrations
just to create the probe table.

After _actual_ elapsed scheduled executions (not manual fast-forward),
inspect the Cloudflare Worker logs and run:

```bash
npx wrangler d1 execute DB --remote \
  --config wrangler.bg29-d1-probe.toml \
  --command "SELECT id, scheduled_at, observed_at, original_count, completed_count, pending_count FROM bg29_d1_probe_sweeps ORDER BY id;"
```

Expect pending counts falling from 16 to 8 to 0 across real hourly
sweeps when all three run. Confirm original count stays 24 and compare
the timestamps with Cloudflare Cron invocation logs. One D1-only probe
cannot substitute for hosted R2/file processing or actual optional
provider sync. Record the observed cost before and after in Cloudflare
Billing; no R2 activity should originate from this Worker.

## Stop / disable the trigger

To stop future Cron executions **without deleting the database**,
use the no-Cron config with explicit `[triggers]` / `crons = []`
and deploy it to the same probe Worker. **The initial version of this
file lacked the explicit empty array and could leave the Cron active;
fetch the corrected version before using this stop command.**

```bash
npx wrangler deploy --config wrangler.bg29-d1-probe.toml
```

Confirm the Cron trigger disappears from that Worker's dashboard.
Do not delete the staging D1 or production resources. Preserve logs
and the D1 sweep table until acceptance evidence has been reviewed.

**BG-29 status:** Even if this completes perfectly, canonical 99/100
remains unchanged because BG-29.078 requires full hosted multi-stage
pipeline evidence that this deliberately restricted probe cannot supply.
