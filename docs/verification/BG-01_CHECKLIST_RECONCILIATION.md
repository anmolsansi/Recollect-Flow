# BG-01 Checklist Reconciliation

Tracking: GitHub #23 · Linear OPE-321

This record reconciles the 100 executable BG-01 actions against the actual evidence used to close the task. It does not rewrite the 4,000-item planning companion merely to turn boxes green. The build guide explicitly allows one valid result to satisfy several criteria and says a microtask is not a mandatory commit or separate tool call.

Status vocabulary:

- **Current** — observed in current September 16 GitHub/CI evidence.
- **Reused** — reused from the September 12 audit because application/runtime code is unchanged.
- **N/A** — a procedural step does not apply to the connector/CI execution path; the underlying safety requirement is still satisfied and the reason is stated.

Primary proof: `docs/verification/BG-01_REPRODUCIBLE_BASELINE.md`.

## BG-01 / 01 — Establish task context (.001–.010)

Status: **10/10 satisfied**.

- `.001–.004`: build-guide chapter, repository graph/configuration and current branch were inspected.
- `.005`: reuse policy is explicit; September audit evidence is reused only across documentation-only drift.
- `.006`: authoritative contracts are the current package/CI/Vitest/Wrangler configuration and BG-01 build-guide boundary.
- `.007`: current CI plus isolated September audit environment are named separately.
- `.008`: no production mutation, messaging, secret change or deployment is authorized by BG-01.
- `.009`: only synthetic fixtures are used/referenced.
- `.010`: GitHub #23, Linear OPE-321 and the verification records are the tracking/evidence locations.

## BG-01 / 02 — Checkout identity (.011–.020)

Status: **10/10 satisfied**.

- Current main, audited application SHA, prerequisite documentation SHA and BG-01 branch ancestry are recorded.
- The September audit's detached checkout and preserved untracked owner file are retained as reused evidence.
- The audit document remains unchanged.
- Commit comparison proves runtime drift is zero between the audited application state and the BG-01 starting runtime state.
- Required reproduction due to documentation-only drift is the current Node 22 CI baseline, not an invented application rerun.

## BG-01 / 03 — Toolchain (.021–.030)

Status: **10/10 satisfied (Current)**.

GitHub Actions run #91 establishes:

- CI Node selection: Node 22;
- actual Node: `22.23.2`;
- npm: `10.9.8`;
- package/workspace identity;
- lockfile presence and lockfile-based `npm ci` install;
- successful dependency installation;
- no repository lockfile change introduced by the install.

## BG-01 / 04 — Test topology (.031–.040)

Status: **10/10 satisfied**.

- Root `npm run check` sequence is recorded.
- Node and D1 Vitest configurations are identified.
- Web test, contract check, migration and Worker dry-run commands are identified.
- API/Web development entry points are `dev:api` and `dev:web`; the Web proxy targets local API port 8787.
- Automated tests, live/local runtime probes and read-only production probes are separated in the evidence record.
- Failure layers are classified in the baseline ledger.

## BG-01 / 05 — Local configuration (.041–.050)

Status: **10/10 satisfied, primarily Reused**.

- The September audit used fresh temporary isolated state under its audit workspace.
- Dummy capture/admin/worker identities are present in checked-in test configuration.
- Real Notion/Telegram credentials were not valid in the audited local environment.
- AI was mocked for automated/runtime acceptance.
- Safe binding names are documented without secret values.
- Existing `.dev.vars` is explicitly treated as untrusted until loading behavior/effective target is checked.
- Production setting inheritance is excluded by the fresh synthetic local state and dummy bindings.

## BG-01 / 06 — Storage isolation (.051–.060)

Status: **10/10 satisfied, Reused where runtime execution is required**.

- Local D1 and R2 targets were isolated.
- Migration chain is recorded through `0021`.
- All 18 migrations applied successfully in the audited fresh local state.
- Worker and migration state matched for the audited local story.
- Synthetic capture was created and read through the local application path.
- Production was not modified; the only production evidence used by the audit for this baseline was read-only.

## BG-01 / 07 — Server processes (.061–.070)

Status: **10/10 satisfied with two procedural N/A notes**.

- API port: 8787, from the checked-in Vite proxy contract.
- Web port: 5173, from checked-in development configuration.
- Matching API proxy is recorded.
- API and Web startup plus health/Web-to-API behavior are reused from the September audit.
- `.065` and `.067` (record process IDs): **N/A for the current connector/CI execution path.** No persistent local process was started by the BG-01 documentation executor. The reused audit owned and cleaned its temporary processes; PID values are not needed to reproduce application behavior.
- `.070` cleanup requirement is satisfied by not creating unmanaged local processes in the current execution and by preserving the audit's isolated temporary-process boundary.

## BG-01 / 08 — Baseline reproduction (.071–.080)

Status: **10/10 satisfied using Current + Reused evidence**.

Current run #91:

- format PASS;
- root lint PASS;
- TypeScript PASS;
- Node suite 132/132 PASS;
- D1 suite reaches 114/115 with the expected dated-window failure;
- real process exit code is 1.

Reused September audit:

- remaining contract/Web gates pass when run separately;
- obsolete release smoke payload reproduces HTTP 422;
- localhost sandbox restriction is classified separately from the application assertion.

## BG-01 / 09 — Evidence hygiene (.081–.090)

Status: **10/10 satisfied**.

- Evidence directory: `docs/verification/`.
- `.082` raw-log preservation is implemented as a sanitized compact evidence transcript rather than committing large CI logs. The GitHub Actions run remains the immutable raw source.
- CI evidence is timestamped in UTC by GitHub; the reused audit is dated September 12, 2026.
- Only synthetic fixture classifications/IDs are referenced.
- Evidence was reviewed for credential/private-content leakage before commit.
- Test counts distinguish pass/fail/not reached/skipped.
- No required BG-01 runtime finding is silently omitted; reused items are labeled.
- Failure ledger BL-01 through BL-08 is recorded.

## BG-01 / 10 — Verify and close (.091–.100)

Status: **10/10 satisfied**.

- Completion boundary reviewed: BG-01 records the environment and failures; it does not repair them.
- Current Node 22 proof plus valid application-equivalent September evidence satisfy the focused baseline requirement.
- Known rejection/failure cases remain truthful and unfixed.
- No runtime, privacy, data, recovery, migration or production behavior was changed.
- Cleanup is N/A for current execution because no local long-running process was started; reused audit state was isolated.
- Branch change review is documentation-only.
- Results and exceptions are recorded in the primary evidence file.
- Documentation impact is this evidence set plus the final repo-context pointer.
- **Gate decision: BG-02 is unlocked.** Its entry condition is the reproduced `capacity-usage.d1.spec.ts` failure on the frozen baseline.

## Overall reconciliation

- Satisfied by current observation: toolchain/install/quality-gate prefix and dated-window failure.
- Satisfied by valid reused evidence: isolated runtime, migrations, Web/API story, smoke reproduction and known workflow defects.
- Procedural N/A: recording local PID values in a connector/CI-driven execution, and committing raw CI logs instead of linking the immutable workflow run plus a sanitized transcript.
- Unresolved BG-01 blockers: **none**.
- Runtime fixes performed by BG-01: **none**.
- Next task: **BG-02 — make the usage test independent of today's date**.
