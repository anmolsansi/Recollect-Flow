# Repo Context — RecollectFlow — audited 2026-08-09

## Audit baseline

This context reflects `main` after merge PR #18 (`b7e44065cec59808ade2dc7d2b22c3c0a1d1f3cd`). It supersedes the 2026-07-18 foundation-only audit.

The repository is no longer only a capture Worker. It now contains the authoritative D1 capture/review model, private R2 attachments, durable jobs, policy-aware AI enrichment and extraction, retry-safe Notion projection, D1 FTS5 search, the React Web Inbox, and daily/weekly digest infrastructure.

## Stack

- Node.js 22+
- TypeScript
- Hono on Cloudflare Workers
- Cloudflare D1 / SQLite
- Private Cloudflare R2 attachments
- Cloudflare Workers AI binding plus provider adapters
- Zod runtime contracts
- `unpdf` for Worker-compatible PDF extraction
- React 19 + React Router 7 + Vite 8 Web Inbox
- Vitest, including workerd-backed D1/Worker tests
- ESLint/Prettier for Worker/shared code and Oxlint for the Web app
- Wrangler 4

The root npm workspace includes `apps/web` and `packages/contracts`. `npm run check` is the repository-wide quality gate and runs formatting, lint, strict type checking, Node/D1 tests, shared-contract validation, Web lint/tests, and the production Web build.

## Repository map

- `apps/worker-api/src/auth`: browser/admin session routes.
- `apps/worker-api/src/captures`: raw-first authenticated capture and duplicate-aware persistence.
- `apps/worker-api/src/attachments`: private R2 upload, validation, finalization, download, cleanup, and deletion lifecycle.
- `apps/worker-api/src/shortcut`: one-request iPhone Share Sheet capture orchestration.
- `apps/worker-api/src/policy`: privacy/provider routing decisions and reprocessing controls.
- `apps/worker-api/src/jobs`: durable jobs, leases, retries, AI adapters, enrichment, extraction, and worker/admin operations.
- `apps/worker-api/src/sync`: retry-safe Notion projection.
- `apps/worker-api/src/search`: D1 FTS5 search, filtering, snippets, pagination, and recovery support.
- `apps/worker-api/src/items`: authoritative item detail/edit/lifecycle/privacy/feedback/recovery operations.
- `apps/worker-api/src/digests`: daily/weekly selection, deterministic rendering, Telegram delivery, retry/reconciliation, and scheduler integration.
- `apps/worker-api/test`: Node and workerd/D1 integration suites.
- `apps/web`: React/Vite Web Inbox and item-review UI.
- `packages/contracts`: shared TypeScript/Zod API contracts.
- `migrations`: forward-only D1 migrations. Current repository chain reaches `0019_add_digest_jobs.sql`.
- `docs/sql`: manual/operator SQL that Wrangler must not auto-apply.
- `docs/tickets`: ticket-specific implementation and acceptance evidence.
- `.github/workflows`: secret-free CI.

## Core authority and invariants

D1 is authoritative. Notion is a review projection, not a source of truth. Raw evidence and the user's original reason/note are not rewritten by enrichment or retry workflows.

Capture success must not depend on AI, Notion, Telegram, optional local workers, or downstream enrichment. Private attachment bytes live in R2 rather than D1. Derived/indexed state must be recoverable from canonical state where practical.

Deletion remains soft/recoverable at the item-review layer today. OPE-228 will define and implement the separately confirmed permanent cross-system purge contract.

## Authentication and credentials

The Worker uses separate capture, admin, and local-worker credentials. Admin browser sessions use the admin credential through an authenticated session route. Credential values live outside Git; production uses Worker secrets and local development uses `.dev.vars`.

Current Phase 0 planning preserves this separation and will later add explicit rotation overlap/retirement behavior under OPE-247.

## Current API capability groups

All application endpoints use `/api/v1`.

Current routed capability groups include:

- health
- captures
- attachments/uploads
- Shortcut capture
- privacy/policy controls
- durable jobs and worker operations
- item list/detail/edit/recovery/feedback
- FTS5 search
- browser/admin auth
- digest generation/review/delivery/reconciliation

Success/error envelopes remain structured and include request IDs.

## Search and Web Inbox

OPE-225 and OPE-248 code are merged into `main`.

The search layer uses D1 FTS5 rather than raw-text `LIKE` scans and supports structured snippets, metadata filters, deletion/privacy handling, and keyset pagination. The Web Inbox is the authoritative recovery/review surface and supports authenticated list/detail, edits, lifecycle/privacy changes, feedback, processing state, retries, Notion recreation, soft delete, restore, and recovery-oriented inspection.

Both OPE-225 and OPE-248 are locally acceptance-complete but still have explicit production release/evidence gates before their Linear tickets should be considered fully closed.

