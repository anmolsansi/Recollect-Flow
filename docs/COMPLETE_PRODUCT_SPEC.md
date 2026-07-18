# RecollectFlow complete product specification

## Document control

- Product: RecollectFlow
- Product owner and launch user: Anmol Sansi
- Source baseline: PRD v1.1 RAG, 2026-07-16
- Deployment model: personal, single-user, cloud-assisted, local-AI-capable, cited-RAG-capable
- Cost policy: $0 within free tiers; no silent billable usage
- System of record: Cloudflare D1
- Attachment authority: private Cloudflare R2
- Review surface: Notion plus a recovery-capable web interface
- Primary capture: Apple Shortcut in the iOS Share Sheet

## Product definition

RecollectFlow is a universal personal capture, recall, and grounded question-answering system. It accepts useful information from Instagram, websites, YouTube, LinkedIn, Reddit, notes, screenshots, PDFs, files, and user-provided recordings. The user shares an item, optionally records why it matters, and receives confirmation as soon as the original is durable.

It is not an Instagram bookmarker, generic chatbot, proprietary note silo, or automatic scraper. It converts fragmented consumption into searchable, reviewable, reusable knowledge while preserving the original source and the user’s intent.

## Vision and brand promise

RecollectFlow becomes the trusted intake layer for external knowledge and personal observations: what was saved, why it mattered, how it relates to current work, and when it should resurface.

> Save anything. Recollect it when it matters.

## Non-negotiable product principles

1. **Capture before intelligence:** persist the original before fetch, OCR, AI, sync, embedding, or generation.
2. **One universal entry point:** capture must not require choosing a database or folder.
3. **Intent over metadata:** a short personal reason can outweigh a long generated summary.
4. **AI suggests; the user owns truth:** derived fields are editable and never replace raw source fields.
5. **Free-tier failure is normal:** providers are replaceable and optional stages may pause.
6. **Resurfacing beats hoarding:** useful recollection matters more than item count.
7. **Privacy is routed:** classification precedes external processing.
8. **Coverage is visible:** the system states exactly what content was available.
9. **Exact retrieval first:** semantic systems follow proven capture and lexical search.
10. **Portability always:** the owner can export and migrate the complete corpus.

## Launch persona

The launch user is a high-volume consumer of technology, career, business, lifestyle, project, and creator information. Most discovery happens on mobile; project work happens on a Mac. The user is comfortable configuring tools but daily capture, review, and recall must not require developer actions. The product must work without committing money to APIs or subscriptions.

Representative active contexts include multi-agent workflows, AI products, job search, content creation, SaaS research, business research, purchasing, travel, and personal reference.

## Jobs to be done

- Save useful content from the system Share menu without interrupting the current task.
- Preserve why an item matters with minimal text or dictation.
- Recover a vague memory without knowing the source, title, or exact words.
- See material related to an active project and reuse prior learning.
- Review a manageable daily/weekly subset instead of maintaining a storage graveyard.
- Continue capturing and retrieving when AI, Notion, the Mac, or a provider is unavailable.
- Keep private material local or unprocessed rather than exchanging privacy for free AI.
- Ask grounded questions across saved knowledge and inspect the exact supporting sources.

## Complete use-case universe

The approved use cases are detailed in [USE_CASES_AND_FLOWS.md](USE_CASES_AND_FLOWS.md): universal URL/text capture, Instagram URL capture, screenshot OCR, PDF/file capture, manual/voice notes, vague-memory recovery, daily review, failed-enrichment recovery, grounded Q&A, source comparison/conflict, honest no-answer, private local processing, project briefings, calendar-aware resurfacing, browser/Android capture, and eventual multi-user productization.

## Product surfaces

- **iOS Shortcut:** primary universal capture and immediate status.
- **Responsive web capture:** secondary manual capture and recovery path.
- **Web Inbox:** authoritative review/search fallback when Notion is unavailable.
- **Notion workspace:** familiar Inbox, project, review, digest, and cold-storage views.
- **Search:** exact FTS5 and filters first; hybrid lexical/vector retrieval later.
- **Ask RecollectFlow:** V1.5 cited question answering over saved evidence only.
- **Telegram:** optional link-oriented digest notification.
- **Local worker:** Ollama-based private and quota-overflow extraction, embedding, and answering.
- **Operations console:** processing status, failures, quotas, storage, sync lag, backup, and recovery.

## Release horizons

- **V0:** technical spike proving authenticated Worker/D1 capture without AI.
- **V1:** reliable universal capture, private attachments, processing, review, FTS search, daily digest, security, export, backup, and recovery.
- **V1.1:** observed-friction improvements such as quick categories, voice reason, better Instagram guidance, retries, weekly review, cold storage, and conditional Android capture.
- **V1.5:** Personal Knowledge RAG, local private processing, hybrid retrieval, citations, conversations, evaluation, and zero-cost fallbacks.
- **V2:** conditional local multimodal processing, browser extension, calendar/project context, and richer capture clients.
- **V3:** knowledge relationships, project briefings, proactive contextual resurfacing, forgetting-curve review, and optional productization exploration.

