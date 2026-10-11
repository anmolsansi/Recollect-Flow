# BG-20 — Production Web Inbox origin: decision and evidence

**Status:** Proposed production topology selected for BG-21 implementation. This is a design gate, not proof of a deployed Web app.
**Scope:** BG-20.001–.100, [tracking issue #81](https://github.com/anmolsansi/Recollect-Flow/issues/81).
**Repository baseline:** `main` `0cb3dae8c5c441aba1d3800842925668ae6f9906`.
**Prerequisite:** BG-19 checklist 100/100, merged-main Actions run [38131681395](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38131681395) passed.
**Allowed actions:** repository documentation, design review and nonmutating checks. No production deploy, DNS change, remote database migration, secret disclosure, outbound messaging or physical-device claim.

## 1. Current-state inventory and evidence classes (BG-20.001–.020)

| Area | Verified repository fact | Operational limit |
| --- | --- | --- |
| Existing API origin | `docs/BUILD_STATUS.md` records `https://recollect-flow.recollectflow.workers.dev` and production Worker version `c0e78f89-d7a6-4416-a638-57693d256c03`. | This is a **documented** deployed origin, not a fresh current Worker-version read. |
| HTML hosting | `wrangler.toml` declares a Worker entry, D1/R2/AI bindings and `workers_dev = true`, but no `[assets]` binding. | The previous audit saw Worker root return 404. It does not establish whether a separate Web deployment exists outside this repository. |
| Local Web | `apps/web/vite.config.ts` proxies `/api` to `http://localhost:8787`. | Vite's proxy is development-only, not a production ingress. |
| Browser API | `apps/web/src/api.ts` fixes `API_BASE = '/api/v1'` and sets `credentials: 'include'`. | Changing to cross-origin would alter authentication and CSRF assumptions. |
| Worker entry | `apps/worker-api/src/index.ts` exports Hono `app.fetch` plus scheduled handler. | There is no routing to built Web assets today. |
| Worker 404 | `apps/worker-api/src/app.ts` returns structured JSON `NOT_FOUND`. | Preserve its semantics for unknown `/api/v1` requests. |
| Web routes | `apps/web/src/App.tsx` defines `/`, `/capture`, `/capture/file`, `/items/:id`. | Direct navigation to each URL must load the app shell and let AuthGuard check session. |
| Digest base | `apps/worker-api/src/digests/digest.renderer.ts` reads `WEB_INBOX_BASE_URL`, requires HTTPS outside localhost and forms `items/<encoded-id>` links. | Runtime secret value and production delivery are not inspectable from repository. |
| Ownership | `recollectflow.workers.dev` is a Cloudflare-managed workers.dev suffix. The Worker name is `recollect-flow`. | Cloudflare account access, current DNS/dashboard mappings, TLS live-handshake and external Web hostname inventory require operator confirmation. |

A read-only fetch attempt against the documented Worker root and `/api/v1/health` could not be completed by the available public fetch tool on October 11, 2026. **Do not treat this as a fresh HTTP 404 or a passing live probe.** Existing historical audit root-404 and the source configuration are the only evidence for the current asset-serving gap.

**Input and tracking fixture:** A synthetic UUID item ID is enough to verify the route contract without exposing private item data. The BG-20 issue records 50 pairs of 100 canonical tasks. Actual architecture proof is in this document. No database writes, credentials or Web artifacts are introduced during BG-20.

## 2. Alternatives and architecture decision (BG-20.021–.040)

### ADR BG-20-001: one Worker serving both assets and API

**Selected:** Keep the existing `recollect-flow` Cloudflare Worker, extend its future deployment artifact with the Vite output, and expose one browser origin. The initial canonical Web Inbox URL is **`https://recollect-flow.recollectflow.workers.dev`**, the existing documented Worker address. A later custom hostname requires an explicit migration decision and synchronized link/preview rollout.

**Why:** The Web client already fetches relative `/api/v1` requests, the browser session cookie is host-only, signed, HttpOnly, `SameSite=Strict` and `Path=/`, and protected mutations check request `Origin`. A shared host preserves these tested contracts without CORS, third-party cookies, proxy trust or additional DNS/certificate operations. Wrangler supports deploying code and static assets as one unit. At personal V1 scale, it minimizes operational cost and deployment drift.

**Rejected alternative:** An independent Pages/static site host with a direct API at `*.workers.dev`. It adds cross-origin cookies/credentials, CORS preflight and cross-origin downloads while signed-cookie writes require an allowed exact `Origin`. A reverse proxy under one public origin could work, but it needs trusted forwarding and explicit ownership/configuration. No current repository evidence demonstrates an externally required host split. **Do not** solve the split by merely changing `API_BASE`, enabling `Access-Control-Allow-Origin: *` with credentials, setting `SameSite=None`, adding a shared cookie Domain, sending tokens in URL fragments, or relaxing `requireSessionWriteOrigin`.

### Official Cloudflare capability evidence

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/): Worker script and assets deploy as one unit.
- [Static asset bindings](https://developers.cloudflare.com/workers/static-assets/binding/): `assets.directory`, optional `assets.binding` and `run_worker_first` route patterns.
- [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/): built-in SPA fallback can serve HTML for navigation requests, including API navigations under some configurations.
- [Static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/): defaults, `_headers` overrides and cache policy.
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/): static asset config field definitions.

