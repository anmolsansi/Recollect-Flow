# BG-12 — Repository-wide Markdown and completion audit (2026-10-10)

**Status:** Verified and merged on `main` at `65d646b4581a8add27bc0de6f8580f609b2a5b77`;
[merged-main CI 38045040286](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38045040286) passed.

**Scope:** All 87 tracked `.md` files on `main` as of
`68e730136be7c297443ab72ca850150d01646ba1`, including the repository
and Web READMEs, client guides, documentation, ticket manuals, and verification
evidence. The audit checked BG-12/BG-13 claims, processing-status contracts,
superseded milestone language, canonical checklist provenance, and CI references.
It did **not** treat a historical phase report as a current deployment claim.

## Source-of-truth checks

| Evidence                                                                                                             | Observed result                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| BG-12 implementation [PR #57](https://github.com/anmolsansi/Recollect-Flow/pull/57)                                  | Merged as `408d415d1d54ab8a5c5668a4b19efc03f3a56171`                                               |
| Implementation [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37990069598)               | Success on same revision                                                                           |
| BG-12 final-docs [PR #58](https://github.com/anmolsansi/Recollect-Flow/pull/58)                                      | Merged as `68e730136be7c297443ab72ca850150d01646ba1`                                               |
| Final-docs [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/37990715310)                   | Success on same revision                                                                           |
| [GitHub #56](https://github.com/anmolsansi/Recollect-Flow/issues/56)                                                 | Closed, 50/50 microtasks                                                                           |
| [Linear OPE-338](https://linear.app/openclaw-neutron/issue/OPE-338/bg-12-define-one-aggregate-processing-state-rule) | Done                                                                                               |
| [Canonical BG-12 microtasks](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-12--100-executable-microtasks)               | 100/100 checked                                                                                    |
| [BG-12 decision contract](BG-12_AGGREGATE_STATE_CONTRACT.md)                                                         | Pure typed helper, explicit verified generation, clock, precedence, separate limited URL coverage  |
| BG-13                                                                                                                | **Not completed**; still owns atomic persisted status transitions and list/detail/filter agreement |

## Document corrections identified

A source-wide text review found pre-BG-12 completion wording in current-facing
`docs/API.md`, `docs/API_SPEC.md`, `docs/BUILD_STATUS.md`,
`docs/RELEASE_ROADMAP.md`, and `docs/repo_context.md`. The references were
reconciled to the verified BG-12 rule and retained BG-13 write-time boundary.
The documentation index, build guide, and BG-11 handoff/checklist needed
as-of-date context so old “BG-12 unlocked” proof was not misread as current
status. The BG-08/09/11 verification reports remain **historical evidence**:
they truthfully record what each earlier milestone had and had not delivered
at its own commit, not the status of every successor today.

The build guide's original “proposed” table was kept for decision history,
but explicitly distinguished from the **adopted, tested** BG-12 rule.
The BG-11 checklist preserves **99 checked / one unchecked**: `BG-11.028`
asks for application of the aggregate state, which remains an implementation
dependency for BG-13 after BG-12 defined the decision rule.

## Verification gap addressed

`apps/worker-api/test/aggregate-processing-state.test.ts` had a deletion
assertion but lacked an explicit restored-item assertion despite the canonical
`BG-12.089` deleted/restored requirement. A new deterministic regression
evaluates the same evidence first while deleted (status excluded), then after
restoration (new current-generation result wins, old failed evidence ignored).
This does not claim restore workflows or database write-time epoch changes are
implemented. [Audit PR #59](https://github.com/anmolsansi/Recollect-Flow/pull/59)
passed [exact-head CI 38044908495](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38044908495)
and merged at `65d646b4581a8add27bc0de6f8580f609b2a5b77`.
The [exact merged-main CI 38045040286](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38045040286)
**passed**. These runs include repository checks, local D1 migrations, and
browser download and source-recovery acceptance.

## Preserved scope

No change was made to historical baseline evidence just to update its old
release date. Unrelated Markdown files without stale BG-12 statements need no
cosmetic edits. No production migration, data backfill, live URL fetch,
private capture, or infrastructure deployment was part of this audit.

**Current owner of outstanding behavior:** BG-13 — transactionally persist the
BG-12 decision with provable generation identity and synchronize the public
read/filter surfaces. See [the adopted BG-12 contract](BG-12_AGGREGATE_STATE_CONTRACT.md)
and [build-guide BG-13 chapter](../RECOLLECTFLOW_BUILD_GUIDE.md#19-bg-13--update-transitions-atomically-and-reject-stale-workers).
