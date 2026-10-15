# BG-25 security boundary hardening: implementation and evidence

**State:** implementation in draft review, NOT accepted or authorized for production promotion.
**Source baseline:** merged `main` at `aa31b0ad562bef4f6b6f1cbe5b4d31124c1f821b` (BG-23/24 #88 accepted; merged-main CI [38777518792](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38777518792) passed).
**Task:** [GitHub #90](https://github.com/anmolsansi/Recollect-Flow/issues/90). **Branch:** `feat/bg-25-auth-request-log-hardening`. **PR:** [#91](https://github.com/anmolsansi/Recollect-Flow/pull/91).
**Safety:** Synthetic tokens/markers only. No remote secrets, production D1 or R2, Cloudflare deployment, or external provider/Telegram sends changed.

## Threat boundary inventory

| Boundary            | Routes and trust                                                                                    | Expected denial                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Login               | `POST /api/v1/admin/session`, bearer presented in JSON, browser Origin if sent                      | 403 unexpected/null Origin; 401 invalid token; 429 exceeded edge window; 503 missing production limiter                    |
| Session             | `GET/DELETE /api/v1/admin/session`, signed HttpOnly cookie                                          | 403 for unauthorized privileged introspection; logout clears browser cookie but is not worldwide revocation                |
| Capture             | `POST /api/v1/captures`, `POST /api/v1/shortcut/captures`                                           | 401 without capture/admin bearer or approved same-origin owner session; invalid explicit bearer never falls back to cookie |
| Upload              | `POST /api/v1/uploads/init`, `PUT /api/v1/uploads/:id/content`, `POST /api/v1/uploads/:id/finalize` | Credential guard before R2 operations; size, expiry, signature and canonical reservation checks                            |
| Read                | `GET /api/v1/attachments/:id/content`, `GET /api/v1/export`, `GET /api/v1/backups/:id/download`     | Scope-specific read permission; no public R2 URL, no shared cache                                                          |
| Privileged mutation | Item edits, jobs, digests, recovery, backup, restore, purge and integrity routes                    | Admin bearer or valid signed cookie with exact approved Origin; no arbitrary credentialed CORS                             |
| Public liveness     | `GET /api/v1/health`                                                                                | Only status and request ID, no private service readiness or token state                                                    |

## Implementation decisions

- `apps/worker-api/src/auth/login-abuse.ts` consumes the Workers rate-limit binding configured in `wrangler.toml`: eight attempts per 60 seconds per Cloudflare location. It keys by SHA-256 truncation of Cloudflare's connecting IP (32 hex characters). It never keys by unbounded submitted token, user-supplied X-Forwarded-For or query contents. A missing/malformed IP uses one stable `unknown` key. The native limiter is edge-local rather than a guaranteed global distributed quota, and NAT peers can share a key. The short window limits lockout damage.
- Public-origin requests fail closed with `AUTH_RATE_LIMIT_UNAVAILABLE` if the binding is not present or fails. Reserved `.test` hosts and local loopback are exempt only for old synthetic tests and local development. Confirm the `250125` namespace ID does not overlap another binding in the actual Cloudflare account before promoting.
- Browser login checks an explicit Origin against the exact Worker origin or the separately configured `WEB_INBOX_BASE_URL` (HTTPS or loopback only). Local Vite proxy tests cover different Web/API ports and deny unrelated ports. Missing Origin is allowed for native nonbrowser clients with the correct admin secret. Existing cookie-mutation Origin enforcement and bearer precedence live in `shared/auth.ts` and must not be relaxed.
- `apps/worker-api/src/app.ts` bounds non-read requests using patched Hono `bodyLimit`. JSON defaults to 1 MiB, raw upload to at most the configured allowed attachment bytes (capped at 50 MB), Shortcut multipart to the attachment maximum plus 1 MiB form overhead, and authorized JSON restore to the attachment maximum. Content-Length is checked before parsing when present. Unannounced/chunked streams are counted until admission rejects with JSON `413 PAYLOAD_TOO_LARGE`. Hono is locked at 4.12.30, newer than the 4.12.16 security fix for unknown-length body limits.
- `shared/errors.ts` logs safe error code + request ID without stringifying unexpected thrown objects. `app.ts` emits matched Hono route patterns rather than private or attacker-controlled path segments. Capture, Shortcut and extraction worker failure logs use stable error codes instead of raw upstream exception contents.
- `apps/web/src/App.tsx` renders dynamic server-owned text with React escaping. No `dangerouslySetInnerHTML` was found in the Web source. The direct-read path continues to use the existing private R2 access and disposition rules from BG-06/BG-07/BG-18.

## Evidence matrix (status must stay honest)

| BG-25 area                                | Current evidence                                                        | State                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| BG-24 prerequisite                        | Accepted merged-main CI and issue #88                                   | Previously verified                                                     |
| Bounded login attempts and reset          | Synthetic limiter unit fixture, platform 60-second window configuration | Code ready, exact-head CI pending; actual edge reset unverified         |
| Cookie attributes, expiry, token rotation | BG-24 authenticated test cases and D1 replay at predecessor SHA         | Previously verified locally, no new live HTTPS claim                    |
| Cookie CSRF/origin                        | BG-15/24 regression matrix, plus new login-origin tests                 | Pending exact-head CI; remote origins not tested                        |
| JSON, multipart and chunked byte bounds   | Bounded Hono middleware and focused tests                               | Pending exact-head CI; no full streaming or multipart gateway proof yet |
| Synthetic secret redaction                | Request/error and background-catch code review and new probes           | Pending CI; upstream/vendor-log controls outside scope not attested     |
| React escaping and file key authorization | Source inspection and BG-18/BG-07 prior local checks                    | No new hosted object-traversal/security proof                           |
| API no-store and asset security headers   | `src/index.ts` and asset router from BG-21                              | Static review, remote HTTPS/cache acceptance still blocked              |
| Full code/security gate                   | GitHub PR #91 status is authoritative                                   | Not yet accepted                                                        |
| OPE-247 release/real-origin gate          | No production deploy or operator-approved remote credentials            | Blocked                                                                 |

## Run and recovery

- Run `npm ci`, then `npm run check`, `npm run auth:rotation:test` and the targeted `npx vitest run --config vitest.node.config.ts apps/worker-api/test/bg25-security.test.ts`.
- Run `npm run release:package`, then `npx wrangler deploy --dry-run` only after the binding configuration is validated. Do not use `npm run deploy`, `db:migrate:remote` or a real login token for this task.
- Check new error logs for event, safe route, request ID, code and timing. Verify that synthetic markers in auth headers, body, URL query and simulated upstream exceptions never appear in logs or errors.
- If real-login rejection spikes, wait for the configured 60-second edge window and inspect matching safe request ID/status counts. A stolen signed cookie is NOT revoked merely by deleting the browser cookie. Follow `docs/TOKEN_ROTATION.md` to replace compromised signing credentials and force new login after an approved incident response.
- Roll back the release artifact if actual login is unavailable due to missing rate-limit binding or if legitimate browser writes fail. Never remove origin enforcement or log redaction as a workaround. Non-production branch changes can be reverted as scoped commits without deleting D1/R2 records.

## Open acceptance conditions

BG-25 must remain open until exact-head quality/CI, rate-reset behavior, unauthorized no-Content-Length request costs, representative private object/traversal/wrong-scope tests, preexisting download and export regressions, external HTTPS cookie/caching review, and the full canonical 100-step reconciliation are supported by recorded evidence. No scanner result alone establishes completion. BG-26 is not unlocked by a partial green test suite.
