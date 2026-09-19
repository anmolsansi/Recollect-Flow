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

### BG-03 — version-aware release smoke

Status: **complete; BG-04 unlocked**

- Primary evidence: [`BG-03_RELEASE_SMOKE_EDIT_VERSION.md`](BG-03_RELEASE_SMOKE_EDIT_VERSION.md)
- Pre-merge 100-action reconciliation: [`BG-03_CHECKLIST_RECONCILIATION.md`](BG-03_CHECKLIST_RECONCILIATION.md)
- Post-merge final closeout: [`BG-03_FINAL_CLOSEOUT.md`](BG-03_FINAL_CLOSEOUT.md) — authoritative 100/100 completion record
- GitHub tracking: issue #27 and merged PR #28
- Linear tracking: OPE-323
- Base `main`: `f43580786e4106c4983e30f1bb351e3150d16bf3`
- Implementation gate: GitHub Actions CI run #121
- Final clean-head gate: GitHub Actions CI run #130
- Merged `main` commit: `95f27d34527a3d5b9b9e31037c060672bf54c8f6`

BG-03 repairs the release verifier rather than the already-correct server contract. Every successful privacy mutation uses a server-authoritative item version and refetches before the next independent mutation. The verifier deliberately proves a stale version still returns `VERSION_CONFLICT`, preserves the existing Public/Personal/Sensitive policy controls, validates source/canonical evidence, fails nonzero on malformed/current-conflict cases and bounds/redacts failure diagnostics. A synthetic child-process regression is part of the normal repository test gate.

The pre-merge reconciliation intentionally stopped at 99/100 because the final action required a green clean-head CI and an actual merge. `BG-03_FINAL_CLOSEOUT.md` records that CI run #130 passed on the exact merged head and PR #28 merged successfully, satisfying BG-03.100 and unlocking BG-04.

### BG-04 — staged smoke story and local setup

Status: **complete; BG-05 unlocked**

- Primary evidence: [`BG-04_SMOKE_STORY_SETUP.md`](BG-04_SMOKE_STORY_SETUP.md)
- Pre-merge 100-action reconciliation: [`BG-04_CHECKLIST_RECONCILIATION.md`](BG-04_CHECKLIST_RECONCILIATION.md)
- Post-merge final closeout: [`BG-04_FINAL_CLOSEOUT.md`](BG-04_FINAL_CLOSEOUT.md) — authoritative 100/100 completion record
- GitHub tracking: issue #31 and merged PR #32
- Linear tracking: OPE-324
- Base `main`: `67c9ec7df369ca4f3413a40d97ceab03f23e4495`
- Implementation gate: GitHub Actions CI run #143
- Final clean-head gate: GitHub Actions CI run #147
- Merged `main` commit: `feb568f6438bc7068520fb654ca933238b9f8c28`

BG-04 turns the release verifier into truthful staged evidence. It reports passed, failed and unavailable stages, preserves earlier stage evidence on failure, requires explicit opt-in for non-local targets, separates exact replay from normalized duplicates, verifies provenance/raw retrieval and version-aware privacy behavior, proves attachment byte integrity without claiming extraction, keeps known later capabilities visibly unavailable, exercises edit/delete/restore/search/export smoke paths, and repairs the root two-terminal local startup instructions.

The pre-merge reconciliation intentionally stopped at 99/100 because the final action required a green documentation-complete CI and an actual merge. `BG-04_FINAL_CLOSEOUT.md` records CI run #147 on the exact merged head and PR #32's merge, satisfying BG-04.100 and unlocking BG-05.

### BG-05 — complete Priority 1 gate

Status: **complete; BG-06 unlocked**

