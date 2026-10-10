# Complete release and development roadmap

## Roadmap rules

Every phase ends with a user-demonstrable gate. Infrastructure does not count as progress when the real workflow remains unusable. A failed gate blocks dependent work. `BUILD_STATUS.md` is the source for current completion.

## BG-11 acceptance gate (V1 extraction recovery)

**Completed on merged `main`.** BG-11 builds on BG-08 through BG-10
and provides owner recovery for unavailable pages. Its acceptance gate verified
retained bookmarks, distinct fetched/owner coverage, bounded idempotent retries,
source-revision race protection, opt-in legacy reprocessing capped at 20 items,
and a keyboard-accessible Web recovery action in real isolated Chrome.

[PR #54](https://github.com/anmolsansi/Recollect-Flow/pull/54) merged at
`dfb8af789a27ef5a3732c20955c1684341bd5c5d` and
[merged-main CI passed](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37981181748).
The [final closeout](verification/BG-11_FINAL_CLOSEOUT.md) documents 99
completed checklist steps and the explicit BG-12 assignment for `BG-11.028`.

**BG-11 and BG-12 are verified prerequisites. BG-13's atomic
persistence integration is now merged and CI verified.** BG-14 is the
next browser acceptance gate. Production deployment, real Instagram
capture and real private content testing remain separate V1 release gates.

## BG-12 aggregate-state contract (merged and CI verified)

BG-12 has formalized and verified the deterministic four-value item
processing status decision with tested required-stage, lease, future retry,
optional work, limited coverage, old-generation and attachment failure rules.
[PR #57](https://github.com/anmolsansi/Recollect-Flow/pull/57) merged, and
[merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37990069598)
passed. [Final closeout](verification/BG-12_FINAL_CLOSEOUT.md): 100/100 contract tasks, BG-13 unlocked.
[Detailed contract](verification/BG-12_AGGREGATE_STATE_CONTRACT.md).
The BG-12 helper alone did not fix persisted runtime status. BG-13 has now
added current-generation transactional reconciliation and synchronized
item detail, list and filter projections, with verified merge evidence
below. Production deployment remains a separate authorization gate.

## BG-13 atomic persistence (merged and CI verified)

[BG-13 issue #61](https://github.com/anmolsansi/Recollect-Flow/issues/61)
and [merged PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62)
delivered explicit item processing epochs, same-transaction stored status
projection, stale-worker and purge protection, source/extraction chaining
guards, and bounded admin reconciliation.
[Final closeout](verification/BG-13_FINAL_CLOSEOUT.md) includes the
exact [PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38052047097)
and [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38052191291),
both passing. BG-14 is now tracked at [issue #63](https://github.com/anmolsansi/Recollect-Flow/issues/63)
and [PR #64](https://github.com/anmolsansi/Recollect-Flow/pull/64).
Its [acceptance record](verification/BG-14_BROWSER_ACCEPTANCE.md)
distinguishes the new isolated Chrome journey from unverified positive
upstream URL acquisition. BG-15 remains locked until the full browser gate
passes on a clean merged head.
No live production D1 migration, historical automatic backfill or deployment
has been performed, and none is implied by this milestone.

## Product releases

### V0 — Technical spike

Prove Worker, D1, secrets, minimal schema, capture token, and an Apple Shortcut URL/note request. AI is intentionally absent. Exit when an authenticated health check works and a test capture is durable/retrievable.

### V1 — Reliable capture and recall

Deliver URL/text/image/PDF/file/note capture; iOS Shortcut and web capture; D1/R2 durability; metadata/PDF/image extraction; retryable jobs; structured enrichment; Notion plus Web Inbox; FTS5/filter search; lifecycle review; daily digest; privacy routing; observability; export/deletion; backup/restore; actual $0 operation.

### V1.1 — Friction reduction

Approve only from observed personal-beta friction: quick categories, dictated reason, better Instagram preview/guidance, visible processing/retry controls, weekly review, cold storage, improved reminders, and Android share target when Android is actually used.

### V1.5 — Personal Knowledge RAG

Conditional entry: V1 acceptance passes, at least 100 useful captures exist, repeated vocabulary-mismatch failures are demonstrated, and a representative gold question set is approved. Deliver source-aware chunks, replaceable/versioned embeddings, hybrid retrieval, duplicate/source-diversity/trust/reranking, bounded context, cited answer states, conversational fresh retrieval, local private RAG, cost controls, invalidation, and evaluation.

### V2 — Richer local/contextual capability

Conditional options: local multimodal processing when hardware/quality is adequate; browser extension when desktop volume justifies it; calendar/project context after privacy/project linkage proves reliable; more capable capture clients and transcription where lawful and useful.

### V3 — Active knowledge system

After a large useful corpus exists: supports/contradicts/updates/derived-action relationships, evidence-based project briefings, proactive contextual resurfacing, personalized forgetting curve, spaced review, and only then optional multi-user productization discovery.

## Delivery phases and gates

### Phase 0 — Product setup and decisions

- Record ADRs for D1, R2, Shortcut-first, Notion-as-view, privacy routing, and $0 policy.
- Define V1 file types/limits (initial recommendation: 20 MB), privacy levels, project list, and quick categories.
- Provision free Cloudflare/Notion development resources.
- Create secrets inventory and rotation procedure.

Gate: architecture decisions written, data model reviewed, and no hidden billing dependency.

### Phase 1 — Durable capture core

- Schema/migrations, authentication, request IDs, strict validation/error contract.
- URL/text/note capture, idempotency, canonical URL detection.
- Minimal read/list endpoints and unit/integration tests.
- Preview and production Worker deployment.

Gate: curl creates/retrieves one durable item; replay creates no second item.

### Phase 2 — iOS Shortcut

- Share Sheet URL/text/image/file support.
- Quick Save, Add Reason, Private Save, client/timestamp/key payload.
- Upload flow for files, actionable status/error UI, retry retention.
- Exportable Shortcut and setup/token-rotation guide.

Gate: Safari, Instagram, Photos, and Files reach RecollectFlow without copy/paste.

### Phase 3 — Attachments and extraction

- Private R2, attachment lifecycle, controlled upload, validation, orphan cleanup.
- URL metadata, embedded PDF text, image OCR/vision, coverage/provenance.
- Inbox original/coverage display.

Gate: originals survive extraction failure; text PDF is searchable without AI.

### Phase 4 — Jobs and AI enrichment

- Leasing, retry_wait, attempts, stale recovery, provider-neutral routing.
- Strict prompt/schema, Workers AI budget, provenance, validation, grounding.
- User-edit protection and manual retry.

Gate: valid enrichment succeeds; invalid output/quota exhaustion preserves raw data.

### Phase 5 — Notion sync

- Database/properties/views, capture-ID upsert, independent sync jobs.
- Rate-limit/overload/payload handling and supported-field reconciliation.

Gate: outage delays sync without affecting capture/search; retry creates no duplicate page.

### Phase 6 — Search and Web Inbox

- FTS5/index maintenance, ranking/filters, responsive Inbox/detail/search.
- Field editing, lifecycle actions, feedback events, seeded-corpus rows-read measurement.

Gate: real items can be recovered without opening Notion.

### Phase 7 — Digest and resurfacing

- Deterministic selection/deduplication, optional wording, Notion page, Telegram links.
- Due/failed/resurfaced items, privacy-safe content, regenerate/review actions.

Gate: concise source-linked digest arrives for seven eligible consecutive days.

### Phase 8 — Local Ollama worker

- Scoped lease/result API, Ollama integration, private/quota-overflow routing.
- Heartbeat, timeout, shutdown, one-job concurrency, Mac-memory model guidance.

Gate: private content completes locally; Mac-off means delay, not data loss.

### Phase 9 — Hardening and V1 launch

- Security review, usage/quota dashboard, export/restore rehearsal.
- Mandatory device/resilience tests, Instagram wording/coverage review.
- Two-week real use minimum and P0 friction fixes.

Gate: every V1 acceptance criterion passes and actual vendor spend is $0.

### Phase 10 — Personal Knowledge RAG

- Policy/trust/benchmark approval; RAG entities; chunking/source spans.
- Embedding/vector adapters and versioned indexes.
- Hybrid retrieval, filters, fusion, duplicate/source-diversity/trust/reranking.
- Query API, injection-safe bounded context, cited answer states, Ask UI.
- Local private path, evaluation harness/gold set, caching/invalidation/quotas/audit.

Gate: V1 already accepted; Recall/citation/refusal/conflict/privacy/deletion/cost thresholds pass; owner records explicit V1.5 go/no-go.

## Epic map

| Epic                       | Scope                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| E1 Capture Platform        | Schema, API, idempotency, canonicalization, clients, retry             |
| E2 Attachment Pipeline     | R2, upload/init/finalize, validation, orphan cleanup, secure access    |
| E3 Processing Framework    | Jobs, leases, retries, status, manual controls                         |
| E4 Extraction              | HTML, PDF, OCR/vision, coverage, provenance, errors                    |
| E5 AI Enrichment           | Router, schemas, provider adapters, prompts, validation                |
| E6 Knowledge UI            | Web Inbox, item detail/edit, projects/topics, search                   |
| E7 Notion                  | Schema, upsert, rate limits, views, reconciliation                     |
| E8 Resurfacing             | Daily/weekly digest, notification, cold storage                        |
| E9 Security & Operations   | Tokens, redacted logs, quotas, backup/restore, runbooks                |
| E10 Personal Knowledge RAG | Chunking through cited answers, Ask UI, evaluation, local path, caches |

## Long-horizon entry conditions

| Horizon | Capability                 | Entry condition                                                                |
| ------- | -------------------------- | ------------------------------------------------------------------------------ |
| V1.1    | Android share target       | Android is a real capture device or iOS limits are measured                    |
| V1.1    | Weekly digest/cold storage | Daily review stable for two weeks                                              |
| V1.5    | Personal Knowledge RAG     | V1 accepted, 100 useful captures, gold questions approved                      |
| V1.5    | Local private RAG          | Sensitivity policy and local-worker reliability proven                         |
| V2      | Local multimodal           | Hardware and benchmark quality sufficient                                      |
| V2      | Browser extension          | Desktop capture volume justifies maintenance                                   |
| V2      | Calendar/project context   | Privacy and project linking proven                                             |
| V3      | Knowledge relationships    | At least 1,000 useful captures                                                 |
| V3      | Multi-user product         | Personal system proves retention and durable value; separate SaaS PRD approved |
