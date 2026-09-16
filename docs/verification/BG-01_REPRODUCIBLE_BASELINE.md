# BG-01 — Reproducible Verification Baseline

Status: in progress

Tracking:

- GitHub issue: #23
- Linear: OPE-321
- Prerequisite context refresh: PR #22
- Work branch: `agent/ope-321-bg-01-reproducible-baseline`

## 1. Baseline identity

BG-01 freezes the starting point before any verification-foundation repair is made.
It does not repair the known clock-dependent test or release-smoke contract.

### Revision chain

- Audited application baseline: `6d5c36b81c9167dc3b53841562d5c997c3c4b3cb`.
- Current `main` before the prerequisite context refresh: `99678dfef1da1ea31b8b1f12c985bdaaf950b722`.
- `99678df…` is exactly one commit ahead of the audited application baseline and that commit adds only:
  - `docs/RECOLLECTFLOW_BUILD_GUIDE.md`;
  - `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`;
  - `docs/WORKFLOW_AUDIT_2026-09-12.md`.
- Prerequisite repo-context commit: `90174606c9d89ef7a28d9474f12121d6cc9d9f4f`.
- BG-01 branch was created from `90174606…`, so the application/runtime code remains byte-for-byte at the audited application state while documentation gains the refreshed context and this evidence record.

This distinction matters: a documentation SHA may move while the application SHA being reproduced remains unchanged.

## 2. Evidence policy

BG-01 uses two evidence classes:

1. **Current observation** — evidence produced after the September documentation refresh, such as GitHub Actions run #91 on Node 22.
2. **Reused application-equivalent evidence** — the September 12 workflow audit, reused only because no application/runtime file changed between `6d5c36b…` and the BG-01 starting branch.

Reused evidence is labeled as reused. It is not presented as a new execution.

## 3. Scope boundary

BG-01 may record and reproduce failures. It must not fix them.

Explicitly deferred:

- capacity usage clock stabilization → BG-02;
- release verifier `edit_version` repair → BG-03;
- complete staged smoke and README startup repair → BG-04;
- final green verification gate → BG-05;
- browser-cookie attachment download → BG-06/BG-07;
- bare URL acquisition/enrichment → BG-08 onward;
- aggregate item processing state → BG-12/BG-13;
- production deployment, external-service acceptance, physical-iPhone acceptance and RAG.

## 4. Toolchain and repository topology

### CI-compatible runtime

The repository declares Node `>=22`, and `.github/workflows/ci.yml` selects Node 22.
Current GitHub Actions run #91 resolved that to:

- Node `v22.23.2`;
- npm `10.9.8`.

The September 12 audit also recorded a local Node `25.8.1` run. That older local run remains useful diagnostic evidence, but Node 22 is the release-evidence runtime.

### Dependency identity

- root package: `recollect-flow@0.1.0`;
- package manager: npm;
- lockfile: `package-lock.json`, lockfile version 3;
- lockfile blob SHA on the audited/current runtime state: `12c77f412f190220e843320bdd8b13557a845927`;
- workspaces:
  - `apps/web`;
  - `packages/contracts`.

Release/reproduction installs use `npm ci`. No pnpm command from another project guide applies here.

### Root verification commands

`package.json` defines:

```text
npm run format
npm run lint
npm run typecheck
npm test
npm run contracts:check
npm run web:lint
npm run web:test
npm run web:build
npm run db:migrate:local
```

`npm run check` composes the first eight quality/build checks in that order. CI then runs `npm run db:migrate:local` only if the composed check succeeds.

### Test topology

- `vitest.node.config.ts` runs `apps/worker-api/test/**/*.test.ts` in Node.
- `vitest.d1.config.ts` runs `apps/worker-api/test/**/*.d1.spec.ts` through the Cloudflare test runtime.
- D1 tests bind isolated databases including `DB`, migration fixtures, and ticket-specific migration databases.
- D1 tests bind an isolated `ATTACHMENTS` R2 bucket.
- D1 tests use dummy capture/admin/local-worker credentials.
- D1 tests enable mocked AI implementations for `openrouter` and `cloudflare`.

### Cloudflare runtime identity

`wrangler.toml` currently declares:

- Worker name: `recollect-flow`;
- entry point: `apps/worker-api/src/index.ts`;
- compatibility date: `2026-08-01`;
- `nodejs_compat` flag;
- D1 binding: `DB`;
- R2 binding: `ATTACHMENTS`;
- Workers AI binding: `AI`.

Production binding names are recorded for topology only. BG-01 local evidence must not mutate production state.

## 5. Isolation contract

A valid BG-01 local reproduction uses a dedicated local/temporary persistence state and synthetic inputs. It must not rely on production D1, production R2, real Notion delivery, real Telegram delivery or real hosted-AI credentials.

### Automated-test isolation already present

`vitest.d1.config.ts` provides the strongest checked-in isolation contract:

