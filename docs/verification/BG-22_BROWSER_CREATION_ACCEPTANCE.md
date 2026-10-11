# BG-22 browser creation and release acceptance

**Status:** IN PROGRESS, **not accepted**. Canonical tracking: [issue #85](https://github.com/anmolsansi/Recollect-Flow/issues/85); predecessor [BG-21 issue #83](https://github.com/anmolsansi/Recollect-Flow/issues/83).

## Objective and boundary

BG-22 is a full browser workflow acceptance of a deployable, same-origin Worker/Web release, not merely an API or Vite development-server test. It must prove public URL, text, personal note, PNG and PDF capture from browser UI through durable storage, search and exact detail, original inspection, metadata persistence, partial-success retries, optional-provider degradation, expired session recovery, direct-link navigation and logout denial. The expected completion criteria are [Build Guide §28](../RECOLLECTFLOW_BUILD_GUIDE.md#28-bg-22--close-priority-3-with-the-complete-browser-creation-story) and [BG-22's 100 actions](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-22--100-executable-microtasks).

**Acceptance dependency:** As of October 11, 2026, BG-21 source was merged into main at `b7536746b46d8703e620b3cc5e9f5c6f24327d38`, and merged-main CI passed run [#38140705905](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38140705905). However, BG-21 is still **91/100**: `.040`, `.044`, `.046`, `.059`, `.061`, `.062`, `.065`, `.077`, `.080` have explicitly unresolved/conditional release, HTTPS, browser and operator-route proof. The full BG-22 signoff cannot bypass those checks. Source merge and isolated HTTP simulation are not actual hosted HTTPS acceptance.

**No production authorization:** This work does not authorize production Cloudflare deployment, secrets changes, DNS changes, production D1 migration, real messaging, or real content. Any remote preview must be separately isolated and properly authorized. Do not use live owner data as a substitute for fixtures.

## Architecture and implementation

Keep existing [BG-21 one-artifact hosting](BG-21_WEB_HOSTING.md), [BG-16 browser capture](BG-16_FINAL_CLOSEOUT.md), [BG-17 retry](BG-17_FINAL_CLOSEOUT.md), [BG-18 upload](../RELEASE_ROADMAP.md#bg-18-browser-attachment-gate-completed-in-repository) and [BG-19 follow-up](BG-19_FOLLOW_UP_FIELDS.md) contracts unchanged.

- `scripts/verify-browser-creation.mjs` is a single **isolated local** bundled Worker/Chrome smoke matrix. It uses the real React form, Wrangler production-shaped asset binding, isolated local D1/R2, real cookie login and GET/PATCH/POST routes. It does not mock the application's own persistence.
- `scripts/bg21-preview-runtime.mjs` launches the local bundled Worker with synthetic credentials, a disposable persistence directory and non-production providers. It is **HTTP loopback**, not Cloudflare HTTPS.
- `scripts/browser-acceptance-fixtures.mjs` supplies deterministic synthetic PNG/PDF bytes and SHA-256 hashes.
- `npm run browser:creation:test` executes the combined matrix after `npm run release:package`. The GitHub CI workflow runs it after the package, dry-run and migration gates.
- Existing scripts cover finer-grained failure paths, but their past success does **not** by itself prove that all the BG-22 scenarios pass together on an authorized hosted candidate.

**Run locally** from a clean Node 22 checkout with Chrome and Wrangler available:

```bash
npm ci
npm run release:package
npm run browser:creation:test
```

The local test creates its own disposable Worker/D1/R2 profile and synthetic media. On error, it exits nonzero and logs a bounded recent API status summary. Successful stages print JSON records. They are not evidence of actual remote Cloudflare cookies or cache invalidation.

## Scenario evidence matrix

| Required boundary                                                                            | Existing source/automation                                                                   | BG-22 live result                                                                              |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fresh browser login, bundled health/assets, build identity                                   | `verify-web-hosting.mjs`, new combined script                                                | Pending exact-head run; hosted HTTPS blocked by BG-21                                          |
| URL, text, note created in real browser with reason/privacy and canonical IDs                | `verify-browser-capture.mjs`, new combined script                                            | Pending exact-head run                                                                         |
| PNG/PDF from picker through finalize/link and matching original SHA-256                      | `verify-browser-file-upload.mjs --bundled`, new combined script                              | Pending exact-head run                                                                         |
| Search supplied phrase and open exact detail after reload                                    | `verify-browser-workflow.mjs`, new combined script                                           | Pending exact-head run; internal extracted PNG/PDF phrases require actual acquisition evidence |
| Owner title, project and reminder survive reload; raw source unchanged                       | `verify-browser-follow-up.mjs`, new combined script (title)                                  | Pending exact-head run; full combined metadata matrix incomplete                               |
| Uncertain capture response, stable idempotency key and canonical duplicate event             | `verify-browser-recovery.mjs`, `verify-browser-capture.mjs`, new combined script (duplicate) | Combined uncertain response still pending                                                      |
| Follow-up PATCH failure after save retries only metadata                                     | `verify-browser-follow-up.mjs`                                                               | Pending bundled release and hosted proof                                                       |
| AI/Notion unavailable but raw saved/searchable, deferred processing truthful                 | Existing job/status suites                                                                   | BG-22 outage/recovery scenario not yet run                                                     |
| Expired session during pending upload, reauthenticate and resume once                        | BG-18 recovery code/suite                                                                    | BG-22 combined expired-session case not yet run                                                |
| Logged-out API read/write/download rejected, direct item link requires login                 | `verify-web-hosting.mjs`, new combined script                                                | Pending exact-head run; hosted HTTPS blocked by BG-21                                          |
| Full quality, migrations, release hash, browser version, clean preview, full artifact record | GitHub `ci.yml`, `web-release.mjs`                                                           | Pending exact-head CI and remotely hosted candidate                                            |

For evidence of browser search on PDF/screenshot **internal text**, do not treat the filename or reason as the extracted phrase. Require extraction completion or record the truthful pending/unavailable state. A successful raw upload may precede text extraction.

## Evidence required before signoff

Each executed run must record the release manifest's `source_revision`, `release_id`, `worker_entry_sha256`, Web asset list/hashes, browser version, runtime type, fixture identifiers, unique item IDs, HTTP status outcomes and sanitized failure/timeout diagnostics. Never record bearer tokens, session cookies, private content or real originals. Retain fixture hashes and compare downloaded bytes.

For the remote production-like pass, verify actual HTTPS `Secure`/`HttpOnly`/`SameSite` cookie attributes, resource cache semantics, fully isolated bindings, browser history/deep links, old/new artifact compatibility, and only the approved hosted preview. The test-only loopback suite is not evidence of those conditions.

On failure, identify the particular boundary (auth, save, follow-up, transfer, search, processing, caching or navigation), preserve canonical IDs and safe evidence, leave that checkbox open, and do not promote or merge as accepted. Restore only disposable test resources. No schema migration or destructive cleanup is part of BG-22.

## Verified local release checkpoint (October 11, 2026)

The [full CI run #38142920329](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38142920329)
passed at draft PR head `1863b19f8273c5c1c798c0028ea8d5a26d30b4b2`.
The GitHub Actions checkout tested its synthetic PR merge revision
`2ef444f27304704b8b1322ba1e1c95cd243f86c9`, not a live production release.
The deterministically packaged artifact reported release ID
`00f33582481453d574564714176bba8bc621ae0ee73447f2ff1b1289c1144db8`.
Node was `v22.23.3`, and the isolated local test used
`Chrome/154.0.8037.97` on `http://127.0.0.1`.

The same CI job passed formatting, ESLint, typechecking, repository unit and D1
tests, contract tests, Web lint/test/build, release-package tests, Wrangler
deployment dry-run, local D1 migration, BG-21 browser hosting, the new BG-22
combined creation script, and existing browser capture, upload, follow-up,
recovery, download, source recovery, workflow and acquisition suites.

The new five-source combined script emitted these successfully verified stages:

- Fresh profile and real owner login through the bundled Web UI.
- Public URL, personal text and personal note, then reason-based Inbox search
  and exact detail reopening for each.
- One synthetic PNG and one PDF through real file selection, initialized
  upload, finalization and canonical linking.
- Browser-downloaded PNG and PDF both matched original size and SHA-256.
- Owner title persisted after a hard reload.
- Sharing an existing canonical URL preserved its item identity and added a
  separate reason-bearing capture event.
- Logout denied item read, original download and unauthorized capture POST
  with HTTP `403`, `401` and `401` respectively. A direct item link prompted
  for login after logout.

The isolated fixtures and temporary resources were ephemeral. IDs in CI logs
are evidence of that single CI run, not production item identities.

This is **verified local production-shaped HTTP behavior**, not Cloudflare HTTPS
authorization, `Secure` cookie proof, provider-outage replay, dropped-response
retry, interrupted-upload session recovery, browser restart proof, or source
extraction search of image/PDF internal text. Those acceptance boundaries stay
open. BG-21's nine outstanding steps also remain gating.

## Completion decision

**NOT ACCEPTED / BG-23 BLOCKED.** The new bundled-browser acceptance test and full CI have passed locally, but this is not the required hosted release acceptance. BG-21 remains open, and hosted BG-22 acceptance plus the outstanding partial-failure scenarios require execution against an approved release candidate. Reconcile issue #85 and the source checklist only after validated proof, exact-head CI, merged-main CI and the predecessor gate.

## Reconciled existing CI evidence

The complete [packaged Worker CI run #38148456677](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38148456677)
passed with the combined five-source browser matrix, bundled BG-19 follow-up
metadata recovery, and bundled BG-17 lost-response and reauthentication
recovery. The scripts used isolated local D1/R2 resources and disposable Chrome
profiles. This run is local HTTP proof, **not** hosted Cloudflare acceptance.

The verified existing actions are grouped by their actual proof boundaries:

- `BG-22.011–.020`: release manifest and Worker/Web candidate,
  isolated D1/R2, synthetic media, fresh unauthenticated Chrome, health,
  asset routing, real persistence, and runtime version.
- `BG-22.021–.028`: browser-created URL/text/note, PNG/PDF file picker,
  logged canonical IDs, durable Saved state, and checked source types.
- `BG-22.036`: all five exact saved items open in the browser.
- `BG-22.041–.045`, `.048`: browser-downloaded original PNG/PDF checksums,
  editable title, and hard reload.
- `BG-22.051–.058`, `.060`: bundled browser recovery test injects an
  actual dropped capture response after server commit, retains and retries
  the same logical operation, and verifies its single canonical ID. The
  combined test preserves a separate canonical duplicate reason event.
  Bundled BG-19 acceptance confirms owner metadata isn't overwritten.
- `BG-22.077`: the signed-out direct item route requires login.
- `BG-22.083–.084`: Wrangler Worker dry-run and paired Web build in CI.
- `BG-22.088–.090`: disposable process cleanup, this result matrix,
  and unresolved production qualifications.

The additional full-revision search, metadata persistence, browser-restart,
remote HTTPS, provider outage, file-transfer interruption and image/PDF
extraction tests remain distinct gates until their own exact-head proof
passes. Do not infer image OCR or PDF text search from a successful file
checksum or a search for the user-supplied filename/reason.
