# R02 — Verify deployed identity and read-only public boundary

**Status:** IN_PROGRESS; public boundary verified, current authenticated platform inventory not independently read this session.
**Packet:** [R02](../tickets/REMAINING_WORK_PACKETS.md#r02--verify-the-deployed-identity-and-current-read-only-boundary)
**Prerequisite:** [R01 evidence crosswalk](R01_RESULT.md), with unproven hosted/device acceptance retained.
**Tracking:** [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141), [BG-21 #83](https://github.com/anmolsansi/Recollect-Flow/issues/83), Linear OPE-340/OPE-346 (historical).
**Recorded:** 2026-11-12 UTC, public read-only browser observation on that date. The browser runner did not report the exact UTC start time.
**Environments:** current unauthenticated public GET-only browser and dated 2026-11-03/06/09 historical/owner-approved Cloudflare records, with their evidence classes kept separate.
**No production mutations.**

## Immutable identity, authority and stop preflight

Approved source [BG-31 frozen manifest](../releases/BG-31_CORE_RELEASE_2026-11-03.json) and [release closeout](../releases/BG-31_CORE_RELEASE_2026-11-03.md). The November 3 owner approval covers the *past core-only first install*, not new operations.

| Field | Frozen approved identity | Evidence class |
| --- | --- | --- |
| Source SHA | `81e82806700519b90b6fbd5c1ebb233ed5def9d2` | Frozen core release |
| Web release ID | `3b455e5d2150e5a38c24f340164b220fe74b05163604c2e159572affbdd8def6` | Frozen core release; current public manifest checked below |
| Worker name | `recollect-flow` | Frozen release |
| Worker version | `ff5ba1ce-32b0-499c-ae67-f561ec09c93a` | Frozen exact UUID; owner-confirmed active November 9; independently observed prefix only November 6 |
| Deployment ID | `b5146a95-1252-4a56-b01c-dfcca31e105d` | Frozen historical release |
| Public origin | `https://recollect-flow.openclawneutron.workers.dev` | Frozen origin and current public GET target |
| Cloudflare account | `a9482fbfb91ace26dee097cbd41293f9` | Frozen release; authenticated dashboard observed November 6 |
| D1 | `recollect-flow-prod-v2`, UUID `76bd35c6-c833-4987-a47e-6aa8238bb832` | Frozen release; authenticated dashboard observed November 6 |
| R2 | `recollect-flow-attachments-prod-v2`, private Standard | Frozen release; authenticated dashboard observed November 6 |
| Migrations | 22 ordered through `0025_bg28_scheduled_backups.sql` | Historical November 3 execution and November 9 owner-provided ledger review |
| Cron/providers | Cron `[]`, hosted dispatch and scheduled work disabled | Frozen release and November 6 authenticated dashboard |

**Repository HEAD is not the deployed Worker:** GitHub `main` at R02 start was `8bd1321236258bd2903522a0d6cea675f4fffd92`, from documentation PR #154 on November 11, distinct from frozen deployed source.

The [existing verifier](../../scripts/bg32-readonly-smoke.mjs) requires the exact canonical HTTPS origin and frozen record, sends only seven GETs with `redirect: manual`, rejects redirects, requires correct statuses/types/private cache, and verifies public manifest source/release IDs. Target/UUID/source mismatch is a **STOP**, not a reason to retarget to another account. This review did not run that Node script because the repository could not be cloned in the execution environment; a browser-based bounded public check was performed instead. Its proof scope is recorded below.
