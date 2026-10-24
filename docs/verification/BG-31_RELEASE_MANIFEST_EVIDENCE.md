# BG-31 — Release-manifest preparation and verification

**As of:** 2026-10-22.  
**GitHub:** [#119](https://github.com/anmolsansi/Recollect-Flow/issues/119) · **Linear:** [OPE-345](https://linear.app/openclaw-neutron/issue/OPE-345/bg-31-prepare-the-v1-release-manifest-without-production-changes).  
**Branch:** `feat/bg-31-release-manifest`, base `main` at `195fcd65f6a75667228c718411a95b1c20a70679`.  
**Baseline exact CI:** [#39752503664](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39752503664), successful on that source. This is **not** CI on the BG-31 branch.  
**Manifest:** [human release packet](../releases/BG-31_RELEASE_MANIFEST.md), [machine-verifiable NO-GO JSON](../releases/BG-31_RELEASE_MANIFEST.json).

## Verified branch checkpoint CI (not production release proof)

The prior branch checkpoint `2649603a8f8f83fca997c6e115c1338b8afb88d4`
passed [GitHub Actions run #39758159109](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39758159109)
with all quality, formatting, typecheck, package, Wrangler **dry-run**,
local D1 and browser acceptance steps successful. Six BG-31 source-only
manifest tests passed. No artifact was uploaded from that run.

In that run, the packaging step executed on the **GitHub-generated PR merge commit**
`d045e14ac0cb9c1c530f9830d96de46faebc34da`
(with parents main `195fcd65...` and branch `2649603a...`) and reported Web release ID
`4d71d3b8e237b8f32bc5d79a471b6c872132c0845c0d24ccc010677a728b7c0e`
with five bundled public files. Wrangler identified version `4.116.0`.
This is reproducible **CI checkpoint evidence**, not an approved immutable
Worker bundle, an uploaded Web manifest or final source/artifact match.
Any later branch commit requires a new successful exact-head CI run.

The focused proof and checklist review are completed only for the source-only
scope. BG-32 remains blocked. Missing hosted account, migration, backup,
rollback-artifact, operator and approval evidence stays **NOT VERIFIED**.

## Follow-up: source-only migration preflight and CI reconciliation

After the original manifest, BG-31 added
[`scripts/bg31-migration-ledger.mjs`](../../scripts/bg31-migration-ledger.mjs)
with five negative/positive Node cases in
[`scripts/bg31-migration-ledger.test.mjs`](../../scripts/bg31-migration-ledger.test.mjs)
and the `npm run bg31:ledger:test` gate in root `npm run check`.
It reads only a caller-supplied local JSON ledger and the source-controlled
migration filenames. It does not call Cloudflare. Prefix validation rejects
missing, duplicate, unknown or reordered migrations rather than fabricating
pending production SQL. A successful run on synthetic JSON is not live D1 proof.

[CI #39780508581](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39780508581)
was successful on branch head `f0f96cc277e5674edf9a9472bd6423d89f097da3`
with local Node/D1, package/dry-run and Chrome browser acceptance. Runner
Node `22.23.3`, Wrangler `4.116.0` and Chrome `155.0.8059.39`
were observed in CI logs. These prove local browser tests, **not** real
hosted HTTPS or a production session. Any newer head must pass its own CI.

The canonical checklist additionally records directly evidenced source/toolchain,
source migration head, full local test and browser proof, declared secret
**names** and nonsecret variables, documented deep-link stop/fallback and the
observed lack of deployment authorization. Actual secret presence, live origin,
artifact pairing, source-to-live migrations, financial boundary and owner
approval remain unverified.

## Scope and prior evidence

[BG-30 final closeout](BG-30_FINAL_CLOSEOUT.md) is merged on main and its GitHub issue #116 is closed. It reconciles implementation documentation, not operational acceptance. The [BG-30 release matrix](BG-30_RELEASE_MATRIX.json) has null deployed identities and unknown production/device evidence. BG-29.078 is still deferred at 99/100. Under the [owner's $0 downstream exception](BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md), BG-31 may prepare local documents, offline tests and CI, but may not query/write hosted R2, deploy, run remote migrations, send provider messages or incur charges. OPE-247 remains In Progress.

The BG-31 task is _manifest preparation_, not a command to execute BG-32. An approval must identify the exact final source SHA, packaged Web `release_id`, Worker artifact, target account/bindings, verified independent backup and declared mutations. Those fields are intentionally **null or NOT VERIFIED** in the machine manifest until evidence exists. D1 applied ledger, current remote Worker version and Web origin have **not** been inspected here. No Cloudflare account connection, external provider credential, backup artifact, signed owner release authorization or validated recovery operator was available for such a claim.

## Changes and why they matter

- `docs/releases/BG-31_RELEASE_MANIFEST.md`: human-readable source and live target identities, migration chain and compatibility stop rules, required bindings and secret **names only**, independent backup and purge-receipt instructions, staged smoke, rollback decisions and no-go authorization packet. It is a controlled planning artifact rather than an implied change approval.
- `docs/releases/BG-31_RELEASE_MANIFEST.json`: explicit machine-readable `NO_GO`, null future artifact/approval/remote facts, exact source migration names and fail-closed gates; makes misleading “ready” assumptions detectable in CI.
- `scripts/bg31-manifest.test.mjs`: offline Node checks for artifact honesty, complete source-controlled migrations, matching `wrangler.toml` identifiers/secret names, smoke stages, missing backup evidence and unchanged $0/BG-29/BG-32 rules. It never connects to external systems.
- `package.json`: adds `npm run bg31:manifest:test` to the normal `npm run check` quality gate so later source/manifest drift cannot silently pass.
- `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`, `docs/RELEASE_ROADMAP.md` and this index: align owner-facing status without changing runtime behavior.

## Truthful validation boundary

`npm run bg31:manifest:test` covers **offline repository consistency**, not live services or a backup restore. Historical BG-30 main CI passed; the BG-31 branch passed the checkpoint CI above; any subsequently changed head needs its **own** new exact-head CI. The private/authenticated browser and physical iPhone, hosted TLS, provider permission, cost, remote migration state, independent recovery, and 10 real elapsed-hour multistage Cron proof remain separate evidence. The manifest deliberately cannot certify those from fixtures.

Every micro-commit should reference [#119](https://github.com/anmolsansi/Recollect-Flow/issues/119) and one paired task number. The canonical 100-step checklist is updated only for actions whose required observation and review can be justified. A document that _describes_ an unknown live value does not satisfy a checklist action that says to _read_ or _verify_ it.

## Missing evidence ledger and blockers

| Area                                              | Current state         | To close the gate                                                                                                            |
| ------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Candidate deployable bundle / matching Web assets | UNFROZEN              | Package identical approved Git SHA, preserve deterministic Web release manifest and Worker dry-run/hash, exact-head green CI |
| Live Worker deployment identity                   | NOT VERIFIED          | Authorized read-only inspection of actual account, deployed version and routing                                              |
| Live D1 ledger and pending migrations             | NOT VERIFIED          | Read-only list from correct D1 UUID; compare actual ordered filenames; review new SQL against isolated backup                |
| Live R2, HTTPS origin, provider targets           | NOT VERIFIED          | Confirm correct live account/bucket/origin and private destination without disclosing secrets or sending anything            |
| Config secret presence                            | NOT VERIFIED          | Authorized names-only presence/permissions check; no values printed                                                          |
| Previous compatible Worker/Web artifact           | NOT IDENTIFIED        | Select immutable known-good package and check mixed-schema compatibility                                                     |
| D1 backup and independent originals               | NOT CREATED/VERIFIED  | Approved independently protected copies and verified full SHA/count/pagination                                               |
| Latest purge receipts                             | NOT VERIFIED          | Independent receipts with readback, newest ledger and anti-resurrection check                                                |
| Restore operator and time/recovery objectives     | NOT ASSIGNED/MEASURED | Named trained operator, isolated rehearsal, measured recovery                                                                |
| Smoke and live provider checks                    | NOT EXECUTED          | Approved BG-32 release and separately approved external neutral actions                                                      |
| Owner approval reference                          | ABSENT                | Dated explicit exact-build, target, backup, cost and rollback authorization                                                  |
| BG-29.078                                         | DEFERRED/NOT VERIFIED | Real hosted multistage elapsed-hour evidence under an independently acceptable strict $0 plan                                |
| OPE-247 and V1 approval                           | OPEN / NO-GO          | Independent security, capacity, production and device acceptance                                                             |

**Document-level judgment:** BG-31 has a substantive release packet, safe source-only validation and an explicit no-go decision. It cannot claim **100% operational checklist closure** or unlock a production deploy while the live inventory, frozen Web/Worker artifacts, independent recovery and owner approval fields remain missing. Deferred facts stay deferred; the $0 exception is not a pass.

**Negative assertions:** no remote D1 or R2 call; no Cloudflare deploy; no hosted backup or restore; no AI/Notion/Telegram send; no device session; no billing change; no production data access; no private identifiers copied beyond already-committed source config; no migration state invented.

## October 23 $0 source-only follow-up

The [traffic-stop decision tree](../releases/BG-31_RELEASE_MANIFEST.md#bg-31078--traffic-stop-plan-not-executed) now spells out no-write abort,
partial-migration response, non-destructive traffic containment, independent
restore and owner notification requirements. This definition supports
`BG-31.078` alone. The paired rollback compatibility requirement
`BG-31.077`, actual emergency notification destination `BG-31.079`,
verified prior artifact, named operator and owner authorization stay open.

The offline `npm run bg31:readiness` utility reads the committed NO-GO
manifest, produces missing-gate identifiers and never calls Cloudflare,
D1, R2, Notion, Telegram, AI providers or billing APIs. It deliberately
cannot output GO from user-entered status fields and is checked by
`npm run bg31:readiness:test` as part of `npm run check`.

**Source checkpoint:** 76/100 canonical actions are documented or supported
by source tests; 24 live/approval/compatibility actions remain open. The
GitHub paired checklist is still 35/50 fully complete, because both halves
of a pair must satisfy their Definitions of Done. CI for this follow-up head
is required before claiming it has passed. No production mutation, new
hosted resource, live message or charge was authorized.

## Owner action sequencing, 2026-10-23

The [BG-31 completion to-do list](../releases/BG-31_COMPLETION_TODO.md)
assigns every remaining canonical action to a specific evidence package.
This sequencing does not mark any production read or acceptance as performed.
The last verified source-only PR-head checkpoint was
[CI #39882760894](https://github.com/anmolsansi/Recollect-Flow/actions/runs/39882760894)
on `8d4836a769edf58c18af4b6849b6ef111bee90aa`. The new planning
commits require fresh exact-head CI before claiming their acceptance.

The first owner action is to name execution and restore operators and
privately establish direct incident contact. A separate, scoped authorization
is then needed for metadata-only live inventory, without hosted R2 object
reads or writes, provider sends, migrations, deploys or costs. The remaining
BG-29.078, OPE-247 and BG-32 GO gates stay blocked.

## October 24: Main Worker not found in inspected account listing

**Evidence type:** owner-provided Cloudflare Workers & Pages screenshot,
followed by the owner's explicit confirmation that the main Worker should be
recorded as not found in the inspected account. **Observation scope:** the
application listing of one selected account, not an exhaustive account or
deployment search.

- Visible application: `recollect-flow-bg29-d1-cron-probe` (BG-29
  diagnostic Worker, not the main `recollect-flow` application).
- Expected application: `recollect-flow`, **not visible** in that listing.
- The screenshot does not display an actual deployment version of the main
  Worker. Account authorization, alternate account selection, production
  routes, D1 applied migrations, R2 bucket presence and Web origin were
  **not independently inspected**.
- No private Cloudflare account ID, login, email, tokens or dashboard
  screenshot was copied to GitHub. Source-only `wrangler.toml` is still
  an intended configuration, not evidence of an existing deployment.
- **Canonical status:** BG-31.021, .022, .024, .025 and .026 remain unchecked;
  main Worker version remains `null`, account provenance unverified.
  Canonical progress unchanged at **78/100**.
- **Next safe operator step:** verify the correct target account and determine
  whether the main Worker is in another authorized account or represents a
  first deployment. Only then establish a zero-cost-safe, read-only D1/R2
  identity and migration inventory. This is not permission to create a
  Worker, deploy, run remote D1 SQL, inspect R2 objects, or incur charges.
- **Decision:** BG-31 and BG-32 remain **NO-GO**. BG-29.078, OPE-247 and
  independent backup/restore conditions remain outstanding.
