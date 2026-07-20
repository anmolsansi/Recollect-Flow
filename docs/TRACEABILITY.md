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

| Linear  | Requirements currently evidenced                                               | Repository evidence                                                                      |
| ------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| OPE-213 | Product scope decisions                                                        | `COMPLETE_PRODUCT_SPEC.md`, `DECISIONS.md`                                               |
| OPE-214 | Cloudflare account, bindings, secrets, migration, and provider smoke tests     | `tickets/OPE-214.md`, `wrangler.toml`, generated binding types                           |
| OPE-215 | Foundation/CI/docs shell                                                       | configuration, CI, README, `repo_context.md`                                             |
| OPE-216 | Core item/attachment/job/sync/provider/audit schema                            | `migrations/0001_initial.sql`, migration tests                                           |
| OPE-217 | CAP-002/004 partial, ING-001/002 partial, SEC-001/002 partial, JOB-001 partial | capture route/service/repository tests and live D1 replay                                |
| OPE-218 | ING-002 cross-key canonical reuse and event preservation                       | capture event/deduplication migrations, repository/service and tests                     |
| OPE-224 | AI provider privacy routing, fail-closed defaults and override lifecycle       | policy matrix/service/routes, policy-stamped jobs and tests; owner approval pending      |
| OPE-249 | Private attachment durability and lifecycle                                    | R2 upload/finalize/link/download/cleanup routes, migrations and tests                    |
| OPE-219 | Shortcut client contract and offline/retry design                              | build sheet, Mac Share Sheet template and device QA matrix; physical-device gate pending |

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
