# BG-14 — Real-browser workflow acceptance

Status: **implementation under verification**. This is a task-scoped record for
[BG-14](../RECOLLECTFLOW_BUILD_GUIDE.md#20-bg-14--prove-the-repaired-workflow-in-a-browser),
[tracking issue #63](https://github.com/anmolsansi/Recollect-Flow/issues/63) and
[PR #64](https://github.com/anmolsansi/Recollect-Flow/pull/64).
Do not unlock BG-15 until clean-head, merged-main browser proof is green and
unperformed requirements are explicitly resolved.

## Baseline and acceptance boundary

- Base `main`: `e3fdecaa77e4da5cb55136065634d7b82e185c9a`.
- BG-13 predecessor: [final closeout](BG-13_FINAL_CLOSEOUT.md),
  [merged PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62).
- Environment: ephemeral local Wrangler D1/R2, isolated process group, Vite,
  an isolated Chrome profile, synthetic-only capture identities and random local
  bearer tokens. No production Cloudflare migration, deployment, live auth
  or Telegram/Notion send is authorized by this task.
- Original source URL is a controlled `https://example.com/bg14-...` marker.
  **No live third-party URL fetch is performed by the new failure/retry journey.**
  Browser login and data requests are _not_ mocked.

## Architecture decision

Option A (selected): extend the repository's BG-07 Chrome DevTools Protocol,
Worker/Vite startup, PDF/PNG hashes and BG-11 keyboard tests. Advantages:
real cookie/download/network boundaries, no new library, consistent cleanup.
Tradeoff: imperative CDP selectors need maintenance as the Web UI evolves.

Option B (rejected for BG-14): add Playwright/browser-driver dependency and
replace existing browser scripts. Advantages: richer locator/assertion API.
Costs: parallel browser stack, additional install/browser management and
high scope churn without improving the signed-cookie proof already present.

Keep broad source-fetch parsing combinations in Worker D1/unit tests. Real
browser acceptance is reserved for the user-visible boundary: login,
download, search, conflict feedback, state, edits, lifecycle and logout.

## Execution

From the repository root with Node 22+, local Chrome, and installed dependencies:

```sh
npm ci
npm run browser:download:test
npm run browser:source-recovery:test
npm run browser:workflow:test
```

The three commands start isolated Worker/Vite/Chrome instances; no shared
persistent D1 or R2 state is required. The BG-14 script creates unique text
and public URL captures; the existing BG-07 script generates parseable PDF,
PNG and text files and compares their downloaded exact SHA-256 and sizes after
real browser Download clicks (including a reload). BG-11 uses real keyboard
Tab and Enter to save source evidence. The new journey deliberately injects
a controlled **worker failure through the authenticated worker lease/fail
routes**, not through an unguarded SQL update or a fake browser response.

The new Chrome journey checks:

1. signed-cookie login (HttpOnly / SameSite Strict; token absent from storage),
2. genuine browser Inbox text search, item detail and current source evidence,
3. visible stale-version conflict and safe refresh after concurrent owner edit,
4. persisted owner title override,
5. leased current-generation URL job terminal failure; failure code, job
   state and aggregate item state agree in API and browser,
6. owner-controlled retry via the actual UI, leaving a queued job without
   executing an external outbound fetch,
7. owner-supplied text recovery without changing the original URL or title,
8. soft-delete, search exclusion, Deleted filter, restore,
9. narrow viewport overflow and logout's immediate private-read denial.

Requests are tracked only by method, pathname and HTTP status, never URL
query strings, body, cookies, bearer tokens or uploaded content. Failed runs
may store one synthetic-data-only screenshot and sanitized JSON under
`artifacts/bg14/`; CI uploads these only after failure for short retention.
All fixture/process/profile cleanup is owned by the harness and invoked in
`finally`.

## Pinned-source probe and network constraint

A separate opt-in command, `npm run browser:acquisition:test`, uses a static
HTML fixture pinned to commit `5d210b4c28d9eeb85fa05c82dde1361d423175e9`.
It starts the **actual scheduled Worker** on disposable local state, retires
only the disposable fixture's Notion sync attempt to prevent outbound delivery,
and requires source acquisition, browser detail text and Inbox search.

The focused proof executed in GitHub Actions
[run 38056407620](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38056407620),
but **failed**: the URL job returned pending with
`SOURCE_NETWORK_ERROR`; no `url_acquisitions` row was committed. This
is an explicitly **unpassed** URL-acquisition acceptance check, not a silent
skip or proof that the Web UI is correct under successful acquisition.
A non-network fixture or known-safe upstream mock at the worker boundary is
still needed to validate the positive flow repeatably. The temporary focused
workflow was removed from the PR after capturing this evidence; the opt-in
script remains available for an environment with permitted outbound access.

## Important limit: upstream source acquisition

BG-14's positive acquired-HTML and internal-page search story must be
proven using a deterministic **public** source fixture that exercises the
real acquisition worker without bypassing SSRF controls. A localhost or
private-address fixture would violate the fetch policy. The current test
covers the negative worker outcome and deterministic owner-supplied text,
**not a positive externally acquired URL response**. Do not check
BG-14.051–.057 or the final BG-15 unlock on this evidence alone.

## Evidence accounting

For each candidate, record exact head SHA and GitHub Actions run URL.
A passing `npm run check` is separate from real Chrome browser proof.
The 100-step checklist must mark only performed and validated steps, and
remaining external-acquisition/cleanup/CI requirements must stay visible.
