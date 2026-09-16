# BG-03 — Release Smoke Edit-Version Repair

Status: **implementation verified; final documentation-complete gate pending**

Tracking:

- GitHub issue: #27
- Linear: OPE-323
- Pull request: #28
- Work branch: `agent/ope-323-bg-03-release-smoke-edit-version`
- Base `main`: `f43580786e4106c4983e30f1bb351e3150d16bf3`
- Implementation head verified by CI run #121: `2b9d8b0dd32b482aa454d821564a67db3c5f5321`
- Checklist reconciliation: `docs/verification/BG-03_CHECKLIST_RECONCILIATION.md`

## 1. Problem and boundary

The release verifier predated the current optimistic-concurrency contract for privacy changes. It sent `privacy_level` and `derived_data_action` but omitted the required `edit_version`, so the current API rejected the first privacy mutation with HTTP 422 before the later smoke stages could execute.

The server contract was already correct and was not changed for BG-03:

- item detail exposes `data.item.edit_version`;
- an edit version must be a positive integer;
- privacy changes require the caller's current version;
- a successful privacy change advances and returns the authoritative version;
- a stale version returns HTTP 409 with `VERSION_CONFLICT`.

BG-03 repairs the client-side verifier. It does not weaken optimistic concurrency, change a migration, change the privacy schema, or introduce an automatic conflict retry.

## 2. Chosen repair

`scripts/verify-production-release.mjs` now uses a small version-aware flow:

1. fetch `GET /api/v1/items/:id` with the admin token;
2. require a `data.item` object for the expected item ID;
3. require `edit_version` to be a positive integer;
4. submit the privacy PATCH with that exact version;
5. validate the version returned by the mutation response;
6. refetch item detail;
7. require the refetched version to equal the server mutation response and to be newer than the version used for the successful mutation;
8. use the refetched value for the next independent privacy change.

The script does not calculate the next version with `version + 1`. The server remains authoritative.

## 3. Privacy sequence preserved

The existing policy scenarios remain explicit:

| Scenario | Derived-data action | Important controls | Expected routing |
| --- | --- | --- | --- |
| Public | `reprocess` | current server version | OpenRouter with Gemini fallback |
| Personal without consent | `reprocess` | OpenRouter requested, app-managed credential | no hosted provider |
| Personal with consent | `reprocess` | hosted consent, ZDR enforced, data collection denied | OpenRouter |
| Sensitive | `purge` | current server version | no hosted provider |

`purge` here remains the privacy route's derived-data action. BG-03 does not turn this into the separate permanent canonical-item purge workflow.

The verifier also compares item identity and source evidence across the privacy sequence. It requires the canonical item ID, source URL, canonical URL and raw source text to remain unchanged.

## 4. Deliberate stale-version proof

After the successful Public mutation, the verifier deliberately reuses the original pre-Public version for an isolated privacy PATCH. The expected result is:

- HTTP 409;
- `error.code === "VERSION_CONFLICT"`;
- no version advance;
- no privacy-level change;
- no source/canonical evidence change;
- no automatic refetch-and-overwrite retry.

This scenario protects the concurrency behavior that `edit_version` exists to enforce. An unexpected current-version conflict also stops the verifier rather than retrying until a write succeeds.

## 5. Executable regression harness

`scripts/verify-production-release.test.mjs` runs the real verifier as a child process against a synthetic local HTTP server. It does not use production credentials or production storage.

The happy-path server advances edit versions by three on each successful privacy mutation. This intentionally makes blind local `+1` arithmetic fail. The observed privacy request versions are:

`1, 1, 4, 7, 10`

The second `1` is the deliberate stale request. The later `4`, `7` and `10` can only be obtained from server responses/refetches.

Three persistent regressions run under Node's test runner:

1. full privacy sequence succeeds with authoritative versions and reaches the later synthetic attachment stage;
2. malformed initial `edit_version` is rejected before any privacy mutation;
3. an unexpected conflict on the current Personal mutation exits nonzero and is not retried.

The regression is wired into the normal repository test gate through `npm run release:smoke:test`.

## 6. Failure and diagnostic behavior

The verifier keeps failures operationally visible:

