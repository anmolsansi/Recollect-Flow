# Phase 0 — Hardening readiness

Date: 2026-08-09

## Purpose

Freeze the repository context and owner/architect contracts required before the V1 hardening sequence begins. This phase makes no production change and introduces no runtime implementation.

## Baseline

- Base branch: `main`
- Audited base commit: `b7e44065cec59808ade2dc7d2b22c3c0a1d1f3cd`
- OPE-227 prerequisite: OPE-222 is merged, Linear Done, and documented as deployed.
- OPE-228 code prerequisites: OPE-225, OPE-249, OPE-221, and OPE-216 are merged.
- OPE-247 remains blocked on OPE-227 and OPE-228.
- OPE-229 remains the human V1 launch gate and is not a normal coding ticket.

## Frozen Phase 0 decisions

- ADR-028: quota enforcement is provider/operation/window specific; only actually published constrained dimensions are modeled. Missing token quotas remain unset rather than being labeled unlimited.
- ADR-029: V1 AI execution is restricted to explicitly approved free-tier provider/model combinations; paid processing cannot be enabled through configuration alone.
- ADR-030: quota/circuit-breaker capacity deferrals return jobs to pending without consuming their terminal retry allowance.
- ADR-031: verified hosted backups are immutable with 30-day retention; purge receipts prevent a later restore from resurrecting purged items; owner-downloaded backups are outside remote deletion control.
- ADR-032: only RecollectFlow/D1 may initiate canonical permanent deletion; Notion is downstream only.
- ADR-033: routine token rotation uses 24-hour default overlap, 72-hour maximum overlap, and immediate old-token revocation on suspected compromise.

## OpenRouter baseline supplied by owner

For OPE-227 design, the owner-approved baseline dated 2026-08-09 models OpenRouter free traffic as a shared account-wide request pool with 20 RPM and the applicable 50/1,000 RPD tier. No provider-wide input/output TPM or tokens/day value is invented when OpenRouter does not publish one. Model context/output/modalities remain separate per-request constraints.

This is operational quota data, not a timeless architecture constant. OPE-227 must revalidate provider limits from authoritative provider documentation before release or provider-policy changes.

## Exit criteria

- [x] Current repository/Linear dependency state audited.
- [x] `docs/repo_context.md` refreshed from the July foundation-only snapshot.
- [x] Six owner/architect decisions frozen in `docs/DECISIONS.md`.
- [x] OPE-227 and OPE-228 readiness boundaries documented.
- [ ] Repository CI green for this documentation branch.
- [ ] Phase 0 PR merged to `main`.

After merge, OPE-227 must start from a fresh branch based on the new `main`.
