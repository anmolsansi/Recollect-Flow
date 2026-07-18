# Exact ticket execution order

This is the canonical one-ticket-at-a-time queue. Pick the first incomplete ticket whose prerequisites are satisfied. Do not choose by issue number. A ticket advances only after its acceptance criteria, tests, documentation, and Linear evidence pass.

## Already completed

| Done | Ticket  | Outcome                                                |
| ---- | ------- | ------------------------------------------------------ |
| ✓    | OPE-213 | Full product scope and non-goals locked                |
| ✓    | OPE-215 | Repository and local/CI workflow bootstrapped          |
| ✓    | OPE-216 | Durable D1 schema and migrations implemented           |
| ✓    | OPE-217 | Authenticated raw-first idempotent capture implemented |

## Pick in this exact order

|   # | Ticket                                                                                                | Type                 | Why it comes here / exit gate                                                                                |
| --: | ----------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
|   1 | **OPE-214 — Create and secure required free-tier service accounts**                                   | Human gate           | Provision Cloudflare/Notion/Telegram resources and secrets without billing; unblocks real integrations       |
|   2 | **OPE-218 — Implement URL normalization and duplicate detection**                                     | Build                | Finish conservative cross-key duplicate behavior while the capture contract is small                         |
|   3 | **OPE-224 — Approve sensitivity classification and AI provider routing policy**                       | Human/architect gate | Freeze Public/Personal/Sensitive/Unknown routing before provider implementation                              |
|   4 | **OPE-249 — Implement private R2 attachment upload and lifecycle**                                    | Build                | Required before image/PDF/file Shortcut completion, extraction, deletion, and recovery                       |
|   5 | **OPE-246 — Implement reusable processing jobs, leases, retries, and recovery**                       | Build                | Shared async foundation for Notion, extraction, AI, digest, and Ollama                                       |
|   6 | **OPE-219 — Build and validate the iPhone Share Sheet Shortcut**                                      | Human + build        | Complete real URL/text/image/file capture on the owner’s iPhone                                              |
|   7 | **OPE-220 — Design the Notion knowledge inbox and review workflow**                                   | Human/architect gate | Approve properties, views, editable-field policy, and authority boundary                                     |
|   8 | **OPE-221 — Implement retry-safe Notion synchronization worker**                                      | Build                | Uses the approved Notion schema and reusable job framework                                                   |
|   9 | **OPE-222 — Implement provider-independent AI enrichment pipeline**                                   | Build                | Starts after routing policy and job framework; raw data remains independent                                  |
|  10 | **OPE-223 — Implement multimodal extraction for screenshots, PDFs, and shared files**                 | Build                | Uses durable R2 objects, jobs, and approved provider routing                                                 |
|  11 | **OPE-225 — Add D1 FTS5 indexing and knowledge search API**                                           | Build                | Makes the corpus recoverable without RAG or Notion                                                           |
|  12 | **OPE-248 — Build the recovery-capable Web Inbox and item review interface**                          | Build                | Integrates review, coverage, FTS, edits, lifecycle, feedback, and Notion-outage recovery                     |
|  13 | **OPE-226 — Build daily digest and weekly review jobs**                                               | Build                | Uses stable items, search, Notion links, jobs, and Telegram resources                                        |
|  14 | **OPE-227 — Add quota tracking, provider circuit breakers, and zero-cost guards**                     | Build                | Proves optional work stops before billing while capture/search remain available                              |
|  15 | **OPE-228 — Implement backup, export, deletion, and recovery workflows**                              | Build                | Covers D1, R2, FTS, Notion, and portable restore after contracts stabilize                                   |
|  16 | **OPE-247 — Complete V1 security, observability, and operational hardening**                          | Build/review         | Consolidated auth, logging, dashboard, incidents, privacy, deletion-freshness, and runbook gate              |
|  17 | **OPE-229 — Run end-to-end V1 acceptance test on real devices and approve launch**                    | Human launch gate    | Actual iPhone and failure/recovery/cost test; V1 is not complete before this passes                          |
|  18 | **OPE-250 — Run post-V1 friction review and approve V1.1 improvements**                               | Human/product gate   | Two-week real-use evidence; fix P0 friction and approve only measured V1.1 changes                           |
|  19 | **OPE-230 — Define RAG answer policy, source trust, and launch metrics**                              | Human/architect gate | Starts after V1/V1.1 gates and 100 useful captures; freezes RAG truth policy                                 |
|  20 | **OPE-231 — Extend the data model for chunks, embeddings, conversations, and citations**              | Build                | Creates versioned RAG provenance structures after policy approval                                            |
|  21 | **OPE-232 — Implement source-aware content versioning and chunking**                                  | Build                | Produces stable citation-ready chunks from approved extracted sources                                        |
|  22 | **OPE-233 — Implement replaceable embedding generation and vector indexing**                          | Build                | Idempotent, versioned, quota-aware indexes over approved chunks                                              |
|  23 | **OPE-234 — Build hybrid lexical and vector retrieval with metadata filters**                         | Build                | Combines proven FTS with vectors while applying privacy filters                                              |
|  24 | **OPE-235 — Add deduplication, diversity selection, source trust, and reranking**                     | Build                | Prevents repost confidence and selects trustworthy diverse evidence                                          |
|  25 | **OPE-236 — Implement the RAG query API and bounded context assembly**                                | Build                | Creates injection-safe, token-bounded evidence packages with citation IDs                                    |
|  26 | **OPE-237 — Generate grounded answers with citations, conflicts, and insufficient-evidence behavior** | Build                | Validates every factual block against supplied saved evidence                                                |
|  27 | **OPE-239 — Build the RAG evaluation harness and regression suite**                                   | Build                | Adds a quality gate before UI/model approval                                                                 |
|  28 | **OPE-238 — Build the Ask RecollectFlow conversational recall interface**                             | Build                | Presents answer states, citations, sources, filters, and fresh retrieval per turn                            |
|  29 | **OPE-240 — Curate the personal RAG gold question set and approve model choices**                     | Human gate           | Supplies representative questions and explicit model/config approval                                         |
|  30 | **OPE-241 — Implement local Ollama embeddings and private RAG fallback**                              | Build                | Adds the approved restricted-content and hosted-quota-overflow path                                          |
|  31 | **OPE-242 — Add RAG caching, quota controls, observability, and audit trails**                        | Build                | Finalizes invalidation, explainability, cost, resilience, and operational controls                           |
|  32 | **OPE-243 — Run Personal Knowledge RAG acceptance testing and approve V1.5**                          | Human launch gate    | Recall, citations, refusal, conflicts, privacy, deletion, outages, cost, and owner go/no-go                  |
|  33 | **OPE-244 — Evaluate and approve conditional V2 expansion capabilities**                              | Human discovery gate | Approve/defer/reject browser, context, multimodal, transcription, or secondary clients using measured demand |
|  34 | **OPE-245 — Evaluate V3 active knowledge and public productization**                                  | Human discovery gate | Requires mature value; public SaaS needs a separate tenancy/legal/billing/support PRD                        |

## How to execute each ticket

1. Open only the next ticket plus `repo_context.md` and the domain specs it names.
2. Confirm every blocker is Done and run the premium ticket-intake checklist; any FAIL returns to planning.
3. Move the ticket to In Progress and implement only its declared scope.
4. Run targeted tests, the full repository gate, and the ticket’s manual/device/integration QA.
5. Review security, privacy, error states, data loss, cost, observability, and scope drift.
6. Update repository docs, traceability, build status, and Linear with exact evidence.
7. Move to Done only when acceptance is proven; then pick the next numbered ticket.

## Parallel-work exception

The table is the safest strict serial sequence. Parallel work is allowed only when every blocker is Done and contracts do not overlap. Human gates are never simulated or skipped. OPE-229, OPE-243, OPE-244, and OPE-245 remain explicit owner decisions.