Entry gates and the complete phase plan are defined in [RELEASE_ROADMAP.md](RELEASE_ROADMAP.md).

## V1 capability scope

V1 supports URL, shared text, screenshot/image, PDF/file, and manual note inputs. Capture clients include the iOS Shortcut and responsive web capture. Backend responsibilities include authentication, validation, idempotency, immediate raw persistence, private attachment storage, retryable processing, deterministic extraction, policy-routed enrichment, Notion projection, Web Inbox, FTS5 search/filtering, lifecycle review, a daily digest, quota controls, observability, export, deletion, backup, and restore.

V1 does not require perfect social-media extraction, paid AI, native apps, multiple users, knowledge graphs, semantic search, or a conversational assistant.

## Future capability scope

Future approved capabilities include Android capture when justified, audio/recording transcription for user-provided lawful files, semantic retrieval, cited RAG answers, private local embeddings/generation, browser capture, calendar/project context, source relationships, contradiction/update tracking, contextual briefings, proactive reminders, spaced review, and a public product only after a separate productization decision.

## Information model

Every capture is an Item. An Item may own attachments, source and derived content versions, processing jobs, sync attempts, tags, project links, review dates, retrieval events, and audit events. Original input and user reason are immutable evidence fields. Corrections create new derived values and history. Future RAG adds chunks, embeddings, index versions, retrieval runs, conversations, answers, and citations; all remain rebuildable derivatives of source items.

The exact model is defined in [DATA_MODEL.md](DATA_MODEL.md).

## AI and retrieval policy

Deterministic parsing precedes AI. Provider selection considers sensitivity, modality, quota, and availability. Workers AI is the hosted default within approved free allocation. Ollama is the private/quota-overflow path. Optional Gemini use is restricted to explicitly approved public content. Enrichment must be structured, grounded to supplied content, coverage-aware, versioned, and safe to reject.

V1 search is D1 FTS5 plus structured filters. V1.5 combines lexical and vector candidates, metadata/privacy filters, deterministic fusion, duplicate control, source diversity, optional reranking, bounded context, and validated citations. A model may not silently supplement saved evidence with general knowledge.

## Instagram promise

RecollectFlow reliably saves an Instagram URL and the user’s reason. Public metadata may be captured when officially available. A user-provided screenshot can preserve visible text; a lawful user-provided recording may be processed in a later release. The product never promises reliable access to Reel audio/video, private/login-gated content, comments, overlays, music, or full creator context. Coverage badges prevent URL-only or caption-only items from being represented as fully analyzed.

## Success measures

| Metric                                      | Target                      |
| ------------------------------------------- | --------------------------- |
| Durable capture success                     | ≥99%                        |
| Capture acknowledgement, excluding upload   | P95 ≤2 seconds              |
| Raw preservation through enrichment failure | 100%                        |
| Exact duplicate URL recognition             | ≥95%                        |
| Search sessions opening a relevant item     | ≥70% after month one        |
| Eligible daily digest delivery              | ≥98%                        |
| Items reviewed within seven days            | ≥50%                        |
| AI title/project correction rate            | Track baseline; target <25% |
| Actual vendor spend                         | $0                          |
| V1.5 retrieval Recall@5                     | ≥85%                        |
| V1.5 citation precision                     | ≥95%                        |
| V1.5 citation coverage                      | ≥90%                        |
| V1.5 insufficient-evidence accuracy         | ≥90%                        |
| V1.5 useful answer sessions                 | ≥70% after month one        |

The north-star metric is useful recollections per week: items opened from search, project view, digest, or answer citations and marked useful, acted upon, or still relevant.

## Guardrails

- No hidden paid billing requirement for core capture/retrieval.
- No private/sensitive item sent to an unapproved external provider.
- No provider failure deletes or replaces raw source data.
- No digest sends full sensitive content to external messaging.
- No RAG answer represents outside knowledge as saved-corpus evidence.
- No factual answer block lacks a resolvable citation unless clearly non-factual navigation.
- No deleted or newly restricted source remains in retrieval or valid answer caches.
- No platform access control, bot protection, or content right is bypassed.

## Kill or simplify criteria

Simplify to Share-to-Notion or Share-to-Telegram if, after sustained trial, the owner saves fewer than five useful items per week, continues using old save destinations despite friction fixes, ignores weekly review, cannot demonstrate useful search/recollection, or spends more maintenance effort than the recovered knowledge is worth. More AI is not the answer to an unused capture/review habit.