**Security/correctness second-guess:** A broad automatic SPA fallback can return HTML 200 for a missing API route or even a missing script on a navigation request. Instead select **explicit Worker-first routes and an allowlist for app-shell URLs**, with asset not-found handling left at `none`. This is slightly more Worker routing code than built-in SPA fallback, but predictable 404 behavior is critical for client correctness and private endpoint isolation. A separate static host stays a fallback only if deployment-account constraints force it, requiring a separate ADR and auth review.

**No new dependency** is needed for this design. The implementation remains BG-21.

## 3. Canonical origin and digest-link contract (BG-20.041–.050)

**Authoritative production origin:** `https://recollect-flow.recollectflow.workers.dev`. Store it as the value of the existing `WEB_INBOX_BASE_URL` secret with optional trailing `/`; canonical runbook value includes the trailing slash: `https://recollect-flow.recollectflow.workers.dev/`. Verify account-controlled domain and actual health in the release approval gate **before** changing this secret or sending production digest links. Cloudflare owns the TLS edge for the workers.dev hostname. No custom DNS records are planned.

- Scheme must be `https:` in production. No userinfo credentials, `?query`, `#fragment` or embedded access tokens.
- A single final slash is preferred in configuration; the existing renderer already appends a slash when missing, strips query/fragment and rejects credentials/non-HTTPS origins except localhost.
- Item link shape is `https://recollect-flow.recollectflow.workers.dev/items/<encodeURIComponent(id)>`. Item ID is an opaque identifier, **not an authorization secret**. Do not place bearer tokens in URLs.
- Preview must use a separately configured preview Worker or isolated local environment with a **preview-only** `WEB_INBOX_BASE_URL` and distinct nonproduction D1/R2/secrets. Do not produce preview links in real production digests.
- Owner/operator of production origin config: Cloudflare account administrator. Git owns code/config; Wrangler secret store owns secret value. Never write a live token or secret in a GitHub issue.
- Link availability relies on BG-21's HTML routing, login and item-detail API, not on the existence of the current Worker API hostname alone.

**Read-only proposed verification:** after a BG-21 preview deploy, request `GET /`, `GET /items/<synthetic-id>` without a session and inspect content type and 200 shell status; log in and confirm the exact originally requested `/items/:id` route stays in the address bar. With a missing real item, the protected API must return 404 after auth, not a public item body. Send a synthetic digest through a local renderer unit test and assert the exact URL. A link accessible without login does **not** imply item data is public.

