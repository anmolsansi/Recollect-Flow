# BG-11 — URL recovery, manual retries, and legacy backfill

Status at the BG-11 baseline: **implementation complete, merged and
CI-verified on `main`**. BG-12 was unlocked but not implemented as part of
BG-11. The successor [BG-12 contract is now complete](BG-12_FINAL_CLOSEOUT.md);
BG-13 remains responsible for applying the rule to persisted item states. The implementation was
merged in [PR #54](https://github.com/anmolsansi/Recollect-Flow/pull/54).
See the [final merged-main closeout](BG-11_FINAL_CLOSEOUT.md). Do not infer
a production deployment or aggregate-status implementation from these records.

Tracking: [GitHub #53](https://github.com/anmolsansi/Recollect-Flow/issues/53) /
[Linear OPE-337](https://linear.app/openclaw-neutron/issue/OPE-337/bg-11-handle-unavailable-urls-retries-and-old-captures).

Baseline: merged and validated BG-10 at
`2e32b6c64b9968afeff7db9f5f21a5cb55595409`.

## Product rule

A saved bookmark survives an unavailable page. URL acquisition evidence remains
immutable. The canonical item, the original capture event, submitted URL, reason,
and owner edits cannot disappear because a site times out, denies access, or
returns an unsupported format. Fetched content is untrusted data, not an
instruction to execute.

Automatic source-host fetch is only allowed for **Public** items. The service
revalidates source revision, privacy, deletion, purge state, operational pause,
and safe destination on every manual retry, then checks again when enqueuing.

## Recovery outcome matrix

| Outcome                                      | Manual retry            | Owner-facing next action                                        |
| -------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Timeout, network error, 429, server 5xx      | Eligible, bounded       | Retry the same current URL                                      |
| Source not yet acquired (legacy bare URL)    | Eligible if Public/safe | Preview and explicitly request acquisition                      |
| 401/403/login wall                           | No                      | Paste permitted text or supply a screenshot; no credentials     |
| 404/410/missing page                         | No blind retry          | Bookmark retained; paste text or replace URL                    |
| Destination/policy blocked                   | No                      | Change authorized source or privacy through the normal controls |
| Unsupported, oversized, empty, parse failure | No                      | Supply an excerpt or supported file                             |
| Acquired text/metadata only                  | No blind retry          | Existing evidence remains; add owner text if useful             |

The backend's eligibility endpoint, not a guessed status badge, decides whether
the Retry button is offered. A repeated request with a pending/processing
current-generation job returns the existing job ID. A completed terminal
acquisition is never rewritten; each accepted new attempt creates a new job
and new immutable evidence row.

## API usage

All endpoints below require the existing authenticated admin session. Responses
use the repository's `{data,meta}` envelope with `request_id`. Errors use
stable error codes and do not echo destination URLs.

- `GET /api/v1/items/:id/source/retry-eligibility?source_revision=1`:
  returns `eligible`, `reason` and `active_job_id`.
- `POST /api/v1/items/:id/source/retry` with
  `{"source_revision":1}`: creates one pending current-generation job or
  returns the existing active job without creating duplicates.
- `POST /api/v1/items/:id/source/text` with
  `{"edit_version":1,"text":"Owner-supplied excerpt"}`: adds owner text
  only when none exists, increments the edit version, records a SHA-256/length
  provenance event and makes the supplied text searchable. It does **not**
  rewrite the original capture event.
- `POST /api/v1/items/:id/source/url` with
  `{"edit_version":1,"source_url":"https://example.com/new"}`:
  validates destination and deduplication ownership, replaces the source URL,
  increments its generation, and enqueues new acquisition. BG-10 discards
  late results from the old generation.
- `GET /api/v1/admin/source-reprocess/preview?limit=20`:
  returns count plus item IDs/revisions for eligible old Public URL records
  lacking current evidence. No source-host network access occurs.
- `POST /api/v1/admin/source-reprocess/run` with
  `{"items":[{"item_id":"id","source_revision":1}]}`:
  processes at most **20 explicit, unique reviewed IDs**, returning per-item
  queued, existing or skipped outcomes. No deployment hook calls this endpoint.

Current source acquisition still enforces the BG-09 8-second deadline, 5
redirects, 2 MiB response limit, 250,000 extracted characters, and 3 automatic
transient attempts. A bounded upstream `Retry-After` header, up to 24 hours,
sets the next eligible time without busy polling.

## Code map

- `source-recovery.policy.ts`: stable outcome/next-action classification.
- `source-retry-after.ts`: bounded server retry delay parser.
- `source-recovery.service.ts`: snapshot/eligibility, idempotent enqueue,
  preview and explicit-ID backfill.
- `source-evidence.service.ts`: versioned owner text and URL replacement.
- `source-recovery.routes.ts`: authenticated HTTP validation and envelopes.
- `source-acquisition.service.ts`: applies bounded backoff hints to existing
  durable job failure scheduling.
- `App.tsx` and `source-recovery.ts`: bookmark, limitations, safe actions,
  retry timing and accessible owner input.

## Verification boundary

Focused D1 regressions are in
`apps/worker-api/test/source-recovery.d1.spec.ts`; fixed timing/outcome
regressions are in `apps/worker-api/test/source-retry-after.test.ts`.
Repository-wide checks, migration replay and actual browser download are the
CI gate. CI evidence must be recorded here after a successful exact-head run.

The legacy candidate preview and execution are **opt-in only**. Production
database migrations, automatic backfills, credentialed page fetching, and a
production deployment are not authorized by this implementation.

## Automated verification and honest exceptions

- [Full passing PR CI on 48e8089](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37972643315):
  formatting, lint, TypeScript checks, 157 Node tests, 152 D1 tests,
  9 web tests, contract checks, production Web build, local DB migrations,
  and browser download tests.
- [Full passing PR CI on 78c0d3e](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37972755448):
  same checks after removal of the temporary formatter workflow.
- [Exact-head CI on `7172bf746e483cd38b4439c538f57254002470fb`](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37980405822)
  passed. This includes 157 Node tests, 153 D1 tests, 12 Web tests,
  TypeScript, lint, formatting, contracts, local D1 migrations, original
  browser download, and new real Chrome keyboard recovery acceptance.
- [Final PR-head run 37980919053](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37980919053): success on `463ee420f7e428a72e92ad4279ae12cee3e05b2a`.
- [Merged-main run 37981181748](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37981181748): success on exact merge commit `dfb8af789a27ef5a3732c20955c1684341bd5c5d` (2026-10-09).
  Previously failing interim revisions were fixed before the passing final gate.
- `BG-11.028` requires the future BG-12 aggregate-status contract.
  This task intentionally does not guess aggregate status semantics.
- `BG-11.088` passed a real isolated Chrome keyboard test: input text,
  Tab to an enabled Save button, Enter to submit, verified persisted owner
  text, and verified the original URL link remains present.
  The test performs no source-host network I/O.
- `BG-11.072` is covered by the D1 hash-change regression. It proves two
  different SHA-256 source hashes, preserved old evidence, a changed-content
  audit event, and immediate stale-term FTS invalidation. The exact-head
  CI above passed this test.
- Later owner-supplied text is represented truthfully in Web as supplied
  coverage without changing historical fetched-text evidence. A dedicated
  Web regression verifies this precedence.
- No production or live Instagram/other website access was performed.
  Network and privacy cases use deterministic fixtures instead.

The authoritative [BG-11 checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-11--100-executable-microtasks)
reconciles current proof. `BG-11.028` remains an explicit BG-12
contract/implementation handoff, because the accepted URL acquisition contract
reserves aggregate `items.processing_status` for BG-12/BG-13.
`BG-11.100` is verified by PR #54's merge and the passing merged-main CI.
The BG-11 checklist is 99/100 checked. The only unchecked step, `BG-11.028`,
is explicitly delegated to BG-12 by the approved aggregate-state boundary.
All BG-11-applicable work is completed, but aggregate-state behavior is not
claimed as implemented. Production smoke testing and deployment remain
separate, approval-gated release work.
