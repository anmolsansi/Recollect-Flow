# RecollectFlow delivery workflow

The exact one-ticket-at-a-time queue is maintained in [TICKET_EXECUTION_ORDER.md](TICKET_EXECUTION_ORDER.md). Do not select work by issue number alone.

## Build order

1. **M0 — decisions:** approve scope, accounts, sensitivity policy, and human-owned integration choices.
2. **M1 — reliable capture:** repository, D1, capture API, conservative deduplication, iPhone Shortcut, then attachments.
3. **M2 — review:** approve Notion schema, then implement retry-safe projection.
4. **M3 — enrichment:** extraction and provider-neutral AI jobs after privacy policy approval.
5. **M4 — recall:** FTS5 search and resurfacing/digest.
6. **M5 — release:** security, observability, backup/export/delete/recovery, end-to-end acceptance.
7. **M6 — V1.5 RAG:** only after M5 acceptance and 100 useful captures.

## Ticket gate

Before implementation, every ticket must score PASS on: buildable context, exact paths, complete contracts, listed tests, unblocked dependencies, no missing decisions, and honest scope. One ticket is implemented and reviewed at a time. Contract-changing discoveries return to planning and update both docs and Linear.

## Session loop

1. Read `docs/repo_context.md`, the ticket, and its direct dependencies.
2. Run intake; stop on any FAIL.
3. Write an implementation plan naming files, contracts, and tests.
4. Implement the smallest coherent change; preserve raw-before-derived ordering.
5. Run targeted tests, then `npm run check`, then relevant migration/browser/device QA.
6. Review security, error states, observability, deletion semantics, and scope drift.
7. Update ticket/Linear status with evidence and explicit blockers.

## Human gates

Cloudflare/Notion/Telegram account creation, production secrets, iPhone Shortcut installation, policy approval, and destructive production deletion require the owner. Those tickets remain clearly labeled and are never silently simulated as complete.

## Release evidence

A milestone is complete only when its acceptance criteria have current test evidence. “Code exists” is insufficient. The current repository is an operational foundation slice, not a V1 release.
