# Architecture Plan: RecollectFlow

## 1. Stack Decisions

Cloudflare Worker + Hono + Zod + TypeScript; D1 as the system of record; private R2 for binary objects; Notion for review; D1 FTS5 for V1 search; Workers AI when policy permits and Ollama as a local fallback. RAG infrastructure is absent until V1.5 gates pass.

## 2. Frontend Architecture

V1 capture is an iOS Shortcut, not a web app. It sends an idempotency key and supported payload to the API and maps `201`, `200`, structured `4xx`, and retryable failures to clear user messages. Notion presents review data copied from D1.

## 3. Backend Architecture

Routes authenticate and validate, services own use-case ordering, repositories isolate D1, and integrations sit behind provider-neutral ports. `CaptureService` saves first and schedules second. A failed scheduler is observable but cannot erase the saved item.

## 4. Database Architecture

`items` is authoritative. Unique idempotency keys make retries safe. Attachments, jobs, sync attempts, provider usage, and audit events are normalized child records. Indexed canonical URLs/hashes support conservative deduplication. Soft deletion precedes explicit permanent deletion.

## 5. API Architecture

Versioned `/api/v1` JSON endpoints use stable envelopes and request IDs. The capture contract is frozen in `docs/tickets/OPE-217.md`. File intake will use a two-step metadata/upload contract rather than large JSON bodies.

## 6. Auth & Permissions

Worker secrets hold separate capture/admin bearer tokens. Capture token may only create captures. Admin token will protect read, retry, export, and deletion operations. Constant-time comparisons reduce token timing leakage.

## 7. Background Jobs

Durable D1 job rows are the coordination record. Extraction, classification, enrichment, and sync are independent, retryable stages with attempt counts and error codes. Provider outages never roll back the raw item.

## 8. File Storage

Private R2 objects use opaque keys; D1 stores metadata and hashes. Content type, signature, and size are validated before processing. Signed access is short-lived and admin-only. Deletion is explicit and audited.

## 9. Integrations

Notion is an eventually consistent projection with retry-safe page IDs. Telegram receives digests, not authority-bearing records. AI providers implement a common enrichment contract and receive content only after sensitivity routing.

## 10. Observability

Structured events include request ID, item ID, stage, status, and safe error code; never bearer tokens or raw sensitive text. Health checks report API/D1 and later integration readiness. Usage and retry tables support free-tier monitoring.

## 11. Deployment Assumptions

One Cloudflare account, one Worker, one D1 database, one private R2 bucket, and free-tier integrations. CI requires no production secrets. Production deployment remains blocked until human-owned resources and secrets exist.

## 12. System Boundaries & Contracts

D1 owns items and state; R2 owns bytes; Notion owns only its projection; the Shortcut owns transient user input; external AI owns no canonical data. Contract changes require a documented compatibility decision, migration impact, test change, and Linear update.

## 13. Parallelization Map

After M1 contracts pass: Shortcut and attachment work may proceed in parallel; Notion schema approval precedes sync; provider policy precedes enrichment; FTS can proceed after stable items; backup/deletion follows stable storage. RAG is serially gated behind the entire V1 acceptance suite plus 100 useful captures.

## 14. Risk Register

| Risk                                | Control                                    |
| ----------------------------------- | ------------------------------------------ |
| Capture lost during provider outage | Save item before scheduling/integrations   |
| Retry creates duplicates            | Unique idempotency key and replay response |
| Sensitive content leaks             | Explicit privacy class and provider policy |
| Notion becomes authority            | One-way projection from D1                 |
| Rollback SQL auto-applies           | Keep rollback scripts outside `migrations` |
| Scope expands into RAG              | M6 gate and no V1 embedding tables         |
