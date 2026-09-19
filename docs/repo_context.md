# Repo Context — RecollectFlow — refreshed 2026-09-16

## Context provenance

This context is prepared from current `main` at `99678dfef1da1ea31b8b1f12c985bdaaf950b722`.

The latest runtime/code audit was performed against application commit `6d5c36b81c9167dc3b53841562d5c997c3c4b3cb` on 2026-09-12. Current `main` is exactly one commit ahead of that audited application state. The only files added by that later commit are:

- `docs/RECOLLECTFLOW_BUILD_GUIDE.md`
- `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`
- `docs/WORKFLOW_AUDIT_2026-09-12.md`

Therefore the September 12 workflow findings remain the best runtime evidence for the current application code, but this document does **not** claim that the full verification suite was rerun on `99678df…`.

Use these sources together:

1. `docs/WORKFLOW_AUDIT_2026-09-12.md` for observed verification results and reproduced defects.
2. `docs/RECOLLECTFLOW_BUILD_GUIDE.md` for the current completion sequence and task boundaries.
3. `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md` for detailed execution/evidence steps.
4. This file for a compact repository map, current architecture, known defects and implementation boundaries.

`docs/BUILD_STATUS.md` contains useful historical implementation evidence but also contains stale branch and completion wording. Do not treat it as the sole current source of truth.

## Current product state

RecollectFlow is a private capture, review, search, resurfacing and recovery system. The repository contains substantial V1 functionality rather than a foundation-only Worker.

Implemented code on `main` includes:

- raw-first authenticated capture and duplicate handling;
- private R2 attachment lifecycle;
- durable processing jobs, leases, retries and stale recovery;
- privacy-aware hosted AI enrichment and multimodal extraction;
- free-tier capacity controls and provider circuit breakers;
- retry-safe Notion projection;
- D1 FTS5 search;
- React Web Inbox and item review/recovery workflows;
- daily and weekly digest infrastructure;
- portable export, hosted backup, permanent purge workflow and restore/integrity tooling.

The system is **not V1 release-ready**. The current verification foundation has two release-blocking defects, several user-workflow defects remain, Web capture/production hosting are incomplete, OPE-247 hardening is not consolidated, and real production/device acceptance has not been completed.

## Stack

- Node.js 22+; CI uses Node 22.
- TypeScript.
- Hono on Cloudflare Workers.
- Cloudflare D1 / SQLite as canonical structured storage.
- Private Cloudflare R2 for attachment bytes and hosted backup objects.
- Provider-independent AI execution with approved hosted adapters and privacy routing.
- Zod runtime contracts.
- `unpdf` for Worker-compatible PDF extraction.
- React 19 + React Router 7 + Vite 8 Web Inbox.
- Vitest, including workerd-backed D1/Worker suites.
- ESLint/Prettier for root/Worker/shared code and Web-specific linting.
- Wrangler 4.

The root npm workspace includes `apps/web` and `packages/contracts`.

The repository-wide quality gate is:

```bash
npm run check
```

It runs formatting, lint, strict TypeScript checking, Node tests, workerd/D1 tests, shared-contract validation, Web lint/tests and the production Web build.

## Repository map

- `apps/worker-api/src/auth`: browser/admin session routes and authentication middleware.
- `apps/worker-api/src/captures`: raw-first capture, idempotency, normalization and duplicate-aware persistence.
- `apps/worker-api/src/attachments`: private R2 upload, validation, finalization, download, cleanup and deletion lifecycle.
- `apps/worker-api/src/shortcut`: iPhone Share Sheet capture orchestration.
- `apps/worker-api/src/policy`: privacy/provider routing decisions and privacy mutation/reprocessing controls.
- `apps/worker-api/src/jobs`: durable job state, leases, retries, stale recovery, extraction/enrichment workers and provider execution.
- `apps/worker-api/src/jobs/ai`: hosted provider adapters, free-tier allowlisting, quota/capacity accounting, circuit breakers and `/usage` support.
- `apps/worker-api/src/sync`: retry-safe Notion projection.
- `apps/worker-api/src/search`: D1 FTS5 search, filters, snippets, pagination and rebuild support.
- `apps/worker-api/src/items`: authoritative item detail/edit/lifecycle/privacy/feedback/recovery operations.
- `apps/worker-api/src/digests`: daily/weekly selection, rendering, Telegram delivery state, retry/reconciliation and scheduling.
- `apps/worker-api/src/recovery`: JSON/CSV export, hosted backup, purge, restore and integrity workflows.
- `apps/worker-api/test`: Node and workerd/D1 test suites.
- `apps/web`: React/Vite Web Inbox and item-review UI.
- `packages/contracts`: shared TypeScript/Zod API contracts.
- `migrations`: forward-only D1 migrations. The current chain contains 18 files and reaches `0021_add_recovery_workflows.sql`.
- `scripts/verify-production-release.mjs`: release smoke verifier; currently obsolete against the privacy edit-version contract and must be repaired before use as release evidence.
- `docs/sql`: manual/operator SQL that Wrangler must not automatically apply.
- `docs/tickets`: ticket-specific implementation and acceptance evidence.
- `.github/workflows`: repository CI and targeted validation workflows.