**Operator-required fact:** Dashboard-confirm `recollect-flow.recollectflow.workers.dev` remains owned/routed to the intended Worker and is the desired personal production origin. If this fails, hold BG-21 production release, record `Needs Architect Decision: canonical host differs from documented Worker origin`, and choose the verified replacement without changing origin silently.

## 4. Request routing and precedence (BG-20.051–.060)

### Proposed BG-21 routing configuration, not deployed in BG-20

From repository root, Vite's existing `apps/web/package.json` build writes `apps/web/dist`. The recommended **proposed**, not current, `wrangler.toml` block is:

```toml
[assets]
directory = "./apps/web/dist"
binding = "ASSETS"
not_found_handling = "none"
run_worker_first = ["/api", "/api/*", "/", "/capture", "/capture/*", "/items/*"]
```

Cloudflare's `ASSETS` binding is then used by the Worker entry on exact known browser routes to retrieve `/index.html` without rewriting the browser's requested URL. Dynamic `/items/:id` must match exactly one nonempty encoded path segment. If the route is unexpected, reject it rather than returning an index document. Keep `/api` and `/api/*` Worker-first **before any shell/asset fallback**. No `single-page-application` fallback is enabled because it can mask bad `/api` and asset URLs.

| Path/method | Decision | Response expected |
| --- | --- | --- |
| `GET /` | Worker-first known UI route → `ASSETS.fetch('/index.html')` | HTML 200, with browser AuthGuard before private queries |
| `GET /capture`, `GET /capture/file` | Same shell allowlist | HTML 200, AuthGuard handles session |
| `GET /items/<id>` | Shell allowlist for single ID segment | HTML 200, item data fetched only by authorized API |
| `GET /api/v1/health` | Hono Worker | Existing JSON health envelope |
| `POST /api/v1/admin/session` | Hono Worker | Signed host-only session cookie on HTTPS |
| `GET /api/v1/items/<id>` | Hono Worker | Authorized JSON item or authenticated API error |
| `GET /api/v1/attachments/<id>/content` and export routes | Hono Worker | Guarded bytes/export, never public static file |
| `GET /api/v1/not-a-route`, `GET /api` | Hono Worker | JSON 404 with `error.code=NOT_FOUND`, never HTML 200 |
| `GET /assets/<hashed>.js`, `GET /assets/<hashed>.css`, favicon | Static asset service directly | File with correct MIME/ETag |
| Missing `/assets/<name>.js`, image, favicon | Static asset service, no SPA fallback | HTTP 404, not index.html |
| `GET /unknown`, `GET /items/a/b`, `GET /capture/unlisted` | No matching valid UI route | HTTP 404, not private data |
| Unsafe methods on UI shell path | Worker dispatch rejects (e.g. 405); never fall back to asset HTML | Failure status, no state mutation |

**Implementation nuance:** Wrangler's `run_worker_first` routes describe which requests reach Worker code; Worker code must preserve Hono's JSON API 404 behavior and fetch only trusted shell files for client routes. For a missing static resource, `not_found_handling="none"` leaves normal asset 404 behavior. Validate response types and status codes with real Cloudflare preview/Chrome, including `Sec-Fetch-Mode: navigate`, `fetch` and direct reload. If Cloudflare's routing semantics differ for a specific version, update this ADR and tests rather than silently weakening unknown-path behavior.

## 5. Authentication and privacy boundary (BG-20.061–.070)

**Public delivery:** The built `index.html`, script/CSS and harmless favicon can be served without authentication. UI visibility confers **no data access**. `AuthGuard` in `apps/web/src/App.tsx` calls `GET /api/v1/admin/session` after load; on missing/expired session the user sees the login form, including on `/items/:id`. Login `POST /api/v1/admin/session` responds at the same origin and the original URL remains open. Logout `DELETE /api/v1/admin/session` invalidates the host-only cookie; browser clears local capture recovery via existing code. A page refresh after logout returns to authentication, not an item body.

