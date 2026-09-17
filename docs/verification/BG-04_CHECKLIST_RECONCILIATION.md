# BG-04 — 100-Action Checklist Reconciliation

Status: **99/100 satisfied before merge; BG-05 remains locked until BG-04.100**

This record reconciles the authoritative `BG-04.001` through `BG-04.100` checklist against the implemented verifier, setup documentation, focused regressions and the repository-wide CI gate. It deliberately stops at `99/100`: `BG-04.100` is a parent completion gate and is not satisfied until the validated implementation is actually merged and the final completion boundary is recorded.

## Candidate identity and gates

- GitHub issue: #31
- Linear: OPE-324
- Pull request: #32
- Base `main`: `67c9ec7df369ca4f3413a40d97ceab03f23e4495`
- Verified implementation head: `4f0c5ea31537f6bb6fb066fe2c304821c5b4ce17`
- GitHub Actions CI run: #143 — **success**
- CI gate executed `npm run check` and `npm run db:migrate:local` on the PR merge candidate.
- Focused synthetic verifier regression before PR: 5/5 tests passing.

The final evidence/index/checklist commits added after this candidate still require their own clean-head CI before PR #32 may merge.

## BG-04.001–BG-04.010 — Establish task context

Satisfied. BG-03's authoritative closeout records the prerequisite as complete and BG-04 unlocked. The task started from the exact merged `main` revision above, inspected the existing verifier, policy/capture/item/attachment/search/export/auth contracts and repository scripts, used synthetic inputs, preserved the no-production/no-live-credential boundary, and opened GitHub #31, Linear OPE-324 and `BG-04_SMOKE_STORY_SETUP.md` as task evidence.

## BG-04.011–BG-04.020 — Scenario inventory

Satisfied. The existing smoke sequence and formerly unreachable post-privacy stages were inventoried. Routes and current envelopes were inspected before implementation. The stale hardcoded policy version was identified, the fallback/eligibility assumptions were separated from actual provider capability, the attachment payload was identified as a byte fixture rather than parsing proof, the missing browser-cookie path was made explicit, and required supported smoke coverage was mapped before coding.

## BG-04.021–BG-04.030 — Runner structure

Satisfied. Each run has a unique UUID marker. Executed work is represented as named stages with start timestamps, expected HTTP behavior, observed status and semantic assertions. Earlier completed stages remain in the summary after a later failure. Required failures leave the process nonzero. Diagnostics redact the configured capture/admin tokens and bound response text. Local targets are recognized explicitly and non-local targets require `ALLOW_REMOTE_SMOKE=true`; the safe target origin is printed before mutating requests.

## BG-04.031–BG-04.040 — Capture cases

Satisfied. The verifier creates a canonical URL fixture, replays the exact same payload and idempotency key expecting `200` + `replayed: true`, then sends a normalized duplicate under a fresh key expecting a duplicate capture event on the same canonical item. It verifies canonical identity, replay semantics and provenance, including that the exact replay does not manufacture a third capture event. A separate synthetic note proves raw source retrieval without depending on optional AI enrichment.

## BG-04.041–BG-04.050 — Privacy cases

Satisfied. The current policy contract was read before changes. The verifier no longer pins the obsolete policy-version string; it captures the first current server version and requires the rest of the sequence to remain consistent. Public eligibility/fallback behavior, Personal without consent, compliant Personal controls, Sensitive no-AI behavior, stale-version conflict, malformed-consent rejection and source/canonical stability are asserted independently. Policy eligibility is explicitly not reported as installed provider-adapter execution proof.

## BG-04.051–BG-04.060 — Attachment cases

Satisfied at BG-04's evidence boundary. The verifier initializes an upload, sends original bytes, verifies upload/finalize checksum semantics, links the attachment, downloads with an allowed bearer, compares byte length and SHA-256, and requires anonymous denial. The signature-only `%PDF` fixture is explicitly labeled `byte-round-trip-only`. A separate genuinely parseable minimal PDF with a unique known phrase is generated for later extraction acceptance. BG-04 does not falsely claim the parseable fixture was extracted.

