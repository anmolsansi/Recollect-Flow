# BG-14 — Final Browser Acceptance Closeout

**Decision:** BG-14 is complete on `main` after the merged implementation and
this closeout record are present. The next engineering task, BG-15, is
unlocked. This is a local/CI browser acceptance gate, **not** authorization
to deploy to production, migrate remote D1 data, or exercise real credentials.

## Immutable delivery references

- Tracking: [issue #63](https://github.com/anmolsansi/Recollect-Flow/issues/63).
- Implementation: [merged PR #64](https://github.com/anmolsansi/Recollect-Flow/pull/64).
- Exact implementation head: `a6d2e7b7c11aec3e019dc5eafeab2c7a9a255089`.
- Merge commit on `main`: `03d81805326cb6c6a3492eae323a3270a5b2baa1`.
- [Passing exact-head PR CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38061589399).
- [Passing merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/38061802146).
- [Architecture, safe fixture and script details](BG-14_BROWSER_ACCEPTANCE.md).
- [Canonical 100-step checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-14--100-executable-microtasks).

## Verified user-boundary regressions

The merged-main CI completed the repository quality gate, fresh local D1
migrations and four Chrome acceptance commands. Its two BG-14 journeys each
ran **twice with independent local state and new synthetic identifiers**:

- `browser:download:test`: real login and HttpOnly signed cookie, original
  PDF/PNG/text download links, exact SHA-256/byte lengths, PDF repeat after
  reload, tampered/expired/logged-out private reads denied.
- `browser:source-recovery:test`: real keyboard Tab and Enter submission of
  owner-supplied source text, persisted evidence and retained original URL.
- `browser:workflow:test` (twice): browser search, visible stale-edit
  conflict and refresh, owner title override, leased current-generation
  processing failure, job/item agreement, safe failure guidance, owner retry
  action, actual scheduler-driven convergence after retry, title/raw/source
  preservation, missing attachment 404, soft delete, Deleted filter, restore,
  fresh search reappearance, mobile overflow check and logout denial.
- `browser:acquisition:test` (twice): a strictly allowlisted synthetic public
  URL, actual `SourceFetcher` policy/parser, guarded acquisition job and D1
  evidence, `acquired_text` displayed in a real Chrome detail page, full-text
  phrase search, canonical duplicate URL reuse, and a separate HTTP 404
  upstream case with `unavailable` / `url_only` evidence and safe browser
  explanation.

The browser interactions and application API responses were never mocked.
Only the external website HTTP response was simulated at the test-only
`SourceFetcher` injection seam. The production `wrangler.toml`, API
authentication, DB migrations and processing services keep their existing
contracts. The temporary focused formatting workflow was removed.

## Failure and cleanup evidence

The tests record only sanitized request method, path and HTTP status, with a
bounded on-failure screenshot/diagnostic artifact. Browser profiles, D1/R2
fixture state, disposable Wrangler fixture configs and owned local processes
are torn down independently for each run. Known failures observed during
implementation, including an unavailable network-dependent source fixture
and overly strict initial browser assertions, were fixed or deliberately
isolated before the passing final runs. No failing browser stage was bypassed.

## Scope boundary and handoff

The deterministic upstream fixture verifies source fetching through the
Worker and browser, **not** that arbitrary live websites are accessible.
Production URL connectivity, provider integrations, deployed runtime
monitoring, remote D1 migration, historic backfill, real Telegram/Notion
delivery and physical-device QA are not claimed. BG-15 begins with its own
cookie-authenticated browser **write** security design and CSRF scope; BG-14
did not silently extend cookie access to capture/upload mutations.

The final documentation edits and all 100 checked BG-14 steps must be
present together on `main` and pass its repository CI. Once that
documentation-only confirmation is green, issue #63 may close as completed
and BG-15 is the next executable build-guide milestone.