**Server guard stays authoritative:** `apps/worker-api/src/auth/auth.routes.ts` creates `admin_session` as signed, `HttpOnly`, `SameSite=Strict`, `Path=/` with `Secure` when request URL is HTTPS, expiry 24h. Its cookie has no `Domain` attribute. `apps/worker-api/src/shared/auth.ts` validates the signature and expiry and requires exact request `Origin` for cookie-backed mutations. With same-origin hosting, browser Origin and Worker origin match. Any separate trusted `WEB_INBOX_BASE_URL` validation already in the auth middleware is **not** a substitute for cookie scope or proof of proxy safety.

- APIs for reading private items, attachments, downloads, backup, exports, mutations, and operator controls retain their existing bearer/session permissions and resource checks. Raw R2 objects must never enter the static assets directory.
- Signed cookies go only to the same host over HTTPS. Never add `Domain=.workers.dev`, `SameSite=None`, localStorage tokens or permissive CORS for convenience.
- Bearer `Authorization` remains valid for Shortcuts/non-browser clients on their current routes, without relying on Cookie/Origin.
- Unknown API routes are handled by Hono JSON 404 even when a logged-in user navigates to them; the shell cannot swallow API rejections.
- API responses containing personalized bytes, item metadata, attachment downloads or exports should use `Cache-Control: private, no-store` (or equivalent stronger policy) and prevent shared CDN caching. Inspect existing headers before adding/removing them in BG-21, then assert them in preview acceptance.
- CSS/JS bundle paths must not include personal item content, API keys or R2 signed URLs. Existing client data fetching is authenticated at the API boundary.
- A reverse proxy, if introduced later, needs explicit trusted-header rules and an independent CSRF/cookie ADR before deployment; never trust arbitrary `X-Forwarded-Host` or `X-Forwarded-Proto` when forming security decisions.

**Threat review:** Cookie fixation, cross-site state changes, cached private responses, unauthenticated direct-link body leakage, cross-origin download failures and bare Authorization headers must be tested. An HTML shell shown after expiry is normal; a private JSON payload served without authorization is a P0 failure.

## 6. Build, deployment and rollback plan for BG-21 (BG-20.071–.080)

### File-level implementation handoff

| File | BG-21 change | Validation |
| --- | --- | --- |
| `wrangler.toml` | Add reviewed `[assets]` block with `apps/web/dist`, `ASSETS` binding, `not_found_handling = "none"` and explicit Worker-first routes. Do not remove existing D1, R2, AI, cron or secret bindings. | Wrangler configuration/type generation, dry-run build and preview route acceptance |
| `apps/worker-api/src/index.ts` | Keep `scheduled` unchanged. Replace direct `fetch: app.fetch` export with a dispatcher that forwards all `/api` requests to Hono and exact, safe navigation routes to `env.ASSETS.fetch('/index.html')`. Reject unknown UI/method paths. | Worker runtime route tests and live preview with browser navigation headers |
| `worker-configuration.d.ts` | Regenerate types from Wrangler (if type generation applies) rather than inventing a handwritten binding definition. | Typecheck |
| `package.json` | Make the deploy command build the Web app before Wrangler deploy or create an explicit atomic release script. Never deploy a Worker referencing a nonexistent/stale `dist`. | Release dry run and exact code/assets version evidence |
| `apps/web/src/api.ts` | Retain relative `/api/v1` and `credentials: 'include'`; **no cross-origin rewrite**. | Existing Web unit tests and Chrome session flow |
| `apps/web/src/App.tsx` | Retain React Router client paths and AuthGuard, changing only proven routing defects. | Direct `/items/:id` reload, login, logout and navigation tests |
| `apps/worker-api/src/app.ts` | Preserve Hono `NOT_FOUND` API envelope; verify unknown `/api/v1` endpoints do not get HTML. | JSON status regression tests |
| `docs/OPERATIONS.md` + release docs | Record host, owner, secrets, version pairing, request matrix, steps, rollback, signoffs and unknowns. | Manual runbook review |
| `.github/workflows/ci.yml` | Add an appropriate no-production deployment dry run and API/static/deep-link checks before merge if existing CI does not cover them. | Exact-head CI; no production mutation |

