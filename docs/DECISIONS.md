# Product and architecture decisions

## Frozen decisions

| ID      | Decision                                                    | Rationale                                                                                                         |
| ------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ADR-001 | Cloudflare D1 is the system of record                       | Relational, indexed, portable authority independent of Notion/providers                                           |
| ADR-002 | Private R2 stores attachment bytes                          | Keeps files out of D1 with opaque private access                                                                  |
| ADR-003 | Notion is a review projection                               | Familiar UI without capture/data dependence                                                                       |
| ADR-004 | Apple Shortcut is the first mobile client                   | Fastest Share Sheet proof without App Store                                                                       |
| ADR-005 | Capture never depends on AI                                 | Provider/quota/Mac/Notion failure cannot lose source                                                              |
| ADR-006 | V1 search is D1 FTS5 plus filters                           | Exact, inexpensive, explainable recall first                                                                      |
| ADR-007 | `/api/v1` is the canonical route prefix                     | Versioned API contract aligned with repository standards                                                          |
| ADR-008 | Separate capture/admin/local-worker credentials             | Least privilege and independent rotation                                                                          |
| ADR-009 | Raw source and user reason are immutable evidence           | Derived edits/retries cannot rewrite truth                                                                        |
| ADR-010 | Provider adapters and structured validation are mandatory   | Replaceability, privacy, quota, and correctness                                                                   |
| ADR-011 | No implicit payment method or overage                       | $0 policy must fail closed                                                                                        |
| ADR-012 | Instagram is URL/coverage-first; no scraper promise         | Platform/access/rights reality and honest UX                                                                      |
| ADR-013 | Deletion is grace then explicit purge                       | Recovery plus complete cross-system cleanup                                                                       |
| ADR-014 | RAG is V1.5 and separately accepted                         | Avoid fluent answers before useful reliable corpus                                                                |
| ADR-015 | RAG uses hybrid retrieval and exact citations               | Exact recall plus semantic help with traceability                                                                 |
| ADR-016 | Restricted RAG uses local or retrieval-only path            | Privacy takes priority over completeness                                                                          |
| ADR-017 | Every conversation turn retrieves fresh evidence            | Prevent model history becoming evidence                                                                           |
| ADR-018 | Wrangler migrations directory is forward-only               | Wrangler applies every SQL file found there                                                                       |
| ADR-019 | Project uses Notion Select for V1                           | Simpler schema mapping until knowledge graph is needed                                                            |
| ADR-020 | Retry waiting is exposed as derived `retry_wait`            | Avoids redundant state; `pending` + `available_at > now` computes it                                              |
| ADR-021 | Deleted Notion pages require owner approval for recreation  | Prevents zombie sync loops and respects human deletion intent                                                     |
| ADR-022 | Notion human-owned fields are create-only in V1             | Preserves edits without an ambiguous timestamp-wins conflict policy                                               |
| ADR-023 | Privacy is D1/admin-owned and never imported from Notion    | A display edit cannot silently authorize hosted processing                                                        |
| ADR-028 | AI quota enforcement is provider/operation/window specific  | Published free limits differ by provider and operation; hard guards must mirror the actual constrained dimensions |
| ADR-029 | V1 AI execution is free-tier allowlist only                 | Configuration alone must never opt the owner into paid processing                                                 |
| ADR-030 | Capacity deferrals do not consume terminal retry allowance  | Quota exhaustion or an open breaker is not an item-processing failure                                             |
| ADR-031 | Hosted verified backups are immutable with 30-day retention | Keeps backup checksums trustworthy while bounding residual deleted data                                           |
| ADR-032 | Only RecollectFlow/D1 can initiate canonical purge          | Notion remains a projection and cannot trigger irreversible source deletion                                       |
| ADR-033 | Routine token rotation uses bounded current/next overlap    | Allows safe client cutover without indefinite dual-token exposure                                                 |

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
| Notion destination access and live view verification | Destination-only Access evidence and view checklist               |
| Telegram digest channel                              | Bot/chat credentials and privacy approval                         |
| Exact V1 file allowlist/size                         | Mobile reliability/storage/security test; recommended start 20 MB |
| Privacy provider matrix                              | Explicit Public/Personal/Sensitive routing approval               |
| Active project/quick category lists                  | Owner’s current taxonomy                                          |
| Ollama models and Mac schedule                       | Hardware benchmark and reliability                                |
| V1/V1.5 go/no-go                                     | Completed acceptance evidence and owner sign-off                  |

## Decision change control

Changing a frozen decision requires a Contract Change Record: problem/evidence, chosen option, alternatives, affected API/data/security/UX/cost, migration/compatibility/rollback, requirement/ticket/test/docs/Linear updates, owner/architect approval, and effective version/date.

## OPE-226 frozen digest decisions

