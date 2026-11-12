# R01 — Reconcile legacy open work against actual evidence

**Status:** IN_PROGRESS (evidence reconciliation only; no claim of hosted V1 acceptance)
**Packet:** [R01](../tickets/REMAINING_WORK_PACKETS.md#r01--reconcile-old-open-work-against-actual-evidence)
**Parent tracking:** [BG-01 #23](https://github.com/anmolsansi/Recollect-Flow/issues/23), [BG-21 #83](https://github.com/anmolsansi/Recollect-Flow/issues/83), [BG-22 #85](https://github.com/anmolsansi/Recollect-Flow/issues/85), [BG-32 #141](https://github.com/anmolsansi/Recollect-Flow/issues/141); existing Linear OPE-321/OPE-340/OPE-346 are historical task tracks.
**Repository baseline:** `main` at `8bd1321236258bd2903522a0d6cea675f4fffd92` (2026-11-11 merge of [PR #154](https://github.com/anmolsansi/Recollect-Flow/pull/154)).
**Production source (different artifact):** `81e82806700519b90b6fbd5c1ebb233ed5def9d2` (approved core-only 2026-11-03 release). GitHub documentation HEAD does **not** identify the running Worker.
**Environment:** public GitHub source, historical run/PR records, frozen release evidence and a separate public GET-only R02 observation. No repository checkout, local D1, device session, or current authenticated Cloudflare inventory was claimed.
**Recorded:** 2026-11-12 UTC. No production mutation or sensitive data access.

## Scope and evidence rules

This is an audit of historical checklist requirements and their current owners. It does **not** re-execute completed setup, rewrite the original checklist as green, run an old migration, close a parent issue, approve a new deployment, or treat one old local browser test as hosted acceptance. The existing [coverage CSV](../tickets/REMAINING_WORK_COVERAGE.csv) is the ID-level source of truth for handoff; no duplicate 415-line shadow tracker is created here.

Evidence class is **source/CI**, **historical release**, **owner-reported**, **current public observation**, or **not executed**. Source correctness never silently upgrades to public-hosted, authenticated, recovery or device proof.

## Coverage integrity audit

The checked-in CSV has **1,236 mapped legacy rows**, zero duplicate IDs, zero malformed IDs, zero missing packet fields, and no invalid `Rxx` packet syntax in the 415 rows including R01. Of those, **415 IDs include R01** as an owner:

| Legacy set | Mapped IDs | Disposition / next owner |
| --- | ---: | --- |
| BG-01.001–.100 | 100 | R01, reconcile existing baseline proof |
| BG-02.001–.100 | 100 | R01, reconcile existing clock-fix proof |
| BG-03.001–.100 | 100 | R01, reconcile final post-merge gate |
| BG-11.028 | 1 | R01, compare BG-13 materialization |
| BG-15.073–.079 | 7 | R01/R10, source and auth/UI boundary |
| BG-21.044/.059/.061/.062/.065/.077/.080 | 7 | R01/R02, hosted identity/auth/cache/publish boundary |
| BG-22.001–.100 | 100 | R01/R13/R14/R15/R16, browser/source/AI/Notion acceptance |
| **Total** | **415** | **Every R01-owned ID has a mapped downstream owner or evidence path.** |

**Reconciliation interpretation:** A syntactically valid mapping is not proof that an underlying action passed. The remainder of this record names the exact evidence and unresolved execution packet(s). The other **821** rows remain with their existing non-R01 packet owners. The CSV, historical evidence files and issues remain unchanged.

## BG-01: 100/100 historical baseline requirements

**Disposition:** SATISFIED by existing dated task evidence, not reproduced in this R01 session. The [BG-01 checklist reconciliation](BG-01_CHECKLIST_RECONCILIATION.md) maps all 100 actions to current-at-2026-09-16, reused 2026-09-12, or explained nonapplicable procedural paths. The [baseline result](BG-01_REPRODUCIBLE_BASELINE.md) and [PR #24](https://github.com/anmolsansi/Recollect-Flow/pull/24) anchor the artifact. Existing CI is not current production or device proof.

**Tracker discrepancy:** [GitHub #23](https://github.com/anmolsansi/Recollect-Flow/issues/23) was **open** when checked for R01 despite a completed task checklist and evidence that its historical objective was satisfied. Preserve the original issue; a tracker-owner status correction is separate from proving the baseline. **Next behavior owner:** none for the historic baseline; changed production/security requirements remain in R02/R10 and later verification packets.

## BG-02 and BG-03: 200/200 historical source actions

**BG-02.001–.100:** [BG-02 reconciliation](BG-02_CHECKLIST_RECONCILIATION.md) and [clock-stabilization evidence](BG-02_USAGE_CLOCK_STABILIZATION.md) record the isolated D1 clock fix, matching test/CI proof and justified no-op paths. Do **not** rebuild the already accepted test stabilization.

**BG-03.001–.100:** The original [BG-03 reconciliation](BG-03_CHECKLIST_RECONCILIATION.md) deliberately stopped at 99/100 pending the final merge. The later [authoritative post-merge closeout](BG-03_FINAL_CLOSEOUT.md) states that `BG-03.100` passed after [PR #28](https://github.com/anmolsansi/Recollect-Flow/pull/28) and its final CI. The later dated closure supersedes the pre-merge count. **No current deployment acceptance** is inferred from either source task.

## BG-11 and BG-15: inherited requirements, not forgotten work

**BG-11.028 (one action):** [BG-11 historical closeout](BG-11_FINAL_CLOSEOUT.md) explicitly delegated applying aggregate status to BG-13 instead of claiming it at BG-11 close. [BG-13 final closeout](BG-13_FINAL_CLOSEOUT.md) identifies merged [PR #62](https://github.com/anmolsansi/Recollect-Flow/pull/62) at `3d1af004bc0ebfaa95645a39880b38f623d3c447` with source/CI verification of current-generation aggregate materialization. **Source disposition: SATISFIED by the later task.** Actual hosted processing/search freshness remains a separate R14/R15 acceptance concern.

**BG-15.073–.079 (seven actions):** [BG-15 closeout](BG-15_FINAL_CLOSEOUT.md) records backend authorization as accepted, but intentionally delegates pending capture/upload identity, reauthentication, resume and UI cleanup to BG-16–BG-18. [BG-16 final](BG-16_FINAL_CLOSEOUT.md) and [BG-17 final](BG-17_FINAL_CLOSEOUT.md) establish staged source/client progress; [BG-22 #85](https://github.com/anmolsansi/Recollect-Flow/issues/85) records more isolated Chrome work including file PUT reauthentication. **Not promoted to hosted PASS.** R10 owns the security/session contract, R13 the deployed browser capture/retry behavior. No duplicate backend authorization rewrite is warranted.

## BG-21: seven specific deployed-Web exceptions

The [BG-21 evidence](BG-21_WEB_HOSTING.md), [GitHub #83](https://github.com/anmolsansi/Recollect-Flow/issues/83), the frozen [BG-31 core release](../releases/BG-31_CORE_RELEASE_2026-11-03.md), and R02's new public observations have different scopes. #83 was still open on 2026-11-12.

| Legacy ID | Supported evidence and evidence class | Required remaining disposition |
| --- | --- | --- |
| `BG-21.044` | [PR #121](https://github.com/anmolsansi/Recollect-Flow/pull/121) and historical exact-head CI prove the approved `/operations` route in packaged local browser, **source/CI**. | R13 to confirm deployed owner route without assuming Web UI access. |
| `BG-21.059` | Static release-manifest match now observable, **current public GET**. It does **not** test old/new CDN cache invalidation across a deployment. | R02/R07; do not redeploy just to tick the check. |
| `BG-21.061` | HTTPS canonical root, deep link and API GETs on exact deployed origin returned without redirects, **current public GET** (R02). | Public HTTPS path supported; current account ownership remains historical/read-only R02 inventory. |
| `BG-21.062` | [BG-31 release](../releases/BG-31_CORE_RELEASE_2026-11-03.md) reports Secure/HttpOnly/SameSite cookie checks, **historical live**; owner session reports differ from independent header capture. | R02/R10; no cookie values or credential reads. |
| `BG-21.065` | BG-31 records successful hosted login/session on approved origin, **historical live/owner**. | R02/R10/R13; no fresh authenticated login attempted. |
| `BG-21.077` | Packaging/rollback instructions exist, but an actual old/new asset compatibility rollback rehearsal is **not observed**. | R02/R07 separate authorized preflight. |
| `BG-21.080` | BG-31 deployed the approved core artifact, and R02's public manifest matches frozen release ID/source, **historical deployment + current public**. | R02 authenticated active Worker/version check remains distinct. |

Do not change the source checklist or close #83 solely on this mapping: missing hosted cache/rollback and exact authenticated release evidence are still explicit.

## BG-22: all 100 IDs retain a concrete execution owner

The [coverage CSV](../tickets/REMAINING_WORK_COVERAGE.csv) assigns every `BG-22.001–.100` to the exact joint path `R01/R13/R14/R15/R16`. [GitHub #85](https://github.com/anmolsansi/Recollect-Flow/issues/85) records isolated local Chrome/Worker progress and names **five explicitly incomplete source checks**: `.031` acquired URL internal-phrase search, `.034` image OCR internal search, `.035` PDF internal search, `.062` Notion disable-path test, and `.068` pending AI retry/resume. [Draft PR #86](https://github.com/anmolsansi/Recollect-Flow/pull/86) is **closed, unmerged**; its branch evidence cannot be advertised as merged `main` functionality or hosted acceptance.

- **R13** owns actual hosted browser creation, safe retry, deep link, loss-of-session and private original acceptance.
- **R14** owns acquisition, lexical search and URL/PDF body phrase visibility (`.031`, `.035`, and source evidence for `.034`).
- **R15** owns approved OCR/AI modality, privacy, quota and same-job retry (`.034`, `.035`, `.068` as applicable).
- **R16** owns the explicit disable/outage/recreation behavior for Notion (`.062`).

This is an ownership crosswalk for all 100 IDs, **not 100 PASS claims**. Already recorded local examples are reused only as their original evidence class. The hosted V1 user story and remaining five tests stay open.
