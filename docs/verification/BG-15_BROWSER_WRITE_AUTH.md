# BG-15 browser write authorization, implementation checkpoint

## Scope and starting evidence

- Baseline: `main` at `d603e210c03125898666e8a1336c4d39363d081a`, following the verified BG-14 closeout.
- Tracking: [issue #65](https://github.com/anmolsansi/Recollect-Flow/issues/65); [PR #66](https://github.com/anmolsansi/Recollect-Flow/pull/66).
- No production deployment, production database operation, device authorization or live capture performed.

## Architecture decision

Reuse the canonical capture and attachment routes. Do not create a second browser persistence pipeline.

The signed HttpOnly owner cookie now contains a server-validated absolute expiry, so a stale cookie remains invalid even if manually replayed. For writes authorized by this cookie, require `Origin` to match the request URL origin exactly. Reject absent and `null` origins, alternate same-site subdomains, and unrelated sites. Do not rely on SameSite alone.

An explicit bearer credential takes precedence. Valid capture/admin bearer credentials retain existing capture/upload permissions without requiring Origin, including nonbrowser Shortcut requests. An invalid bearer or a local-worker bearer cannot borrow an accompanying owner cookie. Admin mutations preserve admin scope and reject capture bearers.

The request URL is the expected origin. Any future reverse-proxy setup must preserve a correct externally visible request origin. Do not trust unvalidated `X-Forwarded-Host` values, arbitrary Origin reflection or a client-supplied "Shortcut" header.

## Code map and behavior

- `apps/worker-api/src/shared/auth.ts`: signed-session expiry, scoped bearer precedence, cookie-origin verification, capture write middleware, admin write protection.
- `apps/worker-api/src/auth/auth.routes.ts`: timestamp-bound signed session issuance, `HttpOnly`, `SameSite=Strict`, HTTPS Secure attribute.
- `apps/worker-api/src/captures/capture.routes.ts`: authorize cookie session or existing capture/admin bearer on POST before reading the JSON body.
- `apps/worker-api/src/attachments/attachment.routes.ts`: same authorization for upload init, raw byte PUT and finalize. Cleanup remains admin-only. Existing MIME, size, signature, checksum, TTL, and R2 validation remain unchanged.
- `apps/web/src/api.ts`: already sends `credentials: 'include'` and dispatches global auth-required events. BG-16/BG-17 own capture form state, draft recovery and idempotent retry UI.

The existing `POST /api/v1/admin/session` requires the admin secret to sign in. This login response does not expose that secret to persistent Web storage. Unauthenticated cookie capture returns 401, rejected browser origin returns 403 `ORIGIN_FORBIDDEN`, and existing validation errors remain in their JSON envelope.

## Authentication matrix

- A valid capture bearer without Origin may capture and upload but cannot perform admin writes.
- A valid admin bearer without Origin may capture, upload, and perform admin writes.
- A valid signed owner cookie with an exact matching Origin may perform both.
- Signed cookies with missing, null, or foreign Origin receive 403 on writes.
- An invalid explicit bearer cannot fall back to a valid cookie.
- Local-worker bearer tokens cannot capture or upload.
- Anonymous, expired, or tampered cookies cannot capture or upload.

## Verification and remaining gate

Added targeted capture and upload-init regression tests for cookie authorization, Origin rejection, invalid/tampered/mixed identity and legacy bearer clients. Run repository CI and inspect the exact PR head before marking any tests passed. Full raw-byte PUT/finalize cookie tests, expiry simulation, browser storage inspection and merged-main CI evidence remain required before the canonical BG-15 checklist may be fully checked. Do not claim BG-15 is complete or unlock BG-16 from this checkpoint.
