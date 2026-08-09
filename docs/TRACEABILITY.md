# Requirement, delivery, and verification traceability

## Product-goal traceability

| Goal                             | Requirements                              | Delivery             | Acceptance evidence                                     |
| -------------------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------- |
| Frictionless universal capture   | CAP-001–009, ING-001–008                  | E1/E2, phases 1–3    | Share Sheet/web/device/offline/upload tests             |
| No source loss                   | CAP-002/004/005, JOB-001–005, OPS-003/006 | E1/E3/E9             | Provider outage, replay, export/restore                 |
| Useful organization/review       | AI-001–008, REV-001–005, NOT-001–004      | E5/E6/E7             | Correction, lifecycle, outage, reconciliation           |
| Reliable recall                  | SRCH-001–005, DIG-001–004                 | E6/E8                | Seeded/real search and digest trial                     |
| Zero cost                        | OPS-002/005, AI-008, RAG-011              | E5/E9/E10            | Quota thresholds and $0 bill check                      |
| Privacy and control              | SEC-001–008, AI-002, EXT-006              | E2/E5/E9             | Routing, auth, object, injection, deletion tests        |
| Notion without dependence        | NOT-001–004                               | E7                   | Outage/rebuild/duplicate tests                          |
| Grounded personal-corpus answers | RAG-001–015                               | E10/phase 10         | Gold evaluation, citation/refusal/conflict/privacy gate |
| Active future knowledge          | FUT-001–006                               | V2/V3/productization | Separate entry gates and future acceptance plans        |

## Current implemented trace

| Linear  | Requirements currently evidenced                                               | Repository evidence                                                                       |
| ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| OPE-213 | Product scope decisions                                                        | `COMPLETE_PRODUCT_SPEC.md`, `DECISIONS.md`                                                |
| OPE-214 | Cloudflare account, bindings, secrets, migration, and provider smoke tests     | `tickets/OPE-214.md`, `wrangler.toml`, generated binding types                            |
| OPE-215 | Foundation/CI/docs shell                                                       | configuration, CI, README, `repo_context.md`                                              |
| OPE-216 | Core item/attachment/job/sync/provider/audit schema                            | `migrations/0001_initial.sql`, migration tests                                            |
| OPE-217 | CAP-002/004 partial, ING-001/002 partial, SEC-001/002 partial, JOB-001 partial | capture route/service/repository tests and live D1 replay                                 |
| OPE-218 | ING-002 cross-key canonical reuse and event preservation                       | capture event/deduplication migrations, repository/service and tests                      |
| OPE-224 | AI provider privacy routing, fail-closed defaults and override lifecycle       | approved policy `2026-07-21.1`, consent/ZDR-stamped jobs, routes, migration and tests     |
| OPE-249 | Private attachment durability and lifecycle                                    | R2 upload/finalize/link/download/cleanup routes, migrations and tests                     |
| OPE-219 | Shortcut client contract and offline/retry design                              | build sheet, Mac Share Sheet template and device QA matrix; physical-device gate pending  |
| OPE-222 | Provider-independent AI enrichment pipeline                                    | queue tracking, resilient AI wrappers, parsing logic, models and integrations tests       |
| OPE-223 | Multimodal extraction for PDF and images                                       | extraction records table, vision/pdf extractors, and repository integrations tests        |
| OPE-225 | D1 FTS5 indexing and search API                                                | `tickets/OPE-225.md`, synced `item_search_fts`, search routes and D1 acceptance tests     |
| OPE-226 | Daily digest and weekly review jobs                                            | `tickets/OPE-226.md`, digest scheduler/selector/renderer/delivery routes and D1 tests     |
| OPE-248 | Recovery-capable Web Inbox and item review                                     | `tickets/OPE-248.md`, item/retry/privacy routes, React Inbox/detail, D1 and browser tests |
| OPE-227 | Zero-cost AI quota admission and circuit breakers                              | migration `0020`, capacity/breaker services, usage API, concurrency and recovery tests    |
| OPE-228 | Portable export, hosted backup, explicit purge, restore, integrity checks      | migration `0021`, recovery routes/services, purge ledger, round-trip and partial-failure tests |

“Partial” is intentional: a requirement is complete only when every input/client/integration/acceptance condition is covered.

## Phase-to-requirement map

- Phase 0: governance, SEC/OPS decisions.
- Phase 1: CAP-002/004, ING-001/002, JOB foundation, SEC-001/002.
- Phase 2: CAP-001/003/005/008/009 and device acceptance.
- Phase 3: ING-003/005–008, EXT-001–006.
- Phase 4: JOB-001–005, AI-001–008.
- Phase 5: NOT-001–004.
- Phase 6: SRCH-001/002/004/005, REV-001/002/004/005.
- Phase 7: DIG-001–004, REV-003.
- Phase 8: JOB-006, AI-005, private provider path.
- Phase 9: SEC-001–008, OPS-001–006 and all V1 acceptance.
- Phase 10: RAG-001–015 and V1.5 acceptance.
- V2/V3: FUT-001–005; separate productization: FUT-006.

