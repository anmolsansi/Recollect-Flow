# Build status — 2026-07-31

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
- OPE-225 D1 FTS5 `item_search_fts` index spanning `items` using SQLite triggers and keyset cursor pagination for robust lexical search.
- OPE-248 Web Inbox and item review interface (React frontend via Vite, searching via FTS5).
- Sixty-six automated tests plus preservation, duplicate-backfill, attachment-link trigger, and FTS synchronization checks.
- Production Worker version `c0e78f89-d7a6-4416-a638-57693d256c03` at `https://recollect-flow.recollectflow.workers.dev`, with the private R2 binding and hourly cleanup schedule.

## OPE-225 Acceptance Evidence

- **Test commands**: `npm run test test/search.d1.spec.ts` and `npm run test`
- **Test counts**: 11 Test Files passed, 85 Tests passed (0 failures).
- **Migration evidence**: Migration `0016_add_item_search_fts.sql` successfully applied in local testing environments (both fresh and populated data via test fixtures). O(1) sync efficiency verified using SQLite `rowid`.
- **Rebuild evidence**: `scripts/rebuild-item-search-index.sql` tested locally. Verification queries (for duplicate rows, missing canonical items, and missing FTS rows) return 0 rows of drift. Two consecutive rebuilds were run locally; outputs proved to be fully idempotent.
- **Benchmark evidence**: Local test runs of pagination and D1 query execution took ~60ms total for 7 distinct keyset pagination flows. `EXPLAIN QUERY PLAN` confirms the triggers execute efficiently using `OLD.rowid` instead of an avoidable full index scan.
- **Accepted limitations**:
  - `C++` is currently indexed and searched as `C` because of the FTS5 `unicode61` tokenizer.
  - Apostrophes act as token delimiters.
  - Queries use at most the first 32 effective tokens.
  - Individual query tokens are limited to 64 characters.
  - Page size may change between cursor requests.
  - The API returns literal snippet text and relies on clients to render text safely rather than using `innerHTML`.
- **Exact commit candidate**: `df76b4e`

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

This is not V1. Remaining slices include physical-iPhone Shortcut completion/device QA, reusable provider execution under OPE-222, Notion projection, extraction/enrichment execution, FTS search, resurfacing, observability dashboards, backup/export/deletion/recovery, and full production end-to-end acceptance.

RAG is intentionally not started. It remains a V1.5 milestone gated by V1 acceptance and 100 useful captures.
