# Complete requirements catalog

Priority: P0 = V1 required, P1 = approved next/conditional release, P2 = exploratory. Implementation evidence belongs in `TRACEABILITY.md` and `BUILD_STATUS.md`.

## Capture platform

| ID      | Pri | Requirement                                             | Verification                                        |
| ------- | --- | ------------------------------------------------------- | --------------------------------------------------- |
| CAP-001 | P0  | Accept URL, text, image, and file Share Sheet inputs    | Valid fixture of each type creates an item          |
| CAP-002 | P0  | Persist raw capture before enrichment                   | AI/Notion outage does not prevent retrieval         |
| CAP-003 | P0  | Accept optional reason, category, privacy, and reminder | Values appear unchanged on the item                 |
| CAP-004 | P0  | Support idempotent retries                              | Same key returns original capture ID                |
| CAP-005 | P0  | Retain failed client payload or provide explicit retry  | Airplane-mode test loses no item silently           |
| CAP-006 | P1  | Android ACTION_SEND share target                        | App appears for supported MIME types and saves them |
| CAP-007 | P0  | Provide responsive manual web capture                   | Owner can save a note/URL without mobile Shortcut   |
| CAP-008 | P1  | Support dictated save reason                            | Dictated text is preserved as user intent           |
| CAP-009 | P1  | Support save-and-remind                                 | Review date reliably enters resurfacing selection   |

## Ingestion and attachments

| ID      | Pri | Requirement                                                                        | Verification                                                    |
| ------- | --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| ING-001 | P0  | Validate authentication, MIME/signature, URL scheme, payload size, required fields | Invalid requests return safe structured 4xx                     |
| ING-002 | P0  | Store original and canonical URL separately                                        | Tracking variants share canonical URL; original survives        |
| ING-003 | P0  | Store approved attachments in private R2                                           | Authorized retrieval works; anonymous retrieval fails           |
| ING-004 | P0  | Create independent metadata/extraction/AI/Notion jobs                              | Every job has its own status/attempt history                    |
| ING-005 | P0  | Record content coverage                                                            | UI distinguishes URL-only, metadata, OCR, transcript, full file |
| ING-006 | P0  | Use controlled upload initialization/finalization                                  | Unverified object cannot be linked to an item                   |
| ING-007 | P0  | Clean orphan uploads after retention window                                        | Expired unlinked object/record is removed audibly               |
| ING-008 | P0  | Use opaque object keys and preserve safe filename metadata                         | Path traversal/name collision tests pass                        |

## Extraction

| ID      | Pri | Requirement                                              | Verification                                               |
| ------- | --- | -------------------------------------------------------- | ---------------------------------------------------------- |
| EXT-001 | P0  | Extract public web metadata with timeout/redirect limits | Public fixture yields title/description/site/canonical URL |
| EXT-002 | P0  | Extract embedded PDF text without a model                | Known PDF phrase becomes searchable                        |
| EXT-003 | P0  | Run image OCR/vision only when routing permits           | Screenshot text stored with provider provenance            |
| EXT-004 | P1  | Transcribe user-provided lawful audio/video              | Transcript links to original and source-time spans         |
| EXT-005 | P0  | Preserve extraction completeness/provenance/errors       | Failed or partial source shows truthful coverage           |
| EXT-006 | P0  | Treat source content as untrusted data                   | Prompt-injection fixture cannot alter processing behavior  |

## Processing framework

| ID      | Pri | Requirement                                         | Verification                                         |
| ------- | --- | --------------------------------------------------- | ---------------------------------------------------- |
| JOB-001 | P0  | Separate item and job state machines                | Item remains available while jobs are pending/failed |
| JOB-002 | P0  | Lease jobs with expiry and stale recovery           | Crashed worker job becomes safely available again    |
| JOB-003 | P0  | Use bounded retries/backoff/jitter and Retry-After  | Provider/Notion fault tests honor policy             |
| JOB-004 | P0  | Expose job status, error category, and manual retry | Owner diagnoses/retries without raw log access       |
| JOB-005 | P0  | Make job/result writes idempotent                   | Duplicate delivery cannot corrupt derived state      |
| JOB-006 | P1  | Support scoped local-worker heartbeat/release       | Controlled shutdown returns or completes lease       |

