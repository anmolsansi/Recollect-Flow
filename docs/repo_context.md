# Repo Context — RecollectFlow — audited 2026-07-18

## Stack

TypeScript 5, Node 22+, Hono on Cloudflare Workers, D1/SQLite, Zod, Wrangler, Vitest, ESLint, and Prettier. The repository began as an empty README-only project; this audit was refreshed after the foundation slice was built.

## Folder Map

- `apps/worker-api/src`: Worker entrypoint, HTTP routes, application services, and D1 repositories.
- `apps/worker-api/test`: route/service contract tests.
- `migrations`: forward-only Wrangler D1 migrations.
- `docs/sql`: manual rollback scripts that Wrangler must not auto-apply.
- `docs/tickets`: intake-ready build contracts.
- `.github/workflows`: secret-free CI.

## Conventions

Strict TypeScript, small feature folders, dependency injection at the application boundary, snake_case over HTTP/database, camelCase inside services, conventional JSON envelopes, and no secret values in Git.

## Auth

Bearer-token authentication. `CAPTURE_TOKEN` is limited to capture operations; `ADMIN_TOKEN` may capture and is reserved for later read/admin operations. Tokens are Worker secrets in production and `.dev.vars` locally.

## API Style

All public endpoints live under `/api/v1`. Success is `{ data, meta }`; errors are `{ error: { code, message, fields? }, meta }`. Each response includes `request_id`.

## Database

D1 is authoritative. Raw capture insertion completes before scheduling enrichment. `items.idempotency_key` is unique. Deletion is soft at the item level; attachment/item foreign keys use `RESTRICT`. Forward migrations are in `migrations`; rollback guidance is outside that directory.

## Testing

`npm run check` runs formatting, linting, strict type checking, and Vitest. `npm run db:migrate:local` validates migrations against local D1. Route tests inject a repository to cover behavior without production services.

## Reusable Utilities

`AppError`/`errorResponse`, constant-time bearer comparison, `captureSchema`, `normalizeUrl`, `CaptureService`, and the `CaptureRepository` boundary.

## Landmines

- Wrangler treats every SQL file in `migrations` as forward migration; rollback scripts must stay in `docs/sql`.
- D1 has no conventional multi-statement transaction API in Worker code. Save the item before best-effort job scheduling to preserve the core invariant.
- Do not couple capture success to AI, Notion, Telegram, or R2 availability.
- Do not begin RAG until V1 acceptance passes and 100 useful captures exist.

## Unknowns

Production Cloudflare account IDs, D1/R2 resources, Notion database IDs, Telegram credentials, final Shortcut installation, and provider policy require human-owned accounts or device access.
