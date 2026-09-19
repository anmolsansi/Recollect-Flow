# BG-07 — Browser Download Verification

Status: **implementation merged; final closeout gate pending**

Tracking: GitHub #41 / PR #42 / Linear OPE-327

Task base `main`: `cb660e359abe36949040bca5d843b7a3d9d660d3`

Work branch: `agent/ope-327-bg-07-browser-download`

## Problem and scope

BG-06 already repaired the attachment-content authorization mismatch. The content
route accepts a capture bearer, admin bearer or verified signed admin session
cookie, while upload and delete boundaries remain intentionally narrower.

The Web Inbox already used the desired same-origin link:

```text
/api/v1/attachments/:id/content
```

BG-07 therefore does not redesign authentication and does not replace the anchor
with JavaScript token handling. It proves the real browser path and strengthens
response/lifecycle regressions around that path.

The required user story is:

```text
real Vite login form
  -> signed HttpOnly admin_session cookie
  -> real item detail page
  -> actual Download anchor
  -> Vite same-origin /api proxy
  -> Worker attachment read guard
  -> D1 attachment lookup
  -> private local R2 object
  -> browser-saved original bytes
```

## Security boundary preserved

BG-07 does not:

- append bearer or admin credentials to URLs;
- expose the admin token to browser JavaScript storage;
- expose R2 keys or bucket URLs;
- broaden cookie-only access to upload or delete routes;
- weaken attachment lifecycle checks;
- introduce public/shared caching for private bytes;
- deploy production, use live credentials or apply remote migrations.

Browser acceptance uses synthetic credentials plus isolated temporary Wrangler D1/R2
state that is removed after the run.

## Implementation

### Download response metadata

`apps/worker-api/src/attachments/attachment.routes.ts` continues to stream the
private object body directly. It now delegates Content-Disposition construction to
`attachmentContentDisposition()` in
`apps/worker-api/src/attachments/attachment.utils.ts`.

The response preserves:

- stored/detected MIME type with safe octet-stream fallback;
- exact `Content-Length`;
- attachment disposition with a sanitized ASCII fallback;
- RFC 5987-style UTF-8 `filename*` when Unicode is present;
- `Cache-Control: private, no-store`;
- `X-Content-Type-Options: nosniff`;
- the private object ETag.

Header-control characters are removed by the existing filename sanitizer before
the disposition is emitted. Unicode names remain recoverable through `filename*`
without allowing response-header injection.

### Route-level regression coverage

`apps/worker-api/test/attachment.test.ts` reuses the real app router with synthetic
in-memory attachment/R2 fixtures. BG-07 expands coverage to prove:

- signed-cookie PDF download returns exact bytes and expected response metadata;
- signed-cookie PNG download returns exact bytes and MIME;
- signed-cookie generic text download returns exact bytes and MIME;
- Unicode filenames emit a safe ASCII fallback plus encoded UTF-8 filename;
- hostile quote/CR/LF filename input cannot inject a response header;
- finalized content remains readable while pending/uploaded/orphaned/deleted states
  stay unavailable;
- missing records and deleted/purged objects return controlled `404` responses;
- traversal-shaped attachment IDs do not reveal server object keys or credentials;
- authenticated missing backing objects remain controlled.

BG-06 bearer compatibility, mixed-credential behavior, anonymous denial, logout
denial, upload isolation and delete isolation remain covered by the same suite.

### Release-smoke contract

`scripts/verify-production-release.mjs` no longer tolerates
`browser-cookie-attachment-download` as a known unavailable stage. The stage now
must return HTTP 200 and prove:

- exact byte length;
- exact SHA-256;
- PDF MIME type;
- expected safe filename;
- `private, no-store`;
- `nosniff`.

`scripts/verify-production-release.test.mjs` models the valid signed-cookie path
and contains a dedicated regression proving a cookie-download `401` is a hard
release-smoke failure.

### Real browser acceptance