**Build artifact:** Vite creates `apps/web/dist/index.html` and content-hashed assets from the repository's locked `package-lock.json`. For each release use one Git commit/SHA with both Worker script and built Web assets. Do not independently deploy an older Web bundle against newer private API contracts.

**Preview isolation:** Use an isolated local `wrangler dev` and preview Worker/configuration with nonproduction resources. The current top-level Wrangler configuration names production D1/R2 bindings. Do **not** re-use remote production databases or buckets when creating a preview deployment, and never assume preview URLs alone are safe. Keep preview credentials and `WEB_INBOX_BASE_URL` distinct.

**Release sequence:** (1) finish all BG-21 code/tests; (2) build via `npm ci` + `npm run check`; (3) verify Wrangler types and deploy dry-run without secrets; (4) run real Chrome/Worker/D1 isolated acceptance; (5) record intended hostname, current Cloudflare account routing, Worker version and existing secret value via authorized operator; (6) obtain explicit production-change approval; (7) use one combined code-and-assets Wrangler release; (8) smoke check login, item deep link, direct reload, private download, logout, bad API, missing script, digest link; (9) observe errors and request counts; (10) roll back on failure.

**Rollback:** Re-deploy the previous known good Worker+Web artifact as a unit, preserving D1/R2 and the unchanged canonical host. On failure, do not redirect digest links to localhost or a preview. No database migration is planned for BG-21; any later migration must have its own rollback and compatibility review. If a production secret/origin change is unavoidable, capture its former value securely and reverse it as part of an approved rollback, never in source control.

**Cache policy:** Public fingerprinted assets may be cached immutably after verifying their hash-based paths. HTML must revalidate or use no-store so it cannot pin an old bundle. Private API and attachment/export responses must never enter public/shared cache. Inspect Cloudflare's actual response headers; `_headers` affects assets, not Worker-generated API responses.

**Costs:** Worker-first only on API and known SPA routes avoids unnecessary Worker execution on every static asset. Check Cloudflare request quotas/cost during preview; preserve the project $0 policy. BG-20 does not authorize deploy, D1 migrations or new paid plans.

## 7. Verification matrix, open evidence and freeze (BG-20.081–.090)

| Scenario | Required check in BG-21 preview | Fail condition |
| --- | --- | --- |
| Same-origin request | Browser `location.origin`, `GET /` and `/api/v1/health` use the same scheme/host/port | API target is another host or session cookie missing |
| Login cookie | `POST /api/v1/admin/session` with approved synthetic admin token, then `GET /api/v1/admin/session` | Cookie not host-only, HttpOnly, Secure on HTTPS or SameSite Strict |
| Logged-out direct item link | `GET /items/<synthetic-id>` loads shell, AuthGuard prompts, URL retained | 404 shell or private item JSON rendered unauthenticated |
| Authenticated deep-link refresh | Authenticate and refresh exact `/items/:id` | 404 from host or unexpected route rewrite |
| Digest link | `renderDigest` with canonical URL produces `/items/<encoded-id>` | Link references localhost, preview or embeds credentials |
| Session expiry/logout | Remove/expire cookie and revisit original item URL | Unauthorized API continues returning private data |
| API JSON precedence | Navigate and fetch `/api/v1/not-a-route` | HTML 200, SPA shell body or non-JSON result |
| Missing asset | Fetch/navigate `/assets/does-not-exist.js` | index.html 200, incorrect MIME or successful response |
| Public/private isolation | Load HTML/assets without auth, then call item/content/export API without auth | Any private body downloadable via static origin |
| Shortcuts | Existing bearer capture request remains authenticated and functional | 401 caused by cookie-only auth regression |
| Cache behavior | Inspect response and CDN headers for HTML, hashed JS, item API, download | Shared cache on private response or stale shell |
| Rollback | Rehearse release-version rollback in isolated preview | Mixed Worker/assets version, missing bundles or link breakage |

