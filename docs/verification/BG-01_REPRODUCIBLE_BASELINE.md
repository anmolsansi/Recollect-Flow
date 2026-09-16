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