## Documentation completeness matrix

All source PRD sections are covered: executive/product definition (`COMPLETE_PRODUCT_SPEC`), problems/principles/users/use cases (`COMPLETE_PRODUCT_SPEC`, `USE_CASES`), goals/metrics/scope/releases (`COMPLETE_PRODUCT_SPEC`, `RELEASE_ROADMAP`), UX/functional requirements (`USE_CASES`, `REQUIREMENTS_CATALOG`), Notion (`NOTION_INFORMATION_ARCHITECTURE`), architecture/data/API (`ARCHITECTURE`, `DATA_MODEL`, `API_SPEC`), extraction/RAG (`AI_AND_RAG_SPEC`), notifications (`USE_CASES`, Notion/requirements), security/cost/Instagram/operations/testing (`SECURITY`, `OPERATIONS`, `TESTING`), implementation/risks/launch/future (`RELEASE_ROADMAP`, `RISK_REGISTER`, `LAUNCH`), appendices (`PROMPTS_AND_SCHEMAS`, `OFFICIAL_SOURCES`, this traceability file).

## OPE-226 digest trace

| Requirements | Repository evidence                                                                 | Automated verification                                                         |
| ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| DIG-001      | `digests/digest.selector.ts`, deterministic renderer, authenticated item links      | Non-empty daily D1 test with count, topics, top items, failures and actions    |
| DIG-002      | Weekly repeated themes, high-value Inbox, dormant-project and archive-warning rules | Weekly D1 fixture verifies every section and explicit contradiction limitation |
| DIG-003      | Delivery-time privacy recheck and neutral restricted projections                    | Public/Personal/Unknown/Sensitive fixture plus privacy-change-before-send test |
| DIG-004      | Versioned `digest_runs`, content hash, review/audit and admin actions               | Duplicate schedule convergence, deterministic regeneration and route tests     |
| OPS-001/004  | Safe delivery states/errors, leases, IDs and metadata-only logs                     | 429, auth, 5xx, network, malformed response, timeout and lease tests           |

<!-- OPE-227 START -->

## OPE-227 traceability

- Zero-cost V1 / ADR-011 + ADR-029 -> provider/model allowlist in `capacity.policy.ts` -> paid/unknown model rejection tests.
- Provider/operation/window quota contract / ADR-028 -> migration `0020` + `capacity.repository.ts` -> final-unit concurrency, reset-boundary, shared text/vision, reconciliation and expiry tests.
- Retry-preserving deferral / ADR-030 -> `capacity-job.service.ts` + enrichment integration -> capacity-deferral and manual-retry tests.
- Provider outage recovery -> `circuit-breaker.repository.ts` -> open, single half-open probe, successful recovery and failed-probe tests.
- Safe operator visibility -> `GET /api/v1/usage` -> admin-scope and content-exclusion tests.
- Capture remains independent from AI -> capture/search continuity test with the OpenRouter request window hard-filled.

<!-- OPE-227 END -->

<!-- OPE-228 START -->

## OPE-228 traceability

- Portable owner exit / no source loss -> `export.service.ts` + JSON/CSV admin route -> CSV quoting, credential scrubber, and D1 export/restore round-trip tests.
- Verified hosted recovery artifact / ADR-031 -> `backup.service.ts`, private `backups/v1/` R2 prefix, migration `0021` -> read-back hash, retrieval-time re-verification, failure-preserves-live-data, and 30-day cleanup tests.
- Reversible grace then explicit purge / ADR-013 + ADR-032 -> `purge.service.ts` -> soft-delete requirement, exact edit-version binding, workflow-bound 15-minute phrase, mismatch/expiry/change rejection tests.
- Cross-system partial-failure truthfulness / ADR-032 -> leased `purge.worker.ts` steps -> Notion-503 partial-state test proves D1 content remains while external purge is incomplete.
- Canonical content purge + completion evidence -> `canonical-purge.service.ts` + `purge_receipts` -> happy-path purge test proves content removal and non-content receipt retention.
- Anti-resurrection backup safety / ADR-031 -> D1 receipt + private hashed `purge-receipts/v1/` mirror -> pre-purge backup restore test proves the newer receipt skips the item.
- Clean disaster recovery -> strict restore schema/plan/repository/service -> clean-D1 round-trip recreates canonical fields, history, job/sync state and searchable FTS projection.
- Notion is not deletion authority / ADR-003 + ADR-032 -> read-only Notion integrity check -> missing-Notion test proves zero purge workflows and unchanged canonical D1 content.
- Recovery integrity -> `integrity.service.ts` -> missing R2 object, missing Notion projection, partial purge, and incomplete backup findings without canonical mutation.
- Migration safety -> isolated OPE-228 migration rehearsal -> populated pre-0021 item/job data survives migration and new recovery tables pass foreign-key check.
- Operator recovery -> `OPERATIONS.md` -> portable restore, explicit purge, D1 SQL export/import, D1 Time Travel, and post-recovery integrity procedures.

<!-- OPE-228 END -->
