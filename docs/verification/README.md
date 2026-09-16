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

## Evidence rules

- Tie claims to a revision and environment.
- Distinguish current observation from reused evidence.
- Distinguish pass, fail, skipped and not-reached states.
- Use synthetic fixture identifiers only.
- Never commit actual credentials or private captured content.
- Do not call local/CI implementation evidence production acceptance.
