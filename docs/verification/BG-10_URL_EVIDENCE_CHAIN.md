# BG-10 — Durable URL evidence and processing-chain verification

Status: **COMPLETE.**

Tracking: GitHub #51 / Linear OPE-330.

Base branch: `main`  
Base revision: `b8c41d729dc613fb43e9c371eadacf73a57232d7`  
Work branch: `agent/ope-330-bg-10-url-evidence-chain`

## Prerequisite

BG-09 is merged at the base revision above. Its final closeout explicitly unlocks
BG-10, so the bounded source-fetch boundary is available before this implementation.

## Implemented system

BG-10 adds a durable URL-source evidence layer without fabricating attachment rows:

- migration `0022_add_url_acquisition_evidence.sql` adds
  `items.source_revision` and immutable `url_acquisitions`;
- URL captures schedule `acquire_url` through the existing
  `processing_jobs` lease system after canonical capture persistence;
- BG-09 `SourceFetcher` performs bounded source-host I/O outside D1;
- non-Public privacy snapshots persist `policy_blocked` evidence without calling
  the source host;
- result acceptance is guarded by the current lease, item existence/deletion,
  purge state, source URL/revision and privacy snapshot;
- one D1 batch persists terminal evidence, conditionally creates eligible
  enrichment work, records a non-content audit event and terminally updates the
  acquisition job;
- automatic transient acquisition is capped at three attempts;
- URL-plus-attachment captures wait for both acquisition and extraction before
  the final enrichment handoff;
- enrichment consumes current acquired source text without copying it into
  `items.raw_text` or bypassing field overrides;
- item detail exposes URL acquisition history, bounded execution observability,
  and a current-evidence projection; the Web Inbox renders acquired source text
  through React text/read-only form values rather than executable markup;
- FTS includes current acquired text in `source_text`, source-revision changes
  remove stale terms immediately, and the rebuild script derives the same
  projection;
- portable export schema `2026-09-19.1`, current-evidence CSV summary,
  clean-target restore, canonical purge and integrity scanning include URL
  evidence;
- D1 enforces the frozen response/text/redirect/attempt bounds in addition to
  service-layer validation;
- generic same-job admin retry rejects `acquire_url`; generation-aware owner
  retry remains explicitly scoped to BG-11.

## Data authority

`items.raw_text` remains owner/client-supplied evidence.
`url_acquisitions.acquired_text` is source-host evidence.
Generated title/summary/topics/etc. remain derived data.

A URL acquisition row is immutable. A later source URL change increments
`items.source_revision`; old rows remain provenance but no longer qualify as
current source evidence. Privacy changes similarly make rows with the old
`privacy_level_snapshot` non-current.

## Security boundaries

- source-host I/O is automatic only for a current `public` item;
- Unknown, Personal and Sensitive items do not contact the source host;
- BG-09 still enforces HTTPS destination validation, redirect revalidation,
  private/local address blocking, no credentials/cookies, no JavaScript execution,
  bounded bytes/characters/redirects and a total deadline;
- full URLs and acquired text are not written into structured worker log labels;
- fetched HTML/text remains untrusted data and is returned through JSON/text
  contracts, never executed;
- no production D1 migration, source-host probe or credentialed production
  operation is part of this task.

## Focused regression proof

`apps/worker-api/test/source-acquisition.d1.spec.ts` covers:

1. migration contract and the rule that BG-10 does not overwrite `raw_text`;
2. policy-blocked acquisition with zero source-host calls;
3. stale privacy snapshot rejection before source-host I/O;
4. source-revision changes during fetch are rejected before stale evidence can persist;
5. durable acquired text and SHA-256 evidence;
6. an internal phrase found through FTS independently of AI plus
   `EXPLAIN QUERY PLAN` evidence that the keyword path uses the FTS virtual
   table index;
7. source-revision replacement immediately removing stale search terms;
8. crash/replay convergence with one evidence row, one acquisition-completion
   audit event and one active downstream enrichment job;
9. transient retry followed by a terminal failed third attempt with durable
   outcome evidence;
10. fail-closed AI routing producing no doomed enrichment work;
11. portable JSON/CSV export plus clean restore preserving source evidence and
    FTS usability;
12. permanent purge removing URL evidence and its searchable terms;
13. generic manual retry rejection for immutable acquisition-job evidence.

`apps/worker-api/test/recovery-migration.d1.spec.ts` applies the final migration
to a populated prior schema and verifies canonical item/job data survives, the
new evidence table exists, `source_revision` is initialized, the FTS projection
contains `source_text`, and foreign keys remain clean.

## Verification gate

BG-10 is complete.

- PR #52 merged to `main` at
  `a065c91b650b6b123d3468542e47e723f8a2383f`.
- Final candidate head `7e2537d454fccb071995b249bbdf4e1e6e9c5dd6` passed CI
  #299:
  <https://github.com/anmolsansi/Recollect-Flow/actions/runs/35451411456>.
- The merged revision passed CI #300:
  <https://github.com/anmolsansi/Recollect-Flow/actions/runs/35451510228>.
- The successful repository gate includes Prettier, lint, strict TypeScript,
  shared-contract checks, Web production build, 153 Node tests across 24 files,
  142 workerd/D1 tests across 35 files, 9 Web tests across 2 files, fresh local
  D1 migration replay through `0022_add_url_acquisition_evidence.sql`, Chrome
  availability, and the real browser-download regression.
- BG-10.001 through BG-10.100 are reconciled as satisfied.
- BG-11 is unlocked.
- No production migration, deployment, credentialed live-source probe, or other
  production mutation was performed as part of BG-10.
