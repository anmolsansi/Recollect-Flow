# BG-02 Checklist Reconciliation

Tracking: GitHub #25 · Linear OPE-322 · PR #26

This record reconciles the 100 executable BG-02 actions against actual code,
test, CI and repository evidence. It does not rewrite the planning companion just
to turn boxes green. One verified behavior may satisfy several checklist actions,
and unperformed work is not relabeled as passed.

Primary proof: `docs/verification/BG-02_USAGE_CLOCK_STABILIZATION.md`.

Status vocabulary:

- **Verified** — directly exercised by BG-02 code/CI evidence.
- **Existing proof** — already covered by an unchanged repository regression or
  contract and explicitly inspected for BG-02.
- **N/A** — a proposed implementation path was unnecessary after discovery; the
  underlying requirement is still satisfied and the reason is stated.
- **Pending** — not yet complete and must remain open.

## BG-02 / 01 — Establish task context (.001–.010)

Status: **10/10 satisfied**.

- `.001–.003`: the BG-02 build-guide chapter and companion were read after BG-01
  issue #23 / PR #24 completed. The work branch was created from `main` at
  `841af95181123630c49fe231297ad12749e40b29`.
- `.004–.006`: the failing D1 test, `AiCapacityService.admit()`, window builder,
  `/usage` route, status service and active-window repository query were traced.
  The authoritative contract is `window_end > query_time`.
- `.005`: BG-01's frozen failure is reused only as entry evidence. BG-02 produces
  new current execution evidence for the repair.
- `.007`: the required environment is the checked-in Cloudflare Vitest/workerd D1
  harness on CI-compatible Node 22, not production.
- `.008`: no deployment, production mutation or external messaging/provider call
  is authorized or required.
- `.009`: fixtures remain synthetic checked-in test values.
- `.010`: GitHub #25, Linear OPE-322, PR #26 and `docs/verification/` are the task
  tracking/evidence locations.

## BG-02 / 02 — Clock trace (.011–.020)

Status: **10/10 satisfied**.

- `.011–.013`: the original failure used an August 9 fixed reservation instant
  passed directly to `AiCapacityService.admit()`.
- `.014`: `quotaWindowBoundary()` floors that instant to UTC minute/day starts and
  computes the corresponding ends.
- `.015–.016`: `/api/v1/usage` constructs `AiCapacityStatusService`, whose
  production default is `status(now = new Date())`.
- `.017–.020`: `listActiveWindows(now)` binds the query clock to the strict SQL
  predicate `WHERE window_end > ?1`. Therefore an exact-end query is expired and
  the original empty-window behavior after August was correct production behavior.

## BG-02 / 03 — Fixture design (.021–.030)

Status: **10/10 satisfied**.

- Reference reservation: `2026-08-09T20:15:00.000Z`.
- Minute window: 20:15:00 through 20:16:00 UTC.
- Daily window: August 9 00:00 through August 10 00:00 UTC.
- Pre-expiry query: `20:15:59.999Z`.
- Exact-expiry query: `20:16:00.000Z`.
- Post-expiry query: `20:16:00.001Z`.
- Existing synthetic source text, OpenRouter model/shared scope, dummy admin token
  and dummy capture token are preserved.
- Expected membership is documented in the primary BG-02 evidence record.

## BG-02 / 04 — Clock mechanism (.031–.040)

Status: **10/10 satisfied with two implementation-path N/A decisions**.

- `.031`: repository clock usage and existing Vitest fake-timer use were inspected.
- `.032–.034`: workerd inner-runtime `Date` behavior was tested rather than assumed.
  CI run #98 showed the real `/usage` route sees `vi.setSystemTime()` and the
  formerly failing usage test passes.
- `.035`: **N/A as an implementation choice.** There was no existing server clock
  injection seam to reuse, but the test runtime already provides the narrower seam.
- `.036`: **N/A.** A new production clock interface was unnecessary after fake-clock
  support was proven.
- `.037–.038`: production `new Date()` and the public API remain unchanged. No
  `?now=` or equivalent override exists.
- `.039`: `afterEach(() => vi.useRealTimers())` guarantees restoration.
- `.040`: the mechanism and rationale are recorded in the primary evidence file.

## BG-02 / 05 — Active-window regression (.041–.050)

Status: **10/10 satisfied (Verified)**.

The D1 test now:

- reserves at the controlled instant;
- calls the actual `/api/v1/usage` route;
- expects HTTP 200 for the admin;
- checks provider `openrouter` and shared scope `free-model-account-pool`;
- checks exactly two active rows at the reference instant;
- checks minute/day starts and ends;
- checks request usage is visible as `used: 1`;
- preserves policy version `2026-08-09.1`;
- preserves warning thresholds 0.7 / 0.9 / 1;
- rejects unrelated extra active windows with the exact length assertion.

## BG-02 / 06 — Expiry regression (.051–.060)

Status: **10/10 satisfied (Verified)**.

