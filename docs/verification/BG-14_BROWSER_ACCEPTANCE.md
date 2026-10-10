# BG-14 — Real-browser workflow acceptance

Status: **complete on main; BG-15 unlocked**. This is a task-scoped record for
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
- Two controlled source cases use `https://example.com/bg14-...` URLs. The
  positive case resolves at the test-only upstream fetch seam; the negative
  worker-failure/retry story performs no external fetch. Browser login and
  API/D1 requests are **never mocked**. The production fetcher and production
  deployment entrypoint are unchanged.

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
npm run browser:acquisition:test
```

All four commands start isolated Worker/Vite/Chrome instances; no shared
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

## Positive acquisition: actual parser and search, upstream-only mock

The network-dependent candidate originally requested a real static HTML
file from a pinned public GitHub revision. [Run
38056407620](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38056407620)
proved that approach was unreliable in local workerd: the URL job recorded
`SOURCE_NETWORK_ERROR` and no acquisition evidence. We do **not** count
that attempt as a pass or retry against arbitrary live websites.

Instead, `scripts/bg14-fixture-worker.ts` is an entirely test-only Worker
entrypoint. The browser runtime constructs a disposable Wrangler config
(`.bg14-fixture-*.toml`) pointing to it, without changing `wrangler.toml`.
The entrypoint uses the **same** `createApp()`, `JobService`,
`SourceAcquisitionService`, `SourceFetcher`, D1 migrations and app routes.
It overrides **only** the SourceFetcher's upstream `fetch` implementation,
accepting a strict `https://example.com/bg14-fixture-<32-hex>` URL and
returning a bounded synthetic HTML page. Unknown URLs are refused.

The actual `SourceFetcher` URL validation, content-type and size limits,
HTML parser, lease guards, source evidence write, current item projection,
FTS synchronization, authenticated browser detail and Inbox search all run
normally. The fixture scheduler does **not** execute Notion, Telegram,
unrelated queue consumers or other external outbound operations. The
original source URL and preserved owner text remain immutable under this
test. Each run uses new local state, credentials, URL, item ID and Chrome
profile. Temp config and state are deleted after each run.

[Focused GitHub Actions run 38057058035](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38057058035)
**passed**: an actual acquisition job persisted `acquired_text`, the browser
showed the synthetic page phrase in its acquired-source field, and a real
Inbox query matched the precise saved item. The fixture is a deterministic
upstream substitute, **not evidence that arbitrary production websites are
reachable**. This is the intentionally mocked upstream boundary BG-14 calls
for, not an HTTP response stub at the browser or application API boundary.

## Additional acceptance cases and verification

- **Canonical capture reuse:** the isolated acquisition story submits two distinct
  capture events for the same normalized fixture URL and checks that the
  canonical item ID is reused rather than scheduling duplicate processing.
- **Unavailable website:** a separately allowlisted `bg14-unavailable-<32-hex>`
  fixture returns an upstream HTTP 404 from the same `SourceFetcher` seam.
  The real acquisition service commits `unavailable`, `url_only` coverage and
  no fabricated `acquired_text`; Chrome renders the limited-coverage explanation
  while preserving the saved URL.
- **Recovery convergence:** the negative workflow first guards a real leased
  processing job failure, then activates the real `Retry page fetch` UI. A
  fixture-only scheduled event invokes actual current-generation acquisition
  processing and the test waits until the job reaches `complete` and the
  acquisition record reaches `acquired_text` before testing owner overrides.
  No live URL is contacted and no production policy bypass is introduced.
- **Missing original:** an authenticated browser request for a nonexistent
  attachment ID must fail with 404 rather than returning arbitrary bytes.

[Focused CI #38061274571](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38061274571)
passed the canonical-duplicate, acquired-HTML/FTS, unavailable/limited
coverage and browser guidance cases, with clean isolated state. The longer
workflow including retry convergence and missing-original assertions requires
a fresh full CI success on its exact implementation head.

## Repetition and remaining release boundary

GitHub CI runs the BG-07 PDF/PNG original-byte acceptance, BG-11 keyboard
recovery, the new negative-to-retry/owner-edit/lifecycle journey, and the
positive acquired-source journey. It repeats both BG-14 journeys with fresh
fixtures to detect accidental shared-state dependence. The full PR-head
and merged-main CI must pass before BG-14 is considered closed. Production
deployment, public-site connectivity and historical backfill remain out of
scope; BG-15 may only unlock from actually verified, merged evidence.

## Evidence accounting

For each candidate, record exact head SHA and GitHub Actions run URL.
A passing `npm run check` is separate from real Chrome browser proof.
The 100-step checklist must mark only performed and validated steps, and
remaining external-acquisition/cleanup/CI requirements must stay visible.
