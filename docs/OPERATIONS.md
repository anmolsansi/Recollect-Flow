# Operations

<!-- OPE-227 START -->

## OPE-227 zero-cost AI capacity operations

V1 fails closed to explicitly approved free-tier provider/model combinations. OpenRouter uses one shared free-model request pool across text and vision, with the configured account tier defaulting to the conservative standard tier. Cloudflare Workers AI is guarded by an operator-configurable daily Neuron ceiling that cannot exceed the approved free allocation. Unknown/paid model identifiers are rejected before a network call.

Capacity utilization is interpreted as: below 70% normal, at least 70% warning, at least 90% high warning, and 100% hard stop. A hard stop does not block capture, D1 persistence, FTS search, review, or Notion processing that does not require a new hosted AI call. Capacity-deferred AI jobs remain `pending` with future `available_at` and do not consume their terminal processing retry allowance. Manual retry never bypasses capacity admission.

Provider circuit breakers are scoped by provider and operation. Three consecutive qualifying provider failures open the breaker. Cooldown starts at five minutes and increases exponentially up to one hour. At probe time only one Worker may hold the 60-second half-open probe lease. A successful probe closes/resets the breaker; a failed probe reopens it. Privacy rejection, quota exhaustion, invalid input, owner-disabled providers, and zero-cost guard rejection are not counted as provider outages.

Operator checks: inspect `GET /api/v1/usage`; confirm no hard-window exhaustion before forcing retries; verify `next_probe_at` before outage recovery; use the standard/qualified OpenRouter tier only after revalidating the account condition; and revalidate provider free-tier limits/model availability before production release or provider-policy changes.
<!-- OPE-227 END -->

<!-- OPE-228 START -->

## OPE-228 backup, export, purge, and recovery operations

### Owner-portable export

Use the admin-only export route when the owner needs an independently readable copy:

```text
GET /api/v1/export?format=json
GET /api/v1/export?format=csv
```

JSON is the full-fidelity restore format. CSV is a readable item-level projection and is not accepted as a restore source. Attachment records contain references and integrity metadata only; private attachment bytes remain in R2. Exports never intentionally contain credentials or authorization material. An owner-downloaded export is outside RecollectFlow's remote deletion control and must be handled/deleted by the owner after a later purge when required.

### Hosted portable backup

Create and inspect hosted backups through the admin-only routes:

```text
POST /api/v1/backups
GET  /api/v1/backups
```

The Worker writes each artifact once under `backups/v1/<backup-id>.json` in the private R2 bucket, records a SHA-256 digest, reads the object back, and marks the D1 backup row `complete` only after the content hash and byte size match. Application cleanup does not remove a completed hosted backup before its 30-day OPE-228 retention boundary. The hourly background job removes expired hosted backup objects and keeps non-content backup audit metadata.

A backup failure is not a canonical-data recovery action. Do not delete or rewrite D1, item attachment objects, or Notion pages in response to backup creation/verification failure.

### D1 SQL snapshot before risky operations

Before a production migration or other planned high-risk operation, take an explicit SQL export in addition to the application-level portable backup:

```bash
mkdir -p backups/manual
npx wrangler d1 export recollect-flow-prod \
  --remote \
  --output="backups/manual/recollect-flow-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

Verify that the resulting file exists and is non-empty before proceeding. Store manual exports according to the owner's backup/security policy; RecollectFlow cannot remotely delete copies that have been downloaded outside its controlled storage.

For a local D1 rehearsal, substitute `--local`.

### Import a D1 SQL snapshot into a separate recovery database

Prefer a separate/empty recovery database for validation rather than overwriting production:

```bash
npx wrangler d1 execute <recovery-database-name> \
  --remote \
  --file=backups/manual/<snapshot>.sql
