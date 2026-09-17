# BG-05 — Automated Suite Evidence

Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`

Source: GitHub Actions CI run #150, job `quality`, executed on the exact candidate SHA under Node `v22.23.2`.

## Release verifier regression

`npm run release:smoke:test` passed:

- test files/suites: Node TAP runner, 5 scenarios
- tests: **5 passed / 5 total**
- failures: 0
- skipped: 0
- todo: 0

The five scenarios include successful staged reporting with known unavailable capabilities, malformed authoritative edit-version rejection, unexpected current-version conflict handling, remote-target opt-in enforcement, and credential redaction.

## Root Node suite

`vitest run --config vitest.node.config.ts` passed:

- test files: **23 passed / 23 total**
- tests: **132 passed / 132 total**
- skipped: none reported

This includes capture, attachment, extraction, policy, capacity, provider fallback, digest, Notion sync, recovery and related unit-level contracts.

## Worker D1 suite

`vitest run --config vitest.d1.config.ts` passed:

- test files: **33 passed / 33 total**
- tests: **116 passed / 116 total**
- skipped: none reported

The dated usage regression in `capacity-usage.d1.spec.ts` passed as part of this suite. The D1 suite also exercises search/FTS behavior, migrations, edit/recovery routes, durable jobs, digest delivery safety, capacity controls, backup/restore, purge safety and recovery authorization.

## Web suite

`npm run web:test` passed:

- test files: **2 passed / 2 total**
- tests: **9 passed / 9 total**
- skipped: none reported

## Result

All automated suites required by the repository gate are green on the verification candidate. BG-05 does not carry any expected unit-test failure into Priority 2.
