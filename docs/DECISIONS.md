# Product and architecture decisions

## Frozen decisions

| ID      | Decision                                                  | Rationale                                                               |
| ------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| ADR-001 | Cloudflare D1 is the system of record                     | Relational, indexed, portable authority independent of Notion/providers |
| ADR-002 | Private R2 stores attachment bytes                        | Keeps files out of D1 with opaque private access                        |
| ADR-003 | Notion is a review projection                             | Familiar UI without capture/data dependence                             |
| ADR-004 | Apple Shortcut is the first mobile client                 | Fastest Share Sheet proof without App Store                             |
| ADR-005 | Capture never depends on AI                               | Provider/quota/Mac/Notion failure cannot lose source                    |
| ADR-006 | V1 search is D1 FTS5 plus filters                         | Exact, inexpensive, explainable recall first                            |
| ADR-007 | `/api/v1` is the canonical route prefix                   | Versioned API contract aligned with repository standards                |
| ADR-008 | Separate capture/admin/local-worker credentials           | Least privilege and independent rotation                                |
| ADR-009 | Raw source and user reason are immutable evidence         | Derived edits/retries cannot rewrite truth                              |
| ADR-010 | Provider adapters and structured validation are mandatory | Replaceability, privacy, quota, and correctness                         |
| ADR-011 | No implicit payment method or overage                     | $0 policy must fail closed                                              |
| ADR-012 | Instagram is URL/coverage-first; no scraper promise       | Platform/access/rights reality and honest UX                            |
| ADR-013 | Deletion is grace then explicit purge                     | Recovery plus complete cross-system cleanup                             |
| ADR-014 | RAG is V1.5 and separately accepted                       | Avoid fluent answers before useful reliable corpus                      |
| ADR-015 | RAG uses hybrid retrieval and exact citations             | Exact recall plus semantic help with traceability                       |
| ADR-016 | Restricted RAG uses local or retrieval-only path          | Privacy takes priority over completeness                                |
| ADR-017 | Every conversation turn retrieves fresh evidence          | Prevent model history becoming evidence                                 |
| ADR-018 | Wrangler migrations directory is forward-only             | Wrangler applies every SQL file found there                             |

## Conditional decisions

- Android client only from real device demand or measured iOS limitations.
- Browser extension only from measured desktop capture volume.
- Audio/screen-recording transcription only for lawful user-provided files with approved processing.
- Semantic retrieval only after V1 acceptance, 100 useful captures, vocabulary-mismatch evidence, and gold set.
- Calendar/project integrations only after privacy/project linkage approval.
- Knowledge graph/relationships only after ≥1,000 useful captures and relation-quality evidence.
- Multi-user/public product only under a separate SaaS PRD and security/legal/business review.

## Open human decisions

| Decision                                             | Owner evidence required                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| Production Cloudflare D1/R2/Worker account/resources | Resource IDs, regions/config, no-billing confirmation             |
| Notion workspace/database and editable-field policy  | Owner access and schema approval                                  |
| Telegram digest channel                              | Bot/chat credentials and privacy approval                         |
| Exact V1 file allowlist/size                         | Mobile reliability/storage/security test; recommended start 20 MB |
| Privacy provider matrix                              | Explicit Public/Personal/Sensitive routing approval               |
| Active project/quick category lists                  | Owner’s current taxonomy                                          |
| Backup destination/retention/grace period            | Owner recovery/privacy preference                                 |
| Ollama models and Mac schedule                       | Hardware benchmark and reliability                                |
| V1/V1.5 go/no-go                                     | Completed acceptance evidence and owner sign-off                  |

## Decision change control

Changing a frozen decision requires a Contract Change Record: problem/evidence, chosen option, alternatives, affected API/data/security/UX/cost, migration/compatibility/rollback, requirement/ticket/test/docs/Linear updates, owner/architect approval, and effective version/date.