- Primary evidence: [`BG-05_PRIORITY_1_GATE.md`](BG-05_PRIORITY_1_GATE.md)
- Automated-suite evidence: [`BG-05_TEST_SUITE_EVIDENCE.md`](BG-05_TEST_SUITE_EVIDENCE.md)
- Fresh-migration evidence: [`BG-05_MIGRATION_EVIDENCE.md`](BG-05_MIGRATION_EVIDENCE.md)
- Web-artifact evidence: [`BG-05_WEB_ARTIFACT_EVIDENCE.md`](BG-05_WEB_ARTIFACT_EVIDENCE.md)
- Worker/smoke evidence: [`BG-05_RUNTIME_EVIDENCE.md`](BG-05_RUNTIME_EVIDENCE.md)
- Pre-merge reconciliation: [`BG-05_CHECKLIST_RECONCILIATION.md`](BG-05_CHECKLIST_RECONCILIATION.md)
- Post-merge final closeout: [`BG-05_FINAL_CLOSEOUT.md`](BG-05_FINAL_CLOSEOUT.md) — authoritative 100/100 completion record
- GitHub tracking: issue #34 and merged PR #35
- Linear tracking: OPE-325
- Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`
- Exact-candidate repository gate: GitHub Actions CI run #150
- Exact-candidate Worker/smoke proof: BG-05 Candidate Proof run `35263570610`
- Final PR-head gate: GitHub Actions CI run #153
- Final clean-head gate: GitHub Actions CI run #154
- Merged `main` commit: `5f6d61c6a255611fd8d6b6ba6731b4e92f33d4df`

BG-05 reuses the green exact-SHA repository gate and adds the two missing operational proofs without changing application source. The candidate passes formatting, lint, type contracts, 5 release-verifier regressions, 132 Node tests, 116 Worker D1 tests, 9 Web tests, the production Web build and all 18 fresh local migrations. A separate exact-candidate proof passes the Worker deployment dry-run and corrected local smoke with 24 passed, 0 failed and 4 explicitly unavailable later-stage capabilities.

The task-specific proof workflow was removed after producing immutable Actions evidence. PR #35 preserved the microcommit history, passed final-head CI #153, merged successfully, and the resulting `main` SHA passed clean-head CI #154. `BG-05_FINAL_CLOSEOUT.md` therefore satisfies BG-05.100 and unlocks BG-06. No production deployment, remote migration, live external delivery or production credential use occurred.

### BG-06 — attachment read authorization

Status: **100/100 complete when this closeout entry is present on `main`**

- Primary evidence: [`BG-06_ATTACHMENT_READ_AUTH.md`](BG-06_ATTACHMENT_READ_AUTH.md)
- Checklist reconciliation: [`BG-06_CHECKLIST_RECONCILIATION.md`](BG-06_CHECKLIST_RECONCILIATION.md)
- Final closeout: [`BG-06_FINAL_CLOSEOUT.md`](BG-06_FINAL_CLOSEOUT.md)
- GitHub tracking: issue #38, merged implementation PR #39
- Linear tracking: OPE-326
- Task base `main`: `13f78b3c4eb1246e044f3a23ed8130de54817434`
- Final implementation/evidence head: `980dad7793d11e408c5661cc68c85e18f3bd2322`
- Merged implementation `main`: `a5096e337def6cad993ff5267f640cc619cafa03`
- Technical implementation gate: GitHub Actions CI run #170
- Documentation-complete implementation gate: GitHub Actions CI run #175
- Final closeout gate: GitHub Actions CI run #180 — passed

BG-06 replaces the conflicting wildcard attachment-read bearer gate with a
capability-specific content guard. Capture bearer, admin bearer and a verified
signed admin session cookie can read eligible attachment content. Upload routes
keep their existing bearer boundary, and deletion explicitly preserves the prior
bearer-first plus admin-only behavior so capture credentials and cookie-only browser
sessions cannot delete. Mixed credentials use the existing alternative-credential
precedence, and attachment lifecycle/R2 checks remain intact after authentication.

Implementation PR #39 is merged. The authoritative checklist is 100/100 on a
documentation-only closeout branch based exactly on the merged implementation SHA.
Closeout PR #40 passed GitHub Actions CI run #180. When this entry is present on
`main`, GitHub #38 / Linear OPE-326 can close and BG-07 is durably unlocked.

### BG-07 — browser attachment download

Status: **100/100 complete when this closeout entry is present on `main`**

- Primary evidence: [`BG-07_BROWSER_DOWNLOAD.md`](BG-07_BROWSER_DOWNLOAD.md)
- Checklist reconciliation: [`BG-07_CHECKLIST_RECONCILIATION.md`](BG-07_CHECKLIST_RECONCILIATION.md)
- Final closeout: [`BG-07_FINAL_CLOSEOUT.md`](BG-07_FINAL_CLOSEOUT.md)
- GitHub tracking: issue #41 / merged implementation PR #42
- Linear tracking: OPE-327
- Task base `main`: `cb660e359abe36949040bca5d843b7a3d9d660d3`
- Final implementation/browser gate: GitHub Actions CI run #208
- Final implementation head: `2f3a9ba36643398059066925dbba3b1be4fb38e7`
- Merged implementation `main`: `27aa0dad8cf82c8e8c483baaf1b302c4772d170d`

BG-07 preserves the BG-06 read-authorization contract and the existing same-origin
Web Download anchor. It adds stronger attachment response/lifecycle regressions,
requires signed-cookie download to pass release smoke, and adds an isolated real
Chrome acceptance story. Chrome logs in through the actual form, uses the HttpOnly
signed admin session, opens real item detail pages and downloads exact PDF, PNG and
text originals through the actual anchor. Byte length and SHA-256 match, reload
retains the valid session, and logout/tampered/expired session states receive fresh
`401` responses.

Implementation PR #42 is merged. CI #208 passed the repository quality gate, local
migrations, Chrome availability and `browser:download:test`. The authoritative
checklist is 100/100 on a documentation-only closeout branch created directly from
the merged implementation SHA. When this entry is present on `main`, GitHub #41
and Linear OPE-327 can close and BG-08 is unlocked.

## Evidence rules

- Tie claims to a revision and environment.
- Distinguish current observation from reused evidence.
- Distinguish pass, fail, skipped and not-reached states.
- Use synthetic fixture identifiers only.
- Never commit actual credentials or private captured content.
- Do not call local/CI implementation evidence production acceptance.
