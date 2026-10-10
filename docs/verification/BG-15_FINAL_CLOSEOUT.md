# BG-15 browser write authorization, completion record

## Implemented and merged

BG-15's *authorization contract* is implemented on merged main through
[PR #66](https://github.com/anmolsansi/Recollect-Flow/pull/66),
merge commit `389d5f7f899ce07b878cb475bf25f2e84fa1cf07`.
The PR preserves the canonical capture and upload services while adding
signed owner-cookie writes and a strict cookie-origin allowlist.

The exact-head implementation [CI run 38063926575](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38063926575)
passed formatting, lint, type checks, unit/integration testing, local D1
migrations, Web build and the Chrome browser suites.

## What changed

- `apps/worker-api/src/shared/auth.ts`: signed-cookie expiry validation,
  bearer precedence and origin checks for owner-authenticated mutations.
- `apps/worker-api/src/auth/auth.routes.ts`: signed expiry embedded in HttpOnly
  sessions, with SameSite Strict and Secure on HTTPS.
- `apps/worker-api/src/captures/capture.routes.ts`: cookie or capture/admin
  bearer for writes without duplicating capture persistence.
- `apps/worker-api/src/attachments/attachment.routes.ts`: cookie support for
  init, raw byte PUT, finalize and admin-scoped cleanup, retaining checksum,
  MIME, length and object-integrity validation.
- `apps/worker-api/test/capture.test.ts` and
  `apps/worker-api/test/attachment.test.ts`: login/cookie capture, anonymous
  denial, cookie-init/PUT/finalize, expiry mid-upload, Origin denial and
  configured local Vite origin acceptance.

Signed-cookie mutation Origins must match the Worker origin or the explicitly
configured `WEB_INBOX_BASE_URL` origin. Arbitrary forwarded host headers are
not trusted. Capture/admin bearer clients remain compatible without browser
Origin, and worker credentials do not inherit capture scope.

## Canonical checklist and boundaries

The authoritative checklist in `RECOLLECTFLOW_MICROTASK_CHECKLIST.md`
has **91/100 resolved** with the implementation evidence above.
Eight browser-form or URL-secret-scanning steps remain explicitly unchecked:
`BG-15.073` through `BG-15.079` are delegated to BG-16/BG-17/BG-18,
and `BG-15.089` requires a URL/query-string credential inspection.
These are not falsely reported as runtime checks. `BG-15.100` is held for
final merged-main evidence and the subsequent documentation closeout gate.

BG-15 is the prerequisite authorization boundary for the BG-16 form, not
the form implementation itself. The Web helper already sends
`credentials: 'include'` and emits the auth-required event. Pending
operation identities and reauthentication UI must be implemented and
verified by the subsequent BG tasks.

## Safety and rollout

No production credentials, remote D1/R2 changes, external delivery,
production deployment or V1 release acceptance occurred in BG-15.
The first merged-main CI run is tracked at
[run 38064153798](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38064153798);
it must pass before the final unlock decision is recorded.

Documentation and the main GitHub issue [#65](https://github.com/anmolsansi/Recollect-Flow/issues/65)
must reflect this exact evidence and the remaining delegated items.
