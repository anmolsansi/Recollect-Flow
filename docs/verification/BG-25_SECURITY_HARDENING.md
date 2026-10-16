# BG-25 security boundary hardening: implementation and evidence

**State (2026-10-16):** BG-25 implementation accepted for merge on explicit owner attestation of the three previously blocked Cloudflare staging checks, with repository CI passed. This is not an independent Cloudflare audit or authorization for a production deployment. Earlier outstanding items below are preserved as historical records.
**Source baseline:** merged `main` at `aa31b0ad562bef4f6b6f1cbe5b4d31124c1f821b` (BG-23/24 #88 accepted; merged-main CI [38777518792](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38777518792) passed).
**Task:** [GitHub #90](https://github.com/anmolsansi/Recollect-Flow/issues/90). **Branch:** `feat/bg-25-auth-request-log-hardening`. **PR:** [#91](https://github.com/anmolsansi/Recollect-Flow/pull/91).
**Safety:** Synthetic tokens/markers only. No remote secrets, production D1 or R2, Cloudflare deployment, or external provider/Telegram sends changed.

## Owner attestation and BG-25 acceptance, October 16, 2026

The repository owner explicitly confirmed that the **three previously blocked
Cloudflare checks are working** and instructed that BG-25 be marked complete
and PR #91 be merged. The owner confirmed the outcomes, not ChatGPT.
This attestation is the acceptance evidence for the following checklist steps:

- **BG-25.029:** Actual Cloudflare rate-limiter window reset. Operator
  attested working. Exact time window logs and staging hostname were not
  provided in the conversation for independent examination.
- **BG-25.031:** Secure session cookies over real HTTPS. Operator attested
  working. No captured Set-Cookie headers, browser traces or staging domain
  were supplied for independent examination.
- **BG-25.083:** Deployed private/API/export response headers. Operator
  attested working. No captured response header transcript was supplied
  for independent examination.

The 97 repository-supported steps plus these three expressly
operator-attested steps total **100/100 recorded checklist completions**,
with the latter three using a different, clearly disclosed evidence tier.
This is an owner signoff to complete and merge **BG-25**, not a claim that
the assistant accessed Cloudflare, reviewed private logs, reproduced staging
results, rotated credentials or deployed anything. The repository's
[exact-head full CI run](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38846686913)
passed on commit `1f59f3a624fcdae91888291f09fde4d0a1939af4`,
before these documentation-only commits. Final CI must pass on the
acceptance documentation head before merging.

The historical sections below describe what was unverified on October 15
and earlier on October 16. Their blocker descriptions are superseded for
BG-25 completion **only by the user's explicit attestation**. Preserve
their test matrices and safety caveats: local mocks are not evidence of
Cloudflare's edge behavior, and broader OPE-247 operations/security tasks
remain open. BG-26 is unlocked after the BG-25 merge, not before.

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

## Earlier open acceptance conditions (historical; superseded by owner attestation)

BG-25 must remain open until exact-head quality/CI, rate-reset behavior, unauthorized no-Content-Length request costs, representative private object/traversal/wrong-scope tests, preexisting download and export regressions, external HTTPS cookie/caching review, and the full canonical 100-step reconciliation are supported by recorded evidence. No scanner result alone establishes completion. BG-26 is not unlocked by a partial green test suite.

## October 16 reconciliation, scoped source implementation

The canonical BG-25 checklist records **97/100** source steps with local or
previously accepted CI evidence, leaving exactly three live-origin verification
steps unverified. The counts do not establish production acceptance. The
separate rate limiter is intentionally edge-local, not a global account lock.

### Additional controls reviewed

- Login and logout both reject a foreign or null explicit Origin. The
  configured Web Inbox origin is allowed only under the existing HTTPS or
  loopback policy. Missing Origin for native credential clients remains an
  intentional, documented compatibility rule.
- Upload bytes, restore JSON and Shortcut multipart now authenticate before
  reading an unknown-length body. Shortcut auth failures retain the established
  HTTP 200 `KEEP_STOP` queue envelope. Route middleware independently verifies
  the credentials again and enforces lifecycle and schema constraints.
- Server-generated opaque request IDs prevent a malicious `X-Request-Id`
  header from reflecting arbitrary secrets into routine request logs.
- Synthetic login/body/URL/header tests, a fake timer for window reset and
  a real capture repository exception carrying private content exercise the
  actual route and service error paths. The latter returns `STORAGE_UNAVAILABLE`
  without logging the private marker.
- Existing attachment tests cover guessed and traversal-shaped identifiers,
  wrong-scope bearer access, tampered cookies, expired reservations, MIME
  signature failures, Unicode filename disposition and genuine authorized
  byte-for-byte PDF/PNG/text downloads. Existing recovery D1 regressions
  reject unauthenticated and capture-scoped exports.
- Source review found no React `dangerouslySetInnerHTML` use. Acquired text,
  filenames and displayed error strings are rendered in React text positions.
  This is not a substitute for a hosted browser exploit regression.

### Independent local validation evidence

- The earlier exact-head [CI acceptance run](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38793384830)
  passed on the initial BG-25 implementation branch. New work after that run
  requires another passing exact-head CI before review.
- The isolated BG-25 format/lint/types/focused-test workflow passed with
  twelve tests prior to the later Shortcut admission regression. The disposable
  diagnostic workflow was removed from the branch after use.
- Previous BG-24 token-rotation and earlier BG-07/BG-18 file tests are reused
  at their original source revisions. No new production credentials or actual
  customer file contents were used.
- The eleven previously reported dependency advisories are not silently
  treated as remediated or as BG-25-specific vulnerabilities.

### Three live-origin conditions previously unverified by the assistant

1. **BG-25.029:** Observe the actual Cloudflare native limiter across an
   exhausted eight-attempt window, its reset and a new authorized attempt.
   Synthetic minute-based fake timers are not edge-reset evidence.
2. **BG-25.031:** Verify a real staging HTTPS origin issues a Secure,
   HttpOnly and SameSite=Strict cookie, enforces expiry and rejects tampering.
   A mocked HTTPS Worker request alone does not establish edge behavior.
3. **BG-25.083:** Inspect deployed API/private-download/export caching,
   Content-Type and security headers on the matching staged release asset
   rather than relying only on source and local replay evidence.

The authenticated Cloudflare staging environment could not be inspected: the
available browser redirected from `https://dash.cloudflare.com/` to the
[login page](https://dash.cloudflare.com/login). No account authorization,
staging deployment, remote D1 or private R2 data change occurred. Before
deploying, confirm the `LOGIN_RATE_LIMITER` namespace is unique for the account
and use independent staging D1/R2 resources and synthetic credentials. Do not
promote to production, weaken the limiter, or close OPE-247 to manufacture
completion. **BG-26 remains locked.**