## BG-04.061–BG-04.070 — Review and recovery cases

Satisfied. The verifier reads the current item version, proves an intentionally stale item edit is rejected, performs a successful version-aware derived edit and refetches state. It soft-deletes the run-owned item, verifies default search exclusion, restores with the returned current version, verifies search restoration and requires JSON export to include the restored item. Permanent purge and clean-target restore are excluded from the default smoke path.

## BG-04.071–BG-04.080 — README startup

Satisfied. Root setup now uses the scripts that actually exist: `npm run dev:api` and `npm run dev:web` in separate terminals. It documents `npm run db:migrate:local`, dummy local credentials, Worker port `8787`, the Vite `/api` proxy dependency, Wrangler local persistence, repository-root commands and the real quality/migration gate. The missing dummy `LOCAL_WORKER_TOKEN` was added to `.dev.vars.example`. No Serviq-specific setup assumption remains in the RecollectFlow root instructions.

## BG-04.081–BG-04.090 — Smoke boundaries

Satisfied. Local versus remote targets are labeled and the origin is printed safely. Remote execution is opt-in. Mutating evidence uses unique run-owned synthetic records and permanent purge is excluded, so the verifier does not delete arbitrary owner items. No live external delivery is silently enabled. Every supported local stage is exercised by the synthetic regression. Known later defects/capabilities are reported as unavailable rather than passed: provider adapter execution, parseable-PDF extraction acceptance, browser-cookie attachment download (BG-07) and bare-URL acquisition/enrichment. Real stage failures remain failures and the evidence record states the coverage boundary.

## BG-04.091–BG-04.099 — Verify and close the implementation

Satisfied before merge.

- Review: the implementation and authoritative checklist were compared and no BG-04-owned behavior remains uncovered.
- Focused verification: syntax checks and the five-scenario child-process verifier regression passed.
- Failure truthfulness: malformed authoritative versions, unexpected current conflicts, remote-target blocking, anonymous download, malformed consent and known unavailable later capabilities remain explicit.
- Integrity: no API schema, database migration, authentication boundary, privacy contract or optimistic-concurrency contract was weakened.
- Cleanup: temporary formatter/lint workflows were removed after producing their task-owned commits; no task-specific workflow remains in the intended final diff.
- Change review: the PR changes only BG-04 verifier/tests/setup/evidence files.
- Results: `BG-04_SMOKE_STORY_SETUP.md` contains sanitized implementation evidence and CI #143 proves the repository-wide implementation gate on the verified candidate.
- Exceptions: later build-guide defects are explicitly unavailable/known gaps, not passed or silently repaired.
- Documentation: status is recorded as pre-merge `99/100`, not complete.

## BG-04.100 — Parent completion gate

**Not yet satisfied in this pre-merge record.**

BG-04.100 requires the documentation-complete PR head to pass CI, PR #32 to merge, and the merged completion state to be recorded before BG-05 is unlocked. Until those facts exist, BG-05 remains locked.

## Second-guess and safety review

The most dangerous false-positive would have been treating a successful attachment upload as parsing evidence or treating a policy-eligible provider as an installed/executed adapter. Both are now separated explicitly. The next likely false-positive would have been accepting a remote URL implicitly, so non-local targets now need explicit opt-in before any mutating stage starts.

The intentionally unresolved browser-cookie attachment path is not a reason to weaken authentication inside BG-04. Its current `401` is recorded as BG-07 work. Likewise, bare-URL acquisition/enrichment remains later scope rather than being manufactured inside the smoke script.

## Pre-merge verdict

`BG-04.001` through `BG-04.099` are satisfied. `BG-04.100` remains open until final clean-head CI and merge. Therefore the authoritative pre-merge state is **99/100**, and BG-05 is **not yet unlocked**.
