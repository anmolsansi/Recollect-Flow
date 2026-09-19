# BG-07 — Checklist Reconciliation

Status: **100 / 100 complete when this closeout record is present on `main`**

Tracking: GitHub #41 / PR #42 / Linear OPE-327

Task base `main`: `cb660e359abe36949040bca5d843b7a3d9d660d3`

Final implementation/browser gate: GitHub Actions CI run #208 on
`2f3a9ba36643398059066925dbba3b1be4fb38e7`

Implementation PR #42 merged into `main` at
`27aa0dad8cf82c8e8c483baaf1b302c4772d170d`. This documentation-only
closeout branch was created directly from that exact merged commit.

This record maps the authoritative `BG-07.001`–`BG-07.100` checklist to
concrete code, tests and sanitized CI evidence. Implementation PR #42 is merged,
and the closeout branch marks BG-07.100 complete. This record becomes authoritative
when the closeout is merged to `main`.

## Evidence index

- `docs/verification/BG-07_BROWSER_DOWNLOAD.md` — implementation, browser proof,
  validation history and security boundary.
- `docs/RECOLLECTFLOW_BUILD_GUIDE.md` — authoritative browser-download contract.
- `apps/worker-api/src/attachments/attachment.routes.ts` — private content
  response and lifecycle behavior.
- `apps/worker-api/src/attachments/attachment.utils.ts` — safe download filename
  and Unicode Content-Disposition handling.
- `apps/worker-api/test/attachment.test.ts` — response, lifecycle, byte and
  failure regressions.
- `scripts/verify-production-release.mjs` and
  `scripts/verify-production-release.test.mjs` — signed-cookie download is a
  required release-smoke pass.
- `scripts/browser-cdp.mjs` — bounded Chrome DevTools client.
- `scripts/browser-acceptance-runtime.mjs` — isolated local Worker/Vite/Chrome
  lifecycle.
- `scripts/browser-acceptance-fixtures.mjs` — synthetic PDF/PNG/text fixtures.
- `scripts/verify-browser-download.mjs` — real browser acceptance.
- GitHub Actions CI run #208 — final implementation/browser gate.
- `docs/verification/BG-07_FINAL_CLOSEOUT.md` — merged implementation identity and final parent boundary.

## Group reconciliation

### BG-07.001–010 — Establish task context: complete

BG-06's final closeout was confirmed on `main` before BG-07 started. The exact
task base, GitHub #41, Linear OPE-327, existing attachment content guard, existing
Web Download anchor and browser acceptance boundary were inspected before changes.

Existing BG-06 proof was reused for the authorization matrix rather than
reimplementing it. The selected environment is isolated local Worker/Vite/Chrome
inside CI with synthetic credentials and temporary D1/R2 persistence. No production
authorization is implied.

### BG-07.011–020 — Route integration: complete

The approved `requireAttachmentContentRead` guard from BG-06 remains installed on
the content route. The conflicting wildcard interception was already removed by
BG-06, so BG-07 does not repeat that change.

Upload authorization and attachment deletion remain unchanged. The route still
uses server-owned attachment IDs, repository lookups and private R2 keys, preserves
finalized/linked lifecycle rules and keeps the existing API error envelope.

Focused signed-cookie route coverage passes inside the attachment test suite.

### BG-07.021–030 — Response metadata: complete

The route reads the stored detected content type and falls back safely to
`application/octet-stream` if the optional detected type is absent. Stored
filenames pass through `safeFilename()` and
`attachmentContentDisposition()`.

Tests verify MIME, Content-Disposition, Content-Length, private caching, nosniff and
ETag. Unicode filenames receive an ASCII fallback plus encoded UTF-8 `filename*`.
CR/LF/quote hostile input cannot inject a new response header. Object keys remain
server-owned.

Missing or unsafe metadata does not become executable header syntax or a raw object
reference.

### BG-07.031–040 — Private caching: complete

Successful content responses retain `Cache-Control: private, no-store`. The real
browser story traverses the Vite same-origin proxy and then verifies a fresh private
request after logout receives `401`, proving the previously authenticated response
is not replayed as a public/shared cached success.

The browser downloads three different attachment IDs with distinct bytes and hashes.
No token-bearing URL or cache key is introduced.

### BG-07.041–050 — Browser session: complete

The acceptance harness starts the actual Vite application and Worker, opens the real
login form, submits a synthetic admin credential through the form, and observes the
signed HttpOnly `admin_session` cookie.

