# BG-05 — Priority 1 Complete Gate Evidence

Status: **candidate gate proven; implementation merge pending**

This record is the authoritative evidence file for BG-05. It closes Priority 1 only from evidence tied to one verification candidate. It does not turn later product gaps into passing results and it does not authorize production deployment.

## Tracking

- GitHub issue: #34
- Linear: OPE-325
- Base branch: `main`
- Work branch: `agent/ope-325-bg-05-priority-1-gate`
- Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`
- Candidate source: merged BG-04 final closeout on `main`
- Dependency: BG-04 is complete and `docs/verification/BG-04_FINAL_CLOSEOUT.md` explicitly unlocks BG-05.
- Gate date: 2026-09-18 Asia/Kolkata (successful proof run started 2026-09-17 UTC).

## Candidate identity

The candidate is the clean `main` revision immediately after BG-04's implementation and post-merge closeout. No BG-05 application source change is required to establish the gate. Documentation/evidence commits on the BG-05 work branch do not redefine the candidate.

- Required runtime: Node.js 22 or newer.
- Exact CI Node version for the candidate: `v22.23.2`.
- Exact CI npm version: `10.9.8`.
- Dependency lockfile: `package-lock.json`, lockfileVersion 3, Git blob `12c77f412f190220e843320bdd8b13557a845927` at the candidate.
- Corrected smoke runner: `scripts/verify-production-release.mjs`, Git blob `de36d0ba4d9cf17519d95831da6d630d1a7b80b4` at the candidate.
- Worker configuration: `wrangler.toml`, Git blob `7a8e3184f4e55144039d4ba6c83248d7bda1697a` at the candidate.

## Environment and authorization boundary

BG-05 uses repository CI evidence plus isolated local Cloudflare/Wrangler state. Synthetic local credentials from `.dev.vars.example` are sufficient for the local smoke verifier. No production secret, remote migration, live Telegram/Notion delivery, permanent purge, or production deployment is authorized by this task.

The smoke runner itself rejects a non-local target unless `ALLOW_REMOTE_SMOKE=true`. BG-05 did not set that opt-in.

## Complete candidate evidence

The final BG-05 evidence packet is split into focused records so reviewers can inspect the relevant proof without reading a single oversized log:

- `BG-05_TEST_SUITE_EVIDENCE.md` — exact automated-suite counts from candidate CI.
- `BG-05_MIGRATION_EVIDENCE.md` — fresh local D1 migration chain and 18-migration ledger.
- `BG-05_WEB_ARTIFACT_EVIDENCE.md` — production Web build artifact evidence.
- `BG-05_RUNTIME_EVIDENCE.md` — Worker deployment dry-run and corrected isolated smoke proof.
- `BG-05_CHECKLIST_RECONCILIATION.md` — microtask-to-evidence reconciliation and merge boundary.

### Exact-SHA repository gate

GitHub Actions CI run **#150** executed on the exact candidate SHA and completed successfully. Because this is exact-SHA evidence, BG-05 reuses it for checks already covered by the repository gate instead of rerunning identical commands without a new reason.

Run #150 proves:

- checkout of `3179b1d1601142d8d071285d06aa3630e3f0742c`;
- Node 22 selection;
- `npm ci` success from the committed lockfile;
- formatting success;
- root lint success;
- root TypeScript success;
- release-verifier regression suite 5/5;
- Node suite 23 files / 132 tests;
- D1 suite 33 files / 116 tests;
- shared contract check success;
- Web lint success;
- Web suite 2 files / 9 tests;
- Web production build success;
- `npm run db:migrate:local` success on fresh hosted-runner state with all 18 migrations.

### Worker artifact and smoke proof

BG-05 Candidate Proof run `35263570610` checked out the exact candidate SHA, installed locked dependencies, then completed:

- `npx wrangler deploy --dry-run --outdir .bg05-worker-bundle` — PASS;
- fresh local migrations — PASS;
- local Worker startup with `wrangler --local` and synthetic credentials — PASS;
- corrected release smoke against `127.0.0.1:8787` — PASS;
- remote deployment/migration assertion — PASS.

Smoke totals were **24 passed, 0 failed, 4 unavailable**. The unavailable stages were deliberately preserved and reported rather than converted into false passes.

The temporary proof workflow was removed after the immutable Actions result was captured, so BG-05 does not leave a task-specific CI workflow in the repository.

## Formatting, lint and type-contract proof

CI run #150 executes the repository `npm run check` chain with `&&`, so each later result below is reachable only because every prior command exited successfully.

| Check                     | Candidate result                                                    |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run format`          | PASS — Prettier reported all matched files use the configured style |
| `npm run lint`            | PASS — ESLint exited successfully                                   |
| `npm run typecheck`       | PASS — root `tsc --noEmit` exited successfully                      |
| `npm run contracts:check` | PASS — shared contracts `tsc --noEmit` exited successfully          |
| `npm run web:lint`        | PASS — 0 warnings and 0 errors across 7 files                       |

No formatting repair, lint suppression, unsafe-cast workaround, generated-binding edit, or API-contract change was needed for BG-05. The candidate therefore remains unchanged for these checks.

## Qualifications and later-stage work

`npm ci` reported 10 dependency advisories, 3 moderate and 7 high. This is recorded as a security qualification. BG-05 does not silently expand into unrelated dependency upgrades and does not claim an `npm audit` acceptance gate that the build guide did not define.

These application gaps remain outside Priority 1 acceptance and stay visible:

- provider adapter execution capability;
- parseable-PDF extraction acceptance;
- browser-cookie attachment download, carried into BG-06/BG-07 work;
- bare-URL acquisition/enrichment.

BG-05 treats a documented unavailable/known-gap stage as truthful evidence, not as a false pass and not as a reason to weaken authentication or other contracts.

## Priority 1 decision

The technical Priority 1 gate is **green on the selected candidate**. Every required repository/build/migration/artifact check passed, every currently supported smoke stage passed, and every unsupported later-stage capability remained explicitly unavailable.

Before the implementation/evidence PR merges, BG-05 remains **99/100** by process: `BG-05.100` is intentionally held open because the parent completion boundary includes merging the task evidence into `main`. BG-06 remains locked until that merge is confirmed and a post-merge closeout records the resulting `main` SHA.
