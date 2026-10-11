# BG-18 — Browser file upload verification

**Task:** BG-18, [issue #77](https://github.com/anmolsansi/Recollect-Flow/issues/77).
**Code review:** [draft PR #78](https://github.com/anmolsansi/Recollect-Flow/pull/78).
**Base:** main (BG-17 accepted). **Work branch:**
`feat/bg-18-browser-file-upload`.

## Scope and safety boundary

- The owner submits exactly one file at `/capture/file`. The UI reads the
  configured server admission policy. The client limits in-memory SHA-256
  processing to 25,000,000 bytes, the BG-17 recovery schema's maximum.
- `GET /api/v1/uploads/config` and `GET /api/v1/uploads/:id/status` use
  the existing write authentication boundary. The status response excludes
  R2 object keys and owner credentials.
- Client stages use the existing init, content PUT, finalize and
  canonical capture/link APIs without new services or migrations.
- Upload state is reconciled before retry, and a lost canonical response
  replays the identical idempotency key, file reference, timestamp, privacy
  and reason. Expired reservations require deliberate restart.
- Sensitive saves do not enter IndexedDB. Owner-opt-in recovery contains
  metadata only, not original File/Blob bytes. Discard does not delete
  a possibly linked server attachment. The server's existing orphan
  cleanup owns abandoned objects.
- Audio is accepted as upload `audio` but linked as capture `file` under
  the existing capture schema; transcription isn't promised.
- No remote deployment, live cloud provider checks or physical-device
  acceptance have been authorized or executed.

## Evidence collected

- Base BG-17 gate: [final BG-17 merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38120252029)
  passed before BG-18 work started.
- Intermediate BG-18 code-only commit `067e73876ee7dfb774a6acddb27be5a6c8793327`:
  [CI run #38121529004](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38121529004)
  **passed**, covering the preexisting complete quality/Chrome suites
  before the dedicated BG-18 browser script was added.
- Subsequent CI runs with the BG-18 Chrome script initially exposed
  formatting and lint errors. They are not evidence of acceptance.

## Required final checks

- [ ] Full exact PR-head CI `npm run check` passes unmodified format,
  lint, typecheck, contracts, unit tests and Web build.
- [ ] Isolated Chrome/Worker/D1/R2 `npm run browser:file-upload:test`
  proves PDF/image original bytes and SHA-256 match after canonical linking.
- [ ] Browser test rejects wrong type and server tests reject invalid
  signature/size while not claiming Saved.
- [ ] Browser and unit tests prove uncertain PUT, finalize, lost capture
  response, repeated same-key retry, expired upload and authorization.
- [ ] Reconcile canonical 100-step checklist and all 50 pairs in issue #77
  with exact evidence, recording any unsupported cases honestly.
- [ ] Merge only with passing required CI, no bypass; verify merged-main CI
  and check final BG-18.100 only after that proof.

**Current verdict:** Implementation candidate, not accepted or deployed.
