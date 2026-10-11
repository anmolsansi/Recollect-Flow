# BG-17 final acceptance, owner-visible scope and exceptions

## Decision

**BG-17 browser retry and draft-lifetime contract: accepted, subject to the final merge/main CI gate.**
BG-17 follows BG-16 and precedes BG-18. Its supported browser clients are
URL, text and note. File upload and original-byte transfer are **not available**
in the Web client yet, and cannot be truthfully counted as delivered in BG-17.
Actual file selection, stage execution, original upload and download prove-out
remain an explicit **BG-18 task**, not secretly added to this closeout.

The checklist records three conditional nonapplicable outcomes rather than
pretending they ran: BG-17.025 (automatic retry is intentionally disabled),
BG-17.064 (file reselect UI belongs to BG-18), and BG-17.068
(network upload-stage resume belongs to BG-18). These are policy decisions,
not passing browser acceptance for capabilities that do not exist.

## Supported recovery contract

A logical submission gets one crypto-generated UUID, fixed captured_at,
privacy, source and request payload. Client-side retry reuses the exact request
after uncertain network response, offline-before-send and reauthentication.
Response-loss after server commit is re-sent with the same key and returns
the same canonical D1 item ID. Success clears the acknowledged retry only.
The browser never equates local persistence with Saved, does not send
background automatic retries and throttles manual repeated clicks for 1.5
seconds per operation.

Durable recovery requires explicit owner opt-in. IndexedDB version 2 stores
editable drafts separately from immutable pending submissions. Content is
unencrypted and disabled on shared devices by default. It retains up to three
pending requests and 256 KB of serialized retries for seven days. It does not
persist secrets, sensitive capture content, original file bytes or File/Blob
objects. Explicit logout and turning off recovery clear both stores. Storage
failures and lost recoverability are shown.

## File metadata boundary, ready for BG-18

`apps/web/src/capture-file-recovery.ts` strictly validates optional file
metadata: name, MIME, SHA-256, byte count, upload stage, original server
attachment ID and expiry. The original File/Blob/bytes are never retained.
If bytes are missing, the policy requires owner reselection and a SHA-256
comparison. Same-name, same-size _changed content_ is rejected. A finalized
server-issued ID can be carried forward unchanged to the capture stage.
An expired reservation is reported and never silently replaced. A merely
selected file with no server reservation must be initialized deliberately,
never treated as uploaded. This module and its tests do not claim a working
Web file picker, actual PUT, finalize, or server download. BG-18 will integrate
them with the existing Worker attachment routes.

## Verification

- Previous core implementation [PR #74](https://github.com/anmolsansi/Recollect-Flow/pull/74) merged in `0498ce3e5bb7c955948a0b676eca9c596fa92267`.
- Core exact-head [CI #38088967812](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38088967812) and merged-main [CI #38089184155](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38089184155) both passed.
- [PR #75](https://github.com/anmolsansi/Recollect-Flow/pull/75) adds file metadata policy, SHA matching/changed-file rejection, per-operation rate limit and Chrome/D1 cookie-expiration, signed-in recovery acceptance. Its exact successful CI and merge evidence must be recorded in issue #73 before closing the parent.
- Focused `capture-file-recovery.test.ts`, `capture-recovery.test.ts` and `verify-browser-recovery.mjs` cover the boundaries above.
- No production deployment, real private data, physical iPhone, genuine browser file upload or expired R2 upload was tested. Those remain separate release gates.

## Review and risk assessment

No D1 migration, server capture schema changes, new service, dependency or
background worker was introduced. The attached metadata policy is a
forward-compatible contract for BG-18, not permission to bypass server
signature, size, checksum, TTL or cookie security checks. Pending capture
storage remains unencrypted, so the user-facing opt-in, retention limits and
logout purge are essential. A file with identical filename and size is not
accepted unless SHA-256 matches. Automatic upload is blocked to avoid
duplicate R2 objects. The reviewed exception boundary is explicitly listed
above, and unresolved BG-18 implementation must not be described as
completed in release notes.
