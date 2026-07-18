# Build status — 2026-07-18

## Completed locally

- Greenfield TypeScript/Cloudflare Worker repository and secret-free CI.
- Forward-only D1 schema for items, attachments, processing jobs, sync attempts, provider usage, and audit events.
- `POST /api/v1/captures` for URL, text, and note inputs.
- Separate capture/admin tokens, strict validation, request IDs, idempotent replay, conservative URL normalization, raw-first persistence, and best-effort scheduling.
- Eleven passing automated tests plus a successful local D1 migration.

## Acceptance evidence

- `npm run check`: formatting, lint, typecheck, 3 test files / 11 tests pass.
- `npm run db:migrate:local`: `0001_initial.sql` executes successfully on local D1.
- Live local Worker check: first request returned `201`, same-key replay returned `200`, and both returned capture ID `32875bda-9d1d-4ed7-9a07-6dd74eeb2a41`.
- D1 verification after the replay: 1 item, 1 processing job, and 1 audit event.
- Failure coverage includes authentication, invalid payload, storage outage, scheduler outage, and replay behavior.

## Not complete

This is not V1. Missing slices include production resource provisioning, iPhone Shortcut/device QA, R2 attachment flow, conservative cross-capture deduplication events, Notion projection, extraction/AI policy and jobs, FTS search, resurfacing, observability dashboards, backup/export/deletion/recovery, and production end-to-end acceptance.

RAG is intentionally not started. It remains a V1.5 milestone gated by V1 acceptance and 100 useful captures.
