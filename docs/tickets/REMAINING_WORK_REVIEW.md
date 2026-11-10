# Engineering review — remaining-ticket redesign

Target: the remaining RecollectFlow backlog, represented by REMAINING_WORK.md and REMAINING_WORK_PACKETS.md. Baseline `1cab02f`; November 10, 2026. This is a documentation and execution-process redesign, not runtime implementation or production acceptance.

## Scope Challenge

Preserve full V1 per the owner's explicit answer. Preserve conditional RAG/V2/V3 requirements. Use 52 meaningful outcome packets rather than another fixed 100-action template. Reuse existing parent issue IDs and runbooks. Six existing entry documents receive a navigation banner; new packet, coverage, tracker and review documents form the handoff. No new service/class/dependency or automation framework.

Historical unchecked boxes conflict with later completion records. Every one of 1,236 unchecked BG actions is retained in the coverage CSV. Reconciliation is required before treating old work as complete, but completed implementation must not be rebuilt from an old tracker status.

## Architecture review

- [P1] (confidence: 9/10) `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`, BG-32: “Execute recovery plan if required.” A conditional incident action and an independent recovery capability require different evidence. Resolved in R05/R06/R07: not-triggered disposition never proves disaster recovery; R22 retains the independent rehearsal.
- [P1] (confidence: 9/10) `clients/ios-shortcut.md`, Exported Mac template scope: “They do not yet implement the durable iCloud queue below.” Device acceptance cannot precede missing implementation. R17–R19 own contract and artifact completion, R20/R21 own physical evidence.
- [P1] (confidence: 8/10) `docs/TICKET_EXECUTION_ORDER.md`: “This is the canonical one-ticket-at-a-time queue.” Its old OPE implementation order conflicts with later BG completion evidence. Entry banners and R01 make the replacement explicit and preserve old requirements.

Disposition: documentation remedies authorized by the user's request to redesign all remaining tickets. Runtime defects discovered during later verification receive bounded implementation packets, not speculative edits now.

## Code quality / execution quality review

- [P2] (confidence: 9/10) `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`: “Implementation choices remain proposals until resolved in the relevant step.” This delegates unresolved planning into execution. New intake rules require exact contracts before builder start and route technical decisions to the architect agent.
- [P2] (confidence: 9/10) GitHub #141: “50 paired units (~2% each; canonical source has 100 actions)”. Pairing unrelated evidence creates false precision. New packets report criterion states and preserve old mapping without equal-effort percentages.

No application helper extraction, schema change or API change is proposed by this documentation patch. Exact future RAG schemas/models/budgets are deliberately owned by R31–R33 and remain blocked until entry evidence. Pretending these are ready-to-code packets today would reproduce the original failure.

## Test / acceptance review

Existing framework: root package.json uses Vitest Node and D1/workerd suites, Node test scripts and browser verification scripts. These are reused by future implementation packets. This patch needs document coverage/link/consistency checks, not a new application test suite.

```text
legacy unchecked action -> coverage row -> replacement packet
  missing/duplicate row -> FAIL documentation coverage
  historical completion -> R01 verify exact existing evidence
  current gap -> prerequisite + bounded execution + observed assertion
  conditional action not triggered -> reason, no fabricated PASS

packet -> input paths exist -> dependencies/authority resolved?
  no -> BLOCKED_INPUT / BLOCKED_DEPENDENCY; prepare independent packet
  yes -> execute -> evidence assertion passes?
    no -> preserve failure -> architect repair packet -> affected recheck
    yes -> parent evidence link -> criterion VERIFIED

owner experience
  one prepared device session -> private setup -> complete scenario sheet
  one bounded operation approval -> execute unchanged scope without re-asking
  new cost/privacy/destructive scope -> concrete new decision required
```

Required document assertions: 52 unique IDs; every unchecked legacy action covered exactly once; every referenced packet exists; all listed existing input files exist; no future result record represented as present; no old checked box rewritten; no runtime file changed. Broken input references or missing coverage fail the handoff.

Future critical acceptance: raw durability/replay, private original byte integrity and denial, source-text search, owner overrides, no restricted outbound calls, deletion freshness, independent recovery/purge, physical queue persistence, real scheduled/calendar/cost evidence. R13–R26 preserve these. R37 prevents privacy/invalidation becoming a late optional RAG cleanup; R42 provides real regression/evaluation before R46 release.

## Performance / operating burden review

No runtime performance change. Execution overhead is reduced by reusing evidence, one status record per parent, coherent commits and prepared device sessions. Packet counts do not estimate equal work. Hardware/calendar/provider waits remain explicit. Later RAG bounds must be measured and frozen in R33; no guessed latency or token budgets are presented as accepted.

## Failure modes

Stale tracker sends builder back to finished work: entry banners plus R01 evidence mapping. Missing original bytes masked by JSON backup: R04 hash/read-back and R05 restore. New deployment executed to close historical exit-code gap: R06 forbids replay. Unknown delivery resent: R11/R23/R24 preserve reconciliation. Future model choice guessed by builder: R32/R33 block implementation. Owner absent: continue preparation; no fabricated device or approval evidence.

## Implementation tasks and validation

- Completed for this redesign: inspect repository and live trackers; preserve full-V1 decision; write execution contract and 52 packet definitions; map all 1,236 unchecked actions; redirect old entry points; compare retained scope with original V1/V1.5 acceptance and live issue descriptions.
- Remaining runtime work: the packets themselves. None is marked executed by this review.
- No TODO feature was added. Conditional future capabilities remain in their existing parents.
- Sequential documentation edits; future independent preparation lanes are shown in the dependency graph. Shared release/evidence records update serially.

## Review limitations

Graph architecture was consulted, but its index exposes an older/smaller code map. This is not a fresh whole-codebase runtime audit. No provider prices, current production state or device behavior were reverified here; packets require owning-source/live verification before those claims. No application tests run for this documentation patch.

## Validation result

PASS: 52 unique packet IDs, all 1,236 unchecked legacy actions mapped exactly once, every listed existing input path and local link present, historical checkbox lines unchanged, formatting and git diff whitespace checks passed. No runtime files changed. Publication and live tracker synchronization await explicit destination approval after automatic approval review rejected push.

## GSTACK REVIEW REPORT

| Review         | Trigger                    | Why                         | Runs | Status                            | Findings                                |
| -------------- | -------------------------- | --------------------------- | ---- | --------------------------------- | --------------------------------------- |
| CEO Review     | Not invoked                | Product scope               | 0    | Not run                           | Full V1 preserved by owner              |
| Outside Review | Claude Code                | Independent plan challenge  | 1    | Unavailable                       | API ENOTFOUND; no review credit         |
| Eng Review     | plan-eng-review principles | Architecture and acceptance | 1    | Draft, not formal skill clearance | Five documented process findings mapped |
| Design Review  | Not invoked                | UI                          | 0    | Not applicable to this patch      | No UI implementation                    |
| DX Review      | Not invoked                | Execution handoff           | 0    | Not run                           | Handoff checked in native review        |

**OUTSIDE COVERAGE:** Claude Code attempt failed with API ENOTFOUND; no completed external reviewer. The skill-specific native fallback requires Agent Plan/TaskOutput/TaskStop capabilities unavailable in this host; no substitute result is claimed.

**VERDICT:** documentation redesign under review; no runtime or release clearance. The complete interactive gstack certification workflow has not been claimed.

NO UNRESOLVED DECISIONS