```

After import, verify table presence, run `PRAGMA foreign_key_check`, start the Worker against that recovery database, and exercise health/search before considering any production recovery action.

### D1 Time Travel

D1 Time Travel is the Cloudflare-native point-in-time recovery mechanism. Inspect the current bookmark first:

```bash
npx wrangler d1 time-travel info recollect-flow-prod
```

Inspect a historical recovery point by timestamp when needed:

```bash
npx wrangler d1 time-travel info recollect-flow-prod \
  --timestamp="<RFC3339 timestamp>"
```

An in-place Time Travel restore is destructive and overwrites the active database. Do not run it as part of normal OPE-228 application recovery. Only execute an in-place restore during an explicitly authorized incident procedure after recording the current bookmark and validating the intended recovery timestamp/bookmark:

```bash
npx wrangler d1 time-travel restore recollect-flow-prod \
  --bookmark="<verified-bookmark>"
```

### Portable clean-target restore

The application restore endpoint is admin-only:

```text
POST /api/v1/restore?dry_run=true
POST /api/v1/restore?dry_run=false
```

Always run `dry_run=true` first. Restore merges purge receipts from the export, current D1 receipt ledger, and the private `purge-receipts/v1/` R2 ledger before it plans item insertion. A receipt wins over an older backup record for the same item. Normal non-dry-run restore refuses a database that already contains canonical item/capture/attachment/job/sync data; restore is a clean-target recovery operation, not a live merge tool.

A successful restore verifies foreign keys, canonical item count, FTS coverage for active items, and absence of every item skipped by the merged purge ledger. Jobs/sync attempts that were captured while `processing` are returned to a safe `pending` state with transient leases cleared.

### Soft delete and permanent purge

Soft delete remains the reversible grace state. Permanent purge requires a separate admin request and confirmation:

```text
POST /api/v1/items/<item-id>/purge-request
POST /api/v1/purges/<purge-workflow-id>/confirm
GET  /api/v1/purges/<purge-workflow-id>
POST /api/v1/purges/<purge-workflow-id>/run
```

A purge request is allowed only for a soft-deleted item at the exact current `edit_version`. The request returns a workflow-bound confirmation phrase that expires after 15 minutes. Confirmation is rejected if the item was restored, edited, the phrase does not match, or the confirmation expired.

Confirmed purge work proceeds in ordered resumable steps: freeze background work, delete private R2 attachment objects, archive the downstream Notion projection, delete canonical/derived D1 item data while atomically writing the D1 purge receipt, and finally mirror the non-content receipt into the private R2 purge ledger. A Notion/R2 failure before D1 deletion leaves the canonical soft-deleted item in D1 and marks the purge `partial`. Use the status route to identify the failed step; retrying the run resumes only incomplete steps and never bypasses the original confirmation.

If D1 deletion succeeds but receipt mirroring fails, the D1 receipt remains authoritative and the finalization step is retryable. Do not recreate the item from an older backup while the receipt mirror is incomplete.

### Recovery integrity checks

Run the admin-only read-only integrity scan:

```text
POST /api/v1/integrity-checks
GET  /api/v1/integrity-checks/<run-id>
```

The scan reports missing R2 attachment objects, attachment-link state drift, missing Notion projections, incomplete/partial purge workflows, incomplete backup verification, and overdue hosted-backup retention. Integrity findings never initiate canonical deletion. In particular, a missing Notion page is only a downstream projection finding; D1 remains the source of permanent-delete authority.

### Incident order of operations

For a recovery incident, use this order:

1. stop/avoid additional destructive operator actions;
2. record the current D1 Time Travel bookmark and incident timestamp;
3. obtain the newest portable JSON export/hosted backup plus the independent R2 purge-receipt ledger;
4. run portable restore dry-run against the candidate input;
5. restore into a clean local/recovery D1 and verify search/integrity;
6. only then decide whether production requires a new deployment/database switch or an explicitly authorized D1 Time Travel restore;
7. run integrity checks again after recovery;
8. retain incident evidence and purge receipts, but never place credentials or raw secret material in recovery notes.

<!-- OPE-228 END -->

## BG-20 — Web Inbox origin decision and BG-21 release handoff

**Design source:** [BG-20 hosting decision](verification/BG-20_WEB_ORIGIN_DESIGN.md). **Design-only:** No current deployed Web asset service or production change is claimed.

- **Canonical production Web origin:** `https://recollect-flow.recollectflow.workers.dev/`, the existing Worker address documented in `docs/BUILD_STATUS.md`. Confirm present control and routing in the Cloudflare account before production release.
- **Architecture:** A single Cloudflare Worker deploys the Vite Web app assets from `apps/web/dist` and serves private Hono APIs at relative `/api/v1`. Its cookie is signed, HttpOnly, HTTPS Secure, SameSite Strict and host-only. Do not create a cross-origin API base or public asset copies of item content.
- **Routing:** Worker-first for `/api` and `/api/*`, Hono JSON 404 for unknown API routes. Exact browser routes `/`, `/capture`, `/capture/file`, and `/items/:id` receive `index.html`; unknown browser paths and missing assets return real 404. BG-21 must explicitly implement the route allowlist and asset binding.
- **Canonical digest links:** `WEB_INBOX_BASE_URL` remains a protected Wrangler secret. The target value for approved rollout is the canonical HTTPS origin above. A digest link uses `/items/<encoded-id>` and never carries a token. Local/preview tests must use isolated test URLs and data.
- **Preview:** The existing root `wrangler.toml` references production D1/R2 resources. Define separate preview config/bindings and secrets before any remote preview. Local `npm run dev:api` plus `npm run dev:web` continues to use Vite's localhost proxy.
- **Release artifact:** `npm ci` followed by `npm run check` builds the Web app. BG-21 must arrange a single Worker+Web asset artifact and safe Wrangler deploy path. Do not deploy the API alone while linking a new UI or vice versa.
- **Acceptance proof:** On isolated preview, verify `/`, direct `/items/:id` reload and login, cookie attributes, Hono /api 404, missing JS 404, download/export authentication, logout, digest URL and response cache headers. Record exact commit SHA/CI and preview hostname before any live release.
- **Operations/rollback:** Operator verifies Cloudflare hostname/TLS, secret owner, deployed Worker version, D1/R2 bindings and approval. Preserve previous working Worker+Web release. Roll back by restoring that exact pair under the same canonical origin; do not redirect digests to preview or alter canonical data. BG-20 authorizes no remote deployment, DNS mutation, migration or messages.

