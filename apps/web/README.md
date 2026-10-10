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
appropriate source. The separate optional reason describes *why* the owner
saved it and is never combined with source text. Category is optional.

Privacy defaults to **Unknown**, which does not authorize hosted AI processing.
Personal processing needs separate consent; Sensitive is protected by server
policy. URL capture saves the bookmark even if fetching or extracting the
source later fails. Saving is durable independently of AI and Notion.

The Web client posts the strict `POST /api/v1/captures` contract through its
existing cookie-authenticated API helper. A successful response links directly
to the canonical item, shows replay/duplicate reuse accurately, and displays
processing as an independent state.

If the network or server fails without a conclusive result, the form retains
the *exact submitted payload and idempotency key* for Retry. To modify that
submission, choose **Start new operation**, recognizing that the first may
already have saved. This is **in-memory only**. Persistent draft recovery and
resolving uncertain operations across reloads belong to BG-17. Browser file
attachments are BG-18. No production deployment is included in BG-16.

Run `pnpm --filter web test` and `pnpm --filter web build` from the repo root
to verify its validators and TypeScript build. Live-browser durability and
optional-provider outage tests require the normal isolated Worker/D1 acceptance
environment; a passing unit test alone does not prove the capture was saved.
