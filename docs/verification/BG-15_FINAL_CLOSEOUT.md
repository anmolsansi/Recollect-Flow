# BG-15 browser write authorization completion

## Implementation

[PR #66](https://github.com/anmolsansi/Recollect-Flow/pull/66) merged the BG-15 backend authorization boundary into `main` at commit `389d5f7f899ce07b878cb475bf25f2e84fa1cf07`.

The existing capture and attachment services support signed owner-cookie writes without duplicating persistence logic. The signed session includes a server-validated expiration. Cookie-authenticated mutations require an `Origin` matching either the Worker origin or the explicitly configured `WEB_INBOX_BASE_URL` origin. A missing, null, or unrelated Origin is denied. An explicit invalid bearer never falls back to a signed cookie. Capture/admin bearer clients remain compatible with requests without a browser Origin, and local-worker credentials cannot acquire capture permissions.

## Code and verification

Changes are implemented in `apps/worker-api/src/shared/auth.ts`, `apps/worker-api/src/auth/auth.routes.ts`, `apps/worker-api/src/captures/capture.routes.ts`, and `apps/worker-api/src/attachments/attachment.routes.ts`. Existing body/schema, raw-byte upload, checksum, MIME, size, object integrity, TTL, and admin-only cleanup checks are retained.

Tests are located in `apps/worker-api/test/capture.test.ts` and `apps/worker-api/test/attachment.test.ts`. They cover signed-cookie capture, anonymous denial, upload initialization, raw-byte upload, finalize, incorrect Origin, configured Vite origin, mixed credentials, and session expiry between init and upload. The Web client already uses `credentials: 'include'` and the global auth-required event.

[PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38063926575) and [implementation merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38064153798) passed. These runs include formatting, lint, type checks, tests, local migrations, Web build, and Chrome acceptance workflows.

## Canonical checklist

The authoritative `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md` has **93 of 100** BG-15 steps checked against available evidence. Steps `BG-15.073` through `BG-15.079` remain unchecked because the capture form, persistent draft, pending upload identity, and reauthentication UI belong to BG-16 through BG-18. Step `BG-15.089` is checked against the isolated Chrome
navigation, anchor and resource URL scan in
[PR #68](https://github.com/anmolsansi/Recollect-Flow/pull/68). The remaining seven browser-form steps are not claimed as completed. The BG-15 backend authorization gate is complete, with BG-16 awaiting the final documentation merge.

The [authorization matrix](BG-15_BROWSER_WRITE_AUTH.md) contains the exact API boundary and deployment assumptions. Tracking remains in [issue #65](https://github.com/anmolsansi/Recollect-Flow/issues/65).

## Release boundary

No production Worker deployment, production D1/R2 migration, external messaging, live private captures, or V1 release approval is implied. This is the local and CI-verified browser write authentication milestone.
