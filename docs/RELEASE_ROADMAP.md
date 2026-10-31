# Complete release and development roadmap

## Current owner direction — local only (October 30, 2026)

The owner chose strict-$0 local operation. BG-31 hosted completion remains
deferred at 78/100; production NO-GO. Local acceptance and a restore from the
user-supplied downloaded encrypted backup passed. The
[BG-32 local handoff](verification/BG-32_LOCAL_ONLY_HANDOFF_2026-10-30.md)
records reusable evidence, 12 passing local tooling tests and the exact resume
conditions. BG-32 deployment remains blocked; no live gate is waived.

## BG-30 reconciled evidence and strict $0 release boundary (2026-10-21)

[BG-30 reconciliation](verification/BG-30_EVIDENCE.md) and the
[feature evidence matrix](verification/BG-30_RELEASE_MATRIX.json) separate
source/CI completion from real production, device and elapsed-time gates.
[GitHub #116](https://github.com/anmolsansi/Recollect-Flow/issues/116)
tracks the documentation closeout. Only safe, zero-additional-cost BG-31
manifest **development** may follow under the
[owner's dependency exception](verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md).
Actual BG-29.078 multistage hourly proof, OPE-247 release-level acceptance,
production deploy, device verification and charge-free billing signoff have
not been waived. No V1 GO or BG-32 deploy authorization follows from this row.

## Roadmap rules

## BG-31 release manifest preparation (2026-10-22)

[BG-31 release packet](releases/BG-31_RELEASE_MANIFEST.md) and
[NO-GO machine manifest](releases/BG-31_RELEASE_MANIFEST.json) now identify the
reviewed baseline, Worker/Web packaging requirements, full ordered migrations,
safe target and secret-name inventory, backup/original/receipt requirements,
smoke stages and rollback triggers. [Verification evidence](verification/BG-31_RELEASE_MANIFEST_EVIDENCE.md)
and [GitHub #119](https://github.com/anmolsansi/Recollect-Flow/issues/119)
track exact source work. This is **source-only preparation** under the strict
$0 development exception. The live production migration ledger, deployed
artifact, previous compatible version, independent backup and release approval
remain unverified. **BG-32 deploy and V1 release remain NO-GO.**

Every phase ends with a user-demonstrable gate. Infrastructure does not count as progress when the real workflow remains unusable. A failed gate blocks dependent work. The [BG-30 evidence matrix](verification/BG-30_RELEASE_MATRIX.json) distinguishes current reviewed source from deployed and accepted versions. `BUILD_STATUS.md` contains dated historical snapshots and must not serve as a standalone current release attestation.

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

**BG-11, BG-12 and BG-13 are verified prerequisites.** BG-14's
real-browser acceptance implementation has merged via PR #64 and passed
its exact PR-head CI. The [BG-14 final closeout](verification/BG-14_FINAL_CLOSEOUT.md)
records its merged-main gate and BG-15 handoff. Production deployment, real Instagram
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
includes the new isolated Chrome journey and
[passing positive source-acquisition proof](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38057058035)
using a test-only upstream fetch mock without bypassing Worker parsing,
security or D1. BG-14 passed full CI on its PR head and merged-main commit,
with [100/100 acceptance](verification/BG-14_FINAL_CLOSEOUT.md).
BG-15 is now unlocked as the browser write-authentication task.
No live production D1 migration, historical automatic backfill or deployment
has been performed, and none is implied by this milestone.

## BG-15 browser write-authentication checkpoint

BG-15 authentication implementation has merged through
[PR #66](https://github.com/anmolsansi/Recollect-Flow/pull/66),
with [passing exact-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38063926575).
This work gives signed owner sessions permission to write through existing
capture and upload routes when the browser's Origin matches the Worker origin.
Capture and admin bearer clients retain the established no-Origin path.
The updated session cookie has a server-enforced expiry. A forged Origin,
invalid bearer, expired session or worker-scoped credential does not gain
capture permission.

[BG-15 verification notes](verification/BG-15_BROWSER_WRITE_AUTH.md)
and [final closeout](verification/BG-15_FINAL_CLOSEOUT.md) record the
93 verified checklist items and the deferred Web form and secret URL checks.
BG-16 requires the completed merged-main and documentation gate. No
production deployment is implied.

## BG-16 browser capture form (implementation merged)

[BG-16 implementation PR #70](https://github.com/anmolsansi/Recollect-Flow/pull/70)
merged to `main` at `2c4fbcdcefbbcf30c70c82bb303d870b0e443619`,
preserving 28 atomic commits. [Exact PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082248375)
passed format/lint/typecheck/unit/contracts/Web build, migrations, the new
isolated Chrome/D1 URL/text/note capture acceptance, and preexisting browser
regressions. The [BG-16 final record](verification/BG-16_FINAL_CLOSEOUT.md)
covers file paths, outcome semantics, privacy, error focus and the handoff to
BG-17. [Implementation merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38082460334) and [documentation merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38086474190) both passed. [Documentation PR #71](https://github.com/anmolsansi/Recollect-Flow/pull/71) is merged. With the BG-16 final checklist gate merged, BG-17 is unlocked. Production deployment and external-provider success are not implied.

## BG-17 stable browser retry implementation (PR #74)

[PR #74](https://github.com/anmolsansi/Recollect-Flow/pull/74)
implements opted-in browser recovery of URL, note and pasted-text captures
while preserving the immutable logical operation on retries. Unfinished
editable drafts are stored separately from submitted requests. Expiry,
quota and logout clearing are explicit. [Issue #73](https://github.com/anmolsansi/Recollect-Flow/issues/73)
tracks the 100 checklist steps; CI and merge evidence are required before
declaring this milestone fully complete. This does not implement BG-18
file uploads or authorize production deployment.

## BG-17 recovery accepted on merged main

[BG-17 completion PR #75](https://github.com/anmolsansi/Recollect-Flow/pull/75)
adds SHA-256 metadata-only file reselection policy, a manual retry
rate boundary and browser reauthentication acceptance on top of merged
PR #74. The supported Web capture actions remain URL, pasted text and note.
Steps belonging to the future BG-18 file picker and PUT/finalize/link workflow
are explicitly conditional N/A for BG-17, **not delivered file uploads**.
The parent BG-17 browser retry/lifetime gate passed exact
[PR-head CI #38119506197](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38119506197)
and [merged-main CI #38119715846](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38119715846)
on merged [PR #75](https://github.com/anmolsansi/Recollect-Flow/pull/75).
This gate does not imply completion of BG-18. See
[BG-17 final acceptance](verification/BG-17_FINAL_CLOSEOUT.md).
No production deployment is included.

## BG-18 browser attachment gate (completed in repository)

The predecessor BG-17 and BG-18 are verified on merged main. BG-18 was
merged in [PR #78](https://github.com/anmolsansi/Recollect-Flow/pull/78)
and closed in [issue #77](https://github.com/anmolsansi/Recollect-Flow/issues/77).
One-file selection, bounded SHA-256, authenticated init/status, byte transfer,
finalize, canonical linking and retry recovery are implemented. Recovery keeps
metadata, not original bytes. [PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38123657728)
and [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38123825547)
both passed isolated Chrome/D1/R2 PDF and image round-trip hash verification,
rejection cases, and preexisting regressions. BG-19 is unblocked. No production
rollout or physical-iPhone acceptance is claimed.

## BG-19 follow-up metadata (repository complete)

[Issue #79](https://github.com/anmolsansi/Recollect-Flow/issues/79) and
[merged PR #80](https://github.com/anmolsansi/Recollect-Flow/pull/80)
implement post-capture project/review-date editing without widening the strict
capture payload. The original capture is confirmed first; a separate versioned
item update may then apply optional metadata. A partial metadata failure is
announced as Saved with follow-up retry, not as a failed capture. Duplicates and
existing owner changes are not silently overwritten. The item date editor
displays local time rather than UTC digits.

The [BG-19 verification record](verification/BG-19_FOLLOW_UP_FIELDS.md)
documents implementation boundaries, failure evidence, and verified tests.
The [PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38131123654)
and [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38131384768)
passed. BG-19 is complete in the repository at 100/100; BG-20 is unlocked
for implementation only. No production deployment or physical-device signoff
is implied.

## Current Web hosting decision gate

- **BG-19:** repository-complete; existing capture and follow-up behavior precedes Web hosting work.
- **BG-20:** choose the documented Worker address
  `https://recollect-flow.recollectflow.workers.dev/` as the production
  Web Inbox origin, with one Worker/Web artifact and secure same-origin
  API and cookie behavior. [Full decision and request matrix](verification/BG-20_WEB_ORIGIN_DESIGN.md).
  This is a reviewable architecture deliverable, **not a deployment**.
- **BG-21:** Worker asset binding, explicit SPA/API routing and one-artifact
  release packaging are implemented on [PR #84](https://github.com/anmolsansi/Recollect-Flow/pull/84),
  with [verification matrix](verification/BG-21_WEB_HOSTING.md). Release/CI and
  actual isolated remote HTTPS preview acceptance are not yet proven. No
  production promotion is authorized; BG-22 remains blocked until BG-21's
  full required evidence and merge checks pass.
- **BG-22:** close full browser creation and hosting acceptance only
  after the actual release candidate passes. Operator authorization is
  required for any production change.

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
