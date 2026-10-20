# BG-29.078 roadmap Steps 6, 7 and 8: local staging hardening

**Scope:** isolated staging-only code, local Miniflare/D1/R2 tests and
measurement instrumentation. **Hosted BG-29.078 acceptance is not claimed.**
Source BG-29.078 remains unchecked (99/100); BG-30 is blocked.

## Step 6: closed staging network and configuration boundary

- The actual staging scheduler accepts only explicit D1, isolated R2,
  attachment-size and mock-only AI/disabled backup bindings.
- Rejected extra credential, notification, HTTP asset, Workers AI and URL
  bindings remain fail-closed. A non-plain inherited environment or a getter
  binding now also fails **before its getter is executed**.
- The source adapter accepts only twelve exact synthetic HTTPS fixture URLs;
  altered query strings, hosts, redirects and unapproved destinations cannot
  fall back to global fetch. The staging HTTP entry exposes no application API.
- Negative network tests trap `globalThis.fetch` and assert zero calls.
  This is an **application-level deny-by-default transport**, not a platform
  network firewall; a newly imported direct fetch would require a new audit.

## Step 7: repeated fixture integrity

`seedBg29TwentyFour` still inserts precisely 12 deterministic synthetic URLs
and 12 actual valid PDF originals with SHA-256; re-seeding preserves data.
New assertions fail if any existing idempotency key, attachment hash/size/key/
content-type/status, source job ID/type/input hash, or initial Notion sync ID/
destination differs. It also rejects additional or paginated R2 objects under
the isolated `bg29-078/` test prefix. R2 hashing remains part of the original
seeder. Tests mutate records and prove that `INSERT OR IGNORE` does not hide
corruption. The seeder is test-only and **must not be imported into hosted
production runtime or used as permission to provision R2**.

## Step 8: durable stage and backlog telemetry

`apps/worker-api/src/bg29-staging-evidence.ts` provides explicitly
provisioned tables exclusively for isolated staging D1:

- `bg29_evidence_sweeps`: local sweep UUID, Cron expression, scheduled UTC
  time and observed UTC time
- `bg29_evidence_stages`: four service stages (acquire_url, extract, enrich,
  notion), actual start/end timestamps and fulfilled/rejected outcomes
- `bg29_evidence_snapshots`: before/after stage queue/status counts,
  original count, oldest eligible pending/expired-lease timestamp/age, and
  actual original, URL acquisition, PDF extraction, enrichment-job-result
  and mock Notion projection record IDs

The staging Worker entry starts a sweep and captures the before snapshot,
wraps the existing **eight independent** `waitUntil` calls without changing
production scheduling, and records final stage outcomes and queue snapshot
after settled promises. A staging-only D1 schema check fails closed before
stage dispatch. Provisioning the telemetry tables is a **separate explicit
isolated staging operation**, never a production migration.

**Evidence limitation:** UUIDs are local correlation references, **not**
Cloudflare event IDs. Local/direct-trigger runs and independently created
hour-like timestamps **do not** satisfy AC-09 actual authenticated
`17 * * * *` real-hour Cron evidence. R2 billing approval is still NO-GO
until independently resolved under the strict $0 rule.

## Focused verification

- `npx vitest run --config vitest.node.config.ts apps/worker-api/test/bg29-staging-binding-hardening.test.ts`
- `npx vitest run --config vitest.d1.config.ts apps/worker-api/test/bg29-staging-24-items.d1.spec.ts`
- `npm run format && npm run lint && npm run typecheck`
- `npm run check` and `.github/workflows/bg29-focused.yml` on the exact PR head.

**No production config modifications, hosted Cron changes, remote migrations,
staging deployment, R2 provisioning or live provider calls are authorized
or undertaken by these steps.**
