# Launch, adoption, future development, and productization

## Personal beta

- **Week 1:** capture ≥10 items/day using Quick Save and Save with Reason; log every failed/annoying step.
- **Week 2:** search daily and compare recovery with Instagram Saved, bookmarks, and existing notes.
- **Week 3:** use daily digest plus one weekly review; remove fields that do not aid decisions.
- **Week 4:** assess useful recollections, failures, correction/review rates, storage/provider usage, and actual cost.

Only observed friction enters V1.1. Speculative native, semantic, graph, or automation features remain gated.

## V1 launch artifact

One-page owner operating guide: install/configure capture, share each input type, understand coverage/privacy/status, search/review, retry a failed item, rotate tokens, export, delete, and recover. Launch requires all criteria in `TESTING_AND_ACCEPTANCE.md` plus owner approval.

## Adoption loop

Capture → optional intent → truthful confirmation → review/correction → search/digest/answer → useful/actioned feedback → ranking/resurfacing improvement. Product success is repeated recovered value, not corpus size.

## Post-V1 development policy

- V1.1 fixes measured friction.
- V1.5 solves proven lexical recall failures with grounded RAG.
- V2 adds clients/context/local multimodal only from measured demand and benchmark evidence.
- V3 activates relationships/briefings/resurfacing after a large useful corpus.
- Every horizon rechecks privacy, cost, maintenance, and simpler alternatives.

## Potential future business/product use cases

- Personal project research and evidence briefings.
- Career/job-search knowledge and application context.
- Creator/content research with source provenance.
- Purchasing/travel/reference collections and reminders.
- Team research inboxes with explicit tenancy/permissions.
- Professional knowledge repositories requiring citations and local/private processing.
- White-label personal knowledge infrastructure or self-hosted deployment.

These are opportunities, not approved implementation scope.

## Public SaaS implications

Productization materially changes architecture and obligations. A separate PRD must cover user/org auth, tenant isolation at D1/R2/jobs/index/cache/Notion/provider boundaries, onboarding, consent/privacy policies, retention/deletion/export rights, billing and usage enforcement, abuse/spam/malware controls, app-store distribution, legal/platform terms, copyright, data residency, subprocessors, observability/SLA/on-call, support, migration, incident/breach response, and paid production model terms.

The personal deployment’s bearer tokens, free-tier assumptions, single Notion database, local worker trust, and manual operations are not reused as a public multi-tenant design without review.

## Productization discovery gate

Before a SaaS build: personal system shows durable retention/value, ≥1,000 useful captures, reliable export/deletion, predictable operating costs, validated user demand beyond the owner, legal review, and an explicit willingness-to-pay/support model. Otherwise remain personal/self-hosted.

## Sunset and portability

At any point the owner can stop optional processing, export canonical data/files/checksums, rebuild Notion elsewhere, preserve original URLs/files, and decommission providers/secrets. The system should fail into a smaller useful capture/search product, not trap the corpus.
