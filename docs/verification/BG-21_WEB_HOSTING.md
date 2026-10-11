# BG-21 — Bundled Worker/Web release and deep-link verification

**Tracker:** [GitHub #83](https://github.com/anmolsansi/Recollect-Flow/issues/83) · [PR #84](https://github.com/anmolsansi/Recollect-Flow/pull/84) · [BG-20 source decision](BG-20_WEB_ORIGIN_DESIGN.md).

## Decision and boundaries

The approved BG-20 design hosts the React Web app and Hono API together at the existing documented Worker origin, `https://recollect-flow.recollectflow.workers.dev/`. The production build continues to be a single Worker with a bound Vite asset directory, not separate Pages hosting or a CORS proxy.

BG-21 implements code and a self-contained build/release candidate. It does **not** authorize production deployment, DNS changes, new Cloudflare resources, modifying production D1/R2, setting or revealing secrets, or sending live digest messages. A local `wrangler dev --local` preview proves bundled Worker behavior, **not** production TLS, remote preview isolation, Cloudflare dashboard ownership, live cookie `Secure`, or physical iPhone behavior.

## Source and change map

Starting code: `main` at `fdb02caea89a3699a833d2e0e566928e95a7d1ba`, after BG-20 merged and passed the final CI. BG-21 implementation branch: `feat/bg-21-static-assets-routing`.

- `wrangler.toml`: `[assets]` uses `apps/web/dist`, `ASSETS`, `not_found_handling = "none"` and explicit Worker-first patterns for API, supported client paths and hashed bundles; existing D1, R2, AI, cron, compatibility flags and secret requirements remain.
- `apps/worker-api/src/index.ts`: the fetch dispatcher sends `/api` and `/api/*` to the existing Hono app and never lets a static-asset lookup override authorization. Private API response headers include `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.
- `apps/worker-api/src/assets/asset-router.ts`: exact shell allowlist serves `/index.html` via the bound asset fetcher, leaving the address bar on the originally requested path. Explicit bundle fetches keep their MIME, receive immutable caching only for hashed names, and fail closed if an asset is missing.
- `scripts/web-release.mjs`: cleans `apps/web/dist` before Vite build, validates index JS/CSS references and excludes source maps, private environment files and symlinks. Emits public, non-secret `release-manifest.json` with source SHA, Worker entry/config hash, lockfile hash, asset SHA-256 and deterministic release identifier. Worker/asset compatibility still requires a complete Git revision, not just an entrypoint digest.
- `scripts/bg21-preview-runtime.mjs`, `scripts/verify-web-hosting.mjs`: run the built asset path through a real local Worker, D1, R2 and Chrome with synthetic credentials and disposable state. This is **not** the Vite development proxy.
- `apps/worker-api/test/asset-router.test.ts`, `apps/worker-api/test/asset-dispatch.test.ts`, `scripts/web-release.test.mjs`: route, privacy and packaging regressions.

No API or D1 schema migration is introduced. No frontend token storage or cookie behavior is relaxed. The current React router supports `/`, `/capture`, `/capture/file` and `/items/:id`. An operator-specific Web URL does not currently exist, so no unsupported operator route is added.

## Request and cache matrix

| Request                                      | Handler                       | Expected observable result                         |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| `GET /`, `GET /capture`, `GET /capture/file` | Worker → `ASSETS /index.html` | 200 HTML, `no-cache, must-revalidate`              |
| `GET /items/<one-encoded-segment>`           | Worker → `ASSETS /index.html` | 200 HTML; actual item data remains behind API auth |
| `GET /api/v1/health`                         | Existing Hono app             | 200 JSON, private/no-store                         |
| `GET/POST /api/v1/unknown`                   | Existing Hono not-found       | 404 JSON with `error.code=NOT_FOUND`, no-store     |
| `GET /api/v1/items/:id`, attachments, export | Existing authenticated routes | No public static fallback; private/no-store        |
| `GET /assets/<hashed>.js                     | css`                          | Worker → `ASSETS`                                  | Correct asset MIME and immutable public cache |
| Missing bundle under `/assets/`              | Worker → `ASSETS`             | 404 text, no-store, never HTML fallback            |
| `POST /capture` or `POST /items/:id`         | Worker path guard             | 405; no asset body, no mutation                    |
| Unknown Web route or extra item segment      | Worker                        | 404, no HTML fallback                              |

The asset service itself has public access to client build output, **never** canonical item, R2, backup, private export or attachment bytes. Hashed assets receive `public, max-age=31536000, immutable` only if their response succeeds. HTML stays revalidatable, and API results are always no-store. Avoid relying on untrusted proxy forwarding headers for cookie or origin decisions.

## Reproducible release commands

From repository root, Node 22 and the committed lockfile:

```bash
npm ci
npm run release:package:test
npm run release:package
npx wrangler deploy --dry-run --outdir /tmp/bg21-worker
npm run browser:hosting:test
```

`release:package` explicitly deletes and regenerates `apps/web/dist` before validating it. `npm run deploy` uses this command first, so a developer cannot publish a stale local Vite artifact. Neither the dry-run nor the local browser suite performs a remote Cloudflare deployment. The `--local --persist-to <isolated-temp-dir>` flags keep acceptance fixtures out of production D1/R2.

The release manifest lives in generated `apps/web/dist/release-manifest.json` and is intentionally non-secret. Store the build output/manifest and the exact commit SHA together for any eventual authorized promotion. Do not use the current production Worker code plus a Web directory from a different revision.

## Rollback and operating safeguards

1. Obtain explicit operator approval and verify Cloudflare account ownership, chosen HTTPS host, active `WEB_INBOX_BASE_URL` value, target bindings and preview isolation **before** any remote deploy.
2. Build one checked-out commit using its lockfile. Require successful tests, local/isolated Worker preview, and `wrangler deploy --dry-run`. Inspect the manifest and make sure new/old API contracts are compatible with the unchanged D1 schema.
3. Perform any authorized preview release only against a separately provisioned preview Worker with **distinct** D1 database, R2 bucket and credentials. A local preview alone is not proof that this remote isolation exists.
4. Compare root, deep links, reloaded deep links, login/logout, JSON unknown API, hashed/missing asset, authenticated original download, cache headers and `Secure; HttpOnly; SameSite=Strict` cookie on actual HTTPS. If any fails, **do not promote**.
5. For rollback, check out the previously verified Git release SHA, run the same clean package command and publish that paired Worker+Web build to the approved target. Preserve the current data and keys. Do not roll back D1 migrations automatically; schema compatibility must be reviewed before changing Worker revisions. Validate both `/api/v1/health` and direct item URLs after restoration.

## Validation ledger

| Evidence                                          | Status                      | Boundary                                            |
| ------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| BG-20 prerequisite and decision                   | Verified on merged `main`   | PR #82 and merged-main CI from BG-20                |
| Wrangler assets, routing, package code            | Implemented on BG-21 branch | CI validation required                              |
| Node/Worker route and package tests               | Added                       | Passing run evidence required                       |
| Built-asset Chrome/D1/R2 acceptance               | Added                       | CI execution evidence required                      |
| Remote isolated HTTPS preview and `Secure` cookie | Not performed               | Requires separately authorized preview resources    |
| Live production deployment or digest delivery     | Not performed               | BG-32 and separate authorization                    |
| Physical iPhone proof                             | Not performed               | Later device acceptance gates                       |
| Final PR-head and merged-main CI                  | Pending                     | Must link exact run and revision before closing #83 |

BG-21 remains **in progress** until all required checks have actual evidence. Do not mark BG-22 unblocked based only on this document or on a passing Vite development test.
