# BG-07 — Final Closeout

Status: **100 / 100 complete when this closeout record is present on `main`**

Tracking: GitHub #41 / implementation PR #42 / Linear OPE-327

Implementation merge:

- PR #42 merged successfully on 2026-09-19.
- Merged `main` commit: `27aa0dad8cf82c8e8c483baaf1b302c4772d170d`.
- Final implementation/documentation head before merge:
  `2f3a9ba36643398059066925dbba3b1be4fb38e7`.
- Final pre-merge GitHub Actions CI run #208: passed.
- Closeout branch:
  `agent/ope-327-bg-07-final-closeout`, created directly from the exact merged
  `main` commit above.

## Completion decision

BG-07's implementation is merged into `main`. The browser download contract is now
part of the repository's default branch:

- the existing same-origin Web Download anchor is preserved;
- a valid signed admin browser session can reach eligible private attachment bytes;
- capture/admin bearer compatibility remains intact;
- upload and delete authorization boundaries remain unchanged;
- PDF, PNG and text downloads are checked by exact size and SHA-256;
- response MIME, safe filename, Content-Disposition, Content-Length, private caching,
  nosniff and ETag behavior have regression coverage;
- reload keeps a valid browser session usable;
- logout, anonymous, tampered and expired browser-session reads fail closed;
- missing, deleted/purged, unavailable and missing-object cases remain controlled;
- traversal-shaped IDs and hostile filename metadata do not expose private object
  keys, credentials or injected response headers;
- release smoke treats the signed-cookie attachment path as required, not unavailable.

The implementation changed no database schema and performed no production
deployment, remote migration or live-credential operation.

## Browser and repository verification

The final pre-merge branch passed GitHub Actions CI run #208.

The repository gate passed formatting, lint, root TypeScript, six release-verifier
regressions, 146 Node tests, 116 Worker D1 tests, shared contracts, Web lint, nine
Web tests and the production Web build. The local migration gate passed all
checked-in migrations.

The same CI run used Google Chrome 152 and passed
`npm run browser:download:test`. The real browser logged in through the actual form,
used the signed HttpOnly admin session, opened real item detail pages and clicked
the actual Download anchors. It saved exact PDF, PNG and text originals and verified
their byte lengths and SHA-256 hashes. A repeat PDF download after reload matched
again. Fresh reads after logout, tampering and expiry returned `401`.

The acceptance environment used isolated local D1/R2 state and synthetic
credentials. The runtime cleaned its owned processes, Chrome profile and temporary
Wrangler state after execution.

## BG-07.100

Implementation PR #42 is merged, and this documentation-only closeout branch starts
from the exact implementation merge commit. The authoritative checklist marks
BG-07.001 through BG-07.100 complete on this closeout branch.

This record is authoritative only when it is present on `main`. Therefore the
closeout pull request must pass the normal repository CI gate before merge. Once
that happens and this record is on `main`:

- BG-07 is **100 / 100 complete**;
- GitHub #41 can close;
- Linear OPE-327 can move to Done;
- BG-08 is unlocked.

## Security qualification

`npm ci` on the validated implementation still reports the repository's inherited
10 dependency advisories, 3 moderate and 7 high. BG-07 did not silently upgrade
unrelated dependencies. That existing maintenance concern remains separate from
the browser-download task.