## Core authority and invariants

D1 is authoritative. Notion is a projection, not a source of truth.

Raw evidence and the user's original reason/note must survive optional processing failures and must not be silently rewritten by enrichment, retries or external projections.

Capture acknowledgement must not depend on AI, Notion, Telegram, local processing or downstream enrichment. Optional processing can fail after the canonical capture has safely persisted.

Private attachment bytes live in R2 rather than D1. Derived/indexed state should be recoverable from canonical state where practical.

Privacy routing fails closed. Provider availability or quota pressure must never cause restricted content to be sent to an unapproved hosted provider.

Permanent deletion is not a cross-system transaction. RecollectFlow/D1 is the deletion authority; R2, Notion and derived-state removal are resumable downstream steps. Purge receipts/tombstones exist to prevent deleted content from being resurrected by restore.

## Authentication and credentials

The Worker uses separate capture, admin and local-worker credential scopes. Browser/admin sessions are created from the admin credential and use a session cookie for Web Inbox API access.

Credential values live outside Git. Production uses Worker secrets; local development uses `.dev.vars`.

ADR-033 defines the desired OPE-247 rotation model: current/next secret slots, 24-hour normal overlap, 72-hour maximum overlap and immediate retirement when compromise is suspected.

That overlap/rotation behavior was **not** established as implemented by the September audit. The inspected authentication middleware still effectively compares against one active token per scope. Do not claim OPE-247 credential rotation is complete until the current code and acceptance evidence prove it.

## Current API capability groups

Application endpoints use `/api/v1`.

Current routed capability groups include:

- health;
- captures and capture events;
- attachments/uploads;
- Shortcut capture;
- privacy/policy mutation;
- processing jobs and scoped worker/admin recovery;
- provider usage/capacity visibility;
- item list/detail/edit/lifecycle/recovery/feedback;
- FTS5 search;
- browser/admin authentication;
- digest generation/review/delivery/reconciliation;
- export, backup, purge, restore and recovery integrity operations.

Success/error envelopes remain structured and include request IDs.

## Search and Web Inbox

OPE-225 search code and OPE-248 Web Inbox code are merged into `main`.

The search layer uses D1 FTS5 and supports structured snippets, metadata filters, deletion/privacy handling and keyset pagination.

The Web Inbox supports authenticated list/detail, derived-field edits, lifecycle/privacy changes, feedback, processing state, manual retry, Notion recreation, soft delete, restore and recovery-oriented inspection.

The September browser audit verified login, search, edit/save, feedback, soft delete, restore and filtered search after restoration.

The Web app does **not** currently provide the intended new URL/text/note capture form or browser file-upload creation flow.

## Attachments

The private R2 attachment pipeline is implemented and the September audit proved token-authenticated init/upload/finalize/link/download with byte-identical content.

A known user-visible defect remains: the Web Inbox renders a normal attachment download link, so the browser sends the admin session cookie. The attachment content route is guarded by capture-token middleware and rejects that browser session. Logged-in browser download therefore fails even though direct bearer-token download succeeds.

The repair must support the intended authenticated admin-session read path while preserving bearer access where required and continuing to reject anonymous access. Do not expose bearer tokens in URLs.

## AI enrichment, extraction and capacity controls

OPE-222 enrichment and OPE-223 multimodal extraction are merged. Supported PDF/image processing preserves original evidence and stores derived extraction/enrichment separately.

OPE-227 capacity-control implementation is also merged into `main` through PR #20. It adds migration `0020_add_ai_capacity_controls.sql`, atomic free-tier capacity reservations/reconciliation, provider/model guards, circuit breakers, capacity-aware deferral and the admin-only usage surface.

The September audit found one clock-dependent test failure in `apps/worker-api/test/capacity-usage.d1.spec.ts`: the fixture creates August 2026 capacity windows while the `/usage` path uses the real current clock. Expired-window filtering is intentional. Repair the test clock/fixture, not the production definition of an active window.

BG-10 repairs the prior bare-URL gap. Canonical URL capture now queues a durable
`acquire_url` stage before enrichment. Public sources use the bounded BG-09
fetcher; non-Public sources persist truthful policy-blocked evidence without
source-host I/O. Acquired source evidence remains separate from owner-supplied
`raw_text` and generated fields.

Do not claim a webpage was read merely because a URL was saved. A URL item is
truthful only when its durable acquisition evidence records what was actually
acquired or why acquisition was limited.

