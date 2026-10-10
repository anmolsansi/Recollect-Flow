# BG-17 browser draft recovery, stable retry and verification

## Status and scope

Implementation is tracked in [issue #73](https://github.com/anmolsansi/Recollect-Flow/issues/73)
and [PR #74](https://github.com/anmolsansi/Recollect-Flow/pull/74). It starts
from BG-16's verified merged-main checkpoint
`a1db965523103ae026c58cf599231393ca71c202`.

**Status:** The scoped URL/text/note browser recovery implementation has
passed [exact PR-head CI #38088786838](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38088786838)
on commit `b739e5aafd94bb24db060c1ec7e72417a0a5373d`. Formatting, lint,
typecheck, unit tests, Web build, D1 migrations, Chrome recovery acceptance
and existing browser regressions all passed. This does **not** close parent
BG-17: file upload/reselection and explicit expired-session acceptance
remain unchecked. The final merged-main gate has not yet been established.
No remote deployment or live personal capture was performed.

## Owner behavior

The existing authenticated Web capture form supports URL, pasted text and
notes. Its original server contract is unchanged. Every submitted operation
keeps a stable UUID, capture timestamp, privacy value and serialized payload.
Uncertain responses, lost transport and reauthentication do not generate a
replacement key. Retry resends the exact original request, and the server's D1
fingerprint/idempotency contract decides whether the original save is replayed.
A confirmed successful response alone produces the Saved state and clears
the corresponding local recovery record.

The owner may start another editable draft without rewriting a pending
operation. Pending retries remain visible and may be retried explicitly or
discarded. Discard does not delete a canonical D1 item that may already exist.

Cross-reload retention is **opt-in**, off on a shared device by default.
The browser stores editable drafts and immutable submitted operations in
different object stores in IndexedDB version 2. Content is not encrypted.
Submitted records expire after seven days; total capacity is three records
and 256 KB of serialized content. Editable drafts have a separate bounded
record, seven-day expiry and a 350-ms debounce. Sensitive content and original
file bytes are excluded. Cookies and admin bearer tokens are never serialized.

Storage errors and quota rejection are shown to the owner. Persistence is
best-effort and is **not** a backup. Explicit logout clears both data stores
and the recovery preference; changing the option to off does likewise.
There is no unattended automatic retry loop.

## Source map

- `apps/web/src/capture-recovery.ts`: schema checks, versioned IndexedDB,
  expiry, bounds, local preference and clearing.
- `apps/web/src/CaptureForm.tsx`: immutable replay, editable draft separation,
  opted-in recovery, explicit retry/discard, owner-visible failures.
- `apps/web/src/App.tsx`: clear local retained content on explicit logout.
- `apps/web/src/capture-model.ts`: restore editable input after server 422.
- `apps/web/src/capture-recovery.test.ts`: pure retention and contract tests.
- `scripts/verify-browser-recovery.mjs`: isolated Chrome + Worker/D1 integration,
  including a committed request with simulated lost browser response.
- `apps/web/README.md`: owner and developer instructions.

## Acceptance commands

Run `npm run check`, `npm run db:migrate:local`, and
`npm run browser:recovery:test`. The GitHub CI workflow also runs existing
capture, download, source-recovery, workflow and acquisition suites. The
automated Chrome test must prove opt-in default off, editable draft reload,
commit-response-loss replay to the **same capture ID**, clearing a confirmed
operation, offline-before-send recovery and clearing when retention is off.

[Exact scoped PR-head CI #38088786838](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38088786838)
passed all checks, including the recovery browser test. The final parent
issue/checklist reconciliation still requires merged-main evidence and
resolution of the explicitly open BG-17 substeps. Earlier failed runs are
diagnostic, not passing evidence.

## Exclusions and follow-up

BG-18 owns browser original file uploads, server attachment linking,
file reselect/hash verification and upload stage resume. No unfinished
file-recovery subtask should be checked solely because its future metadata
shape is reserved. BG-36 owns physical iPhone offline/rotation acceptance.
BG-21 owns production hosting and asset packaging. The feature is scoped
to local browser recovery and does not claim real-device offline support,
encrypted local storage or indefinite retention.

## Engineering decision

A small IndexedDB adapter reuses the current capture route and does not add
backend services, D1 migrations, additional dependencies or browser background
workers. Alternative in-memory-only retry cannot survive reload. Unconditional
localStorage persistence would leak content on shared devices and lacks a
transactional, versioned schema. Versioned IndexedDB with explicit device
opt-in and bounded cleanup is the chosen reversible option.
