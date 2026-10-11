# BG-19 — Web capture follow-up and review date

## Implementation context

- Base: `main` at `14bda81aabcdf87b2061e814e78dd85ccdf7f325`, after BG-18 merged-main gate.
- Tracking: [issue #79](https://github.com/anmolsansi/Recollect-Flow/issues/79), [PR #80](https://github.com/anmolsansi/Recollect-Flow/pull/80).
- Scope: local isolated Web/Worker/D1 acceptance. No production mutation, real account data, delivery, or physical-iPhone signoff.

## Why this is a two-stage operation

The `POST /api/v1/captures` request has a strict schema that does **not** accept
`project`, `review_at`, or `title`. These fields live in the **item edit**
schema. BG-19 preserves the existing capture contract: submit the immutable,
idempotent original capture first. After a successful capture confirmation,
`GET /api/v1/items/:id` to obtain `edit_version` and current metadata.
Only after that, `PATCH /api/v1/items/:id` with the version and the optional
nonconflicting project text label or review instant. GET again to verify.

The project field is a nullable free-text label in the existing item schema, not
a project ID and not a request to create a separate project record. An empty
project or reminder in the Web capture form means **leave the existing value
unchanged**. Clearing already saved metadata is available from the item editor,
not implicit in a capture replay. New capture reasons remain capture-event
provenance. A canonical duplicate retains its existing project's and reminder's
values; the user can open the saved item to make a deliberate edit.

## Source locations

- `apps/web/src/capture-follow-up.ts`: schema-compatible two-stage PATCH,
  optimistic concurrency, duplicate handling, lost-response reconciliation.
- `apps/web/src/CaptureFollowUp.tsx`: shared optional fields, visible partial
  success, manual follow-up-only retry, accessible status messages.
- `apps/web/src/CaptureForm.tsx` and `FileCaptureForm.tsx`: attach follow-up
  metadata to stable capture operations, keep original save/retry semantics.
- `apps/web/src/capture-model.ts` and `capture-recovery.ts`: separate
  editable follow-up draft from strict capture payload and recover the
  intent without mutating submitted body, key, timestamp or privacy.
- `apps/web/src/follow-up-recovery.ts`: optional seven-day metadata-only
  browser recovery, up to three pending records. No secret or original file bytes.
  Logging out or turning off draft recovery clears these pending records.
- `apps/web/src/follow-up-date.ts`: convert displayed local wall-clock
  values to an ISO UTC instant, format UTC instants back into local fields.
  Empty values are null. Nonexistent and repeated DST wall-clock times are
  rejected rather than silently choosing an offset.
- `apps/web/src/App.tsx`: item editor uses local display and conversion
  instead of `review_at.slice(0, 16)`.
- `scripts/verify-browser-follow-up.mjs`: isolated Chrome/Worker/D1 acceptance
  for persisted project and reminder, India timezone, network interruption,
  manual patch-only retry and narrow viewport.

## Failure behavior

The capture itself is already durable by the time follow-up begins. If the
versioned patch fails, the visible state is “Saved; project/reminder needs retry.”
It never claims capture failure or creates a new capture key. A manual retry
loads the item first and reconciles already-applied server metadata. A concurrent
owner edit or an existing duplicate's metadata is never silently overwritten.
The owner can choose **Edit saved item** if explicit changes are needed.

The capture form identifies invalid review date/time and project length before
submission. The shared stage exposes semantic labels, field-linked errors,
`aria-live` status and a focusable retry action. Narrow screens use a one-column
layout; long messages wrap rather than overflow.

## Validation

- `npm run check` (format, lint, types, tests, contract check and Web build).
- `npm run db:migrate:local`.
- `npm run browser:follow-up:test` (real local Chrome/D1, no production data).
- Existing browser capture, file-upload, retry, download and acquisition suites
  in `.github/workflows/ci.yml`.
- `apps/web/src/capture-follow-up.test.ts` and
  `follow-up-date.test.ts` test version conflicts, duplicate preservation,
  recovered PATCH responses, empty values, Asia/Kolkata and New York DST.

## Final repository acceptance, October 11, 2026

- [PR #80](https://github.com/anmolsansi/Recollect-Flow/pull/80)
  merged as `d17fb544721ec66e5a25773bcf52cd3c432dd4cf`, preserving its
  microcommit history.
- [Exact PR-head CI #38131123654](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38131123654)
  **passed** at `7335c0b941aebedcd0776634aee849d4fa95cf0b`.
- [Merged-main CI #38131384768](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38131384768)
  **passed** at `d17fb544721ec66e5a25773bcf52cd3c432dd4cf`.
- Web tests include nine versioned follow-up cases and three timezone
  conversion cases, including Asia/Kolkata and America/New_York DST.
- Isolated real Chrome/Worker/D1 acceptance confirmed canonical capture and
  versioned project/review updates; UTC/local round trip; injected lost
  metadata response and metadata-only retry; duplicate metadata protection;
  field-linked validation and focus; a narrow viewport and a zoom-equivalent
  viewport; and keyboard Enter with accessible live Saved confirmation.
- All existing browser upload, recovery, download, acquisition, workflow
  and source-recovery regression suites passed.
- Canonical [BG-19 100-step checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-19--100-executable-microtasks)
  is **100/100**. BG-20 is unblocked for repository implementation.
- No production release, production data mutation, real outbound messaging,
  or physical-iPhone acceptance was authorized or performed. Browser zoom
  coverage is viewport emulation, not a physical device certification.

This is a repository acceptance gate, not a production rollout.