## Durable jobs and aggregate item state

Reusable processing jobs provide leases, retry timing, stale recovery, bounded failures and admin/manual recovery. `retry_wait` is a projection of `pending` plus a future `available_at`, not a distinct stored status.

A known consistency defect remains: a terminal processing-job failure can leave
the item's aggregate `processing_status` as `pending`. BG-10 removes the prior
bare-URL `NO_CONTENT_TO_ENRICH` path, but it intentionally does not redefine the
aggregate item-state contract. BG-12/BG-13 still own that repair.

Before Priority 2 can close, define one aggregate item-state rule and ensure terminal job transitions, item detail, filters and retries agree with it.

## Notion

Notion synchronization is retry-safe and D1-authoritative. Human-owned Notion fields are not silently overwritten. Missing/deleted Notion-page recreation requires explicit owner/admin intent rather than automatic zombie recreation.

A missing or deleted Notion page must never initiate canonical D1/R2 deletion.

Automated mocked-service coverage exists. Successful live Notion delivery/outage/recreation acceptance for the final release was not established by the September audit.

## Digest infrastructure

OPE-226 code is merged.

Daily digests use the previous completed Asia/Kolkata day and weekly reviews use the previous completed Monday-to-Monday Asia/Kolkata week. Delivery-time privacy is rechecked before Telegram output.

Ambiguous Telegram outcomes become `unknown` and require reconciliation rather than blind resend because Telegram provides no application-level idempotency key.

Real destination acceptance and seven eligible consecutive daily deliveries remain release evidence, not local implementation evidence.

## Recovery, backup and purge

OPE-228 is merged into `main` through PR #21. The implementation adds migration `0021_add_recovery_workflows.sql`, full-fidelity portable JSON and readable CSV export, verified hosted backup creation/download, explicit purge workflows, resumable cross-system purge steps, purge ledgers, clean-target restore and integrity checks.

Portable JSON export preserves attachment references/metadata but does not embed all original attachment bytes. Disaster-recovery acceptance must account for original R2 bytes separately.

The recovery design keeps hosted backups immutable, uses a 30-day hosted retention baseline, persists non-content purge receipts/tombstones and does not imply remote control over owner-downloaded/offline copies.

The September audit exercised local export, backup hash verification, purge/restore and integrity behavior. Production disaster recovery remains a separate human-authorized rehearsal.

## Current migration and release state

The repository now contains the BG-10 forward migration `0022_add_url_acquisition_evidence.sql`. Recent migration files include:

- `0016_add_item_search_fts.sql`
- `0017_add_item_review_contract.sql`
- `0018_add_item_duplicate_target.sql`
- `0019_add_digest_jobs.sql`
- `0020_add_ai_capacity_controls.sql`
- `0021_add_recovery_workflows.sql`
- `0022_add_url_acquisition_evidence.sql`

BG-10 CI/local migration proof applies `0022` to both fresh and populated prior
schemas. The older September audit remains historical evidence only through
`0021`.

Do **not** infer production migration state from the repository. Before any production release, compare the live migration ledger with the release candidate using a read-only check, back up production as required, obtain explicit authorization, then apply only pending forward migrations in reviewed order.

## September 12 verification snapshot

The audited application SHA was `6d5c36b81c9167dc3b53841562d5c997c3c4b3cb`.

Observed results:

- formatting: pass;
- root lint: pass;
- TypeScript: pass;
- Node tests: 132/132 pass across 23 files;
- workerd/D1 tests: 114/115 pass across 33 files;
- shared contracts: pass;
- Web lint/tests: pass, including 9/9 Web tests;
- Web production build: pass;
- all 18 migration files through `0021`: pass on fresh isolated local D1;
- Worker deployment dry run: pass; no deployment performed;
- release smoke verifier: fails at privacy PATCH with HTTP 422;
- production read-only health: HTTP 200/status ok;
- documented production Worker root: HTTP 404 and does not establish Web Inbox hosting.

Total automated results recorded by that audit: **255 passed, 1 failed**.

The local audit machine used Node 25.8.1 while repository CI specifies Node 22. Priority 1 must produce a same-SHA gate using the repository-supported Node 22 environment before treating the verification foundation as green.

## Immediate release blockers and reproduced workflow defects

### Verification foundation

1. `capacity-usage.d1.spec.ts` depends on today's date and now fails because its August fixture is correctly expired.
2. `scripts/verify-production-release.mjs` does not send required `edit_version` on privacy mutations, so the current API returns 422 before later smoke stages execute.
3. The root README instructs `npm run dev`, but the package scripts expose `dev:api` and `dev:web` instead.

These correspond to Priority 1, BG-01 through BG-05, in `RECOLLECTFLOW_BUILD_GUIDE.md`.

