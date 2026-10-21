# BG-29.078 — $0 downstream development dependency exception

**Owner direction:** 2026-10-21. No additional spending to finish BG-29;
continue with downstream development.

**Scope:** BG-30 through BG-40 and all later successor tickets that directly
or transitively depend on BG-29.078.

**Source baseline:** `027192d83b836f8f3ae84bb307dd07c934f32b47`.

**Decision class:** Development entry only. No acceptance waiver.

## 1. BG-29 remains incomplete

- The canonical BG-29 checklist remains **99/100**.
- BG-29.078 is **DEFERRED / NOT VERIFIED**, never PASS, N/A or DONE.
- GitHub issue [#99](https://github.com/anmolsansi/Recollect-Flow/issues/99)
  remains open at 49/50 paired steps.
- Linear [OPE-344](https://linear.app/openclaw-neutron/issue/OPE-344/bg-29-resilience-capacity-and-performance-acceptance)
  remains In Progress.
- The [AC-01 through AC-17 acceptance contract](BG-29_078_ACCEPTANCE_CONTRACT.md)
  remains unchanged. Local/emulated tests and the old D1-only live Cron
  do not count as the genuine hosted multistage acceptance.
- The [financial assessment](BG-29_078_STEP12_FINANCIAL_DECISION_2026-10-21.md)
  remains **NO-GO**. Metered R2 lacks an enforceable $0 spending cap.
  Steps 13–17 were neither authorized nor completed.

## 2. One development exception for all downstream tickets

- BG-29.078 alone must not block BG-30–BG-40 or any later successor
  from repository analysis, documentation, design, source changes,
  local fixtures, offline D1/R2 emulation, local tests or safe CI.
- The `.002` dependency check should record this dated exception
  whenever BG-29.078 is the only missing inherited prerequisite.
  Checking `.002` means the disposition was reviewed; it does not
  mean the unfinished BG-29.078 test was passed.
- There is no need to request the same BG-29 development exception
  again for each downstream ticket.
- All other missing predecessor requirements remain independent.
  No implementation, integrity, privacy, safety, release, device,
  external-provider, scheduling or billing acceptance is waived.
- BG-30 documentation reconciliation and BG-31 release planning
  may be completed on their own evidence. BG-32–BG-39 can proceed
  with safe local work while genuine live steps remain blocked.
- BG-40 may document an informed **NO-GO**, but the exception
  never justifies an unsupported V1 GO decision.

## 3. Strict $0 and production protection

- No added charges or paid subscription and service upgrades.
- No hosted R2 writes, reads or provisioning; no remote D1 mutation,
  production deployment or Cloudflare Cron enablement.
- No real Notion, OpenRouter, Telegram or other paid/outbound
  provider interaction or live notification without separate
  operation-specific owner approval and acceptable cost safeguards.
- A free allowance, projected $0 invoice or budget alert is not a
  hard spending cutoff and does not constitute permission.
- Read-only research, GitHub/Linear records, local code and tests,
  local emulated D1/R2 and CI within authorized free capacity
  remain permitted.
- The BG-29 staging Cron remains disabled. This documentation
  change does not alter production resources or secret values.

## 4. Ticket-by-ticket boundaries

**BG-30:** Reconcile implementation, status, audits and OPE-247.
Do not infer missing hardening or BG-29 acceptance.

**BG-31:** Prepare the release manifest, backups, operational stops
and recovery plan. No production action is implied.

**BG-32:** Plan and test deployments locally. Real production
migrations, deployment and smoke checks require separate approval.

**BG-33–BG-34:** Prepare capture, download, enrichment and Notion
fixtures. Live provider/production behavior is not locally proved.

**BG-35–BG-36:** Prepare device QA. Physical iPhone acceptance must
be observed on the actual device.

**BG-37:** Prepare isolated recovery drills. Do not claim an
independent hosted restoration without its actual evidence.

**BG-38:** Prepare daily digest observation. Seven consecutive
eligible real scheduled days cannot be replaced with simulation.

**BG-39:** Prepare a two-week usage protocol and actual-cost
verification. Neither two weeks of use nor a final bill is assumed.

**BG-40:** Record GO/NO-GO from available evidence; missing
safety-critical or billing acceptance may require NO-GO.

## 5. Review and future applicability

- This single exception also applies to any future ticket that
  inherits the same unfinished BG-29.078 prerequisite.
- A downstream dependency review must name its actual known
  and outstanding predecessor requirements; no task is
  automatically marked complete.
- Track implemented, locally tested, CI, deployed, device,
  real-clock, cost and outstanding evidence separately.
- This exception cannot silently change the frozen BG-29
  thresholds, authorize spending or change release GO criteria.
- Any later billing-policy relaxation or live acceptance attempt
  needs a separate, explicit, dated owner decision.

**Result:** BG-29.078 remains deferred. Safe downstream
development may proceed at $0; live acceptance remains gated.