| ID      | Decision                                                                   | Reason                                                                                            |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ADR-024 | Digest item links target the authenticated Web Inbox item-detail route     | The owner can inspect the canonical item without depending on Notion or exposing source URLs.     |
| ADR-025 | Ambiguous Telegram sends become `unknown` and require reconciliation       | Telegram has no idempotency key; automatic retry after a possible accepted send risks duplicates. |
| ADR-026 | Scheduled periods use completed Asia/Kolkata calendar days and weeks       | Calendar boundaries remain correct across month, year and leap-day transitions.                   |
| ADR-027 | Contradictions are not inferred until an explicit evidence relation exists | Keyword heuristics would create unsupported claims; weekly output states the limitation.          |

The daily schedule is 07:30 IST (`0 2 * * *` UTC). The weekly schedule is Monday
07:45 IST (`15 2 * * 1` UTC). The hourly processing schedule remains separate.

## Phase 0 hardening decisions — approved 2026-08-09

### ADR-028 — Provider/operation/window-specific quota accounting

Quota enforcement must model the dimensions the provider actually publishes rather than inventing universal token limits. Capacity records are keyed by provider, operation and applicable quota window, using UTC boundaries unless a provider contract explicitly requires a different reset rule.

Track the constrained dimensions independently:

- request count;
- estimated input units when the provider publishes an input-unit limit;
- estimated output units when the provider publishes an output-unit limit;
- reserved/in-flight capacity used for atomic pre-call admission;
- reconciled actual usage when reliable actual-usage metadata is available.

A missing provider-wide token quota is represented as `null`/not applicable, never as `unlimited`. Per-request model constraints such as context length, output limits, modalities and provider-specific restrictions remain separate from account quota accounting.

Owner-provided OpenRouter free-tier baseline for the OPE-227 contract as of 2026-08-09:

- shared account-wide free-model pool;
- 20 requests/minute;
- 50 requests/day for the ordinary free account, or 1,000 requests/day after the account qualifies through the documented lifetime-credit condition;
- no platform-wide free-tier input/output TPM or tokens/day value should be invented;
- text and vision requests share the same request pool;
- model-specific capability/context/output restrictions remain separate;
- failed/retried requests are treated conservatively as quota-consuming unless authoritative provider evidence proves otherwise.

Provider limits are operational configuration, not timeless architecture constants. They must be revalidated against authoritative provider documentation before release/provider changes and whenever quota behavior is suspected to have changed.

### ADR-029 — Free-tier-only V1 execution

V1 may execute only explicitly approved free-tier provider/model combinations. Runtime configuration cannot opt into a paid model, paid endpoint or billable fallback. Unknown combinations fail closed.

Enabling paid AI later requires owner approval plus a Contract Change Record, code/config changes, tests, security/cost review and deployment evidence. This extends ADR-011 rather than replacing it.

### ADR-030 — Capacity deferral preserves retry allowance

Quota exhaustion, an open provider circuit breaker, or other capacity-based unavailability returns affected work to `pending`, sets `available_at` to the next safe quota reset or breaker probe, records a stable safe error code, and releases the lease.

These deferrals do not consume the job's terminal processing retry allowance. Manual retry cannot bypass quota, privacy, breaker or paid-provider guards. True execution failures may still consume the normal bounded retry allowance according to the job contract.

### ADR-031 — Immutable hosted backups, 30-day retention and purge receipts

Verified hosted backups are immutable recovery artifacts and are not rewritten after every item purge. They expire after a 30-day retention period.

A confirmed purge removes the item from active hosted D1, R2, Notion and derived surfaces as the cross-system purge workflow completes. Historical hosted backup copies may remain only until their normal retention expiry, bounded to 30 days.

A retained non-content purge receipt/tombstone prevents later restore of a pre-purge backup from silently resurrecting the purged item. Restore tooling must apply purge receipts before declaring recovery successful.

Owner-downloaded/offline backup copies are outside RecollectFlow's remote deletion control and must be disclosed as such. The system must never claim that it remotely erased copies held on an owner's Mac, external disk, Time Machine or other user-controlled storage.

### ADR-032 — D1/RecollectFlow is the only purge authority

Only an explicit RecollectFlow purge workflow rooted in D1 may initiate permanent canonical deletion. Deleting, moving, archiving or losing access to a Notion page must never trigger canonical D1/R2 purge.

Notion removal is a downstream purge step. If the Notion step fails, the purge remains visibly partial/retryable until reconciled; the system must not claim cross-system atomic completion.

### ADR-033 — Bounded token-rotation overlap

Capture, admin and local-worker credentials will support current/next secret slots.

Routine rotation policy:

- default overlap: 24 hours;
- maximum overlap: 72 hours;
- explicit retirement of the old credential is required;
- indefinite dual-token operation is prohibited.

If compromise is suspected, the old credential is revoked immediately with no overlap regardless of the normal rotation window. Rotation and retirement events must be auditable without recording token values.
