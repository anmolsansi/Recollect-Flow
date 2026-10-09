# BG-11 — Final merged-main closeout

**Status: COMPLETE for the approved BG-11 URL-recovery scope. BG-12 is unlocked, not completed.**

- GitHub tracking: [#53](https://github.com/anmolsansi/Recollect-Flow/issues/53) (closed).
- Linear tracking: [OPE-337](https://linear.app/openclaw-neutron/issue/OPE-337/bg-11-handle-unavailable-urls-retries-and-old-captures).
- Implementation: [PR #54](https://github.com/anmolsansi/Recollect-Flow/pull/54), merged to `main` on **2026-10-09**.
- Implemented merged-main revision: `dfb8af789a27ef5a3732c20955c1684341bd5c5d`.
- Final implementation PR-head revision: `463ee420f7e428a72e92ad4279ae12cee3e05b2a`.
- [Final PR-head CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37980919053): **success**.
- [Merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37981181748): **success**, `push` event, exact revision `dfb8af789a27ef5a3732c20955c1684341bd5c5d`.

## Accepted functionality

BG-11 adds owner-recoverable URL capture behavior on top of BG-09/BG-10 without weakening capture or acquisition provenance.

1. A saved URL and its immutable capture event remain durable when page acquisition fails, is limited, or is disallowed.
2. Transient source-acquisition retry is bounded by the existing three automatic attempts and a capped server `Retry-After` hint. At most three accepted owner retries per current URL revision are permitted.
3. Only current Public, safe-destination, non-deleted, non-purging, non-paused URLs qualify for source-host acquisition. Repeated active-generation retries return the existing job.
4. Supplying permitted owner text records separate provenance and searchable evidence without inventing fetched page coverage or modifying older capture events. Replacing a URL advances `source_revision` and prevents late old-source evidence from becoming current.
5. Legacy URL-only acquisition candidates can be previewed without fetching; actual reprocessing requires explicitly reviewed IDs with a maximum of 20 per call. Deployment and migration do not trigger a sweeping backfill.
6. Web item detail preserves the original source link and provides safe limitation messages, backend-controlled retry eligibility, owner-text entry, replacement URL entry, and truthful displayed coverage.

## Verified test and quality gates

The passing merged-main run above executed the repository `CI` workflow, whose required steps are `npm ci`, `npm run check` (format, lint, typecheck, Node and workerd/D1 tests, contract and Web checks/build), `npm run db:migrate:local`, Chrome availability, `npm run browser:download:test` and `npm run browser:source-recovery:test`.

The passing PR-head run included 157 Node tests, 153 D1 tests and 12 Web tests. BG-11-specific regression evidence includes:

- timeout followed by successful source acquisition and immutable outcome records;
- denied privacy retry, bounded/deduplicated owner retry and old-item batch exclusions;
- replacement/revision race handling, preserved source history and FTS invalidation;
- changed acquired-text SHA-256, changed-source audit evidence and no stale terms;
- a real isolated headless Chrome keyboard path: Tab from supplied-text input, Enter activation, persisted owner text and retained original URL. No live source-host fetch was used.

The exact passing merged-main CI is stronger than relying only on a successful PR run; it confirms the actual merged revision.

## Checklist reconciliation and BG-12 handoff

The [canonical BG-11 checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-11--100-executable-microtasks) has **99 checked steps and one deliberately unchecked downstream dependency**:

- `BG-11.028`, *Apply approved aggregate status*, is **not BG-11 implementation evidence**. The approved [URL acquisition contract](../URL_ACQUISITION_CONTRACT.md) and [BG-12 build-guide chapter](../RECOLLECTFLOW_BUILD_GUIDE.md#18-bg-12--define-one-aggregate-processing-state-rule) explicitly assign aggregate `items.processing_status` decisions to BG-12/BG-13. No new aggregate state has been invented, implemented or claimed in BG-11.
- `BG-11.100`, *parent gate and BG-12 unlock*, is satisfied by the merged PR and the passing `main` CI. BG-12 is available to begin at this verified source revision, subject to its own contract and acceptance requirements.

This is **99/99 completed BG-11-applicable steps, plus one explicitly delegated BG-12 step**, not a claim that all 100 requirements have been implemented or that BG-12 is complete.

## Scope boundaries and release state

Only local, mocked/workerd D1 and isolated headless-browser acceptance was performed. These records **do not claim** a production database migration, deployed Worker/Web build, production smoke test, live Instagram fetch, login-wall bypass, access to real private material, automatic historical URL backfill, or full V1 acceptance.

Any production rollout remains subject to the separate operational release gates in [RELEASE_ROADMAP.md](../RELEASE_ROADMAP.md) and [TESTING_AND_ACCEPTANCE.md](../TESTING_AND_ACCEPTANCE.md).

The detailed implementation and acceptance rationale remain in [BG-11_URL_RECOVERY.md](BG-11_URL_RECOVERY.md). This final closeout supersedes its pre-merge status claims.
