# BG-06 — Checklist Reconciliation

Status: **99 / 100 complete before merge**

Tracking: GitHub #38 / PR #39 / Linear OPE-326

Task base `main`: `13f78b3c4eb1246e044f3a23ed8130de54817434`

Technical implementation gate: GitHub Actions CI run #170 on
`1c366a2d5d005b1fb421fb4ff709ee47152c3b68`

This reconciliation maps the authoritative `BG-06.001`–`BG-06.100` checklist
to concrete code, tests and sanitized repository evidence. It intentionally leaves
only `BG-06.100` incomplete until the implementation/evidence PR is merged into
`main` and the resulting clean head is verified.

## Evidence index

- `docs/verification/BG-06_ATTACHMENT_READ_AUTH.md` — permission contract,
  middleware decision, lifecycle boundary, regression coverage and validation.
- `docs/RECOLLECTFLOW_BUILD_GUIDE.md` — implemented BG-06 access decision.
- `apps/worker-api/src/shared/auth.ts` — signed-session predicate and
  capability-specific attachment-content read guard.
- `apps/worker-api/src/attachments/attachment.routes.ts` — route-scoped content
  guard with upload/delete boundaries preserved.
- `apps/worker-api/test/attachment.test.ts` — route-level permission and failure
  regressions using synthetic in-memory fixtures.
- GitHub Actions CI run #170 — exact implementation quality/migration gate.

## Group reconciliation

### BG-06.001–010 — Establish task context: complete

BG-05's final closeout and checklist sync were confirmed before work began. The
task started from `main` at
`13f78b3c4eb1246e044f3a23ed8130de54817434`, with GitHub #38 and Linear
OPE-326 as the task-level tracking records. The Web Inbox's ordinary attachment
link, signed admin session, existing bearer behavior, known 401 mismatch and BG-07
dependency were mapped before changing code. No production credentials or private
capture data were used.

### BG-06.011–020 — Map current middleware and request flow: complete

The attachment router originally applied `requireCaptureToken` to
`/attachments/*` before the content handler. That guard accepts capture/admin
bearers but not the signed admin cookie, so a browser request was rejected before
R2 lookup. The existing admin guard already accepted an admin bearer or verified
signed cookie. Upload routes, content reads, usage and deletion were mapped
separately, including the effective two-stage deletion boundary created by the
wildcard capture guard plus the route-level admin guard.

### BG-06.021–030 — Inventory permissions: complete

The final matrix is explicit and executable:

- anonymous or invalid credentials: content read denied;
- capture bearer: content read allowed and capture-scoped writes preserved;
- admin bearer: content read allowed and existing admin bearer permissions preserved;
- valid signed admin cookie: content read allowed;
- local-worker bearer alone: content read denied;
- tampered, cleared or browser-expired session: denied;
- cookie-only upload/write permission is not introduced by BG-06;
- capture bearer and cookie-only browser sessions cannot delete attachments;
- admin bearer retains attachment deletion.

BG-15 remains the owner of any later browser-write expansion.

### BG-06.031–040 — Define the read boundary: complete

Authentication remains separate from attachment availability. After successful
identity validation, the existing handler still requires a stored attachment,
allows only `finalized` or `linked` states, checks finalized-upload expiry,
uses the server-owned stored R2 key, rejects missing bytes, sanitizes the download
filename and returns private/no-store plus nosniff headers. Authentication success
does not expose pending, orphaned, deleted, expired or physically missing content.

### BG-06.041–050 — Define credential precedence: complete

Permitted read credentials are alternatives, matching the existing admin-auth
pattern. A valid signed admin cookie is not suppressed by an invalid or wrong-scope
Authorization header. A valid capture/admin bearer is not suppressed by an invalid
cookie. Worker bearer alone remains invalid for content. No fallback accepts an
unsigned cookie name/value, query token, raw R2 key or client-supplied role.

The mixed cases are encoded in route tests rather than left as middleware-order
accidents.

### BG-06.051–060 — Implement the guard: complete

