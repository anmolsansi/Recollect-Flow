# OPE-247 security remediation and replacement candidate — November 3, 2026

**Scope:** Resolve the two logging findings and dependency findings from the
[October 31 review](OPE-247_SECURITY_OPERATIONS_REVIEW_2026-10-31.md), then
build and verify a new core-only BG-31 candidate. Production deployment, hosted
acceptance, live credentials, Cron activation and recurring monitoring are not
part of this change. OPE-247 and BG-29.078 remain open for their other evidence.

## Logging fixes and regressions

- Notion network failures log the fixed `NOTION_NETWORK_ERROR` category;
  arbitrary exception names/messages are not emitted. The public error remains
  retryable, and timeout/HTTP classification is unchanged.
- Backup-retention failures log `BACKUP_RETENTION_CLEANUP_FAILED` with the safe
  backup ID. Failed deletion still leaves verified bytes/metadata intact for
  retry and does not report an object expired.
- Both regression tests failed against the old source on a synthetic private
  `Error.name`, then passed after the fixes. No live provider was called.

## Dependency disposition

The fresh November 3 baseline audit reproduced **24 affected package entries**:
10 high and 14 moderate. The final full and production-only npm audits both
report **zero known vulnerabilities** for the committed dependency tree as
checked on this date. This is a registry snapshot, not a vulnerability-free
guarantee or a substitute for application tests.

| Package family                 | Before                                   | Replacement                                  |
| ------------------------------ | ---------------------------------------- | -------------------------------------------- |
| Hono                           | 4.12.30                                  | 4.13.16                                      |
| Zod, root and shared contracts | 3.25.76                                  | 4.6.7                                        |
| Workers test integration       | `@cloudflare/vitest-pool-workers` 0.19.1 | maintained `@cloudflare/vitest-plugin` 1.5.0 |
| Wrangler                       | 4.116.0                                  | 4.156.2                                      |
| Vitest                         | 4.1.10                                   | 4.1.12                                       |
| Vite, including root peer copy | 8.2.0                                    | 8.3.5                                        |
| ESLint / typescript-eslint     | 10.8.0 / 8.65.0                          | 10.14.0 / 8.72.1                             |
| minimatch in lint tooling      | vulnerable pre-11 tree                   | 11.0.4 override                              |

The lockfile also refreshes affected compatible transitive dependencies.
No forceful audit downgrade was used. The maintained Cloudflare plugin already
uses patched Wrangler/Miniflare/Zod versions, so temporary overrides for the
retired test pool are absent from the final manifests.

The one remaining `minimatch` override compensates for upstream ESLint and
typescript-eslint ranges that otherwise retain vulnerable versions. Its Node
requirement supports this project's Node 22+ toolchain; full lint/tests exercise
the project's usage. Remove the override once those upstream ranges resolve a
patched version themselves. It is development tooling, not a hosted binding.

The migration follows [Cloudflare's maintained-plugin guide](https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/)
and [Zod's migration guide](https://zod.dev/v4/changelog). The only application
compatibility edits are explicit string keys for a result record and the
supported `ZodError.issues` property for existing search validation responses.
No authentication, privacy, migration or provider policy is relaxed.

## Collection-validation regression

The old schema's 2,000 invalid topic elements produced 2,001 issues despite
`.max(20)`. The new regression exercises the actual shared item-update schema:
the same oversized input is rejected with one size issue, and 20 valid topics
still parse unchanged. No hosted stress test or actual memory-exhaustion claim.
The [upstream size-check fix](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd)
is included in the selected Zod version.

## Validation and candidate identity

- `npm run check` passed locally: format, lint, typecheck, Node evidence checks,
  **340 API/unit, 222 D1 and 62 Web tests**, contracts and Web build.
- Full-tree and production-only npm audits passed with zero findings.
- CI now audits the installed dependency tree and calculates source-head
  Worker/Web fingerprints for this security-candidate branch family.
- Exact final source SHA, PR/CI results, package/Worker/Web/config/SQL hashes,
  archive and proposed commands are recorded in the new local packet:
  `.wrangler/bg31-security-candidate-20261103/release-packet.json`.
  Do not infer that a pending CI run passed; the receipt must record its actual
  final outcome and byte comparison before this candidate is CI-verified.
- Local gate logs/audits remain under `.wrangler/security-candidate-20261103/`.

The old packet `BG31-CANDIDATE-8efb4c59dd30-2026-10-31.1`, its frozen directory
and sealed archive remain unchanged. All 34 old file hashes and archive hash
were rechecked. New builds use a separate directory and approval identity.
Do not rebuild over the old receipt or substitute these bytes under its name.

## What happens next

1. Review the security PR and its actual successful candidate CI; merge through
   the normal owner workflow. A merge is not deployment authorization.
2. Review the new exact-build packet. Recheck live resource/schema identities
   when release execution is considered; October 31 observations are dated.
3. Resolve cost-alert/account-visibility and hosted operator/incident evidence
   or obtain an explicit accepted scoped release decision. Metered R2 exposure
   is acknowledged; proposed thresholds are not configured hard caps.
4. Preserve the owner's BG-29 decision: **Cron disabled, no monitoring**.
   The missing real hourly proof is not waived by these fixes or green CI.
5. Obtain a separate approval for the new exact packet after required gates
   are resolved. Only then perform authorized migrations/deployment/live smoke.

This candidate closes the specified source findings; it does not independently
complete OPE-247, BG-31, BG-32, hosted recovery or V1 acceptance.
