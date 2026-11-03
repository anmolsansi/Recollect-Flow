# OPE-247 security, operations and BG-31 packet review

**Follow-up:** The [November 3 remediation candidate](OPE-247_SECURITY_REMEDIATION_2026-11-03.md)
fixes the two logging findings and updates the dependency tree. This document
preserves the October 31 observations; it is not the new candidate's verdict.

**Reviewed:** October 31, 2026. **Review complete; release signoff NOT granted.**
[OPE-247](https://linear.app/openclaw-neutron/issue/OPE-247/complete-v1-security-observability-and-operational-hardening)
was freshly read and remains **In Progress**. This review does not close V1,
BG-29.078, BG-31 or BG-32, or authorize deployment, rotation or notifications.

## Evidence identity and reuse

The reviewed release is `BG31-CANDIDATE-8efb4c59dd30-2026-10-31.1`, source
`8efb4c59dd30fb1a9e5d5dbc874ef17ce106cbc9`.
[PR #137](https://github.com/anmolsansi/Recollect-Flow/pull/137) is merged as
`0caa73b54f472a6ea0b8975714eda86718830fa2`.
[Exact-source CI #41223493069](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41223493069)
is SUCCESS at the candidate SHA. Its retained log shows **337 API/unit,
222 D1 and 62 Web tests passed**, plus the package/build/browser gates.
The earlier local receipt's 221 D1 figure is a local checkpoint, not the
final CI total. No need to rerun that whole suite to perform this review.

The current checkout `a4ed0f0851c1287f38feaeb44eb5783e6ab7310d` differs from
the candidate's runtime only in two dedicated BG-29 staging source files.
Production Worker/Web source, dependency lockfile, canonical configuration
and migrations are unchanged. Staging evidence cannot replace release evidence.

All **34 frozen file hashes**, the sealed archive hash and the exact upload
bytes were retained/verified. A fresh scan found none of the three prepared
token values in the public frozen artifacts. The private four-key file is
mode **0600**, parent **0700**; no values were printed or uploaded by this review.
These observations do not establish remote secret installation.

## Requirement-to-evidence matrix

| OPE-247 requirement                                       | Evidence reused or refreshed                                                                                                                                    | Verdict and remaining proof                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Capture/admin/local-worker scope and rotation             | `token-rotation.test.ts` (33) and `token-rotation.d1.spec.ts` (1), passing exact-source CI; `TOKEN_ROTATION.md` / ADR-033                                       | Local/CI PASS: overlap, expiry, promotion, compromise and data continuity. No new-account live rotation/client-convergence rehearsal.                                                                                                                                    |
| Auth, private objects/files, malformed/oversized bodies   | `bg25-security.test.ts` (13), `attachment.test.ts` (27), recovery auth and browser download tests in the same CI                                                | Repository proof reused. BG-25's three older hosted checks were owner-attested, not independently captured new-account evidence.                                                                                                                                         |
| SSRF, redirects, prompt-shaped source and privacy routing | `source-fetcher.d1.spec.ts` (17), including inert prompt-injection-shaped text; `policy.test.ts` (9), extraction/provider/privacy tests                         | Local/CI proof. No claim of universal model-injection resistance or live provider acceptance; first-release providers remain disabled.                                                                                                                                   |
| Redacted structured logging                               | Reviewed matched logging sites in the Worker; BG-25 sentinel tests and opaque request IDs pass in CI                                                            | **GAP:** two paths still log arbitrary `Error.name`; fresh fault-injection reproduction below. No production leak is claimed.                                                                                                                                            |
| Health and dependency visibility                          | Public `/api/v1/health` is deliberately liveness only; protected operations routes and real capture/file smoke are the dependency checks                        | Do not infer D1/R2 readiness from a 200 health response. New hosted core smoke remains pending deployment authorization.                                                                                                                                                 |
| Actionable operations dashboard                           | `operations-summary.d1.spec.ts` (4), capacity utilization/continuity fixtures, operations browser CI and BG-26 evidence                                         | Local/CI PASS with explicit limitations. D1 attachment metadata is not an independent R2 inventory; provider-account totals/headroom remain unavailable in the app.                                                                                                      |
| Incident playbooks rehearsed                              | Controlled token compromise/promotion, provider-outage recovery, hard-quota core continuity, FTS rebuild and isolated restore/purge tests                       | Synthetic/local procedures supported. No current-account operator-performed hosted incident rehearsal or live containment/rotation claim.                                                                                                                                |
| No silent billing path                                    | Four hosted-dispatch/backup flags false, Cron absent, no enabled AI implementations, optional credentials absent; metered R2 risk explicitly disclosed/accepted | Narrow core configuration supported. Proposed warning/pause thresholds are not enforced caps; account billing visibility and alert-policy disposition remain unresolved.                                                                                                 |
| Deletion/restriction and index freshness                  | Item/privacy/search/recovery suites, `restore-purge-ledger.d1.spec.ts`, purge partial-failure and integrity tests in CI                                         | Local/CI proof reused. No new-account live deletion/index/cache acceptance; no production purge authorized. RAG/vector capabilities are not established by these tests.                                                                                                  |
| Independent recovery                                      | Previously verified downloaded encrypted backup restored three synthetic items/one 51-byte PDF into an isolated local target; search/hash/auth checks passed    | Reused valid local recovery proof, not a hosted disaster-recovery drill. Actual copied receipt ledger was empty; nonempty anti-resurrection is separate synthetic CI evidence.                                                                                           |
| Named operator and recovery handoff                       | Owner explicitly answered “I will do it” and supplied a Google Drive backup-folder label                                                                        | Deployment/recovery operator confirmed as repository owner. Private folder label and local recovery paths retained outside tracked source. Separate password/account recovery is owner-attested, not independently audited. No out-of-band alert/contact test performed. |
| Dependency security                                       | Fresh full and production-only npm audit, unchanged lockfile                                                                                                    | **GAP:** 24 vulnerable-package entries overall (10 high, 14 moderate); production-only 2 (Zod high, Hono moderate). Advisory presence is not proof of application exploitability.                                                                                        |

## Newly executed checks and concrete findings

### 1. Dependency advisories need remediation or explicit reachability disposition

The locked production packages are **Zod 3.25.76** and **Hono 4.12.30**.
`npm audit --json` reports 24 affected package entries, while
`npm audit --omit=dev --json` narrows the runtime list to those two packages.
Counts are a dated registry snapshot, not 24 independently proven exploits.
The historical BG-23/24 count of 11 advisories must not be reused as current.

For Zod, the registry identifies
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
The [maintainer's size-check fix](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd)
is explicitly for v4; do not blindly treat a major migration as a safe patch.
A bounded local probe of the **actual `itemUpdateSchema`** supplied 2,000
invalid topic elements in **4,029 input bytes**. It rejected them but built
**2,001 validation issues** despite `.max(20)`. This confirms eager work on an
oversized invalid collection. It does not prove a crash, anonymous HTTP
exploitability, actual Worker memory exhaustion or a complete advisory match
across Zod major versions. Review admission/authorization and error amplification
before choosing a compatible fix and focused regressions.

Hono has several reported feature-dependent advisories. For example, its
[maintainer's dot-notation advisory](https://github.com/honojs/hono/security/advisories/GHSA-g6gw-c38x-mqfc)
requires explicitly enabled dot-notation parsing. The repository's matching
`source-recovery.routes.ts` function named `parseBody` is its **own JSON/Zod
helper**, not evidence of using that Hono feature. The source search found no
use of the named CORS/JSX/language/proxy/SSG helpers; this is not a disposition
of every Hono advisory. Keep runtime versus development-only impact separate.
Some automatic audit suggestions are major-version changes or downgrades;
no `audit fix`, package install or dependency update was executed.

### 2. Two background paths log unsanitized error names

- `apps/worker-api/src/sync/notion-sync.service.ts`, network failure logging.
- `apps/worker-api/src/recovery/backup-cleanup.ts`, failed object deletion logging.

Both use `error instanceof Error ? error.name : ...`. A local fault-injection
probe assigned an arbitrary synthetic private marker to `Error.name`; the
marker reached the warning log in both paths. **Zero live fetches occurred.**
The Notion error still became `NOTION_NETWORK_ERROR`; failed backup cleanup
still returned zero without marking an object expired. Existing failure
semantics should be preserved when replacing the log field with a stable
allowlisted category. Add one targeted redaction regression per path.

These are disabled background/integration paths in the narrow first release.
That limits reachability; it does not make OPE-247's broad “no sensitive logs”
requirement proven. No actual credential leak or attacker-controlled production
path has been demonstrated, and no runtime fix is included in this review.

### 3. Cost controls and operator visibility are not configured by a plan

Workers Free is already owner-confirmed; no repeat confirmation or upgrade is
needed. R2 metered risk is accepted for the BG-31 preparation/review scope.
The **$1 warning, $5 stop-and-review and 1 GB manual upload pause remain
proposals**, not configured billing alerts, automatic storage controls or hard
invoice caps. Account-wide current/final billing cannot be inferred from D1
metadata or the app usage dashboard.

`OPERATIONS_RUNBOOK.md` requires Cloudflare budget alerts before future
pay-as-you-go enablement. The first-release packet does not record configured
alerts or a scoped disposition of that requirement for this installation's use
of an existing metered subscription. Resolve that policy/application question
and the owner's manual inspection/containment procedure before final signoff;
do not silently mark either alerts or a guaranteed $0 bill as established.
No alert creation, recurring monitor, email or provider send is authorized here.

## Review of the prepared first-release guide

- **Scope is deliberately narrow:** note/URL/file storage, lexical search over
  available stored text/metadata, edits, private original download and export.
  Saved URLs are not fetched; uploaded PDFs are not automatically text-extracted
  or searchable by their contents. Jobs can remain pending. No AI, Notion,
  Telegram, automatic hosted backup or scheduled pipeline is promised.
- **Migrations:** reuse the reviewed 22-file source order through `0025`, with
  intentional `0011`–`0013` gap. Fresh authenticated schema recheck still shows
  only `_cf_KV`, with zero rows written. All application migrations remain
  pending on the new production database. Do not confuse the fully migrated
  BG-29 staging database with this fresh target.
- **Failure/recovery:** stop only new ingress, preserve database/bucket/ledger,
  inspect the durable partial result and choose reviewed forward repair or a
  separately authorized isolated restore. There is no previous new-account
  app version. Code rollback cannot reverse SQL or substitute for originals.
- **Core credentials:** four names and private file permissions verified;
  optional provider credentials absent. Remote secret installation remains a
  later approved atomic deployment operation. Keep credential values out of
  exports, public artifacts and the review document.
- **Approval identity:** preserve the frozen source/config/SQL/Worker/Web
  hashes. PR #137 is already merged; no need to ask the owner to merge it again.
  An updated runtime after any remediation needs a new candidate, CI and packet.
- **Scope versus V1:** disabled optional features are an explicit release
  proposal, not proof that the full OPE-247/V1 contract is complete. Required
  gates need evidence or an explicit scoped contract decision before release.

## Operator handoff and remaining checklist

The private handoff is `.wrangler/ope247-review-20261031/OPERATOR_HANDOFF.md`.
It records the owner-provided backup-folder label, verified local backup/restore
evidence paths, separate-password recovery qualification and frozen release
receipt. Private folder labels are not copied into tracked source.

- [x] Read current OPE-247 requirements and map each to evidence/limitations.
- [x] Reuse exact-candidate security, rotation, privacy, recovery and ops CI.
- [x] Refresh dependency audit; run only missing bounded local probes.
- [x] Verify frozen artifact/archive hashes and credential-file permissions.
- [x] Review core scope, exact migration/recovery and proposed cost controls.
- [x] Confirm the owner as deployment/recovery operator and record backup label.
- [ ] Resolve the dependency/admission findings and background redaction gap;
      collect focused regression proof for the resulting source.
- [ ] Resolve cost-alert policy, account-level visibility and operator response
      arrangements without claiming an automatic spending cap.
- [ ] Obtain current-target hosted security/operations/incident evidence or an
      explicit accepted scoped release decision; keep full V1 proof separate.
- [ ] Resolve BG-29.078: owner currently requires Cron disabled and no monitoring.
- [ ] Obtain exact-build release authorization after all required dispositions.

## Final disposition and evidence location

**OPE-247 remains In Progress; BG-31 release remains NO-GO.** The review is
finished, but the identified findings and unobserved acceptance are not passed.
No tracker was closed or requirement waived. BG-29 was manually inspected once:
Cron empty, zero hosted sweeps, 24 originals retained. No monitoring was created.

New private evidence is under `.wrangler/ope247-review-20261031/`:
`npm-audit.json`, `npm-audit-production.json`, `ci-reuse.json`,
`packet-verification.json`, `log-name-probe.{ts,json}`,
`collection-probe.{ts,json}`, `fresh-production-schema.json` and
`bg29-hold-verification.json`. Probes use synthetic inputs only.

Skipped deliberately: repeat full CI, repeat backup restore, live rotations,
incident mutations, hosted purge/load tests, provider calls, billing changes,
production deployment, secret uploads and recurring monitoring. This report
adds documentation only; runtime findings are recorded for a scoped fix.