`matchesAdminSession()` centralizes the existing Hono signed-cookie check.
`requireAdminToken` reuses that helper without behavior change.
`requireAttachmentContentRead` accepts capture bearer, admin bearer or the
verified admin session. The wildcard `/attachments/*` capture guard was removed
only because it conflicted with the content capability.

The content route now installs the read guard directly before lookup. Upload
wildcard authorization is unchanged. Deletion explicitly installs
`requireCaptureToken` followed by `requireAdminToken`, preserving the prior
effective permission boundary instead of accidentally making cookie-only deletion
reachable.

### BG-06.061–070 — Positive-path fixtures: complete

The Node attachment suite creates a synthetic finalized PDF through the real
upload initialization, content upload and finalize routes. Positive coverage proves:

- existing capture-bearer download still succeeds with exact byte equality;
- admin-bearer download succeeds with exact byte equality;
- a cookie issued by the real admin login route succeeds without a bearer header;
- returned content is reached through the real attachment route and server-owned ID.

No test bypasses the normal route stack.

### BG-06.071–080 — Negative and lifecycle fixtures: complete

The route suite proves denial for anonymous access, an invalid bearer,
local-worker bearer alone, a tampered signed cookie, a cleared/logout browser
session, capture-bearer deletion and cookie-only deletion. It also proves
cookie-only upload initialization remains denied and an authenticated read still
returns controlled `404 NOT_FOUND` when the backing object is missing.

Cookie expiry is browser-enforced by the cookie expiry attribute in the current
session design. Once expired, the browser sends no valid cookie, which is the same
server request shape covered by anonymous denial. The real logout route's clearing
cookie and the explicit tamper regression cover invalid session material received
by the server. BG-06 does not invent a new server-side session-expiry store.

### BG-06.081–090 — Contract closure: complete

The permission matrix, route registration order, upload isolation, destructive
operation isolation, lifecycle behavior and mixed-credential rule were reviewed
against the final diff. The implementation uses existing cryptographic helpers,
does not add auth tokens to URLs and does not expose private R2 keys. The Web UI
was intentionally not changed because BG-07 owns end-user browser download proof.

GitHub Actions CI run #170 passed the repository gate:

- release-verifier regressions: 5 / 5;
- Node Vitest: 23 files, 140 / 140 tests;
- Worker D1 Vitest: 33 files, 116 / 116 tests;
- Web Vitest: 2 files, 9 / 9 tests;
- formatting, lint and type contracts: passed;
- Web production build: passed;
- local D1 migration gate: all 18 migration commands completed successfully.

### BG-06.091–099 — Verify and prepare closeout: complete

Task-owned code, tests, documentation and route contracts were reviewed. The two
early PR CI attempts that stopped on formatting did not bypass the quality gate;
the repository's own Prettier output was captured with a temporary branch-only
workflow, applied exactly, and that workflow was deleted. The subsequent clean
task diff passed CI run #170.

The repository still reports 10 inherited dependency advisories during
`npm ci`, 3 moderate and 7 high. They are recorded rather than silently repaired
inside this authorization task. No database schema, production deployment, remote
migration, live delivery or production credential operation was introduced.

The build guide and evidence packet document what changed, why, how the route
works, where it lives, how it is tested and the remaining BG-07 browser proof.

### BG-06.100 — Merge and clean-head completion boundary: intentionally pending

BG-06.100 must not be checked before the implementation/evidence PR has actually
merged and the merged `main` head has passed CI.

Pre-merge conclusion:

- technical implementation: complete;
- pre-merge checklist: 99 / 100;
- PR #39: requires documentation-complete CI and merge;
- BG-07: **not yet unlocked**;
- remaining action: merge the validated PR, verify clean-head `main` CI, record
  final closeout, then mark BG-06.100 complete and unlock BG-07.

## Pre-merge conclusion

BG-06 is ready for its documentation-complete PR gate. The access decision is
explicit, implementation and regressions are present, and the only intentionally
open checklist action is the post-merge completion boundary.
