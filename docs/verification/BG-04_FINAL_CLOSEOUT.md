# BG-04 — Final Closeout

Status: **complete; BG-05 unlocked**

This post-merge closeout is the authoritative completion record for BG-04. The pre-merge `BG-04_CHECKLIST_RECONCILIATION.md` intentionally stopped at `99/100`; this file records the parent gate that could only become true after the validated implementation PR merged.

## Completion facts

- GitHub issue: #31 — closed by the implementation merge
- Linear: OPE-324
- Implementation PR: #32
- Base before BG-04: `67c9ec7df369ca4f3413a40d97ceab03f23e4495`
- Final clean documentation-complete PR head: `2fce629709ec210320124c7eca5e518df1479f39`
- Final clean-head CI: GitHub Actions CI run #147 — **success**
- Implementation merge commit on `main`: `feb568f6438bc7068520fb654ca933238b9f8c28`

CI run #147 passed on the exact PR head that was merged. The run completed both the repository `npm run check` chain and `npm run db:migrate:local` successfully. The implementation PR then merged without changing that validated head.

## BG-04.100 reconciliation

BG-04.100 required the documentation-complete PR head to pass CI, PR #32 to merge, and only then for BG-04 to be considered complete and BG-05 unlocked.

That gate is satisfied:

1. `BG-04.001` through `BG-04.099` were reconciled before merge;
2. final clean-head CI run #147 passed on `2fce629709ec210320124c7eca5e518df1479f39`;
3. PR #32 merged successfully;
4. the resulting `main` merge commit is `feb568f6438bc7068520fb654ca933238b9f8c28`;
5. GitHub issue #31 closed as completed.

Therefore the authoritative BG-04 checklist is **100/100 satisfied**. The `99/100` wording in `BG-04_CHECKLIST_RECONCILIATION.md` remains a truthful pre-merge snapshot and is superseded by this post-merge closeout record.

## Outcome

BG-04 is complete. The release verifier now reports named passed, failed and unavailable stages; protects remote targets behind explicit opt-in; distinguishes exact replay from normalized duplicates; verifies provenance and raw retrieval; preserves BG-03 authoritative version behavior; separates policy eligibility from adapter execution; proves attachment byte integrity without overstating parsing; preserves the browser-cookie attachment gap as later BG-07 work; covers version-aware edit, delete, search exclusion, restore, search restoration and JSON export; keeps permanent purge outside default smoke; and documents the real two-terminal local startup flow.

Known later-stage capabilities remain explicitly outside BG-04 rather than being converted into false passes: provider adapter execution, parseable-PDF extraction acceptance, browser-cookie attachment download, and bare-URL acquisition/enrichment.

BG-05 is now unlocked.
