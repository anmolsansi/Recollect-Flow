# RecollectFlow documentation

This directory is the complete product knowledge base for RecollectFlow. It covers the personal product from initial capture through future productization. The source authority is **RecollectFlow PRD v1.1 RAG, dated 2026-07-16**. Repository documents translate that source into buildable, version-controlled contracts.

## Status language

- **Implemented:** present in the repository and verified by current evidence.
- **Planned:** approved product scope, not yet implemented.
- **Conditional:** approved only when its stated entry gate is satisfied.
- **Exploratory:** a future option requiring a new decision before implementation.
- **Human gate:** requires the owner, a physical device, credentials, policy approval, or a destructive production action.

No planned capability should be interpreted as shipped. Current evidence is maintained only in [BUILD_STATUS.md](BUILD_STATUS.md).

## Complete document map

| Document                                                                 | Authority                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [COMPLETE_PRODUCT_SPEC.md](COMPLETE_PRODUCT_SPEC.md)                     | Product vision, users, jobs, all use cases, scope horizons, success measures, constraints    |
| [PRD.md](PRD.md)                                                         | Premium-product-builder PRD contract and micro-system split                                  |
| [USE_CASES_AND_FLOWS.md](USE_CASES_AND_FLOWS.md)                         | Capture, review, search, RAG, recovery, and failure-state journeys                           |
| [REQUIREMENTS_CATALOG.md](REQUIREMENTS_CATALOG.md)                       | Complete CAP/ING/EXT/AI/SRCH/NOT/REV/DIG/SEC/OPS/RAG requirement registry                    |
| [RELEASE_ROADMAP.md](RELEASE_ROADMAP.md)                                 | V0, V1, V1.1, V1.5, V2, V3, phases 0–10, gates, epics, dependencies                          |
| [TICKET_EXECUTION_ORDER.md](TICKET_EXECUTION_ORDER.md)                   | Exact first, second, third, and onward Linear ticket queue                                   |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                       | System boundaries, components, integrations, deployment, and risks                           |
| [API_SPEC.md](API_SPEC.md)                                               | Versioned endpoint, payload, response, auth, error, upload, job, search, and RAG contracts   |
| [DATA_MODEL.md](DATA_MODEL.md)                                           | Operational, search, processing, audit, and future RAG entities and lifecycle                |
| [MOBILE_CAPTURE_SPEC.md](MOBILE_CAPTURE_SPEC.md)                         | iOS Shortcut, future Android share target, web capture, retry, and setup behavior            |
| [NOTION_INFORMATION_ARCHITECTURE.md](NOTION_INFORMATION_ARCHITECTURE.md) | Notion properties, views, sync/reconciliation, and authority limits                          |
| [AI_AND_RAG_SPEC.md](AI_AND_RAG_SPEC.md)                                 | Extraction, routing, enrichment, local Ollama, hybrid retrieval, citations, evaluation       |
| [SECURITY_PRIVACY_GOVERNANCE.md](SECURITY_PRIVACY_GOVERNANCE.md)         | Threat model, classifications, provider routing, deletion, export, prompt-injection controls |
| [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)                           | Reliability, logging, dashboards, retry, quota controls, backup, restore, incidents          |
| [TESTING_AND_ACCEPTANCE.md](TESTING_AND_ACCEPTANCE.md)                   | Test pyramid, fixtures, performance, resilience, V1 and V1.5 gates                           |
| [RISK_REGISTER.md](RISK_REGISTER.md)                                     | Product, technical, privacy, platform, cost, RAG, and productization risks                   |
| [LAUNCH_AND_PRODUCTIZATION.md](LAUNCH_AND_PRODUCTIZATION.md)             | Personal beta, launch, kill/pivot criteria, and public-SaaS implications                     |
| [DECISIONS.md](DECISIONS.md)                                             | Frozen decisions, conditional decisions, and open human decisions                            |
| [TRACEABILITY.md](TRACEABILITY.md)                                       | Goal → requirement → phase → ticket → test mapping                                           |
| [PROMPTS_AND_SCHEMAS.md](PROMPTS_AND_SCHEMAS.md)                         | Enrichment and grounded-answer prompt/output contracts                                       |
| [OFFICIAL_SOURCES.md](OFFICIAL_SOURCES.md)                               | Provider documentation registry and revalidation policy                                      |
| [WORKFLOW.md](WORKFLOW.md)                                               | Premium build workflow, ticket gate, human gates, evidence rules                             |
| [repo_context.md](repo_context.md)                                       | Current codebase conventions and landmines                                                   |
| [BUILD_STATUS.md](BUILD_STATUS.md)                                       | Implemented versus remaining work and current verification evidence                          |
| [tickets/](tickets/)                                                     | Self-contained implementation tickets                                                        |

## Scope hierarchy

1. The source PRD defines product intent and full lifecycle scope.
2. `DECISIONS.md` freezes resolved choices and records human-owned decisions.
3. Domain specs define exact contracts.
4. `REQUIREMENTS_CATALOG.md` supplies stable requirement IDs.
5. `TRACEABILITY.md` connects requirements to delivery and verification.
6. Ticket files govern implementation sessions.
7. `BUILD_STATUS.md` alone states what exists now.

## Change control

Any API, database, event, auth, privacy, deletion, or shared-schema change requires same-day updates to the relevant domain spec, requirement IDs, traceability row, affected ticket, tests, and Linear. New future ideas enter as Exploratory and cannot bypass release gates.
