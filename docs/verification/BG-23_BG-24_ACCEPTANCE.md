# BG23/BG24 acceptance and release qualifications

Baseline: `b6f5113`, `origin/main`. Task branch `feat/bg23-bg24-operations-auth` in the managed worktree. [GitHub #88](https://github.com/anmolsansi/Recollect-Flow/issues/88) contains 50 microtasks; [OPE-247](https://linear.app/openclaw-neutron/issue/OPE-247/complete-v1-security-observability-and-operational-hardening) stays open for broader hardening. Execution began October 14 and resumed October 15, 2026 after an approval-review usage limit. No production configuration or data changed.

## BG23 contract proof

The [inventory](../OPERATIONAL_CONTROLS.md) was checked against current route middleware, Zod schemas and service state guards for usage, jobs/reconciliation, source recovery, Notion recreation, digests, exports, backups, integrity, purges and restore. Every runbook incident has a diagnosis, current control/manual alternative and expected result. BG26-28 screen scope is explicit; account-wide measurements and missing aggregate endpoints remain absent.

The rotation test's operator authorization matrix invokes the actual app and checks anonymous, capture and local-worker denial before any DB/external work. Source route/service review establishes exact inputs, IDs, audit and state guards; existing repository tests provide accepted/failure behavior. GET inspection does not start jobs or send messages. Integrity POST and restore dry-run explicitly persist run evidence; they are not labeled pure reads.

The first full gate caught an old attachment test expecting invalid-bearer fallback to a valid cookie. BG24 deliberately aligns original reads with capture/admin precedence. The regression now expects 401 and still verifies valid bearer access with a tampered cookie. This is an intentional stricter authentication boundary, not removal of cookie-only downloads.

## BG24 focused proof

`npm run auth:rotation:test` uses synthetic secrets and a controlled clock, restored after each test. It covers single-slot compatibility, empty/malformed config, 24h default/72h maximum, exact boundaries for all scopes, constant-time candidate comparisons, actual route scopes and Shortcut outcome envelopes, active-key issuance, legacy/versioned copied-cookie bounds, promotion, fresh-key compromise, unaffected scopes, Origin and cookie attributes, browser-only logout, and log/error redaction.

The D1 fixture migrates disposable local state, captures an item, expires the old capture key, replays through the next key, promotes it and replays again. Item row and capture-event data remain identical, with one canonical item identity and one capture event. No migrations, new dependencies or live credentials are introduced. [The operator runbook](../TOKEN_ROTATION.md) describes atomic staging, verification, promotion, secret-free records and rollback; remote commands are documented, not executed.

## Gate ledger

Local validation passed on `3a0e0e9383f462b4c2978915d7513cbaee4d3169` (October 15):

- Exact-lockfile worktree installation, followed by `npm run check`: formatting, lint, types, six release-verifier tests, 242 Node tests, 169 D1 tests, contracts, 62 Web tests and Web build.
- Six release-package tests, clean package build and Wrangler deployment dry-run.
- Production-entry bundled Chrome hosting/login/reload/back-forward/logout matrix, plus actual browser PDF/PNG/text download checksums. Download URL audit: 38 inspected, zero credential-bearing URLs. Logout, tampered and expired sessions all rejected with 401.
- Node `v25.8.1`, Chrome `155.0.8059.79`; hosted CI uses its configured Node 22. The initial root dependency link omitted workspace-specific TypeScript, so it was replaced with a fresh lockfile install; no application workaround or lockfile change was needed.

Release manifest: `8b7c05b9c696249e0f7ed79b155597100f61ce22da7f6a4bf67356504c8bcf5f`, tied to the tested revision above. Generated build output, test state and private credentials are not committed. Documentation-only evidence commits after this revision do not change the runtime.

`npm audit` also reports **11 existing advisories** (8 high, 3 moderate) in the unchanged dependency tree, including a moderate Hono advisory and development-tool transitive issues. This task adds no dependency versions and does not run `audit fix`; dependency remediation remains an explicit security/release follow-up under the broader hardening work. Green feature checks are not a claim that the repository is vulnerability-free.

Exact PR-head and merged-main results are recorded here or in the main issue only after they actually finish. A passing source test does not prove a live secret change, edge convergence, HTTPS rollout or phone-client update.

Carry BG21/BG22 hosted HTTPS/cache/rollback and remaining processing/outage acceptance as release blockers. Their earlier local work is preserved in the original checkout and is not included in this branch. BG23/BG24 completion unlocks BG25 and later source work; it does not close broader OPE-247 or authorize production deployment/messages.