## AI enrichment and extraction

OPE-222 provider-independent enrichment and OPE-223 extraction are merged. The documented production build includes policy-aware enrichment/extraction support.

Provider execution is selected through privacy policy and provider adapters. Unknown/Sensitive or otherwise unauthorized content fails closed rather than being sent to an unapproved hosted provider. Vision extraction and enrichment use durable processing jobs rather than coupling inference to capture acknowledgement.

Phase 1/OPE-227 will add atomic quota reservation, circuit breakers, free-tier allowlisting, capacity-aware deferral, and a protected usage endpoint around these existing AI entry points.

## Durable jobs and Notion

Reusable processing jobs provide leases, retry timing, stale recovery, bounded failures, and admin/manual recovery. `retry_wait` is a projection of `pending` plus future `available_at`, not a separate stored job status.

Notion synchronization is retry-safe and D1-authoritative. Human-owned Notion fields are not silently overwritten, and deleted/missing Notion-page recreation requires owner/admin intent rather than automatic zombie recreation.

## Digest infrastructure

OPE-226 code is merged.

Daily digests use the previous completed Asia/Kolkata day and are scheduled for 07:30 IST. Weekly reviews use the previous completed Monday-to-Monday Asia/Kolkata week and are scheduled Monday at 07:45 IST. The existing hourly background schedule remains separate.

Digest rendering rechecks item deletion/privacy before Telegram delivery. Public items may expose neutral labels plus authenticated Web Inbox links; restricted content is projected to neutral private-item labels. Ambiguous Telegram outcomes become `unknown` and require reconciliation rather than automatic resend.

OPE-226 remains production-acceptance pending: production Web Inbox URL/destination verification, migration/deployment evidence, and seven eligible consecutive daily deliveries are still required before Linear closure.

## Current migration/release state

The repository migration chain currently reaches:

- `0016_add_item_search_fts.sql`
- `0017_add_item_review_contract.sql`
- `0018_add_item_duplicate_target.sql`
- `0019_add_digest_jobs.sql`

The latest repository evidence shows all migrations through 0019 apply successfully to isolated local D1. Production application of the later search/review/digest migrations must continue to follow backup, explicit approval, migration, deploy, and smoke-test procedures.

## Current ticket readiness for the hardening sequence

- OPE-227: code prerequisite satisfied. OPE-222 is merged and documented as deployed. Phase 0 must freeze the quota/free-tier/capacity contract before implementation.
- OPE-228: code prerequisites satisfied. OPE-225, OPE-249, OPE-221, and OPE-216 are merged. Phase 0 must freeze export/purge/backup-retention semantics before implementation.
- OPE-247: blocked until OPE-227 and OPE-228 are complete; OPE-214 is already complete.
- OPE-229: human launch gate. It remains blocked on all V1 release prerequisites, including production acceptance of OPE-225/OPE-226/OPE-248 and later completion of OPE-227/OPE-228/OPE-247.

## Testing and release discipline

Repository-wide verification:

```bash
npm run check
npm run db:migrate:local
npx wrangler deploy --dry-run
```

For migration-heavy work, also test a fresh database and a populated pre-migration database. Production migration/deploy/recovery operations require explicit approval and a verified backup where the runbook requires one.

Do not treat green CI as equivalent to ticket completion when the ticket has production, physical-device, external-service, or human-judgment acceptance gates.

## Known landmines

- Every SQL file under `migrations/` is forward-applied by Wrangler; rollback/operator SQL belongs outside that directory.
- D1/Worker code must not assume a conventional long-lived multi-service transaction across D1, R2, Notion, Telegram, or external AI.
- FTS/index/derived state must not outlive privacy/deletion authority.
- Telegram has no application idempotency key; ambiguous delivery cannot be blindly retried.
- Provider availability must never weaken privacy routing.
- Quota exhaustion must never make capture/storage/search unavailable.
- Permanent deletion cannot be described as cross-system atomic; OPE-228 must persist recoverable step state.
- Do not begin OPE-247 before OPE-227/OPE-228 contracts land, and do not begin OPE-229 as a normal coding ticket.
- RAG remains V1.5 and must not be pulled into the V1 hardening sequence.

## Phase 0 unresolved architecture decisions

Before OPE-227/OPE-228 implementation begins, explicitly freeze:

1. quota windows/units and warning/hard-stop behavior;
2. free-tier-only paid-provider policy;
3. whether capacity deferrals consume terminal retry allowance;
4. permanent deletion semantics for hosted versus downloaded backups;
5. Notion purge authority/semantics;
6. current/next credential rotation overlap and retirement behavior.

These decisions belong in `docs/DECISIONS.md` with clear owner/architect approval and are the remaining Phase 0 human gate.