The admin token is not inserted directly into cookie state and is not retained in
browser local/session storage. Chrome navigates to the actual attachment item,
locates the existing same-origin Download anchor and clicks it. The resulting
downloads are files, not authentication-error HTML/JSON.

### BG-07.051–060 — Exact byte proof: complete

The browser story uploads, finalizes, links and then downloads:

- a generated valid PDF;
- a valid 1x1 PNG;
- a generic text file.

For each saved file it compares exact byte length and SHA-256 with the original
fixture. It also checks a basic file signature/structure appropriate to the fixture
type and the browser-suggested filename.

CI #208 recorded 641 PDF bytes, 68 PNG bytes and 76 text bytes with exact matching
synthetic hashes. Fixtures remain available for the whole acceptance run and are
removed only with the owned temporary runtime during cleanup.

### BG-07.061–070 — Session lifecycle: complete

Chrome reloads the attachment detail page while authenticated, confirms the session
cookie remains active and downloads the PDF again with the same length/hash.

The real UI Logout button clears the browser session. A subsequent private fetch
returns `401`. A tampered synthetic session cookie returns `401`. An expired
cookie fixture is not retained as an active browser cookie and the following
private request returns `401`.

### BG-07.071–080 — Object lifecycle and safe failure: complete

Route regressions cover missing IDs, deleted/purged content, unavailable lifecycle
states, missing backing objects and traversal-shaped IDs. These return controlled
errors rather than private bytes.

Unsafe filename input is sanitized and encoded without header injection. Failure
bodies are checked not to expose private object-key prefixes or synthetic capture,
admin or local-worker credentials. No bucket URL is returned to the browser.

### BG-07.081–090 — Regression evidence: complete

Cookie-authenticated download coverage is added while existing bearer and anonymous
coverage remains. Exact byte equality is enforced both at route level and through
the real Chrome story.

The attachment suite passes with 19 tests. Release smoke requires the signed-cookie
download stage to pass and includes a regression where a cookie-path `401` fails
the verifier. Browser acceptance passes for PDF, PNG and text, validates known file
signatures and records only synthetic response/hash evidence.

The original defect is therefore resolved at the same cross-layer boundary that
failed for the user: real login -> signed cookie -> actual anchor -> original bytes.

### BG-07.091–099 — Verify and prepare closeout: complete

The final task-owned diff was reviewed against the build-guide outcome. Required
negative states remain truthful, and BG-07 does not broaden upload/delete authority,
expose credentials, add token URLs, change database schema or deploy production.

GitHub Actions CI run #208 passed:

- formatting, lint and root typecheck;
- 6/6 release-verifier regressions;
- 23 Node test files, 146/146 tests;
- 33 Worker D1 test files, 116/116 tests;
- shared contracts check;
- Web lint;
- 2 Web test files, 9/9 tests;
- Web production build;
- all checked-in local migrations;
- Chrome 152 availability;
- real browser acceptance with three exact-file downloads, reload continuity and
  logout/tampered/expired-session denial.

The browser harness owns and removes its temporary processes, Chrome profile and
Wrangler state. CI-only failures discovered during development were fixed rather
than bypassed.

The repository's inherited npm advisory count remains 10 findings, 3 moderate and
7 high. That unrelated dependency-maintenance concern is recorded, not silently
expanded into BG-07.

### BG-07.100 — Merge and parent completion boundary: complete on closeout branch

Final implementation/documentation head
`2f3a9ba36643398059066925dbba3b1be4fb38e7` passed GitHub Actions CI run
#208. PR #42 then merged successfully into `main` at
`27aa0dad8cf82c8e8c483baaf1b302c4772d170d`.

The closeout branch was created directly from that exact merged application tree and
changes only documentation/checklist state. The authoritative checklist now marks
BG-07.100 complete. The closeout pull request must pass normal repository CI before
merge, so the repository does not treat an unvalidated documentation state as final.

When this reconciliation and `BG-07_FINAL_CLOSEOUT.md` are present on `main`,
BG-07 is durably 100/100 and BG-08 is unlocked.

## Final closeout conclusion

BG-07.001–.100 are supported by merged repository code, automated regression tests,
the real Chrome acceptance run and the exact merged implementation identity. This
100/100 conclusion is authoritative when the documentation-only closeout is merged
to `main`.
