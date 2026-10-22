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
| `GET /assets/<hashed>.js`, `.css`            | Worker → `ASSETS`             | 200 correct asset MIME, immutable cache            |
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

| Evidence                                          | Status                      | Boundary                                         |
| ------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| BG-20 prerequisite and decision                   | Verified on merged `main`   | PR #82 and merged-main CI from BG-20             |
| Wrangler assets, routing, package code            | Implemented on BG-21 branch | CI validation required                           |
| Node/Worker route and package tests               | Verified in GitHub Actions  | Run #38137343234 passed on earlier head          |
| Built-asset Chrome/D1/R2 acceptance               | Verified locally in CI      | Run #38139897478 tested login, reload and logout |
| Remote isolated HTTPS preview and `Secure` cookie | Not performed               | Requires separately authorized preview resources |
| Live production deployment or digest delivery     | Not performed               | BG-32 and separate authorization                 |
| Physical iPhone proof                             | Not performed               | Later device acceptance gates                    |
| Exact-head and merged-main CI                     | Still pending final merge   | Earlier full green run #38137343234, prior SHA   |

BG-21 remains **in progress** until all required checks have actual evidence. Do not mark BG-22 unblocked based only on this document or on a passing Vite development test.

## Evidence reconciliation and remaining acceptance gates (October 11, 2026)

