# BG-06 — Final Closeout

Status: **100 / 100 complete when this closeout record is present on `main`**

Tracking: GitHub #38 / implementation PR #39 / Linear OPE-326

Implementation merge:

- PR #39 merged successfully on 2026-09-18.
- Merged `main` commit: `a5096e337def6cad993ff5267f640cc619cafa03`.
- Final implementation/evidence head before merge:
  `980dad7793d11e408c5661cc68c85e18f3bd2322`.
- Pre-merge documentation-complete CI: GitHub Actions run #175 — passed.
- Earlier code-complete CI: GitHub Actions run #170 — passed.

## Completion decision

BG-06's technical and documentation work is merged into `main`. The authorization
contract is now part of the repository's default branch:

- capture bearer may read eligible attachment content;
- admin bearer may read eligible attachment content;
- a verified signed admin session cookie may read eligible attachment content;
- anonymous, invalid and local-worker-only requests remain denied;
- permitted read credentials are alternatives when multiple credential forms are
  present;
- upload routes keep their existing bearer boundary;
- attachment deletion keeps the bearer-first plus admin-only boundary, so capture
  credentials and cookie-only browser sessions still cannot delete;
- attachment lifecycle, private R2 lookup, safe filename and no-store behavior remain
  enforced after authentication.

The implementation PR changed no database schema and performed no production
deployment, remote migration or live-credential operation.

## Verification history

The final pre-merge branch passed the repository's full CI gate in run #175:

- formatting, lint and root typecheck: passed;
- release-verifier regressions: 5 / 5;
- Node Vitest: 23 files, 140 / 140 tests;
- Worker D1 Vitest: 33 files, 116 / 116 tests;
- shared contracts typecheck: passed;
- Web lint: passed;
- Web Vitest: 2 files, 9 / 9 tests;
- Web production build: passed;
- local D1 migration gate: all 18 checked-in migration commands completed
  successfully.

The repository did not expose a separate workflow run for merge SHA
`a5096e337def6cad993ff5267f640cc619cafa03` when this closeout branch was
created. To avoid fabricating a clean-head claim, final closeout PR #40 was based
exactly on that merged `main` commit and changed documentation/checklist state only.

GitHub Actions CI run #180 on the closeout PR passed the normal repository gate,
including `npm run check` and `npm run db:migrate:local`. That validates the
already-merged application tree plus the final evidence updates without introducing
another application change.

## BG-06.100

The authoritative checklist records BG-06.001 through BG-06.100 as complete.
Closeout PR #40 passed CI run #180. This record is authoritative only when read from
`main`, which means the closeout PR has merged.

At that point:

- BG-06 is **100 / 100 complete**;
- GitHub #38 can close;
- Linear OPE-326 can move to Done;
- BG-07 is unlocked to prove the original attachment actually downloads in a
  browser.

## Security qualification

`npm ci` on the validated implementation still reported 10 inherited dependency
advisories, 3 moderate and 7 high. BG-06 did not silently change unrelated
dependencies. That existing maintenance concern remains separate from the
attachment-read authorization task.