**Actual BG-20 evidence:** Repository configuration, Web/Worker contract inspection, historical root-404 audit, documented production Worker URL, official Cloudflare docs and the reviewed request matrix here. The publicly available fetch tool could not reach the live Worker URL on October 11, 2026. No live TLS response, DNS dashboard record, secret inspection, screenshot, preview deploy, new CI run or physical phone test can be inferred from that failure.

**Still operator-owned, not fabricated:** Confirm existing separate hosting, Cloudflare Worker account ownership/current routing, current `WEB_INBOX_BASE_URL` value, preview namespace/D1/R2 resources, and any production-change authorization. These checks are **release prerequisites for BG-21**, not grounds to claim production is already live.

### Decision freeze

- **Selected production browser origin:** `https://recollect-flow.recollectflow.workers.dev/`.
- **Selected topology:** single Worker with static assets and `/api/v1` on one origin.
- **Selected asset behavior:** Worker-first on API and approved client routes, explicit index.html delivery, no catchall SPA fallback for missing assets.
- **Selected session behavior:** preserve same-origin host-only signed cookie, strict origin validation, and bearer Shortcut compatibility.
- **Selected link behavior:** existing `WEB_INBOX_BASE_URL` produces encoded `/items/:id` URLs; preview and production never share digest destinations.
- **Selected deployment boundary:** BG-21 implements and validates in isolated preview; production change needs explicit approval; BG-20 does not deploy.
- **Architecture exception:** If the existing account cannot host assets under the documented Worker origin, reopen this ADR before choosing a split-origin setup.

## 8. Final design quality and failure review (BG-20.091–.100)

### Acceptance boundary

The BG-20 outcome is a documented production hosting decision: one concrete canonical origin, evidence-backed topology choice, exact routing, cookie/CSRF/credentials boundary, direct-link/digest flows, build/artifact ownership and rollback plan. The plan is reviewable without a production mutation. BG-21, BG-22 and later gates supply actual deployment, end-to-end and real-device proof. **BG-20 passing must never be reported as a working hosted Web UI.**

**Failure review:** A misrouted `/api` path must retain Hono's JSON 404. A missing hashed asset must remain 404. A logged-out `/items/:id` URL may return the public shell but cannot return private item bytes. Unauthorized download/export stays denied. Stale versions, origin/cookie mismatch, unauthorized browser writes or lost D1/R2 bindings block BG-21. This proposal leaves all existing API routes, secrets and DB tables untouched.

**Integrity review:** No sensitive data is moved to public assets; no CORS/cookie relaxation; no cross-origin proxy assumptions; no new database or queue; no production billing or migration changes. All repository edits in BG-20 are docs/tracking only. Any operational dashboard/hostname facts not available from source remain explicitly unverified.

**Cleanup:** No remote resources or production fixtures were created. No temporary task-owned deployment requires cleanup.

**Docs contract:** This evidence document complements a concise current-state explanation in `RECOLLECTFLOW_BUILD_GUIDE.md`, deployment runbook in `OPERATIONS.md`, and engineering/release gate notes. The canonical checklist and GitHub issue must reflect precisely reviewed work, not promised tests.

**Gate rule:** BG-20.100 may be marked complete only after the final design document and related documentation are on merged `main`, exact PR-head CI succeeds, merged-main CI succeeds, and the review record states that BG-21 is unlocked *for implementation only*. Missing actual production Web hosting, preview browser tests and physical phone tests are not BG-20 passes and remain explicitly under later work.

