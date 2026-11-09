# BG-32 Step 5 — failure response and recovery decision (November 9, 2026)

**Scope:** BG-32 / 08, actions .071–.080, against the already deployed November 3 **core-only** release. **Outcome:** stop-trigger review completed and further release actions remain **HALTED / NO-GO**. There was **no live production rollback, recovery, new migration, deploy, Cloudflare setting change, provider/notification send, or D1/R2 write**. This is not V1 or BG-33 acceptance.

## Immutable reference and latest bounded read

- [Approved core-only release](../releases/BG-31_CORE_RELEASE_2026-11-03.json): source `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, Worker version `ff5ba1ce-32b0-499c-ae67-f561ec09c93a`, 22 applied migrations through `0025_bg28_scheduled_backups.sql`, D1 `recollect-flow-prod-v2`, private R2 `recollect-flow-attachments-prod-v2`.
- [S01–S11 stop-stage definitions and approved incident procedure](../releases/BG-31_RELEASE_MANIFEST.md) are the governing expectations. They distinguish **halt further release actions** from any separately authorized traffic-control or recovery mutation.
- [November 6–9 release-gate evidence](BG-32_RELEASE_GATE_2026-11-06.md) documents authenticated owner-session private PDF/hash/anonymous denial, Step 4's 10/10 bounded inspections, seven-day Cloudflare event sampling, and known limitations.
- A fresh, **anonymous, read-only** Opera GET to the approved `/api/v1/health` endpoint on November 9 displayed `data.status = ok` and safe request ID `fa43c1e1-0276-4084-93ba-0c0f512c4aed`. Browser accessibility content does **not** independently establish HTTP headers, current resource inventory or overall release health.

## .071 — Stop-trigger evaluation

<!-- prettier-ignore-start -->

| Approved stage | Evidence-backed disposition | Decision |
| --- | --- | --- |
| S01 identity/config/ledger | Approved frozen manifest/Web identity and owner-confirmed current Worker version; authenticated D1 ledger previously reconciled 22/22. No new mutation preflight or independently re-read full Worker UUID on November 9. | No demonstrated mismatch for deployed core; **new release not authorized** |
| S02 homepage/assets | Existing real hashed CSS/JS and missing-asset behavior inspected in Step 4. No new full asset SRI/edge audit. | No confirmed stop event in tested assets |
| S03 direct item deep link | Prior Opera direct route loaded the admin access flow, with no misrouted SPA 404. | No confirmed stop event in tested route |
| S04 login/session/logout | BG-31 release smoke included secure cookie/logout; owner Opera session and persistence subsequently verified. No exhaustive new logout/session attack audit. | No confirmed leak in tested session; do not infer universal auth proof |
| S05 anonymous denial | Existing private item denied anonymously; owner-reported actual PDF GET gave HTTP 401 with no private PDF body. | No confirmed private leak in tested routes |
| S06 capture + replay | Historical authorized November 3 synthetic capture/replay passed. No new capture was executed. | No confirmed lost/duplicate item from existing evidence; future writes withheld |
| S07 original attachment/privacy | Owner verified existing PDF 639 bytes with expected SHA-256; session/item/PDF HTTP 200 with `private, no-store`, PDF content type, `CF-Cache-Status: DYNAMIC`, no `Age`; logged-out PDF HTTP 401. | No observed cache/privacy stop in these bounded requests; no global CDN certification |
| S08 search/reopening | Historical first immediate search missed, later read-only search matched. No immediate-visibility or latency guarantee established. | **Open product deviation**, not silently converted to PASS; hold broader acceptance |
| S09 privacy/optional degradation | Disabled dispatch flags and no Cron. Unexecuted hosted provider failure/degradation paths. | **Not exercised**; no permission to enable |
| S10 external integrations | Notion/Telegram/AI provider tests were excluded from core-only approval and remain disabled. | **Not executed / gate open**, never implied PASS |
| S11 operational inspection | November 8–9 Cloudflare seven-day dashboard: 258 events, Errors counter 0; bounded item/DB reads worked, six known pending jobs remained intentionally undispatched. No exhaustive event-status, billing, R2 or logging audit. | **Qualified inspection** only; no broad operational GO |

<!-- prettier-ignore-end -->

**Cross-cutting mandatory holds:** independently retained encrypted hosted-data export with original bytes and latest purge receipts, a verified *complete* isolated recovery rehearsal, unclosed BG-29.078 and OPE-247, no blanket cost cap for metered R2, and no fresh operation-specific approval. These block **future release/promotion or mutation**, not proof that a live disaster occurred. The initial search miss and Python default User-Agent's historical Cloudflare 1010/403 remain documented deviations.

## .072 — Stop further dependent actions, without unauthorized traffic changes

The release stays **NO-GO**. No new SQL, Worker/Web deploy, Cron activation, provider/AI/Notion/Telegram call, capture fixture, R2 operation, automatic backup, paid service change, or production repair was performed during Step 5. The core Worker is **not** claimed rolled back or disabled. No email escalation was sent, as no incident notification was separately authorized and no current incident requiring that procedure was confirmed. A source or checklist update does not grant new production authority.

## .073 — Preserve available safe request evidence

- Existing **expected anonymous PDF denial** returned `UNAUTHENTICATED` and the safe application request ID `963929e1-85e8-4517-90d4-1c05687f2026`; separate November 9 owner-reported HTTP status was **401**. These are complementary earlier observations, not necessarily the same network response.
- Historical **healthy** requests retained for correlation, **not failure IDs**: November 7 health `f775fd8c-768d-4930-b304-ab2612ccdd30`, operations summary `43d78bbf-8a79-4e7c-86c7-ab54940fbec0`; November 9 health `fa43c1e1-0276-4084-93ba-0c0f512c4aed`.
- The historical Cloudflare **1010/403** on default Python `urllib` had **no application request ID**, and the independent browser `ERR_QUIC_PROTOCOL_ERROR` returned **no HTTP response**. Do not invent IDs. No newly observed unexpected production failure request ID is available for escalation.
- No tokens, cookies, passwords, email destinations, private PDF body or private local paths recorded.

## .074 — Schema versus code rollback compatibility

This is a **fresh installation**, not an in-place upgrade from an earlier application release. The approved deployed Worker expects the **full 22-migration D1 schema**; the November 6 owner/Opera ledger comparison verified all 22 ordered names. The immutable original bundle is identified, and the currently observed core paths run against the deployed schema. **No previous known-good Worker/Web release with proven compatibility exists.** Migration `0022` includes an FTS table replacement, and source-only analyses are not proof an older binary can run on current D1. Code rollback **does not undo D1 migrations**, so a reverse binary or SQL rollback must not be improvised.

## .075–.077 — Explicitly left open

- `BG-32.075` **unchecked:** No *approved compatible previous* Worker/Web release is selectable. The decision is **do not roll back code** without a verified target and fresh owner authorization.
- `BG-32.076` **unchecked:** No active incident demonstrated an immediate production recovery need; more importantly, no production recovery was approved or executed. Remain in the halted/no-change state instead of simulating success.
- `BG-32.077` **unchecked:** Earlier local isolated tests are useful but are **not** an independently retained off-device backup plus complete application-level restore rehearsal, and no production rollback or recovery behavior was verified.

Existing `.078–.080` remain supported: no unauthorized destructive repair, production limits recorded, launch remains unapproved. **Step 5 is 7/10 actions evidence-checked**: .071–.074 newly reviewed, .078–.080 previously checked, .075–.077 deliberately unverified.

## Next authorized path

1. Finish verified, encrypted off-device hosted backup, independently preserved originals/current purge receipts, and full isolated restore, under a separately approved plan that protects data and meets the $0 additional-spend constraint.
2. Identify and verify an actual compatible rollback candidate, or prepare a reviewed forward-repair/isolated restore plan with retention and data-loss consequences. Do not deploy it from this documentation.
3. Obtain **specific owner approval for the exact proposed operation** before any production change or incident email. Preserve the frozen November 3 release and existing 22-migration ledger.
4. Only then revisit .075–.077 as applicable. Keep BG-32, BG-29.078, OPE-247, BG-33, and V1 acceptance separate.

**Evidence classification:** prior release/owner records + approved manifest + new anonymous Opera health body. No newly observed full authenticated recovery, protocol headers, billing or production data restore is claimed.
