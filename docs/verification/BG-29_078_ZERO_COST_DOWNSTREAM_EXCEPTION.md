# BG-29.078 — $0 downstream development dependency exception

**Owner decision:** 2026-10-21 — do not incur any additional cost to finish BG-29; continue with BG-30 and later planned tickets.
**Applicability:** RecollectFlow BG-30 through BG-40 **and any future successor tickets**, including any direct or inherited dependency on BG-29.078.
**Starting source baseline:** `027192d83b836f8f3ae84bb307dd07c934f32b47` on `main` when this documentation change began.
**Exception type:** DEVELOPMENT-ENTRY ONLY. This is not a passed test, acceptance waiver, production-release authorization or representation of operational readiness.

## 1. Frozen unfinished requirement and evidence

- BG-29 stays **99/100** source microtasks; BG-29.078 (measured actual multi-stage hourly hosted backlog delay) remains **UNCHECKED/DEFERRED**, not PASS, N/A or DONE.
- The corresponding GitHub #99 paired item stays **49/50**; [GitHub issue #99](https://github.com/anmolsansi/Recollect-Flow/issues/99) remains open and [Linear OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance) stays In Progress, unless independently and truthfully reclassified through a later owner decision.
- The [frozen acceptance contract](BG-29_078_ACCEPTANCE_CONTRACT.md) AC-01 through AC-17 is unchanged. The previous D1-only hourly Cron and local emulated D1/R2 tests are valuable partial evidence, **not** the genuine hosted end-to-end acceptance.
- The [Step 12 financial decision](BG-29_078_STEP12_FINANCIAL_DECISION_2026-10-21.md) is **NO-GO**: metered R2 free allowances and $0 currently billed are not an enforceable $0 upper bound. Steps 13–17 were not authorized or completed.

## 2. Single exception governing all subsequent work

1. **Development may continue:** BG-29.078's unfinished hosted proof must not be used as a repeated gate to prevent BG-30 through BG-40 repository analysis, documentation, design, local code/test work, local D1/R2 emulation, fixture preparation, offline CI or review. No additional permission is needed simply to reuse this exception for the same missing BG-29.078 evidence.
2. **Carry the risk forward explicitly:** When a downstream `.002` dependency check encounters the unfinished BG-29.078 directly or transitively, record this dated development exception and keep its missing hosted evidence visible. The dependency check may be completed as an *accurate disposition review*, not a claim that BG-29 passed.
3. **Other prerequisites still apply:** This does not waive missing implementation, correctness, integrity, privacy, physical-device, migration, backup, live-provider, scheduling, billing or other required acceptance proof from BG-30 onward. Normal completion gates still require their actual independent evidence.
4. **Development completion is not release acceptance:** BG-30 documentation reconciliation and BG-31 release-manifest preparation may reach their own documented completion if all **their** evidence requirements pass. For BG-32 through BG-39, prepare and validate safe offline portions without falsely completing mandatory production, real-device, real-clock, provider or billing checks.
5. **BG-40 can record NO-GO:** An explicit V1 GO/NO-GO decision may be documented with residual BG-29.078 risk and other unverified gates. A GO claim must not be inferred from this exception; missing safety-critical acceptance still blocks a responsible production GO.

## 3. Hard $0 operational boundary (all future tickets)

- **No new charges, including small or estimated charges.** No metered paid API/provider activity, subscription/plan upgrade, hosted R2 provisioning or access, remote D1 migrations, production deployment, Cloudflare Cron enablement, real messaging, or billable external interaction without a **new, operation-specific owner authorization and an acceptable financial safeguard**.
- Existing free-tier allowances, account projections and budget alerts are **not** automatic permission and do not guarantee a hard $0 bill.
- Permitted now: GitHub/Linear documentation and issue tracking, code/test/design/review, local fixtures, local emulated R2 and D1, CI using existing authorized capacity, and read-only investigation.
- If a downstream ticket inherently needs hosted services, real users, physical devices, seven calendar days, two weeks of actual usage, or actual paid-service billing proof, mark that portion **BLOCKED/NOT RUN** until genuinely possible within the $0 policy and specifically authorized. No substitution of simulations for live evidence.
- Production code, bindings, secrets, routes and databases remain unchanged by this policy. Existing disabled BG-29 staging Cron remains disabled.

## 4. Ticket-by-ticket treatment

| Ticket | What the exception permits now | What it does **not** prove or authorize |
| --- | --- | --- |
| BG-30 | Reconcile documentation, tickets, audit, OPE-247 evidence and current implementation status | BG-29.078 PASS, unrelated OPE-247 missing evidence or production acceptance |
| BG-31 | Prepare a precise release manifest, backups, stop/rollback plan and approval packet | Production release or completed live inventory not actually observed |
| BG-32 | Prepare/configure/test locally and review release operations | Production migration/deployment or smoke before explicit authorization and suitable cost controls |
| BG-33–34 | Develop/test capture, retrieval, AI and Notion failure fixtures locally | Actual approved production, AI/Notion provider or outage proof |
| BG-35–36 | Prepare iPhone workflows and offline test matrices | Physical iPhone test result without the actual device observation |
| BG-37 | Prepare restore drills against isolated local artifacts | Independently validated hosted recovery without the required artifacts/operations |
| BG-38 | Prepare daily digest tests and evidence collection | Seven consecutive real eligible scheduled delivery days or live messaging |
| BG-39 | Prepare the real-use protocol and $0 financial verification criteria | Two weeks of observed use or final invoice/cost reconciliation not obtained |
| BG-40 | Draft/review an evidence-based explicit GO/NO-GO, including NO-GO | A GO decision without required operational, safety and cost proof |

## 5. Application and verification

- This single exception applies **transitively** to BG-30..BG-40 **and any newly added downstream successors**, not just BG-30. Future maintainers should not request to rerun or pay for BG-29.078 as a prerequisite to the **safe development subset** of a later ticket.
- A downstream checklist's `.002` checkbox is eligible only after its reviewer records which predecessor evidence exists, identifies any other missing prerequisites, and links this exception for BG-29.078. No other checkbox is automatically completed.
- Evidence tables should have separate **implemented / locally tested / CI / deployed / device / time-based / billing / outstanding** states. Keep unknown values unknown; preserve source SHA and links.
- A later owner decision may authorize a different financial policy and real acceptance attempt, but must be explicit, documented and independently reviewed; this October 21 exception cannot grant it by implication.
- This document changes only development ordering and documentation. It does not change the frozen BG-29 test's numerical thresholds, production release conditions or the meaning of PASS.

**Record outcome:** BG-29.078 remains deferred; BG-30–BG-40 safe development unblocked; production and live acceptance remain separately gated; additional spend authorized = **$0**.
