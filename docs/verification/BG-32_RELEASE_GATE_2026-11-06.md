# BG-32 — core deployment reconciliation and remaining release gates

**Status: In progress, not full V1 release acceptance.** Tracking: [GitHub #141](https://github.com/anmolsansi/Recollect-Flow/issues/141) and [Linear OPE-346](https://linear.app/openclaw-neutron/issue/OPE-346/bg-32-verify-deployed-core-release-boundaries-and-close-production).

## Baseline and task boundary

The current source baseline for this work is main at `f7c487808539cc0809cd407f4b3f1debe6834b3a` (November 3, 2026). The approved immutable production artifact is **not** that documentation head. The [BG-31 core release record](../releases/BG-31_CORE_RELEASE_2026-11-03.md) reports that source `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, Web release ID `3b455e5d2150e5a38c24f340164b220fe74b05163604c2e159572affbdd8def6`, and Worker version `ff5ba1ce-32b0-499c-ae67-f561ec09c93a` were deployed on November 3 after the exact owner approval `BG31-CORE-81e828067005-2026-11-03.3`. This is historical, owner-approved evidence, not a new live observation.

Target: `https://recollect-flow.openclawneutron.workers.dev`, account `a9482fbfb91ace26dee097cbd41293f9`, D1 `recollect-flow-prod-v2` / `76bd35c6-c833-4987-a47e-6aa8238bb832`, private R2 `recollect-flow-attachments-prod-v2`. This is a **fresh installation** with no earlier compatible application artifact. The historical 22-migration ledger, required secret-name presence, safe auth and routing smoke, three synthetic items and one 639-byte PDF are recorded by BG-31. Do not reapply migrations or rerun its write-bearing smoke to inflate BG-32 progress.

## Already performed, with scoped evidence

- Approved core-only forward migrations through `0025`, first Worker/Web deployment and runtime secret installation.
- Homepage, direct route, health, anonymous/wrong-scope rejection, session, capture/replay, PDF original/private denial, edits, eventual search, CSV/JSON exports and a bounded safe-log sample.
- Provider/Cron/Notion/Telegram work intentionally disabled. No provider execution, automatic backup, full device or destructive recovery acceptance is established.

## Missing evidence and stop conditions

- A **new, independently recoverable encrypted export** of the hosted data including original bytes and any latest purge receipts, with an isolated restore proof, must be confirmed before relying on real hosted data or any further production mutation. The October 30 local backup only covered earlier local synthetic data.
- Operator/device login, session and private downloads remain owner-reported, not independently verified on the intended device.
- Immediate first search missed and then succeeded on read-only retry. Do not claim instantaneous search correctness or a latency SLO. Default Python urllib User-Agent encountered Cloudflare error 1010/403; known application User-Agent succeeded. Investigate before universal client acceptance.
- Confirm current Worker version, deployment identity, D1 ledger and current binding/secret-name presence through authorized read-only authenticated platform inspection. Public smoke alone cannot prove any of these.
- Skipped BG-29.078 hourly sweep and incomplete OPE-247 security/operations remain independent gates. R2 is metered, and a budget alert is not a hard billing cap.

**Authorization:** The November 3 approval applied to the exact first-install core packet and bounded operations. It does **not** permit another deploy, remote SQL mutation, R2 write, destructive restore, provider/notification send, Cron activation or billing change. Stop if artifact/target checks mismatch or a new operation lacks explicit scoped approval.

## Verification approach

Keep the historical evidence separate from new observations. Use a read-only checker for health, public routing, exact published Web release ID, anonymous private denial and missing asset behavior. The checker must never make a mutating request or use credentials. A passed public check supports reachability and routing only, not private session, DB inventory, billing, backup or final release acceptance.

The canonical [BG-32 100-step checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-32--100-executable-microtasks) remains the truth for completeness. Check items only after their evidence and review are recorded. Do not close BG-33 or full V1 by inheriting this bounded initial deployment.