### User workflows after Priority 1

1. Browser/admin-session attachment download fails while bearer-token download succeeds.
2. Terminal job failure can leave aggregate item processing state looking pending.
   The former bare-URL source-acquisition gap is repaired by BG-10.

These belong to Priority 2 and must not be silently pulled into the Priority 1 verification-foundation scope, except where Priority 1 intentionally reproduces and labels them as known later defects.

## Missing release functionality or acceptance

- Web capture creation UI and browser file-upload creation flow remain incomplete.
- Production Web Inbox hosting/routing and deep-link behavior are not established by the checked-in Worker root.
- OPE-247 still needs consolidated security, credential-rotation, observability, abuse/logging and operational acceptance against current `main`.
- Physical-iPhone scenarios remain human/device acceptance work, including offline retention/retry and file/photo flows.
- Production schema/deployed SHA, approved live AI behavior, Notion outage/recreation, private Telegram delivery and final recovery procedures require explicit production acceptance.
- Seven eligible consecutive daily digest deliveries and the longer real-use gate cannot be certified from local automated tests.
- A runnable local Ollama processing client was not established by the September audit; treat optional local processing separately from the working hosted pipeline.
- Personal Knowledge RAG remains V1.5 and must not be pulled forward before V1 acceptance.

## Current execution order

Follow the build guide rather than old ticket chronology:

1. BG-01 — freeze a reproducible starting point.
2. BG-02 — repair the date-dependent usage test without changing active-window semantics.
3. BG-03 — make the release smoke verifier carry authoritative `edit_version` values.
4. BG-04 — finish the staged smoke story and correct setup instructions.
5. BG-05 — produce one complete same-SHA verification gate.
6. Continue with BG-06+ to repair attachment authorization, URL acquisition and aggregate processing state before browser capture/hosting and hardening work.

The 100-step-per-task microtask document is a detailed execution/evidence checklist. Do not manufacture meaningless code changes or commits merely to check boxes. Reuse valid evidence where the build guide permits it and preserve truthful blocked/unverified states.

## GitHub and Linear reality

Repository history is the authority for code presence. Tracker status alone is not proof that implementation is present, absent, deployed or accepted.

Examples at this snapshot:

- OPE-227 implementation is merged through GitHub PR #20 even though tracker state may lag the repository.
- OPE-228 implementation is merged through GitHub PR #21 even though tracker state may lag the repository.
- OPE-225/OPE-226/OPE-248 have merged implementation evidence but retain production/human acceptance gates.
- OPE-247 and OPE-229 remain release-level work and must not be marked complete solely because prerequisite code exists.

When closing or updating Linear, attach the exact candidate SHA/PR and distinguish implementation, local verification, production deployment and human acceptance.

## Testing and release discipline

Use the repository-supported environment and keep evidence tied to an exact SHA.

Baseline local verification commands include:

```bash
npm ci
npm run check
npm run db:migrate:local
npx wrangler deploy --dry-run
```

The release verifier is currently not valid evidence until BG-03/BG-04 repair it.

For migration-heavy work, test both a fresh database and the appropriate populated pre-migration state. Production migration/deployment/recovery operations require explicit authorization and the runbook-required backup.

Green CI is necessary but not sufficient when a ticket includes production, physical-device, external-service, sustained-observation or human-judgment acceptance gates.

## Known landmines

- Every SQL file under `migrations/` is forward-applied by Wrangler; rollback/operator SQL belongs outside that directory.
- Never change production expiry semantics merely to repair a clock-dependent test.
- Never guess or locally increment `edit_version`; fetch/use the authoritative current version and preserve stale-write conflicts.
- Do not expose capture/admin bearer credentials in URLs to fix browser downloads.
- Saving a URL is not proof that page content was acquired.
- Do not retry terminally unprocessable input forever without changing the underlying evidence/contract.
- D1/Worker code must not assume a conventional atomic transaction across D1, R2, Notion, Telegram or external AI providers.
- FTS/index/derived state must not outlive privacy/deletion authority.
- Provider availability must never weaken privacy routing.
- Quota exhaustion must never make canonical capture/storage/search unavailable.
- Telegram ambiguous delivery must not be blindly resent.
- Permanent deletion cannot be described as cross-system atomic.
- Hosted backup retention does not imply remote control over owner-downloaded copies.
- Do not infer production deployment/schema from local code or health alone.
- RAG remains post-V1 work.

## Current documentation boundary

This refresh is documentation-only under Linear OPE-320. It does not change runtime code, migrations, secrets, deployment, production state, device acceptance or external-service configuration.

The next implementation work should begin from a fresh branch based on the then-current `main`, verify the repository state again, and start with the Priority 1 verification-foundation sequence rather than relying on this context as proof that those fixes have already been performed.
