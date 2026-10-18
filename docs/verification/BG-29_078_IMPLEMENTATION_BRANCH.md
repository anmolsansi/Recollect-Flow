# BG-29.078 — implementation branch scope and execution gates

**Branch:** `feat/bg29-078-hosted-multistage-acceptance`  
**Base:** `main` at `1ddae022219249bd0fc120b272e538004a56bf97` (October 18, 2026)  
**GitHub:** [BG-29 issue #99](https://github.com/anmolsansi/Recollect-Flow/issues/99)  
**Linear:** [OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance)  
**Authority:** [Frozen acceptance contract](BG-29_078_ACCEPTANCE_CONTRACT.md), AC-01 through AC-17.

## Purpose and current status

This branch is for completing **BG-29.078, Measure multi-stage backlog delay**,
and nothing else. The original BG-29 status is **99/100**, with the existing
D1-only hosted Cron proof already passed. Its shutdown and $0 bill check were
owner-confirmed; **do not re-run** that D1-only experiment. Production must
not be changed, and the existing staging D1 may be reused only where
explicitly authorized.

The first two commits in this branch are *planning-only*. They do not seed
D1, create R2 objects, deploy Workers, turn on Cron, contact external
providers or invoke paid Cloudflare services. Opening a draft PR does not
authorize any later hosted action.

## Invariants (must hold on every microcommit)

1. Never modify default production `wrangler.toml` or deploy the
   production Worker `recollect-flow`, its production D1/R2 or routes.
2. No real Notion/OpenRouter/Telegram/provider credentials or network
   calls. Stub providers in the isolated test harness, fail closed on
   unexpected outbound requests and preserve production handler behavior.
3. Keep staging Cron explicitly disabled (`[triggers]\ncrons = []`)
   until actual hosted acceptance is separately approved.
4. Never create, read or write staging R2 or start hosted file tests without
   AC-02 financial preflight and explicit owner authorization. Its
   Standard free allowances are **not** a guaranteed $0 spending cap.
5. Freeze **12 URL + 12 valid-PDF** originals, bounded retries, at most
   **10 eligible real hourly** Cron sweeps, and all **17** acceptance checks;
   do not weaken the gate to make a test pass.
6. Each later microcommit must be reviewable alone, keep existing tests green,
   include negative cases, and name its verification command/evidence.
7. Never claim BG-29.078 complete from local fast-forwarded clocks, the
   existing D1-only heartbeat, empty queue counters alone or CI alone.
8. Do not merge the draft PR, close GitHub #99, complete Linear OPE-344
   or unlock BG-30 before AC-01..AC-17 are independently evidenced.

## Ordered implementation checkpoints

Proceed in order. Each checkpoint is divided into minimal,
independently-verifiable commits in
[the microcommit ledger](BG-29_078_MICROCOMMITS.md).

| Phase | Objective | Required gate |
| --- | --- | --- |
| 0 | Branch and draft-PR baseline | Clean branch at known main SHA; no production changes |
| 1 | Scheduler/provider dependency injection | Production defaults unchanged; real external calls fail closed in staging |
| 2 | Deterministic URL, Notion, AI fixtures | Exercise real worker services with mock transports, including failure cases |
| 3 | Genuine PDFs and emulated R2 | Real `ExtractionService` reads/checksums/parses PDF bytes locally |
| 4 | Idempotent 24-item seeder | Exactly 12 URL/12 file items, stable hashes, re-run safe |
| 5 | Stage telemetry and retry/lease accounting | Per-sweep queue/age, originals, projections and attempt trace |
| 6 | Full local integration and resource regression | End-to-end real services, mocked providers, 17-AC evidence mapping |
| 7 | Explicit hosted $0 financial/production-isolation gate | Dated actual usage and user authorization; otherwise NO-GO |
| 8 | Hosted isolated staging deployment with Cron off | R2 and staging Worker only if Phase 7 passed, never production |
| 9 | Real hourly multi-stage execution | Authenticated Cloudflare events and stages all drain within 10 sweeps |
| 10 | Cleanup, billing and independent acceptance review | Cron removed, bill reconciled, every AC PASS, CI green before closure |

## Start/stop decisions

- **GO for local engineering:** branch, tests, mock provider implementation,
  local D1 and R2 emulator, documentation and GitHub CI.
- **NO-GO for hosted R2 by default:** a prior account check showed a
  usage-billed R2 subscription; the $0 test was only D1-only. Even if
  free quotas appear ample, no hard $0 guarantee has been established.
- **NO-GO for hosted Worker/Cron changes:** further isolated hosting
  requires later stage-specific approval, verified nonproduction bindings,
  offline pass and safe shutdown plan.
- **Stop:** charge risk, unexpected external request, production binding,
  damaged original, repeated failures or unbounded CPU/time.
- **Close:** only on documented PASS of all AC-01 through AC-17. If the
  absolute $0 rule prevents R2 hosted tests, leave BG-29.078 open and
  record the blocker instead of weakening the contract.

## Baseline verification

Use the exact GitHub source SHA and do **not** run `npm run deploy`,
`npm run db:migrate:remote` or Wrangler commands without an explicitly
reviewed nonproduction `--config`. All automated checks in this branch
must be local or CI-only until Phase 7 is cleared.
