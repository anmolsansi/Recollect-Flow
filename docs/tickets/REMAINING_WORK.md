# Remaining work — execution contract, November 10, 2026

For step-by-step implementation and verification instructions for all 52 packets, use the [junior engineer development handbook](../../development.md). This contract remains the authority for scope and readiness.

This is the current entry point for unfinished work. Full V1 remains the destination, as confirmed by the owner on November 10; the deployed core is an intermediate milestone. Later RAG, V2 and V3 work remains conditional. This redesign authorizes planning and ticket maintenance, not the operations described in the tickets.

Baseline: `1cab02f6710a8c5e61437885ebcece6764d1b3ab`, freshly fetched and equal to origin/main. GitHub open issues and Linear RecollectFlow issues were inspected November 10. Their descriptions contain historical status; the latest dated evidence wins over an old count, not over an actual acceptance requirement.

## How to execute without repeatedly asking the owner

1. Pick the first READY packet whose actual dependencies pass. Preparation may run while an execution packet is blocked. Never infer readiness from an unchecked legacy box or a tracker status alone.
2. The architect agent assembles the packet, resolves technical choices from existing contracts, and verifies its listed paths and dependency evidence. It does not make the owner assemble files or arbitrate routine implementation mechanics.
3. A builder may choose internal names, reuse existing helpers, add necessary regression cases, and repair an in-scope implementation. Contract, privacy, cost or product changes return to the architect agent. The architect resolves them within accepted scope; only a genuinely new owner decision reaches the owner.
4. Ask the owner only for unavailable personal inputs, physical-device actions, a changed product/cost/privacy commitment, a destructive action, or a concrete live operation outside existing authorization. Prepare the exact target, operations, limits, stop/recovery steps and recommendation first. Reuse that answer for the entire unchanged packet. A new session is not a reason to ask again.
5. On failure, retain evidence, stop dependent operations and continue independent preparation. Never redeploy, replay migrations, resend an uncertain message, or delete fixtures merely to increase completion counts.
6. One logical source change normally gets one commit. Evidence collection does not need a commit per screenshot. Checkpoints occur after each coherent packet, not after an arbitrary percentage. These packets are meaningful subdivisions; they are not equal estimates of effort.
7. Before executing a packet, compare current source, deployed artifact and accepted contract with its baseline. Reopen only the affected packet on drift, giving the exact changed assumption. Preserve evidence from unaffected paths.

## Status and evidence rules

Packet states: READY, BLOCKED_DEPENDENCY, BLOCKED_INPUT, IN_PROGRESS, VERIFIED, FAILED, CONDITIONAL. VERIFIED requires the packet's actual acceptance evidence; writing this plan verifies none of the future work.

Individual criteria use PASS, FAIL, NOT_EXECUTED, NOT_APPLICABLE or NOT_TRIGGERED. The last two require a reason and evaluated condition. They never satisfy an independent recovery, security or device requirement. A parent completes only when every required criterion passes or has an already authorized applicability disposition. Scope exceptions require owner acceptance.

Every evidence row records packet/criterion ID, source SHA, deployed version when applicable, environment, UTC observation time, actor, observed versus owner-reported versus historical evidence, safe result/reference, and next action on failure. Keep credentials, original private content and raw exports outside Git and issue bodies.

The frozen November 3 packet and historical evidence remain immutable. Current-state records may cite them, never relabel them as fresh execution. BG-32.035's missing historical exit code cannot be recreated by another migration. BG-32.037 is not triggered if no failure occurred. BG-32.075–.077 do not authorize a rollback on a first installation; independent recovery proof remains required separately.

## One record, several views

The packets below define scope and acceptance. The existing parent GitHub/Linear issue tracks execution status and links to the same evidence; do not maintain 100-action and 50-pair progress counters. Keep parent IDs, historical bodies and evidence links. Do not close old issues merely because they were remapped.

The legacy BG checklist is an archived requirement inventory. `REMAINING_WORK_COVERAGE.csv` maps every unchecked action to its new owner. A mapping is not a pass. For historical reconciliation, the agent must establish evidence or move the real gap to the relevant execution packet before closing the reconciliation packet.

## Frozen boundaries

- D1 owns canonical records; Notion is a projection. Original bytes and newest independent purge receipts are required for complete recovery.
- Existing privacy, auth, idempotency, retention and zero-additional-cost contracts remain. Budget alerts and projected invoices are not hard spending caps.
- November 3 authorization covers the executed first-install packet only. New activation or deployment receives one bounded operation packet after prerequisites are concrete.
- BG-29.078's existing exception permits safe local downstream development, not hosted acceptance or launch.
- Seven consecutive eligible daily deliveries and at least two weeks of real use require real elapsed time. Eligible-day rules are frozen before observation; failed eligible days cannot be excluded retroactively.
- RAG requires V1 acceptance, at least 100 useful captures, demonstrated lexical-search limitations, an approved gold set and an explicit start decision. Future model/vendor selection is not approved by this redesign.

