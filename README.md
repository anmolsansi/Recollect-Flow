# RecollectFlow

RecollectFlow is a private, zero-cost-first capture and recall system. The current release slice provides a Cloudflare Worker API, a Vite web app, D1 persistence, attachment storage, policy controls, search, recovery/export tooling, and the verification paths documented under `docs/`.

## Local development

Use Node.js 22 or newer and run commands from the repository root.

### 1. Install dependencies and create local-only credentials

```bash
npm ci
cp .dev.vars.example .dev.vars
```

`.dev.vars.example` contains dummy local values such as `local-capture-token`, `local-admin-token`, and `local-worker-token`. Keep real credentials out of the repository and do not replace the example with production secrets.

### 2. Prepare the local Worker database

```bash
npm run db:migrate:local
```

Wrangler keeps local development state under the repository's `.wrangler/state` area. The local migration command prepares that local D1 state. It does not apply the remote production database migrations.

### 3. Start the API in terminal 1

```bash
npm run dev:api
```

The Worker API listens on `http://localhost:8787` by default. Keep this process running while using the web app.

### 4. Start the web app in terminal 2

```bash
npm run dev:web
```

Vite serves the web app on its local development port and proxies `/api` requests to `http://localhost:8787`. If the Worker is not running, browser API requests through the web app will fail even if the Vite page itself loads.

## Quick API check

With `npm run dev:api` running, create a local capture using the dummy capture token:

```bash
curl -X POST http://localhost:8787/api/v1/captures \
  -H 'Authorization: Bearer local-capture-token' \
  -H 'Content-Type: application/json' \
  -d '{"idempotency_key":"demo-capture-0001","source_type":"url","source_app":"manual","url":"https://example.com/?utm_source=test","captured_at":"2026-07-18T12:00:00.000Z","client":{"name":"curl","version":"1.0"}}'
```

## Release smoke verifier

The release verifier is a verification tool, not a deployment command. It creates uniquely marked synthetic records and reports named stages as passed, failed, or unavailable. Known later-stage product gaps remain visible rather than being counted as successful smoke coverage.

For the local Worker:

```bash
WORKER_BASE_URL=http://localhost:8787 \
CAPTURE_TOKEN=local-capture-token \
ADMIN_TOKEN=local-admin-token \
node scripts/verify-production-release.mjs
```

A non-local target is rejected unless the run is explicitly opted in:

```bash
ALLOW_REMOTE_SMOKE=true \
WORKER_BASE_URL=https://your-explicit-worker.example \
CAPTURE_TOKEN='...' \
ADMIN_TOKEN='...' \
node scripts/verify-production-release.mjs
```

The verifier prints the safe target origin before mutating requests. Do not set `ALLOW_REMOTE_SMOKE=true` casually. The default smoke flow does not perform permanent purge or clean-target restore operations.

## Quality gate

Run the repository quality gate before opening or merging implementation work:

```bash
npm run check
npm run db:migrate:local
```

`npm run check` chains formatting, lint, TypeScript, root tests, shared-contract checks, web lint/tests, and the web production build with `&&`. It stops at the first failing command, so fix that failure before treating later checks as verified.

## Product and engineering documentation

The complete product knowledge base lives in [`docs/README.md`](docs/README.md). It covers current and future use cases, requirements, architecture, APIs, data, mobile capture, Notion, AI/RAG, security, operations, testing, risks, launch, productization, decisions, sources, traceability, and delivery tickets. [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) separately identifies what is implemented today.
