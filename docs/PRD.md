# PRD: RecollectFlow

This premium-product-builder PRD is the implementation-oriented contract. The complete lifecycle specification, future use cases, and all supporting domain documents are indexed in [README.md](README.md) and [COMPLETE_PRODUCT_SPEC.md](COMPLETE_PRODUCT_SPEC.md).

## 1. Problem

Useful links, notes, screenshots, and files are scattered across apps. Saving is inconsistent, context is lost, and retrieval requires remembering where an item was placed. RecollectFlow must make capture dependable before making recall intelligent.

## 2. Users

V1 serves one owner using an iPhone and a private Cloudflare/Notion stack. The same owner acts as capturer, reviewer, and administrator. Multi-user collaboration is not part of V1.

## 3. Goals

- Capture a supported item in seconds from the iOS Share Sheet.
- Make D1 the durable source of truth before enrichment or sync.
- Keep recurring infrastructure cost at zero within free tiers.
- Provide a clear review inbox and useful search/resurfacing.
- Preserve privacy with explicit routing and private object storage.

## 4. Non-Goals

No native mobile app, browser extension, automatic Instagram/private-account scraping, automatic video downloading, multi-user workspaces, knowledge graph, autonomous actions, paid infrastructure, or RAG in V1.

## 5. V1 Scope

Inputs are URL, shared text, manual note, screenshot/image, and PDF/file. The first client is an iPhone Shortcut. Backend scope includes authenticated idempotent capture, D1 records, private R2 attachments, retryable jobs, safe extraction/enrichment, Notion review sync, FTS5 search, resurfacing, export/deletion/recovery, and observability. Telegram is the initial digest target.

V1 sentence: “Share something from iPhone, know it was saved, and find or review it later.”

## 6. Future Scope (V2+)

V1.5 adds Personal Knowledge RAG only after V1 acceptance passes and 100 useful captures exist. Later candidates include additional capture clients, audio, screen recordings, semantic recommendations, knowledge graphs, and multi-user support.

## 7. User Flows

1. User shares an item, optionally adds reason/category, and submits.
2. API authenticates, validates, and durably saves the raw record.
3. API schedules independent enrichment/sync jobs and immediately confirms save.
4. User reviews in Notion, searches the knowledge store, or receives a digest.
5. User can export, soft-delete, restore, or permanently delete with confirmation.

## 8. Roles & Permissions

The capture client holds a capture-only token. The owner/admin token can use future read, retry, export, and deletion operations. External providers receive only the minimum allowed content under the sensitivity policy.

## 9. Data Model (conceptual)

`Item` owns the original capture and derived fields. `Attachment` references a private R2 object. `ProcessingJob` and `SyncAttempt` provide independent retry histories. `ProviderUsage` records provider operations/cost estimates. `AuditEvent` records significant state changes. Future `Chunk`, `Embedding`, `Conversation`, and `Citation` entities are V1.5 only.

## 10. APIs (conceptual)

- `POST /api/v1/captures`: capture URL/text/note now; file-init/upload is a later M1 ticket.
- `GET /api/v1/items` and `GET /api/v1/items/:id`: owner retrieval.
- `/api/v1/search`, `/api/v1/jobs`, `/api/v1/exports`, and deletion endpoints arrive in their gated milestones.
- New capture returns `201`; exact idempotent replay returns `200`; invalid input returns structured `4xx`; unavailable storage returns retry-safe `503`.

## 11. Frontend Requirements

The iOS Shortcut is the V1 capture UI. It must accept Share Sheet inputs, collect optional context, submit a stable idempotency key, and show Saved / Already saved / Retry states. Notion is a review surface, never the source of truth.

## 12. Backend Requirements

Persist raw input before downstream work; separate capture/admin credentials; reject unknown fields; enforce size/type limits; use private R2; retain retry history; protect sensitive content; log request IDs without secrets; expose dependency-aware health; and provide tested migrations and recovery guidance.

## 13. Micro-Architecture Systems

MAS-1 Capture API; MAS-2 durable data model; MAS-3 attachment intake; MAS-4 extraction; MAS-5 sensitivity/provider routing; MAS-6 enrichment jobs; MAS-7 Notion sync; MAS-8 FTS search; MAS-9 resurfacing; MAS-10 export/deletion/recovery; MAS-11 observability; MAS-12 V1.5 RAG.

## 14. Success Metrics

- At least 95% of supported shares save on the first attempt during V1 trial.
- Idempotent retry creates zero duplicate raw items.
- Capture acknowledgement is independent of AI/Notion availability.
- At least 100 useful captures exist before RAG work starts.
- Owner can retrieve a known item and recover from documented failure modes.

## 15. Risks

Free-tier ceilings, platform/API changes, iOS Shortcut limitations, unsafe content extraction, privacy leakage to AI providers, Notion drift, false duplicate matches, and premature RAG complexity. Mitigations are explicit boundaries, provider-independent jobs, conservative normalization, private storage, usage tracking, and milestone gates.

## 16. Open Questions

- Which production Cloudflare, Notion, and Telegram accounts/resources will the owner provision?
- What exact file-size ceiling fits the selected free tiers?
- Which content classes may leave local/private infrastructure for AI processing?
- Does Telegram remain the digest channel after the first V1 trial?