## Dependency graph

```text
R01 historical reconciliation -----> R02 release identity -----> R07 BG-32 gate
R03 recovery operation packet -> R04 independent copy -> R05 isolated restore --^
R06 index/exit evidence -------------------------------------------------------^

R08 staging packet -> R09 elapsed-hour proof ---------------------------> R27
R10 auth/security + R11 operations + R12 deletion freshness -------------> R27
R07 -> R13 core browser -> R14 source/search -> R15 AI -> R16 Notion -----> R27
R17 client audit -> R18 online client -> R19 queue -> R20 online device
                                                    R20 -> R21 offline -> R27
R05 -> R22 independent disaster/purge rehearsal ------------------------> R27
R23 digest activation -> R24 daily/weekly observation ------------------> R27
technical prerequisites -> R25 trial -> R26 actual cost ----------------> R27
R17 -> R50 local contract -> R51 runnable Mac worker -> R52 Mac proof -> R25/R27
R27 -> R28 owner V1 decision -> R29 friction review -> R30 RAG entry
R30 -> R31 policy + R32 gold/model evidence -> R33 frozen contracts
R33 -> R34 schema -> R35 chunking -> R36 indexing -> R38 retrieval
R33 -> R37 privacy/invalidation -------------------------------> R38
R38 -> R39 selection -> R40 context -> R41 answers -> R43 UI
R33 -> R42 eval harness; R41 + R42 + R43 + R44 local + R45 controls -> R46
R46 -> R47 V1.5 decision -> R48 V2 decision -> R49 V3 decision
```

Arrows describe execution prerequisites, not a ban on preparing downstream documentation. R15/R16/R23 live work also needs an approved operation packet and recoverability; R20/R21 need an installed device and authorized target. R25 starts only after required technical acceptance; it may overlap R24 once both windows are eligible. R27 waits for every required gate, including R09 and OPE-247. R48/R49 are discovery decisions, never promises to build every candidate.

## Shared packet contract

Each packet below supplies its goal, exact input documents, dependency, steps and acceptance. The following fields apply to every packet, avoiding duplicated boilerplate:

- **Owner:** architect agent prepares and diagnoses; builder implements bounded source work; operator executes approved live/device actions; owner decides explicit product/risk gates.
- **Files allowed:** the named output record and named input Markdown documents where current instructions need correction. Runtime files may change only in a concrete repair/build packet produced by the named contract/audit prerequisite; that packet lists exact paths, callers, fixtures, API/data/UI states and tests. No wildcard implementation permission.
- **Data/API/UI:** verification packets preserve existing contracts and create only evidence records. Design packets produce specifications, not runtime changes. Implementation packets cannot start with unresolved contract fields. A BLOCKED packet is fully planned work, not a claim that a builder can execute it today.
- **Validation/errors:** mismatched target, missing secret access, missing backup, unknown costs or inconsistent contract stops only the affected execution. Record FAIL/NOT_EXECUTED and safe diagnostics. No silent fallback across privacy or billing boundaries.
- **Definition of done:** named outputs exist, each acceptance assertion has evidence, applicable targeted validation passes, scoped diff is reviewed, required implementation CI passes, and parent tracking points at the evidence. A documentation merge does not prove live behavior.
- **Out of scope/do not change:** frozen release artifacts, accepted security/cost guarantees, unrelated source, owner data, production configuration and credentials outside an approved operation packet. No new dependencies for ticket administration.
- **Handoff:** architect supplies this contract, the single packet, current `docs/repo_context.md`, its named input contents and necessary source excerpts. Builder reports changes, evidence, remaining criterion states and next eligible packet. It must not ask the owner to rediscover the plan.
- **Repair loop:** a failed acceptance creates a bounded repair under the same parent, with failing fixture, expected/actual behavior, exact owning source/callers, regression assertion, allowed paths and recheck scope. Architect supplies this before builder execution. Recheck affected evidence, not the entire release by default.

## Packets

Packet-specific definitions follow in `REMAINING_WORK_PACKETS.md`. Start with R01, R03, R08, R10–R12 and R17 preparation. Other packets retain their explicit dependency/input states. All future RAG build packets stay conditional until R30–R33 settle their contracts; making them falsely executable now would repeat the original planning failure.

## Owner decision queue

Already settled: runnable local AI is mandatory in V1 (R50–R52), full V1 remains the goal, core is intermediate; preserve existing zero-cost/privacy boundaries and conditional later milestones.

Prepare before asking: R03 independent backup destination/access and bounded live operations; R08 actual affordable staging feasibility; R15/R16/R23 exact provider/destination activations; R25 trial dates and usefulness judgment; R28/R30/R47/R48/R49 release/expansion decisions. Do not ask for all of these now. An operation-specific packet must first demonstrate feasibility and reuse any applicable prior answer.

No guarantee of zero future questions is possible: hardware access, actual provider constraints and product choices remain real. The measurable goal is zero repeated settled decisions and zero builder sessions starting with an unspecified required contract.