The browser proof is dependency-free at runtime and uses Chrome DevTools Protocol:

- `scripts/browser-cdp.mjs` — bounded CDP request/event client;
- `scripts/browser-acceptance-runtime.mjs` — isolated Wrangler migration,
  Worker/Vite lifecycle, Chrome discovery/startup and cleanup;
- `scripts/browser-acceptance-fixtures.mjs` — synthetic PDF, 1x1 PNG and text
  upload/finalize/link helpers;
- `scripts/verify-browser-download.mjs` — real login, navigation, download,
  byte/hash proof, reload and invalid-session checks.

The browser harness starts the actual Web workspace directly so Vite receives
`--host`, `--port` and `--strictPort` without nested npm argument loss. Browser
navigation compares canonical URL forms so the root origin's trailing slash does
not create a false timeout.

The root `browser:download:test` script runs this story, and normal CI executes it
after the repository quality and local migration gates. No Playwright/Puppeteer
dependency is required.

## Browser proof

GitHub Actions CI run **#196** passed on implementation head
`1ae56558d0919ea6452e73869c8daeb06795c72a`.

The runner used:

- Node 22.23.2;
- Wrangler 4.116.0;
- Google Chrome 152.0.7977.82;
- isolated local D1/R2 state;
- synthetic per-run capture/admin/local-worker credentials.

The real Chrome story reported `login-proof-passed` with three prepared fixtures.

| Fixture | Saved bytes | SHA-256 verification        |
| ------- | ----------: | --------------------------- |
| PDF     |         641 | exact uploaded hash matched |
| PNG     |          68 | exact uploaded hash matched |
| text    |          76 | exact uploaded hash matched |

The PDF was downloaded again after a page reload with the same byte count and hash.
The browser retained the signed session across reload.

New private reads after invalid session states returned:

- logout: `401`;
- tampered session cookie: `401`;
- expired browser session: `401`.

The created `admin_session` was observed by Chrome as HttpOnly with
`SameSite=Strict`. The synthetic admin token was not persisted in
`localStorage` or `sessionStorage`.

## Repository validation

CI run #196 passed every required stage:

- Prettier formatting: passed;
- ESLint: passed;
- root TypeScript typecheck: passed;
- release-smoke regressions: 6 / 6;
- Node Vitest: 23 files, 146 / 146 tests;
- Worker D1 Vitest: 33 files, 116 / 116 tests;
- shared contracts check: passed;
- Web lint: passed;
- Web Vitest: 2 files, 9 / 9 tests;
- Web production build: passed;
- local D1 migration gate: all checked-in migrations applied successfully;
- Chrome availability check: passed;
- `npm run browser:download:test`: passed.

`npm ci` still reports the repository's inherited 10 dependency advisories
(3 moderate, 7 high). BG-07 does not silently upgrade unrelated dependencies under
a browser-download task. That remains separate maintenance work.

## Validation iterations

The browser harness exposed two CI-only integration issues before the green run:

1. The first browser run showed nested npm argument forwarding stripped Vite flags.
   The harness now runs the Web workspace directly.
2. After Vite started, Chrome canonicalized the root origin with a trailing slash.
   Navigation now compares canonical URL forms. ESLint then required the existing
   Node global `URL` to be declared for that script.

Each correction was committed separately. No quality check was bypassed.

## Completion boundary

The technical implementation and browser evidence are green, and implementation PR
#42 is merged into `main` at
`27aa0dad8cf82c8e8c483baaf1b302c4772d170d`. The final implementation head
passed CI run #208 before merge.

A documentation-only closeout branch now starts directly from that exact merged
application tree. The authoritative checklist marks BG-07.100 complete on the
closeout branch, but the 100/100 state is authoritative only after the closeout
pull request passes normal repository CI and this evidence is present on `main`.

At that point GitHub #41 and Linear OPE-327 can close, and BG-08 is unlocked.