## AI enrichment

| ID     | Pri | Requirement                                                                | Verification                                            |
| ------ | --- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| AI-001 | P0  | Produce validated title, summary, topics, project, importance, action JSON | Invalid output is rejected safely                       |
| AI-002 | P0  | Route by sensitivity, modality, quota, and availability                    | Sensitive fixture never reaches unapproved provider     |
| AI-003 | P0  | Never claim unavailable coverage                                           | URL-only Reel remains URL-only                          |
| AI-004 | P0  | Preserve user edits against routine retries                                | User override survives later processing                 |
| AI-005 | P1  | Process private/backlog jobs through local Ollama worker                   | Mac-off stays pending and later completes               |
| AI-006 | P0  | Record provider/model/prompt/schema/content version                        | Every derived field is attributable                     |
| AI-007 | P0  | Bound provider input to minimum necessary content                          | Audit shows no unnecessary full-document submission     |
| AI-008 | P0  | Allow deterministic/no-AI operation                                        | Capture and exact retrieval work with every AI disabled |

## Search, review, and knowledge UI

| ID       | Pri | Requirement                                                               | Verification                                           |
| -------- | --- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| SRCH-001 | P0  | FTS title, reason, shared/extracted text, summary, topics, project/source | Expected fixtures match                                |
| SRCH-002 | P0  | Filter by source, project, topic, status, date, importance, privacy       | Combined filter returns correct subset                 |
| SRCH-003 | P1  | Semantic retrieval through chunk embeddings                               | Paraphrase finds relevant item lacking exact terms     |
| SRCH-004 | P0  | Rank personal reason/title ahead of generic summary                       | Ranking fixture orders intent-bearing result first     |
| SRCH-005 | P0  | Record useful/not relevant/already used/outdated feedback                 | Feedback event appears without exporting private data  |
| REV-001  | P0  | Show a Web/Notion Inbox for new/unreviewed items                          | New capture appears with source/status/coverage        |
| REV-002  | P0  | Support Inbox, Reviewed, Actioned, Archived, Duplicate, Deleted           | Validated transitions are auditable                    |
| REV-003  | P1  | Review-before-archive cold storage                                        | Rule produces review list before archival              |
| REV-004  | P0  | Edit derived fields while preserving raw evidence                         | History contains correction event and original remains |
| REV-005  | P0  | Provide source inspection/open actions                                    | Owner can resolve result/answer to original            |

## Notion and resurfacing

| ID      | Pri | Requirement                                             | Verification                                          |
| ------- | --- | ------------------------------------------------------- | ----------------------------------------------------- |
| NOT-001 | P0  | Upsert Notion page by capture ID                        | 429 retry creates no duplicate page                   |
| NOT-002 | P0  | Remain usable without Notion                            | Web/API capture/retrieval works during outage         |
| NOT-003 | P0  | Restrict reconciliation to supported editable fields    | Arbitrary Notion edits cannot mutate raw evidence     |
| NOT-004 | P0  | Notion deletion never deletes D1 automatically          | Deleted page creates sync state/action request only   |
| DIG-001 | P0  | Generate daily digest from stored facts                 | Eligible digest links to exact items                  |
| DIG-002 | P1  | Generate weekly themes/review/actions/cold-storage view | Weekly report links to source items                   |
| DIG-003 | P0  | Keep sensitive text out of external notifications       | Sensitive fixture emits neutral label and secure link |
| DIG-004 | P0  | Support deterministic regeneration/review status        | Regeneration remains stable and auditable             |

## Security, privacy, portability, and operations