- missing `WORKER_BASE_URL`, `CAPTURE_TOKEN` or `ADMIN_TOKEN` fails before requests start;
- the target origin must be an absolute HTTP(S) URL;
- request failures include a stable scenario label;
- failed response diagnostics are limited to 800 serialized characters;
- capture/admin tokens are redacted if a server echoes them;
- Authorization headers are never printed;
- uncaught assertion/request failures produce a nonzero Node process exit;
- rejected operations are not converted into successful continuation.

There is no shell wrapper in this repository around this verifier, so shell exit-code preservation is not an applicable BG-03 code change. The executable itself is regression-tested for nonzero failure status.

## 7. Verification evidence

### Historical failure source

The September workflow audit recorded the obsolete verifier sending privacy mutations without `edit_version`, with the current API returning HTTP 422 before later smoke assertions were reached. BG-03 uses that as the frozen failure entry condition rather than weakening the API to accommodate the old script.

### Pre-PR focused proof

Before opening PR #28, the branch ran:

- `node --check scripts/verify-production-release.mjs` — pass;
- `node --test scripts/verify-production-release.test.mjs` — 3/3 pass.

### First PR CI finding

CI run #118 passed formatting and then failed ESLint because the two new `.mjs` files had not declared all runtime globals used by the repository's lint configuration. The failure named `URL`, `Buffer` and `process`. This was a code-quality configuration defect in the new files, not a privacy/version behavior failure.

BG-03 fixed those declarations in microcommits without disabling lint rules or changing runtime behavior.

### Clean implementation gate

GitHub Actions CI run #121 executed PR #28 on Node `22.23.2` and passed:

- `npm ci`;
- Prettier;
- ESLint;
- TypeScript typecheck;
- release-smoke regression: 3/3 pass;
- Node Vitest suite: 132/132 pass across 23 files;
- D1/workerd suite: 116/116 pass across 33 files;
- contracts typecheck;
- Web lint with 0 warnings/errors;
- Web tests: 9/9 pass;
- Web production build;
- `npm run db:migrate:local`, with all 18 repository migrations applied successfully.

The `npm ci` output also reports existing dependency-audit findings. BG-03 does not modify dependency versions and does not claim to remediate those unrelated findings.

## 8. Microcommit record

Meaningful implementation commits include:

1. `8600ef94…` — thread authoritative item versions through privacy mutations.
2. `8d1983f6…` — add stale-version proof and bounded/redacted diagnostics.
3. `ad3fecaa…` — add executable verifier regression coverage.
4. `5a693728…` — wire the verifier regression into the persistent quality gate.
5. `35005963…` / `5bb5bc64…` / `285bd5ad…` — one-shot formatter add, formatting result, and removal; no task-specific formatter workflow remains in the final diff.
6. `abcf7e96…` and `ca71d49e…` — declare Node runtime globals required by ESLint.
7. `2b9d8b0d…` — remove unrelated package-ordering noise from the final diff.

All task commits remain on the BG-03 branch and reference issue #27/microtask progress.

## 9. Scope and safety review

The implementation changes only:

- `scripts/verify-production-release.mjs`;
- `scripts/verify-production-release.test.mjs`;
- `package.json` test wiring.

BG-03 does not change:

- `apps/worker-api/src/policy/policy.schema.ts`;
- `apps/worker-api/src/policy/policy.routes.ts`;
- `apps/worker-api/src/policy/policy.repository.ts`;
- item-detail API semantics;
- D1 schema or migrations;
- authorization middleware;
- provider policy;
- production secrets/configuration;
- attachment/browser/setup gaps reserved for BG-04.

The test harness uses only synthetic local fixtures and closes its owned HTTP server. No production verifier run or production mutation was performed by BG-03.

## 10. Completion boundary

The implementation portion of BG-03 is proved:

- no privacy mutation omits `edit_version`;
- versions come from server detail/mutation responses, never blind local increments;
- the obsolete missing-version 422 path is absent from the successful regression;
- the deliberate stale version still returns `VERSION_CONFLICT`;
- an unexpected conflict stops rather than auto-overwriting;
- Public, Personal/no-consent, Personal/consent and Sensitive controls remain asserted;
- source/canonical evidence remains stable;
- malformed versions fail before mutation;
- verifier failures are nonzero with bounded/redacted diagnostics;
- the persistent regression is part of the normal quality gate;
- full Node, D1, Web, contracts, build and migration gates passed on CI run #121.

The remaining completion step is the documentation-complete CI/PR merge gate. BG-04 is not marked unlocked until that gate is green and BG-03 is merged.
