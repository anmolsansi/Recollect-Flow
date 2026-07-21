# Build status — 2026-07-21

## Completed and deployed

- Greenfield TypeScript/Cloudflare Worker repository and secret-free CI.
- Forward-only D1 schema for items, attachments, processing jobs, sync attempts, provider usage, and audit events.
- `POST /api/v1/captures` for URL, text, note, image and file inputs; approved audio is durable through the file capture contract.
- Separate capture/admin tokens, strict validation, request IDs, idempotent replay, conservative URL normalization, raw-first persistence, and best-effort scheduling.
- OPE-218 canonical item reuse with immutable per-share capture events, exact-key race protection, preserved notes and conservative duplicate boundaries.
- OPE-224 policy version `2026-07-21.1`, approved OpenRouter/Gemini/no-AI matrix, consent/ZDR-stamped jobs and audited privacy reprocess/purge override.
- OPE-249 controlled private-R2 upload, validation/finalization/link/download/delete/cleanup/usage lifecycle with a data-preserving migration.
- Thirty-six automated tests plus preservation, duplicate-backfill, attachment-link trigger and foreign-key migration checks.
- Production Worker version `33065734-2b25-4a07-9a1f-eee5cd49ed19` at `https://recollect-flow.recollectflow.workers.dev`, with the private R2 binding and hourly cleanup schedule.

## Acceptance evidence

- `npm run check`: formatting, lint, typecheck, 5 test files / 36 tests pass.
- Fresh migration chain `0001`–`0005` executes successfully.
- Seeded preservation migration retains an existing linked attachment and backfills its capture event with no foreign-key violations.
- Seeded duplicate migration accepts two pre-existing canonical duplicates, assigns the atomic key to the oldest item, and links a finalized attachment through the D1 trigger.
- Live isolated Worker story: two normalized URL shares returned one canonical ID with `duplicate_of`; D1 confirmed 1 item, 2 events and 2 distinct notes.
- Live isolated R2 story: PDF init/upload/finalize/link/download returned `201/200`, the bytes round-tripped exactly, D1 reported `linked`, and anonymous download returned `401`.
- Failure coverage includes authentication, invalid payload, malformed URL, storage/scheduler outage, replay, near duplicates, wrong size/signature/checksum/expiry, anonymous download, quota/provider failure, cleanup and deletion idempotency.
- Production D1 backups completed before migrations; migrations `0002`–`0005` applied with no pending migrations. Migration `0005` preserved both historical processing jobs and added safe consent defaults.
- Production duplicate story returned one canonical item for two differently keyed URL captures; D1 confirmed two capture events and two distinct notes.
- Production policy `2026-07-21.1` verified Public → OpenRouter with Gemini fallback, Personal without consent → no AI, compliant Personal → OpenRouter with ZDR/data collection denied, and Sensitive → no AI. All four changes produced audit evidence.
- Production attachment story passed private PDF init/upload/finalize/link/download with byte-exact SHA-256, rejected anonymous download with `401`, and passed authenticated deletion with a D1 tombstone and zero remaining R2 objects.

## Not complete

This is not V1. Remaining slices include physical-iPhone Shortcut completion/device QA, reusable provider execution under OPE-222, Notion projection, extraction/enrichment execution, FTS search, resurfacing, observability dashboards, backup/export/deletion/recovery, and full production end-to-end acceptance.

RAG is intentionally not started. It remains a V1.5 milestone gated by V1 acceptance and 100 useful captures.
