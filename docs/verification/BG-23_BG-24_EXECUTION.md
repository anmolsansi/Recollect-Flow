# BG-23/BG-24 execution contract

Starting revision: `b6f51131050e7c1bf034ab5e05bb2c6849ae325d` from fetched `origin/main`.
Base: `main`. Task branch: `feat/bg23-bg24-operations-auth`, created in an isolated managed worktree to preserve the prior BG21/BG22 changes.

The owner explicitly authorized continuing with BG23/BG24 despite the unfinished BG21/BG22 release evidence. This permits inventory and implementation, not a claim that those release checks passed. Keep HTTPS/cache/rollback, acquired-text and provider-outage acceptance open in the release ledger.

The task implements the operational control inventory and ADR-033 credential rotation, with synthetic local fixtures. No production keys, D1/R2 bindings, live messages or data migrations are changed. BG23 selects surfaces; later BG26-28 implement the operations UI. OPE-247 remains the broader hardening task and cannot be closed by BG23/BG24 alone.

Execution uses one main GitHub issue with 50 defined microtasks, focused checks and meaningful commits. Every five steps receives a cumulative review. Read-only discovery and administrative steps do not receive empty commits.

Tracking: [GitHub #88](https://github.com/anmolsansi/Recollect-Flow/issues/88) and [Linear OPE-247](https://linear.app/openclaw-neutron/issue/OPE-247/complete-v1-security-observability-and-operational-hardening). The 50 definitions of done are maintained in the GitHub issue.
