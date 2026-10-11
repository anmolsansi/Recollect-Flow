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