| ID      | Pri | Requirement                                                                          | Verification                                           |
| ------- | --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| SEC-001 | P0  | Authenticate every write/read/admin operation with scoped credentials                | Unauthorized access returns 401/403                    |
| SEC-002 | P0  | Store secrets only in approved secret stores                                         | Repository/response/log scan finds no credential       |
| SEC-003 | P0  | Keep objects private and non-enumerable                                              | Anonymous object URL fails                             |
| SEC-004 | P0  | Export and two-stage delete user data                                                | Export/soft-delete/purge tests match policy            |
| SEC-005 | P0  | Classify Public, Personal, Sensitive, Unknown before provider routing                | Unknown defaults conservatively                        |
| SEC-006 | P0  | Block arbitrary tools/URLs/credentials from model context                            | Injection/SSRF tests fail closed                       |
| SEC-007 | P0  | Rotate capture/admin/local-worker tokens without data migration                      | Rotation runbook succeeds                              |
| SEC-008 | P0  | Invalidate retrieval/index/cache after deletion or restriction                       | Deleted/restricted fixture disappears from new results |
| OPS-001 | P0  | Show processing status and safe last error                                           | Failure diagnosable without payload logs               |
| OPS-002 | P0  | Stop optional work before paid usage                                                 | Hard threshold leaves jobs pending                     |
| OPS-003 | P0  | Create periodic versioned machine-readable backup/export                             | Clean restore recreates items/links                    |
| OPS-004 | P0  | Log request/job IDs, duration, category, provider, bytes without raw secrets/content | Logging audit passes                                   |
| OPS-005 | P0  | Show captures, backlog, failures, usage, storage, D1, sync lag                       | Dashboard reflects seeded conditions                   |
| OPS-006 | P0  | Rehearse Notion, secret, and D1 recovery                                             | Each runbook completes in test environment             |

## Personal Knowledge RAG

| ID      | Pri | Requirement                                                                  | Verification                                                       |
| ------- | --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| RAG-001 | P1  | Create stable source-aware chunks with spans/coverage                        | Citation resolves to meaningful original span                      |
| RAG-002 | P1  | Use replaceable embeddings and versioned indexes                             | Parallel model index builds without corrupting active index        |
| RAG-003 | P1  | Combine FTS5/vector retrieval with metadata/privacy filters                  | Exact and paraphrased gold queries retrieve expected sources       |
| RAG-004 | P1  | Deduplicate, preserve diversity, apply trust, optionally rerank              | Repost cluster does not dominate; conflicts remain visible         |
| RAG-005 | P1  | Assemble token-bounded injection-safe context with citation IDs              | Source instructions cannot override system; limits enforced        |
| RAG-006 | P1  | Validate citations for every factual answer block                            | Sampled claims resolve to supplied evidence                        |
| RAG-007 | P1  | Return partial/conflict/insufficient-evidence states                         | Unanswerable/contradictory cases are not confident answers         |
| RAG-008 | P1  | Retrieve fresh evidence for every conversational turn                        | History guides intent but is never evidence                        |
| RAG-009 | P1  | Version and run retrieval/answer evaluation                                  | Report separates retriever and generator failures                  |
| RAG-010 | P1  | Keep restricted chunks/embeddings/answers on approved local path             | External audit sees no restricted fixture                          |
| RAG-011 | P1  | Enforce embedding/vector/rerank/generation quotas and fallbacks              | Hard thresholds stop calls and return lexical/evidence-only result |
| RAG-012 | P1  | Invalidate/rebuild on edit/delete/restriction/model/policy change            | Stale source disappears from new answers/caches                    |
| RAG-013 | P1  | Store retrieval candidates, scores, selections, corpus/index/prompt versions | Answer provenance is reproducible                                  |
| RAG-014 | P1  | Never silently add general model knowledge                                   | Forbidden-fact tests pass                                          |
| RAG-015 | P1  | Preserve exact source coverage and staleness labels in answers               | URL-only/old evidence is visibly qualified                         |

## Future active-knowledge and productization requirements

| ID      | Pri | Requirement                                                         | Entry condition                                           |
| ------- | --- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| FUT-001 | P2  | Evidence relationships: supports/contradicts/updates/derived action | ≥1,000 useful captures and relation-quality benchmark     |
| FUT-002 | P2  | Project briefings assembled from cited evidence                     | RAG and project linkage accepted                          |
| FUT-003 | P2  | Calendar/project-context resurfacing                                | Privacy and integration scopes approved                   |
| FUT-004 | P2  | Personalized forgetting curve/spaced review                         | Stable review feedback history exists                     |
| FUT-005 | P2  | Browser extension                                                   | Measured desktop capture demand                           |
| FUT-006 | P2  | Public multi-user product                                           | Separate SaaS PRD, tenancy/legal/billing/support approval |
