# BG-16 Web capture acceptance and implementation closeout

## Scope and version

BG-16 adds a browser-first secondary capture client for URL, pasted text and notes. Implementation PR [#70](https://github.com/anmolsansi/Recollect-Flow/pull/70) merged to `main` at `2c4fbcdcefbbcf30c70c82bb303d870b0e443619` with 28 microcommits; tracked in [issue #69](https://github.com/anmolsansi/Recollect-Flow/issues/69). Its exact implementation head `9128203f6a7765a31dee42fdcef08bde76fbe0b4` passed [PR-head CI #38082248375](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082248375).

**Environment:** GitHub Ubuntu runner, local Wrangler Worker, isolated D1, local Vite Web, and headless Chrome with synthetic URLs and text only. The browser writes using the signed HttpOnly owner cookie. No production deployment, live provider credentials, real third-party URL fetch or private owner content was used.

## Delivered contract

- `apps/web/src/App.tsx` supplies Save something navigation and the authenticated `/capture` route.
- `apps/web/src/CaptureForm.tsx` provides labeled URL, pasted-text and note choices, reason, category and privacy controls. Unknown is the safe privacy default. Inputs stay distinct and inactive-mode values are excluded from submission.
- `apps/web/src/capture-model.ts` assembles the strict Worker request with UUID idempotency key, offset-aware capture time, source app and real Web package version. The category enum in `packages/contracts/src/common.ts` is shared with `capture.schema.ts`.
- `apps/web/src/api.ts` preserves cookie authentication, passes field-specific 422 validation errors, and signals unauthorized sessions.
- Successful responses show Saved or Already Saved based on canonical API fields and provide an item detail link. Save confirmation does not depend on Notion, source extraction or optional AI completing.
- Invalid input keeps draft values and focuses the first error. Concurrent form submit is blocked. An uncertain response retains the exact operation key/payload for in-memory retry; cross-reload draft storage, reauthentication resume and durable uncertain-operation reconciliation remain BG-17, and attachments remain BG-18.

## Verification

[PR-head CI #38082248375](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082248375) **passed** on the exact implementation head, including Prettier, lint, typecheck, tests, contracts, Web build, local database migrations and the new `npm run browser:capture:test` acceptance, plus all preexisting browser download/source-recovery/workflow/acquisition suites. `scripts/verify-browser-capture.mjs` verifies:

- An empty note rejects and moves focus to its field.
- URL, note and pasted-text submissions produce durable items that are fetched back via the real Worker API.
- Unknown privacy remains Unknown; duplicate URL with a new reason reuses canonical ID while retaining the new reason as a separate capture event.
- Switching from URL to pasted text never submits the hidden URL.
- The capture view does not overflow a 390-pixel mobile viewport.

`apps/web/src/capture-model.test.ts` covers invalid URLs, blank notes/text, type-specific data shape, field maximums and Unicode reason. Existing Worker `capture.test.ts` confirms same-key replay returns the same item without extra events and optional scheduling failure does not undo a durable save.

## Risks and remaining boundaries

BG-17 is responsible for draft persistence, session-expiry recovery and cross-reload stable retries; BG-18 for file upload; BG-19 for follow-up fields. No production Web hosting or release gate is proven by this local acceptance. The initial feature CI runs encountered formatting, a malformed JavaScript acceptance selector, lint-global errors and an asynchronous focus assertion. These were corrected and were not hidden. The final PR-head CI passed.

**Merged-main gate:** [CI #38082460334](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082460334) is the run on implementation merge `2c4fbcdc...`. Record its outcome only after GitHub reports a completed conclusion. This record is a documentation-closeout candidate until its own exact-head and merged-main CI pass.