- dummy `CAPTURE_TOKEN`: `test-capture-token`;
- dummy `ADMIN_TOKEN`: `test-admin-token`;
- dummy `LOCAL_WORKER_TOKEN`: `test-local-worker-token`;
- synthetic Notion/Telegram identifiers;
- `DIGEST_AI_ENABLED=false`;
- `MOCK_AI_ENABLED=true`;
- mocked OpenRouter and Cloudflare provider implementations;
- isolated D1 databases;
- isolated `ATTACHMENTS` R2 bucket.

The September 12 audit used fresh temporary D1/R2 state, dummy authentication, mocked AI and no valid Notion/Telegram credentials. That environment is reused as application-equivalent evidence for BG-01 because runtime code has not changed since the audit.

### Developer `.dev.vars` warning

`.dev.vars.example` contains development-shaped values, including local capture/admin credentials and placeholder integration values. Existing `.dev.vars` files are not assumed safe merely because they are local. A reproduction must inspect which config is loaded without printing secrets and must avoid inheriting live provider or messaging credentials.

### Storage rule

The same isolated persistence target must be used for both migration and Worker startup. A database migrated in one state directory does not prove a Worker reading another state directory is valid.

### Web/API relationship

For browser verification, the Vite Web app must point to the same isolated Worker used for API checks. Seeing two processes start is not enough; the September audit proved the link by exercising the actual Web UI against the local Worker.

## 6. Migration baseline

The current repository contains 18 forward migration files and the chain reaches:

- `0020_add_ai_capacity_controls.sql`;
- `0021_add_recovery_workflows.sql`.

The September 12 audit applied the complete chain through `0021` successfully to a fresh isolated local D1.

CI run #91 did not reach its separate `npm run db:migrate:local` step because `npm run check` correctly stopped on the known BG-02 D1 assertion. This is recorded as **not executed by run #91**, not as a migration failure.

The fresh-migration proof therefore comes from the September 12 application-equivalent audit, not from the current documentation PR CI run.

## 7. Current Node 22 baseline observation

GitHub Actions run **#91** executed against the merge candidate containing the prerequisite repo-context documentation and the same application code as the audited baseline.

Observed environment:

- runner: Ubuntu 24.04;
- Node: `v22.23.2`;
- npm: `10.9.8`;
- install command: `npm ci`;
- install result: success;
- package installation changed no committed lockfile.

Observed quality-gate sequence:

| Stage | Result | Evidence |
| --- | --- | --- |
| Prettier check | PASS | `All matched files use Prettier code style!` |
| ESLint | PASS | command exited successfully |
| TypeScript | PASS | `tsc --noEmit` exited successfully |
| Node tests | PASS | 23 files, 132/132 tests |
| D1/workerd tests | EXPECTED BASELINE FAILURE | 32 files pass; `capacity-usage.d1.spec.ts` has 1 failing test; 114/115 tests pass |
| contracts | NOT REACHED | `npm run check` stops at D1 failure |
| Web lint/tests/build | NOT REACHED IN RUN #91 | same reason |
| standalone local migration step | SKIPPED BY CI | CI only runs it after `npm run check` |

The failure is the expected BG-02 entry condition, not a new regression introduced by documentation work.

### Exact current failure

Test:

`apps/worker-api/test/capacity-usage.d1.spec.ts > OPE-227 usage API > returns safe quota and breaker metadata to the admin only`

Observed assertion:

```text
expected [] to deeply equal ArrayContaining{…}
```

Location:

`apps/worker-api/test/capacity-usage.d1.spec.ts:70`

The route returned HTTP 200. The assertion failed because `body.data.windows` was empty when the test expected the historical OpenRouter capacity window to still be active.

This is the same defect described by the September 12 audit. BG-01 records it. BG-02 repairs it.

## 8. Reused September 12 runtime evidence

The following evidence is reused because application code is unchanged from the audited SHA.

| Story | Reused result |
| --- | --- |
| Fresh local D1 migrations | PASS, all 18 migration files through `0021` |
| Worker deployment dry run | PASS, no deployment performed |
| Web production build | PASS |
| Contracts/Web lint/Web tests | PASS; Web tests 9/9 |
| Local health | HTTP 200, status `ok` |
| Web Inbox against local Worker | Browser login/review flows exercised against real Vite UI and local Worker |
| Synthetic capture | Durable capture and duplicate reuse observed in isolated runtime |
| Release smoke | FAIL at privacy PATCH with HTTP 422 because `edit_version` is missing |
| Browser attachment download | FAIL with admin session cookie; bearer-token direct download succeeds byte-for-byte |
| Bare URL processing | capture persists, enrichment terminally fails `NO_CONTENT_TO_ENRICH` |
| Aggregate item status | item remains `pending` while its only job is terminally `failed` |
| Production Worker root | HTTP 404; does not establish production Web Inbox hosting |

The audit's first sandboxed attempt also hit a localhost permission restriction before D1 tests could start. After localhost access was available, the test suite reached the real clock-dependent assertion. BG-01 preserves these as separate environment and application findings.
