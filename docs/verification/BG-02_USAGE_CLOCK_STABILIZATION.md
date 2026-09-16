# BG-02 — Usage Clock Stabilization

Status: **implementation verified; documentation/final gate in progress**

Tracking:

- GitHub issue: #25
- Linear: OPE-322
- Pull request: #26
- Work branch: `agent/ope-322-bg-02-usage-clock`
- Base `main`: `841af95181123630c49fe231297ad12749e40b29`
- Verified implementation commit: `82a63a47dba143ce87f411bceac654c0f5a855cd`
- Checklist reconciliation: `docs/verification/BG-02_CHECKLIST_RECONCILIATION.md`

## 1. Problem reproduced from BG-01

BG-01 froze one deterministic application failure in
`apps/worker-api/test/capacity-usage.d1.spec.ts`. The test reserved OpenRouter
capacity at `2026-08-09T20:15:00.000Z`, then called the real `/api/v1/usage`
route. The reservation used the fixture time, but the route called
`AiCapacityStatusService.status()` with its production default `new Date()`.

The production repository correctly treats only rows with `window_end > query_time`
as active. Once the wall clock moved beyond the August fixture, the route returned
no historical window. The defect was the test's two clocks, not the active-window
predicate.

## 2. Chosen repair

BG-02 keeps the real HTTP route and production code unchanged. The D1 regression
uses Vitest's controlled system clock:

1. call `vi.useFakeTimers()`;
2. set the system clock to the same UTC instant passed to `AiCapacityService.admit()`;
3. call the real `/api/v1/usage` route through `createApp()`;
4. move the controlled clock across exact expiry boundaries;
5. call `vi.useRealTimers()` from `afterEach()` so no test leaks the clock.

This is narrower than introducing a production clock abstraction because the
Cloudflare Vitest/workerd harness was empirically shown to honor `vi.setSystemTime`
inside the route runtime. No public `now` query parameter or test-only production
route was added.

## 3. Preserved production contract

BG-02 does **not** change:

- `apps/worker-api/src/jobs/ai/capacity.repository.ts`;
- the `WHERE window_end > ?1` active-window predicate;
- `AiCapacityStatusService.status(now = new Date())` production default;
- OpenRouter minute or daily limits;
- provider selection;
- migrations;
- authentication middleware;
- API response contract;
- live provider configuration.

The only runtime-facing source file changed by the implementation is the existing
D1 test file.

## 4. Deterministic fixture and expected windows

Reference reservation time:

`2026-08-09T20:15:00.000Z`

Expected OpenRouter windows:

| Kind   | Start                        | End                          | Initial request usage |
| ------ | ---------------------------- | ---------------------------- | --------------------- |
| minute | `2026-08-09T20:15:00.000Z` | `2026-08-09T20:16:00.000Z` | 1                     |
| day    | `2026-08-09T00:00:00.000Z` | `2026-08-10T00:00:00.000Z` | 1                     |

The test keeps the shared scope `free-model-account-pool` and the synthetic source
text used by the original regression.

## 5. Exact expiry proof

The route is queried at three controlled instants:

| Query instant                  | Expected active OpenRouter windows |
| ------------------------------ | ---------------------------------- |
| `2026-08-09T20:15:59.999Z`     | minute + day                       |
| `2026-08-09T20:16:00.000Z`     | day only                           |
| `2026-08-09T20:16:00.001Z`     | day only                           |

This protects the strict `>` comparison. A window ending exactly at the query time
is expired.

The regression then admits one new reservation at
`2026-08-09T20:16:00.001Z`. The route exposes a new minute window from 20:16 to
20:17 while the daily window remains the same and reports two reserved requests.
A direct D1 assertion proves the old 20:15 minute row remains historical and the
new 20:16 row exists independently. Expired history is retained in storage but is
not revived as active usage.

UTC-midnight behavior remains covered by the existing `capacity.window.test.ts`
unit regressions, including daily alignment and creation of a fresh daily key at
the reset boundary.

## 6. Authorization and redaction preservation

Existing access behavior remains in the same D1 test file:

- anonymous `/api/v1/usage` request → 403;
- capture-token request → 403;
- admin-token request → 200.

The admin response still proves that serialized output does not contain:

- `test-admin-token`;
- the synthetic usage source text;
- `OPENROUTER_API_KEY`.

BG-02 did not weaken these checks to make the clock regression pass.

## 7. CI evidence

### First controlled-clock proof

GitHub Actions run #98 executed the first clock-pinning microcommit. It established
that the workerd-backed D1 route observes Vitest's controlled system time:

- Prettier: pass;
- ESLint: pass;
- TypeScript: pass;
- Node tests: 132/132 pass;
- `capacity-usage.d1.spec.ts`: 2/2 pass;
- full D1 suite: one unrelated timeout in the existing concurrent-capacity test;
- migration step: not reached because the composed quality gate stopped on that timeout.

The timeout was not in the BG-02 test and no unrelated code was changed in response.

### Clean implementation gate

GitHub Actions run #102 executed implementation commit
`82a63a47dba143ce87f411bceac654c0f5a855cd` on Node 22 and completed successfully:

- `npm ci`: pass;
- `npm run check`: pass;
- standalone `npm run db:migrate:local`: pass.

Because `npm run check` includes formatting, linting, typechecking, Node tests, the
complete D1 suite, contract checks, Web lint, Web tests and Web production build,
this run proves the BG-02 test coexists with the broader repository gate. The prior
concurrent-capacity timeout did not reproduce and is recorded as transient evidence,
not silently converted into BG-02 scope.

## 8. Microcommit record

1. `5494fbbb…` — pin route evaluation to the reservation clock and restore real timers.
2. `66fe63e2…` — assert exact active minute/day identities and reservation usage.
3. `e775bdf5…` — protect before/exact/after minute-expiry behavior.
4. `4ced388d…` — prove next-minute creation without stale-window revival.
5. `82a63a47…` — normalize the final regression file to repository formatting.

Documentation and final tracking commits follow these implementation commits.

## 9. Scope and safety review

The final implementation diff before documentation contains one file:

`apps/worker-api/test/capacity-usage.d1.spec.ts`

No secret, private capture content, production configuration, migration, provider
limit, public API, Worker route or application service was changed. All test inputs
are synthetic checked-in fixtures.

## 10. Completion boundary

The implementation portion of BG-02 is verified. Final completion additionally
requires:

- reconcile the authoritative 100-action companion against actual evidence;
- update the verification index and task trackers;
- run CI on the documentation-complete head;
- record whether BG-03 is unlocked.

Until that final gate is green, this record must not claim BG-02 is fully closed.
