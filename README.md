# RecollectFlow

RecollectFlow is a private, zero-cost-first capture and recall system. The current release slice provides a Cloudflare Worker API that durably records a URL, text, or note in D1 before any enrichment work is scheduled.

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Create a capture:

```bash
curl -X POST http://localhost:8787/api/v1/captures \
  -H 'Authorization: Bearer local-capture-token' \
  -H 'Content-Type: application/json' \
  -d '{"idempotency_key":"demo-capture-0001","source_type":"url","source_app":"manual","url":"https://example.com/?utm_source=test","captured_at":"2026-07-18T12:00:00.000Z","client":{"name":"curl","version":"1.0"}}'
```

Run the quality gate:

```bash
npm run check
```

The complete product knowledge base lives in [`docs/README.md`](docs/README.md). It covers all current and future use cases, V0 through V3+, requirements, architecture, APIs, data, mobile capture, Notion, AI/RAG, security, operations, testing, risks, launch, productization, decisions, sources, traceability, and delivery tickets. [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) separately identifies what is implemented today.
