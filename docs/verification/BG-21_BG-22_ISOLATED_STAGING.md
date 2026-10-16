# BG-21/BG-22 — Isolated Cloudflare staging runbook

**Status (October 11, 2026):** Repository preparation only. No authenticated
Cloudflare management session or account-scoped Cloudflare connector was
available. A read-only dashboard check opened
[Cloudflare login](https://dash.cloudflare.com/login); Workers, D1 and R2
access cannot be assessed without an authenticated owner session. **No remote
deployment, remote migration, live D1/R2 access, secrets, DNS edits or outbound
messages were performed.** BG-21 issue #83 and BG-22 issue #85 stay open.

## Least privilege and explicit boundaries

Cloudflare's [Workers authorization guide](https://developers.cloudflare.com/workers/authorization/)
describes Workers **Admin** for creating a new Worker, and **Editor** for
deploying updates to an existing Worker. Provisioning D1/R2 additionally
requires the corresponding product-level creation rights; remote D1
migrations require access to the explicitly created staging D1. Once
provisioned, scope the deployment token to the staging Worker and its
resources rather than granting production write access. Use a user-approved
Cloudflare dashboard session or a secret-managed `CLOUDFLARE_API_TOKEN`
outside GitHub and outside chat. Never share credentials in a message,
commit, command argument, Actions log, or screenshot.

The default `wrangler.toml` remains **production-targeting**: Worker
`recollect-flow`, database `recollect-flow-prod`, bucket
`recollect-flow-attachments-prod`. **Do not run** `npm run deploy` or
`npm run db:migrate:remote` for staging. They use production-targeting
defaults.

Staging requires individually created resources:

| Resource              | Separate staging target                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker                | `recollect-flow-bg21-bg22-staging`, a distinct `*.workers.dev` host                                                                                         |
| D1                    | `recollect-flow-bg21-bg22-staging`, with its new, separate UUID                                                                                             |
| R2                    | `recollect-flow-attachments-bg21-bg22-staging`, private by default                                                                                          |
| Worker secrets        | New synthetic CAPTURE/ADMIN/LOCAL_WORKER tokens; placeholder nonfunctional Notion/Telegram tokens; `WEB_INBOX_BASE_URL` set to the staging **HTTPS** origin |
| Optional integrations | No real AI providers, no actual Notion database, disabled digest AI, no scheduled cron triggers, no live notifications                                      |

Do not attach a production D1/R2 resource, real Notion/Telegram credential,
custom domain, route, DNS zone, account billing setting or production Worker
version. Use synthetic records exclusively. Leave R2 public access disabled.

## Provision only after the account connection is established

1. Sign in at <https://dash.cloudflare.com/> in the account explicitly
   approved for this staging release. Confirm its **account ID**, Workers
   administration access, **D1** and **R2** access. A signed-out browser
   cannot supply this proof.
2. Create the three separately named staging resources in that account,
   either through the dashboard or through approved account-scoped
   Cloudflare tools. Record the actual D1 database UUID. Independently
   inspect the D1 and R2 bindings against the production config.
3. Configure the staging Worker's required secrets from secure storage;
   generate new unique staging values. Never copy production secrets.
   Disable external integrations: use synthetic nonfunctional integration
   credentials and no linked real Notion database. Set
   `WEB_INBOX_BASE_URL` to the actual `https://<staging-worker>.<account-subdomain>.workers.dev`
   URL. Cloudflare Workers environments and D1 bindings are
   [separately configurable](https://developers.cloudflare.com/workers/wrangler/environments/).

## Generate an isolated, ignored Wrangler config

From the **exact intended release checkout**, after creating resources,
supply non-secret resource identifiers and the account ID through your
local/CI environment (replace placeholders only in your own terminal):

```bash
export CLOUDFLARE_ACCOUNT_ID="<32-character-account-id>"
export BG_STAGING_WORKER_NAME="recollect-flow-bg21-bg22-staging"
export BG_STAGING_D1_NAME="recollect-flow-bg21-bg22-staging"
export BG_STAGING_D1_ID="<distinct-staging-D1-UUID>"
export BG_STAGING_R2_BUCKET="recollect-flow-attachments-bg21-bg22-staging"

npm ci
npm run staging:guard:test
npm run staging:prepare
npm run staging:verify
npm run release:package
npx wrangler deploy --config .bg21-staging-preview.toml --dry-run
```

`scripts/staging-guard.mjs` rejects missing account identity, invalid
naming and malformed UUIDs, the exact production Worker/D1/R2 identities,
and unsafe Worker origins. It generates the ignored
`.bg21-staging-preview.toml` with **no secrets**, no custom routes,
no cron triggers and no enabled AI/Notion/digest processing. Generated
configuration is not an authorization to deploy.

The staged Worker should only be deployed using
`--config .bg21-staging-preview.toml`; do not use the default production
Wrangler config. Review dry-run bindings and explicit account identity
before issuing any remote command. To apply initial D1 migrations to **only
the confirmed staging database**:

```bash
npx wrangler d1 migrations apply "$BG_STAGING_D1_NAME" \
  --remote --config .bg21-staging-preview.toml
```

Then, **after verifying the staging Worker has its own required secrets
and the approved D1/R2 bindings**, deploy the checked artifact using:

```bash
npx wrangler deploy --config .bg21-staging-preview.toml
```

This is a staging-only command and should not be run from an unverified
account. Cloudflare documents both
[D1 migrations](https://developers.cloudflare.com/d1/wrangler-commands/)
and [private R2 bucket provisioning](https://developers.cloudflare.com/r2/buckets/create-buckets/).

## Hosted acceptance (read/limited synthetic writes)

Only once the account, Worker and D1/R2 bindings have been independently
checked and no production resources are referenced, supply the exact staging
host and separately managed **staging** admin credential:

```bash
export BG_STAGING_ORIGIN="https://recollect-flow-bg21-bg22-staging.<account-subdomain>.workers.dev"
export BG_STAGING_BINDINGS_CONFIRMED="yes"
# Set BG21_PREVIEW_ADMIN_TOKEN securely to the staging-only ADMIN_TOKEN value
npm run staging:verify
npm run staging:hosted:verify
```

The combined runner checks the account-independent binding invariants,
matched generated config, exact local source/release manifest, declared
staging HTTPS origin and explicit operator resource confirmation. It first
runs `verify-remote-hosting.mjs` for actual HTTPS routing, versioned asset
SHA-256, private cache headers, Secure/HttpOnly/SameSite cookie, browser
login and logout; only if that succeeds does it run
`verify-browser-creation.mjs --hosted-staging`. The second stage creates
**synthetic** URL, text, private note, PNG and PDF through a real browser,
asserts search, original integrity, edits, duplicates and signed-out access,
and retains test fixtures in **staging-only** D1/R2. Neither script performs
a deploy. The runner fails closed before network access if validation fails.

## Still needed before 100%

**BG-21**: resolve operator-route scope (`.044`), prove edge-cache
transition (`.059`), real HTTPS/cookies/hosted login (`.061`, `.062`,
`.065`), run old/new artifact and rollback compatibility (`.077`),
and record authorized exact release publication (`.080`). The staged
HTTPS script handles a subset; version transitions require two distinct
approved releases and preserved historical asset testing.

**BG-22**: acquire/index/search actual URL page text (`.031`), screenshot
OCR text (`.034`), PDF extracted content (`.035`), confirm a disabled
Notion test path (`.062`) and retry the _same_ deferred enrichment job after
its eligible backoff (`.068`). Hosted five-source browser acceptance does
not substitute for these separate scenarios.

Close the milestone issues, approve the draft PR and unblock BG-23 **only**
after the exact-head, hosted, and merged-main acceptance evidence exists.