- At `20:15:59.999Z`, minute and day are present.
- At `20:16:00.000Z`, the minute row is absent and the day row remains.
- At `20:16:00.001Z`, the minute row remains absent.
- A new reservation at `20:16:00.001Z` creates a fresh 20:16–20:17 minute window.
- The daily row remains the August 9 daily window and its request usage becomes 2.
- Direct D1 evidence proves both 20:15 and 20:16 minute rows remain in history;
  only the current row is surfaced as active.
- No repository predicate was edited. `window_end > query_time` remains the rule.

## BG-02 / 07 — Authorization preservation (.061–.070)

Status: **10/10 satisfied (Verified)**.

The same real route test preserves:

- anonymous request → 403;
- capture token → 403;
- admin token → 200;
- response field inspection;
- no serialized `test-admin-token`;
- no serialized synthetic source text;
- no serialized `OPENROUTER_API_KEY` name.

No authentication or response-redaction code changed.

## BG-02 / 08 — Isolation and robustness (.071–.080)

Status: **10/10 satisfied using current focused + full-suite evidence**.

- `.071`: one-shot BG-02 workflow run #1 ran only
  `capacity-usage.d1.spec.ts`; it passed.
- `.072`: the same workflow ran that file a second time in a fresh command; it
  passed again.
- `.073`: the workflow then ran `capacity-usage.d1.spec.ts` beside
  `capacity.d1.spec.ts`; both passed.
- `.074`: passing repeated/adjacent execution plus `afterEach(useRealTimers)` proves
  no BG-02 clock leak into the core capacity suite.
- `.075`: full repository CI run #102 includes the existing lease/timer tests and
  passed `npm run check`.
- `.076`: run #102 also passed the standalone `npm run db:migrate:local` step.
- `.077`: all controlled instants use explicit `Z` UTC timestamps.
- `.078`: existing unchanged `capacity.window.test.ts` proves daily windows align to
  UTC midnight and move to a fresh daily key exactly at reset.
- `.079`: D1 config keeps mocked AI implementations; this test makes no provider
  request.
- `.080`: implementation diff was reviewed. No production source edit was needed.

The one-shot proof workflow was removed immediately after its successful run, so
it leaves no final CI/workflow surface in the branch diff.

## BG-02 / 09 — Failure diagnosis (.081–.090)

Status: **10/10 satisfied**.

- `.081`: the test no longer compares an August reservation against today's wall
  clock; reservation and route evaluation share one controlled clock.
- `.082`: no empty-array fallback or weakened expectation was introduced.
- `.083`: provider, scope, exact windows, counters, policy and breaker assertions
  remain meaningful.
- `.084`: focused passing evidence is GitHub Actions workflow `BG-02 focused proof`
  run #1.
- `.085`: complete repository D1 execution is included in successful CI run #102.
- `.086`: run #98 exposed one unrelated concurrent-capacity timeout; run #102 and
  the focused adjacent proof did not reproduce it. No unrelated code was changed.
- `.087`: release evidence uses repository CI Node 22; the resolved runner line is
  Node 22.23.2 in the current CI environment.
- `.088`: BG-01's frozen failure was the historical active-window assertion at
  `capacity-usage.d1.spec.ts:70`; BG-02 replaces the implicit-clock assumption with
  explicit deterministic window assertions.
- `.089`: before/exact/after expiry plus next-window evidence is recorded in the
  primary proof document.
- `.090`: implementation gate evidence is tied to
  `82a63a47dba143ce87f411bceac654c0f5a855cd`; later documentation commits do not
  change runtime/test behavior.

## BG-02 / 10 — Verify and close (.091–.100)

Status: **9/10 satisfied; final gate pending**.

- `.091`: checklist/outcome review found no missing BG-02 behavior after adding the
  focused repeated/adjacent proof.
- `.092`: focused proof and full CI evidence are both current; no production test is
  substituted for local/CI evidence.
- `.093`: anonymous/capture-token rejection and exact-expiry rejection semantics
  remain explicit.
- `.094`: data, privacy, auth, quota and active-window guarantees were not weakened.
- `.095`: no owned local process was started. The temporary focused-proof workflow
  was removed after producing immutable CI evidence.
- `.096`: current implementation diff was reviewed for unrelated changes; none were
  introduced.
- `.097`: results are recorded in the primary evidence file with branch, base,
  candidate SHA and CI run identities.
- `.098`: the transient run #98 concurrency timeout is recorded as an exception and
  not hidden or repaired under BG-02.
- `.099`: documentation is updated only to the verified implementation level.
- `.100`: **Pending.** BG-03 is unlocked only after the documentation-complete PR
  head passes the repository CI gate and BG-02 is closed.

## Overall reconciliation

- Satisfied now: **99/100**.
- Pending: **BG-02.100 final parent gate**.
- Production/runtime source edits: **none**.
- Migration edits: **none**.
- Permanent CI workflow edits: **none**.
- Known unrelated defect created by BG-02: **none**.

The next action is one final CI run on the documentation-complete head. Only a green
result may change BG-02.100 to satisfied and unlock BG-03.
