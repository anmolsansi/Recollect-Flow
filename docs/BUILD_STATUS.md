# Build status — 2026-08-08

## Completed and deployed

- Greenfield TypeScript/Cloudflare Worker repository and secret-free CI.
- Forward-only D1 schema for items, attachments, processing jobs, sync attempts, provider usage, and audit events.
- `POST /api/v1/captures` for URL, text, note, image and file inputs; approved audio is durable through the file capture contract.
- Separate capture/admin tokens, strict validation, request IDs, idempotent replay, conservative URL normalization, raw-first persistence, and best-effort scheduling.
- OPE-218 canonical item reuse with immutable per-share capture events, exact-key race protection, preserved notes and conservative duplicate boundaries.
- OPE-224 policy version `2026-07-21.1`, approved OpenRouter/Gemini/no-AI matrix, consent/ZDR-stamped jobs and audited privacy reprocess/purge override.
- OPE-249 controlled private-R2 upload, validation/finalization/link/download/delete/cleanup/usage lifecycle with a data-preserving migration.
- OPE-219 one-request Shortcut capture endpoint with stable queue actions, request-fingerprint conflict protection, private attachment orchestration and compensating cleanup.
- OPE-222 provider-independent AI enrichment pipeline via background queues, utilizing D1 queue tracking, durable error boundaries, and `items.topics_json`/`items.why_it_matters`.
- OPE-223 multimodal extraction for PDFs (via `unpdf`'s Worker-compatible serverless PDF.js build) and images (via policy-approved vision providers), decoupled into `extraction_records` without mutating the canonical source. Fully implemented with capability-aware routing, error boundaries, and integration into the enrichment pipeline.
- Sixty-six automated tests plus preservation, duplicate-backfill, attachment-link trigger, and FTS synchronization checks.
- Production Worker version `c0e78f89-d7a6-4416-a638-57693d256c03` at `https://recollect-flow.recollectflow.workers.dev`, with the private R2 binding and hourly cleanup schedule.

## Locally complete, release pending

- OPE-225 D1 FTS5 `item_search_fts` index, synchronization triggers,
  admin-only search API, structural snippets, combinable filters, and stable
  keyset pagination are implemented on `feature/ope-225-search`.
- This local completion does not mean the production migration, deployment,
  smoke test, PR merge, or Linear closure has occurred.

## OPE-225 local acceptance evidence

- **Full gate**: `npm run check` passes: 11 Node test files / 87 tests and
  5 D1 test files / 47 tests, with formatting, lint, and typecheck green.
- **Behavior evidence**: the D1 suite covers the real capture and search routes,
  all eight indexed fields, enrichment/reprocessing replacement, every privacy
  level under admin scope, rejected capture/local/invalid tokens, AI-independent
  search, combined filters, safe snippets, deletion/restoration, malformed
  legacy JSON, cursor rejection, and a 120-item tied traversal without duplicate
  or omitted IDs.
- **Migration evidence**: the complete migration chain through
  `0016_add_item_search_fts.sql` applies to an isolated fresh local D1. A
  populated-through-0015 fixture verifies backfill of an existing item, including
  malformed legacy topic JSON.
- **Rebuild evidence**: `scripts/rebuild-item-search-index.sql` was run twice
  against local D1. Both passes reported zero missing, orphaned/deleted, and
  duplicate rows, with canonical/indexed/distinct counts equal. The D1 suite
  additionally clears one canonical index row, inserts an orphan, rebuilds twice,
  and verifies restored search and zero drift.
- **Query-plan evidence**: local `EXPLAIN QUERY PLAN` reports
  `SCAN fts VIRTUAL TABLE INDEX 0:M9`, then primary-key lookup on `items`; the
  implementation does not scan raw text with `LIKE`.
- **Worker gates**: Wrangler 4.116.0 reports binding types current, dry-run bundle
  success (2779.88 KiB / 642.08 KiB gzip), and a 53.6 ms local startup profile
  window.
- **Accepted limitations**:
  - `C++` is currently indexed and searched as `C` because of the FTS5 `unicode61` tokenizer.
  - Apostrophes act as token delimiters.
  - Queries use at most the first 32 effective tokens.
  - Individual query tokens are limited to 64 characters.
  - Page size may change between cursor requests.
  - Snippets are structured text segments; clients must render segment text as
    text rather than using `innerHTML`.
- **Source state**: local working-tree changes after `428d0b0`; not yet
  committed, pushed, deployed, or merged.

## Acceptance evidence

- `npm run check`: formatting, lint, typecheck, 8 test files / 66 tests pass.
- Fresh migration chain `0001`–`0006` executes successfully.
- Seeded preservation migration retains an existing linked attachment and backfills its capture event with no foreign-key violations.
- Seeded duplicate migration accepts two pre-existing canonical duplicates, assigns the atomic key to the oldest item, and links a finalized attachment through the D1 trigger.
- Live isolated Worker story: two normalized URL shares returned one canonical ID with `duplicate_of`; D1 confirmed 1 item, 2 events and 2 distinct notes.
- Live isolated R2 story: PDF init/upload/finalize/link/download returned `201/200`, the bytes round-tripped exactly, D1 reported `linked`, and anonymous download returned `401`.
- Failure coverage includes authentication, invalid payload, malformed URL, storage/scheduler outage, replay, near duplicates, wrong size/signature/checksum/expiry, anonymous download, quota/provider failure, cleanup and deletion idempotency.
- Production D1 backups completed before migrations; migrations `0002`–`0005` applied with no pending migrations. Migration `0005` preserved both historical processing jobs and added safe consent defaults.
- Production duplicate story returned one canonical item for two differently keyed URL captures; D1 confirmed two capture events and two distinct notes.
- Production policy `2026-07-21.1` verified Public → OpenRouter with Gemini fallback, Personal without consent → no AI, compliant Personal → OpenRouter with ZDR/data collection denied, and Sensitive → no AI. All four changes produced audit evidence.
- Production attachment story passed private PDF init/upload/finalize/link/download with byte-exact SHA-256, rejected anonymous download with `401`, and passed authenticated deletion with a D1 tombstone and zero remaining R2 objects.
- Production Shortcut story passed authenticated text and PDF saves and exact-key replays; D1 confirmed one linked attachment for the PDF capture.
- Secret-free Mac exports exist for online save and manual retry. Durable iCloud queue behavior and file magic-variable handling remain physical-iPhone acceptance work.

## Not complete

This is not V1. Remaining slices include physical-iPhone Shortcut completion/device QA, reusable provider execution under OPE-222, Notion projection, extraction/enrichment execution, OPE-225 production migration/deployment smoke testing, resurfacing, observability dashboards, backup/export/deletion/recovery, and full production end-to-end acceptance.

RAG is intentionally not started. It remains a V1.5 milestone gated by V1 acceptance and 100 useful captures.

## OPE-226 implementation branch

Branch `agent/ope-226-digests` implements local daily digest and weekly review
infrastructure. It includes migration `0019`, Asia/Kolkata period calculation,
deterministic selection/rendering, delivery-time privacy rechecks, optional AI
wording with deterministic fallback, retry-safe Telegram delivery, operator
review/regeneration/reconciliation routes, explicit cron routing, and migration,
D1, privacy, scheduler and Telegram failure tests.

Local/CI completion does not constitute production acceptance. Production still
requires an authorized private Telegram destination, configured Web Inbox base
URL, migration/deployment evidence, one neutral credential smoke test, and seven
eligible consecutive daily deliveries.

## OPE-248 local acceptance

The recovery-capable Web Inbox and authoritative item-review surface are locally
acceptance-complete. The full gate passes 104 Node tests, 74 Worker-runtime D1
tests and 9 Web tests. A fresh isolated D1 applied all 16 migrations, the Worker
deployment dry run passed, and browser acceptance covered authentication,
search, edit/lifecycle/privacy concurrency, immutable evidence, feedback,
manual retry, Notion recreation, soft-delete/restore and mobile layout.

Local acceptance does not constitute production acceptance. Deployment,
representative production-item verification, and a real Notion outage/missing
page rehearsal remain explicit release gates. See `tickets/OPE-248.md`.