A full GitHub Actions [CI run #38137343234](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38137343234) passed on earlier implementation SHA `ef54be89c470914589f68af4c83c5f2b6f4fb64e`. Subsequent targeted microcommits expanded bundled download-after-logout proof. The first CI attempt for SHA `d26784b3c52a9351cd9512e6880c71183ab8bf20`, [run #38139897478](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38139897478), passed formatting, all test suites, release packaging, Wrangler dry-run, local migrations, the complete BG-21 bundled Worker browser route matrix, signed session login, item deep-link reload, logout, PDF/PNG capture and byte-integrity checks, and download rejection after logout. That attempt failed later in the existing BG-19 browser follow-up suite with a generic CDP evaluation error; its retry must be checked rather than incorrectly counting the attempt as an entire green run.

The canonical BG-21 checklist currently records **91/100** independently evidenced or reviewed steps. The following nine IDs remain unchecked, with explicit disposition:

- **BG-21.040:** focused malformed authenticated API request in the bundled-asset preview not separately exercised. Existing API test coverage is not substituted without matching evidence.
- **BG-21.044:** approved operator-specific SPA route does not exist in the current React app. Do not invent an operator view merely for checklist completion.
- **BG-21.046:** browser History API back/forward traversal is not independently proven on the production-like bundled origin.
- **BG-21.059:** remote deployment cache invalidation across actual Worker/Web release versions has not been rehearsed.
- **BG-21.061 and BG-21.062:** actual Cloudflare HTTPS origin control and `Secure` cookie issuance need isolated real HTTPS preview evidence. `http://127.0.0.1` is insufficient.
- **BG-21.065:** real HTTPS login through the deployed Worker/edge cannot be inferred from a local Worker test.
- **BG-21.077:** old/new release asset compatibility and rollback are documented, not yet executed in isolated hosted preview.
- **BG-21.080:** approved remote publication of the precise checked artifact is not yet performed. The authorized local build and `wrangler deploy --dry-run` alone do not deploy.

**Gate result:** code implementation and local bundled test coverage are advanced, but BG-21 is **not fully accepted** until those specific checks are resolved or a documented architectural exception is approved, exact-head CI passes, and the release evidence is merged. BG-22 remains blocked. No actual production changes, live messages, secrets or remote D1/R2 operations have been performed by this work.

## Follow-up acceptance implementation (October 11, 2026)

A follow-up draft PR adds focused tests without claiming remote evidence:
`scripts/verify-web-hosting.mjs` now checks an authenticated malformed JSON
capture request and real React Router browser back/forward behavior on the
isolated bundled Worker origin. These are candidate proofs for
`BG-21.040` and `BG-21.046`, subject to green exact-head CI.

`npm run browser:hosting:remote:test` is an operator-controlled, read-only
HTTPS preview verifier. It deliberately rejects the canonical production Worker,
requires an explicitly supplied isolated preview origin and admin token,
checks actual Secure/HttpOnly/Strict session cookies, API/asset routing, and
compares the hosted JavaScript's SHA-256 to the exact local release manifest.
It does **not** provision Cloudflare resources or run a deployment. Supply the
credentials through a secure local/CI secret store, never in version control:

```bash
npm ci
npm run release:package
BG21_PREVIEW_ORIGIN=https://your-isolated-preview.example.workers.dev \
BG21_PREVIEW_ADMIN_TOKEN="$APPROVED_PREVIEW_ADMIN_TOKEN" \
npm run browser:hosting:remote:test
```

Before running this gate, the operator must independently verify the preview's
Cloudflare account, its distinct D1/R2 resource IDs and separate secrets,
its chosen hostname and `WEB_INBOX_BASE_URL`, the exact matching Worker/Web
artifact, and no live owner content or notification side effects. Release
roll-forward/rollback and edge cache invalidation still require a separately
authorized multi-release rehearsal. An unrun verification script is **not**
evidence that any of those gates passed. In particular, `BG-21.059`,
`.061`, `.062`, `.065`, `.077`, and `.080` remain open until real
hosted proof exists. Operator-specific UI routing (`.044`) is a deliberate
scope decision, not an implicitly implemented page.

## BG-21 operator route and post-BG-27 deep-link reconciliation (2026-10-22)

This entry supersedes the **historical** October 11 statement that no approved
operator UI route exists. BG-26 later implemented an authenticated
`/operations` React route and tested its actual rendered dashboard in
isolated Chrome (`scripts/verify-browser-operations.mjs`;
[BG-26 evidence](BG-26_OPERATIONS_VISIBILITY.md)). The main Worker asset
allowlist already contained `/operations`, but the BG-21.044 checklist had
not been revisited.

A separate regression was found during this review: BG-27 introduced the
authenticated `/digests` page, yet `wrangler.toml` omitted `/digests` and
`/operations` from `run_worker_first`, and the Worker asset-router
allowlist omitted `/digests`. This branch fixes the Worker-first list and
the shell allowlist without adding a fallback to unknown client or API paths.

The focused source/tests in [BG-21 PR #121](https://github.com/anmolsansi/Recollect-Flow/pull/121)
cover:

- The React page and Worker-first route parity for all current SPA entry paths.
- Public shell delivery for `/operations` and `/digests` without permitting
  unauthenticated private API access.
- Direct packaged-Worker Chrome navigation to authenticated Operations and
  Digest review screens, in addition to root/capture/item/browser history.
- Existing immutable-hash, JSON-API, missing-asset and logout/private-cache
  behavior, without changing any D1 migration, external provider or secret.

**Verified source CI:** [Run #39769262188](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39769262188)
passed on exact route-fix/test SHA `9ae1045ecff05d865da92f68d9778f195ecfbbbd`.
The complete repository gate included formatting, lint, unit tests, local D1,
clean packaged Worker/Web, Wrangler dry-run and the isolated Chrome browser
suite. BG-21.044 is now checked, bringing the source record to **94/100**
and GitHub issue #83 to **45/50 pairs**. Subsequent documentation changes
require their own exact-head CI before merge.

**Remaining acceptance:** These tests use the isolated local Worker/Chrome
and CI environment. BG-21.059/.061/.062/.065/.077/.080 remain
**NOT VERIFIED**, because no authorized isolated remote HTTPS release,
real Secure cookie observation, cross-release cache invalidation/rollback
rehearsal or actual publication was performed. The owner-directed strict
$0 condition and BG-32 production NO-GO remain unchanged. Source route
completion cannot grant hosted acceptance or release authorization.
