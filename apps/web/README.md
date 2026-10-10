# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Browser capture (BG-16)

After signing in with the owner session, choose **Save something** from Inbox
(or visit `/capture`). Choose Web link, Pasted text, or Note, then enter the
appropriate source. The separate optional reason describes _why_ the owner
saved it and is never combined with source text. Category is optional.

Privacy defaults to **Unknown**, which does not authorize hosted AI processing.
Personal processing needs separate consent; Sensitive is protected by server
policy. URL capture saves the bookmark even if fetching or extracting the
source later fails. Saving is durable independently of AI and Notion.

The Web client posts the strict `POST /api/v1/captures` contract through its
existing cookie-authenticated API helper. A successful response links directly
to the canonical item, shows replay/duplicate reuse accurately, and displays
processing as an independent state.

If a request fails with an uncertain outcome, the form preserves the exact
submitted payload, original capture time, privacy choice and idempotency key for
**Retry original**. Do not modify a submitted operation. **Start new operation**
creates a different draft while keeping the old retry visible. **Discard local
retry** clears only browser state, not a server item that might have saved.

## Browser capture recovery (BG-17)

Cross-reload recovery is **off by default**. The owner can opt into **Keep
unfinished captures on this device for up to seven days** on the capture screen.
Opted-in drafts are written to versioned IndexedDB before each request. The
browser stores URLs, text, reasons, metadata and retry keys without encryption.
Do not opt in on shared devices. No administrator token, auth cookie, original
file bytes or Sensitive capture is stored by this feature. An explicit logout
clears stored operations and the preference. Turning the option off also clears
the store. Storage may be unavailable, and cleanup is not a guaranteed backup
or remote deletion.

Up to **three** operations and **256 KB** of serialized capture recovery may
remain on this device. Expired or malformed records are discarded when opened.
Quota failures are shown and the active submission remains retryable in memory
while the page is open. A lost response does not imply Saved. Once a canonical
response is received, its retry record is cleared. On an expired session, sign
in again and retry the unchanged operation. There is no background retry loop.

BG-17 covers URL, pasted text and note submissions. BG-18 owns the actual
file upload flow, hash/reselection and resumable server attachment references.
Do not interpret the optional metadata record type as implemented file recovery.
Physical-iPhone offline retention is separately gated by BG-36. No production
deployment is implied.

Focused checks: `npm run web:test`, `npm run web:build`, and
`npm run browser:recovery:test` with local Worker/D1 and Chrome installed.
The last test attempts loss of response after D1 commit, reload/replay with
the same server capture ID, offline-before-send recovery, and nonpersistent
mode clearing. The repository CI workflow runs this alongside BG-16 browser
acceptance.

Run `pnpm --filter web test` and `pnpm --filter web build` from the repo root
to verify its validators and TypeScript build. Live-browser durability and
optional-provider outage tests require the normal isolated Worker/D1 acceptance
environment; a passing unit test alone does not prove the capture was saved.
