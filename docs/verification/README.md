# Verification Evidence Index

This directory contains task-scoped verification evidence that is safe to keep in the repository. It records sanitized results and links to immutable CI/audit sources rather than committing secrets, private capture content or large raw logs.

## Priority 1 — verification foundation

### BG-01 — reproducible baseline

Status: **complete; BG-02 unlocked**

- Primary evidence: [`BG-01_REPRODUCIBLE_BASELINE.md`](BG-01_REPRODUCIBLE_BASELINE.md)
- 100-action reconciliation: [`BG-01_CHECKLIST_RECONCILIATION.md`](BG-01_CHECKLIST_RECONCILIATION.md)
- GitHub tracking: issue #23
- Linear tracking: OPE-321
- Application baseline: `6d5c36b81c9167dc3b53841562d5c997c3c4b3cb`
- Prerequisite repo-context commit: `90174606c9d89ef7a28d9474f12121d6cc9d9f4f`
- Current Node 22 baseline source: GitHub Actions run #91 on prerequisite PR #22
- Historical application-equivalent runtime source: `docs/WORKFLOW_AUDIT_2026-09-12.md`

BG-01 intentionally leaves the repository quality gate red on the dated capacity-window assertion. That failure is the frozen entry condition for BG-02. A red baseline is not permission to bypass CI.

### BG-02 — clock-stable usage regression

Status: **complete; BG-03 unlocked**

- Primary evidence: [`BG-02_USAGE_CLOCK_STABILIZATION.md`](BG-02_USAGE_CLOCK_STABILIZATION.md)
- 100-action reconciliation: [`BG-02_CHECKLIST_RECONCILIATION.md`](BG-02_CHECKLIST_RECONCILIATION.md)
- GitHub tracking: issue #25 and PR #26
- Linear tracking: OPE-322
- Base `main`: `841af95181123630c49fe231297ad12749e40b29`
- Verified implementation commit: `82a63a47dba143ce87f411bceac654c0f5a855cd`
- Full implementation gate: GitHub Actions CI run #102
- Focused repeated/adjacent proof: temporary `BG-02 focused proof` workflow run #1
- Documentation-complete gate: GitHub Actions CI run #110

BG-02 keeps production quota semantics unchanged. The D1 regression controls the test wall clock, proves the strict expiry boundary through the real `/api/v1/usage` route, preserves authorization/redaction checks and restores real timers after each test. The temporary focused-proof and formatter-proof workflows were removed after producing evidence, so no task-specific workflow remains in the final branch diff.

BG-03 is now unlocked. Its scope is the version-aware release-smoke repair defined by the build guide; BG-02 does not preemptively change that script.

## Evidence rules

- Tie claims to a revision and environment.
- Distinguish current observation from reused evidence.
- Distinguish pass, fail, skipped and not-reached states.
- Use synthetic fixture identifiers only.
- Never commit actual credentials or private captured content.
- Do not call local/CI implementation evidence production acceptance.