BG-20 completion is **design signoff**, not a production-hosting acceptance. BG-21 and BG-22 own the implementation and end-to-end release proof.

## BG-21: build and verify the single-origin Web release

The Worker now has a Vite static-assets binding and explicit API-first routing. A release must include assets built from the same source revision as Worker code. Read the [BG-21 hosting record](verification/BG-21_WEB_HOSTING.md) before preparing a preview or rollback.

Use Node 22 and the committed lockfile from the repository root:

```bash
npm ci
npm run release:package:test
npm run release:package
npx wrangler deploy --dry-run --outdir /tmp/bg21-worker
npm run browser:hosting:test
```

`npm run release:package` removes stale `apps/web/dist`, rebuilds the Web app and writes a non-secret release manifest containing the Git revision, lockfile/config hashes and hashes of published Web files. `npm run deploy` invokes packaging before Wrangler. Do **not** execute the production deploy command without explicit operator authorization.

The local BG-21 browser test uses the compiled asset path on an isolated `wrangler dev --local` instance with disposable D1/R2 and synthetic tokens. It does not establish HTTPS `Secure` cookie, account ownership, Cloudflare remote preview binding isolation or production readiness. For release approval, check the actual host, secret ownership, isolated preview resources, deep-link reloads, private downloads, cache controls and rollback from a matching prior release. Do not relax authentication or fall back to index HTML on failed API/JS routes.
