# Workflow audit — 2026-09-12

Audited freshly fetched `origin/main`, commit `6d5c36b81c9167dc3b53841562d5c997c3c4b3cb` (PR #21 merge). Checkout is detached at that commit. Existing untracked `.dev copy.vars` was preserved. No application code was changed.

**Verdict: substantial V1 functionality is implemented, but main is not release-ready.** The quality gate fails one test, two user workflows fail in local runtime, and production/device acceptance remains incomplete or unverified.

## Evidence and boundaries

| Check                                                      | Result                                    |
| ---------------------------------------------------------- | ----------------------------------------- |
| Formatting, root lint, TypeScript                          | Pass                                      |
| Node tests                                                 | 132/132 pass across 23 files              |
| Cloudflare/workerd D1 tests                                | 114/115 pass across 33 files              |
| Contracts, Web lint, Web tests                             | Pass; 9/9 Web tests                       |
| Web production build                                       | Pass                                      |
| Fresh local D1                                             | All 18 migration files through 0021 apply |
| Production-config Worker deployment dry run                | Pass; no deployment performed             |
| Repository release smoke script against isolated local API | Fails at privacy PATCH with 422           |
| Production read-only health                                | HTTP 200, status ok                       |
| Documented production Worker root                          | HTTP 404; does not serve the Web Inbox    |

The first sandboxed test attempt could not bind localhost. The rerun with localhost access reached the actual D1 test failure. The remaining contract/Web gates were run separately because `npm run check` stops at the failing D1 test. Total automated results: **255 passed, 1 failed**. Local Node version was 25.8.1; CI specifies Node 22.

Runtime tests used a fresh temporary D1/R2 state, dummy auth tokens, mocked AI and no valid Notion/Telegram credentials. Browser tests used the real Vite UI and local Worker without mocked browser responses. Real AI output quality, successful live Notion/Telegram delivery, production schema/deployment version, billing, physical iPhone behavior and multi-day acceptance were not established by this audit. Notion failures in this deliberately unconfigured local environment are not evidence of a production Notion defect.

## Fix now

### 1. Logged-in attachment downloads fail — high priority

Reproduction: upload/finalize/link an attachment; log into Web Inbox; open its item; click Download. The browser displays `UNAUTHENTICATED: A valid capture token is required.` Token-authenticated direct download of the same object returns byte-identical content.

`apps/web/src/App.tsx:719` uses a normal attachment link, which sends the admin session cookie. `apps/worker-api/src/attachments/attachment.routes.ts:27` protects every attachment route with `requireCaptureToken`; that middleware accepts bearer tokens but not the admin cookie.

Fix the content-download authorization to support the authenticated admin session while retaining intended capture-token access. Add a browser/session-cookie download regression check and confirm anonymous access still fails. Do not solve this by exposing tokens in URLs.

### 2. Bare URL capture cannot complete enrichment — high priority

Reproduction: capture a public URL without title, note or shared text, then run the background scheduler. Capture succeeds and remains durable, but the enrichment job terminally fails with `NO_CONTENT_TO_ENRICH`.

`apps/worker-api/src/captures/capture.repository.ts:303` queues enrichment directly for captures without attachments. `apps/worker-api/src/jobs/enrich.service.ts:128` fails when title/note/raw text/extractions are empty. There is no URL metadata/content extraction stage in this path. Adding a note can enrich the note, but does not establish that the webpage was read.

Implement the intended URL extraction path with honest coverage, or explicitly complete unsupported URL-only captures without presenting an unrecoverable enrichment failure. Retrying unchanged input cannot resolve this condition.

### 3. Item status disagrees with terminal job status — high priority

The same URL's detail response reports `item.processing_status = pending` while its only processing job is `failed` with `NO_CONTENT_TO_ENRICH`. The failure path in `apps/worker-api/src/jobs/job.service.ts:865` updates the job table without updating the item's aggregate processing status.

Define and enforce aggregate item state for terminal processing outcomes. Verify detail, filters and retries agree with the underlying job state.

### 4. Main's quality gate has a clock-dependent failure — release blocker

`apps/worker-api/test/capacity-usage.d1.spec.ts:42` creates quota windows at `2026-08-09T20:15:00.000Z`. Its subsequent `/usage` request uses the real clock through `AiCapacityStatusService.status()`. The repository intentionally filters out expired windows, so the test now gets `windows: []` and fails at line 70.

Use one controlled clock for fixture creation and the request, or create a current fixture with boundary-safe timing. Keep the expired-window behavior intact. Run the full gate on the corrected SHA, including CI's Node 22 environment.

### 5. Release verification script no longer matches the API — release blocker

`scripts/verify-production-release.mjs:106` sends a privacy mutation without `edit_version`. Current main returns 422 with `edit_version: Required`, so the script never reaches its later attachment and privacy assertions.

Update the script to fetch and carry current edit versions across mutations. Recheck its hardcoded policy/fallback assertions against the current contract, then validate every stage locally before using it as release evidence. The README also instructs `npm run dev`, but only `dev:api` and `dev:web` exist.

## Implemented and validated locally

| Capability                                                                           | Evidence obtained in this audit                                                                                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durable capture, normalization, deduplication, idempotency, Shortcut server contract | Passing unit/integration coverage; live synthetic text/URL capture; normalized duplicate reuse in release smoke before its failure                                   |
| Private attachments                                                                  | Live init/upload/finalize/link and byte-exact token-authenticated download; passing validation/failure tests; browser download defect above                          |
| PDF/image extraction and enrichment                                                  | Passing stored-PDF and screenshot D1 stories; live text enrichment with mocked provider preserves source text                                                        |
| Job leases, retries, stale recovery, privacy and capacity controls                   | Passing service/integration tests except the usage test above; item status inconsistency remains                                                                     |
| Notion projection and recovery                                                       | Implementation and automated mocked-service/D1 coverage; successful live Notion delivery not verified                                                                |
| FTS search and Web review                                                            | Passing search/review tests; browser login, edit/save, feedback, soft-delete, restore and filtered search after restoration pass                                     |
| Daily/weekly digests                                                                 | Passing selection, privacy, scheduler, delivery-failure and reconciliation tests; successful real delivery not verified                                              |
| Export and backups                                                                   | Live local JSON/CSV exports, verified backup creation and hash-checked download pass                                                                                 |
| Purge, restore and integrity                                                         | Passing confirmation, partial-failure, leases, purge-ledger anti-resurrection and clean-target restore tests; live local integrity scan completes with zero findings |

The attachment smoke payload was a small signature-valid synthetic PDF used for byte preservation, not PDF parsing acceptance. Actual stored-PDF extraction was exercised by the passing D1 suite.

## Missing functionality or acceptance

- **Web capture:** the UI contains Inbox and item-detail routes only. It has no new URL/text/note capture form or upload flow, despite the V1 roadmap including web capture.
- **Operator UI:** usage/capacity, digest review, backups/export and permanent-purge/restore workflows have APIs, but no corresponding Web screens. Decide which need UI versus documented operator commands for V1.
- **Web production hosting:** the checked-in Worker configuration has no Web asset serving; the frontend uses same-origin `/api/v1`, and only the Vite development proxy wires it to the Worker. The documented Worker root returns 404. A separate production host may exist, but its routing, authentication and deep links were not verified here.
- **OPE-247 hardening:** still needs its consolidated acceptance. ADR-033's current/next token overlap is not implemented in the inspected authentication middleware, which compares against one token per scope. Reconcile the operational dashboard, rotation, incident and privacy acceptance requirements.
- **Physical iPhone:** every scenario in `clients/ios-shortcut-device-qa.md` remains recorded as Pending, including offline retention/retry, Photos, Files, repeated taps and invalid tokens. Desktop tests cannot close these rows.
- **Production acceptance:** reconcile deployed SHA and migrations, establish the Web Inbox host, test actual approved AI/Notion configuration and recovery, and complete the private Telegram delivery acceptance. Seven eligible consecutive daily deliveries and the real-use launch gate cannot be certified from local tests.
- **Optional local processing:** token-scoped worker APIs exist; a runnable Ollama client was not found in the inspected graph. Treat this separately from the working hosted pipeline and confirm whether it is required for the chosen V1 release.
- **RAG:** deliberately deferred until V1 acceptance and the useful-capture threshold; not an immediate blocker to V1.
- **Completion documentation:** `BUILD_STATUS.md` contains contradictory old “not complete” text and branch-pending claims for code already merged into main. Replace those statements with a SHA-based implementation/release/acceptance matrix.

## Recommended order

1. Correct the clock-dependent test and obsolete smoke script so release checks are usable.
2. Fix cookie-authenticated downloads, URL handling and aggregate processing status; add regressions for the reproduced stories.
3. Complete the minimum web-capture and production-hosting path needed for the intended V1 workflow.
4. Close OPE-247 hardening against current main and refresh the completion matrix.
5. Perform authorized production integration checks, physical-device acceptance and sustained digest/real-use gates before V1 approval.

## Local evidence

Raw check logs: `/tmp/recollect-audit-check-full.log`; migration log: `/tmp/recollect-audit-migrations.log`; Worker bundle log: `/tmp/recollect-audit-bundle.log`; obsolete release-smoke failure: `/tmp/recollect-audit-smoke.log`. Synthetic runtime scripts/state are under `/tmp/recollect-workflow-audit`. These temporary files are supplementary and may be removed by the operating system; this report preserves the findings.
