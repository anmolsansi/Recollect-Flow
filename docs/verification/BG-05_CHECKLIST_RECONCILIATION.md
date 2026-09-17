# BG-05 — Checklist Reconciliation

Status: **99 / 100 complete before merge**

Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`

Tracking: GitHub #34 / Linear OPE-325

This reconciliation maps the authoritative `BG-05.001`–`BG-05.100` checklist to concrete evidence. It intentionally leaves only `BG-05.100` incomplete until the BG-05 implementation/evidence PR has merged into `main` and the parent completion boundary can be evaluated from merged state.

## Evidence index

| Evidence | Purpose |
|---|---|
| `BG-05_PRIORITY_1_GATE.md` | candidate identity, authorization boundary, exact-SHA gate and completion decision |
| `BG-05_TEST_SUITE_EVIDENCE.md` | release verifier, Node, D1 and Web suite counts |
| `BG-05_MIGRATION_EVIDENCE.md` | complete fresh local 18-migration chain |
| `BG-05_WEB_ARTIFACT_EVIDENCE.md` | production Web build and artifact sizes |
| `BG-05_RUNTIME_EVIDENCE.md` | Worker dry-run, isolated smoke, unavailable-stage accounting and cleanup |
| GitHub Actions CI run #150 | exact-candidate repository gate |
| BG-05 Candidate Proof run `35263570610` | exact-candidate Worker dry-run and local smoke proof |

## Group reconciliation

### BG-05.001–010 — Establish task context: complete

Scope and parent boundary were read from the build guide and authoritative microtask checklist. BG-04 final closeout was verified as the prerequisite. The exact candidate, repository contracts, local-only environment, authorization boundary and synthetic input policy are recorded in `BG-05_PRIORITY_1_GATE.md`. GitHub #34 and Linear OPE-325 provide external tracking.

### BG-05.011–020 — Candidate identity: complete

The candidate SHA, work branch, Node 22 runtime, npm version, lockfile identity, baseline fixes, corrected smoke runner identity and known later defects are explicit. Documentation commits do not redefine the source candidate.

### BG-05.021–030 — Formatting and lint: complete

Exact-SHA CI run #150 proves formatting and lint success. There were no formatting failures to repair, no relevant rules disabled and no generated source edits required. Reusing this exact-SHA run is the narrowest valid proof.

### BG-05.031–040 — Type contracts: complete

The root TypeScript and shared contract checks passed on the candidate. Web imports compiled through the production build. No unsafe cast workaround or generated binding edit was introduced.

### BG-05.041–050 — Automated suites: complete

Recorded results:

- release verifier regressions: 5 / 5 passed;
- Node: 23 files, 132 / 132 tests passed;
- Worker D1: 33 files, 116 / 116 tests passed;
- Web: 2 files, 9 / 9 tests passed;
- skipped tests: none reported in these suites.

The dated usage regression passed inside the D1 suite.

### BG-05.051–060 — Migration evidence: complete

Fresh hosted-runner/local state applied all 18 committed migrations successfully. The persistent migration/search contracts on the same candidate validate the repository's expected relational and FTS schema behavior. No remote D1 operation occurred.

### BG-05.061–070 — Artifact evidence: complete

The candidate Web production build completed under Vite 8.2.0. The exact candidate also completed a Wrangler 4.116.0 Worker `deploy --dry-run`, produced a nonempty bundle and resolved the checked-in binding names. The command exited at Wrangler's dry-run boundary without deployment. Hosting and release deployment remain later work.

### BG-05.071–080 — Smoke evidence: complete

The successful Candidate Proof run started a fully local Worker, waited for local health, and ran the corrected release verifier with dummy credentials against `127.0.0.1`.

Result: **24 passed, 0 failed, 4 unavailable**.

The proof explicitly records exact replay, privacy/version-conflict behavior and attachment byte equality. The four unavailable stages remain browser-cookie attachment download, provider adapter execution, parseable-PDF extraction acceptance, and bare-URL acquisition/enrichment. The harness cleanup trap removed the temporary `.dev.vars` and stopped the owned process. The task-specific workflow was subsequently deleted from the branch.

### BG-05.081–090 — Gate reconciliation: complete

All required commands were compared against the build-guide definition. Existing exact-SHA CI evidence was reused where it was authoritative, while the two unresolved checks, Worker dry-run and actual smoke execution, received dedicated candidate proof. No unrelated passing command was substituted. No expected unit failure remains. The gate date, known Priority 2 work and candidate evidence packet are recorded.

### BG-05.091–099 — Verify and close preparation: complete

The completed work was compared against BG-05's stated outcome. Failure/incomplete cases are still truthful, including the four unavailable smoke capabilities and dependency-advisory qualification. No authentication, privacy, data-integrity, recovery or production-authorization contract was weakened. The temporary proof harness was removed, task-owned changes were reviewed, and actual results are recorded in the evidence packet.

### BG-05.100 — Parent completion boundary: intentionally pending before merge

BG-05.100 must not be checked before the task evidence is merged. Pre-merge conclusion:

- technical gate: green;
- checklist: 99 / 100;
- BG-06: **not yet unlocked**;
- remaining action: merge validated BG-05 implementation/evidence PR, confirm merged `main` state, then record final closeout and unlock BG-06.

## Exceptions and qualifications

- The first temporary proof run could not start a local Worker because plain `wrangler dev` tried to establish a remote Workers AI proxy and required a Cloudflare API token. This was a harness/environment issue, not an application failure. The harness was corrected to `wrangler --local`, after which the exact candidate passed.
- `npm ci` reported 10 dependency advisories, 3 moderate and 7 high. They are recorded as a security qualification, not silently fixed under this gate.
- No production deployment, remote migration, live external delivery, destructive purge or production credential use occurred.

## Pre-merge conclusion

BG-05 has sufficient evidence to open its implementation/evidence PR. The source candidate itself required no application repair. The final parent gate remains intentionally open until the merge has actually occurred.
