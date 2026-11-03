# BG-31 core-only release closeout — November 3, 2026

**BG-31 manifest: 100/100 under the accepted fresh-install criteria and exact core-only release decision. This is not full V1 acceptance.** The authorized bounded BG-32 core deployment was executed; its full checklist, owner-device acceptance, OPE-247 and skipped BG-29 hourly proof remain separate.

## Exact approval and deployment

The owner replied **“Done, complete it fast”** directly to the approval request for `BG31-CORE-81e828067005-2026-11-03.3`, including its stated core-only migration, atomic secret/deployment, bounded smoke and operations exceptions. The execution record timestamps that authorization at `2026-11-03T11:12:10.059912+00:00` and preserves approved packet SHA256 `4cdd5899325e398ef2fd785fa4729872cc7830afa7200a78ffdc09a6ebcef839`. This is an exact owner decision, not an approval inferred from CI or PR merge.

- Source: `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, PR139 merged as `2d221757fe6a29459105f097d2680a2bf0245f9e`.
- [Exact-source CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41606982016) and [merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41613173405) passed.
- Origin: https://recollect-flow.openclawneutron.workers.dev
- Worker version: `ff5ba1ce-32b0-499c-ae67-f561ec09c93a`; deployment: `b5146a95-1252-4a56-b01c-dfcca31e105d`; created `2026-11-03T11:13:00.742663Z`.
- Account: `a9482fbfb91ace26dee097cbd41293f9`.
- D1: `recollect-flow-prod-v2`, `76bd35c6-c833-4987-a47e-6aa8238bb832`.
- R2: `recollect-flow-attachments-prod-v2`, private Standard; r2.dev disabled and no custom domains at preflight.

[Machine-readable current record](BG-31_CORE_RELEASE_2026-11-03.json) retains exact Worker/Web/config/archive/SQL identities, approval, deployed version and safe evidence hashes. The old draft JSON remains a historical NO-GO snapshot; it is not the current approved release.

## Execution and functional evidence

Authenticated preflight confirmed no prior Worker, only `_cf_KV` in the new D1 and no ledger. The comparator established exactly 22 pending frozen migrations in order through 0025; numbering gap 0011–0013 is intentional. All applied successfully. Exact ledger, `PRAGMA foreign_key_check`, D1-supported `PRAGMA quick_check` and initially zero items passed before app deployment. The initial unsupported CLI confirmation option was rejected before database contact; it was removed. An unsupported `integrity_check` probe was replaced by documented `quick_check`; migrations were not replayed after success.

The preserved Worker bundle was uploaded with `--no-bundle`, frozen Web/config and the private four-key JSON using `--secrets-file`. Required secret names were immediately listed and verified without values: ADMIN_TOKEN, CAPTURE_TOKEN, LOCAL_WORKER_TOKEN, WEB_INBOX_BASE_URL. Authentication/session/scope denials then verified runtime behavior. Local secret file and directory permissions remain 0600/0700; token values were absent from checked artifacts/logs.

Live checks passed for homepage/direct routes, exact Web manifest/release ID, health liveness, protected operations/usage, HttpOnly/Secure/SameSite=Strict session, anonymous and wrong-scope denials, note/URL/file capture, replay, edit, search, private original SHA/size and anonymous denial, and protected JSON/CSV exports. Exactly three synthetic items and one PDF remain; no extra fixtures, real imports or permanent deletion. The PDF is 639 bytes. Provider usage, URL acquisitions and extraction records are all zero. Processing/sync work may remain pending; disabled integrations are not represented as completed work.

**Retained findings:** the first immediate search returned no matching note; subsequent read-only requests found it. The cause and immediate search freshness are not claimed resolved; this does not prove instantaneous search visibility or a latency objective. Default Python urllib User-Agent received Cloudflare 403/error 1010 with no app request ID; an explicit application User-Agent and Node requests returned 200. Do not claim all client agents accepted. These observations remain qualifications for BG-32/V1, not hidden passes.

A temporary foreground tail sampled one successful core operation, found no prepared token values and was stopped. No recurring monitor/automation was created. Sampling one request is not an exhaustive hosted log audit.

## Accepted criterion dispositions for the 22 formerly open actions

The owner previously accepted [fresh-install applicability](BG-31_FRESH_INSTALL_APPLICABILITY.md). November 3 exact approval accepts the narrow operations exceptions and installing/verifying secrets during first deployment. These changes apply to this exact new core installation, never to the inaccessible old account.

| Canonical actions | Evidence / accepted treatment                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| .021              | Preflight Worker absence; actual deployed version now recorded. No fabricated old version.                                                                                                                                     |
| .022–.023         | Authenticated fresh schema/ledger absence and exact frozen comparison, followed by verified applied ledger.                                                                                                                    |
| .024–.025         | Authenticated D1/account/UUID and private Standard bucket; metered exposure explicitly accepted.                                                                                                                               |
| .026              | Intended origin approved and actual HTTPS homepage/direct routes observed.                                                                                                                                                     |
| .027–.028         | Notion/Telegram explicitly disabled; no dummy destinations or provider secrets. Their actual integration acceptance remains absent.                                                                                            |
| .031–.032         | Exact 22-file pending sequence from observed target, applied ledger rechecked.                                                                                                                                                 |
| .033–.036         | Target-specific table/index/backfill/trigger/compatibility review in the approved packet; fresh target had no legacy items; runtime requires complete schema through 0025. No backwards-compatible down-migration claim.       |
| .042              | Owner accepted atomic first-deploy installation plus immediate name/runtime verification, now performed.                                                                                                                       |
| .044–.046         | Exact intended origin, canonical config and deployed disabled flags/core capabilities verified. AI binding declared, provider list/map empty, no invocation claimed.                                                           |
| .076–.077         | Accepted first-install substitute: no previous app artifact, preserve exact first-release bytes, stop ingress/preserve data, reviewed forward repair or separately approved isolated restore. Code rollback does not undo SQL. |
| .082              | Exact approved migrations, atomic core deployment/settings and bounded synthetic smoke recorded; excluded providers/Cron/upgrade/import/delete/restore.                                                                        |
| .089              | Direct owner response to exact revision/scope; approved packet hash and timestamp retained.                                                                                                                                    |

## Explicit remaining limits and next actions

BG-29.078 was skipped at owner direction; zero hourly sweeps remain NOT PASSED. Full OPE-247 remains In Progress: no hosted compromise/rotation, destructive purge/index/DR rehearsal or universal provider/headroom acceptance was created. Owner reported billing/alerts and independent credential/account recovery complete; billing API returns 403, so current spend/alert delivery is not independently inspected. Workers Free is owner-confirmed; R2 remains metered without a hard spending cap. Proposed $1/$5/1GB manual responses are not enforcement guarantees.

No Cron, provider calls, URL fetching, extraction, AI/Notion/Telegram, automatic hosted backup, recurring monitor, plan upgrade, unrelated-resource mutation or old-data import was performed. Frozen old/replacement candidate files and archives remain unchanged. Host/device/notification acceptance is not inherited from a source test.

**Owner next:** open the deployed origin and log in privately using the prepared admin credential; confirm the interface on the device you intend to use. Never paste credentials in chat/URLs. Before relying on real hosted data, retain a new independent encrypted export plus originals/current purge receipts; the earlier backup contains only prior local synthetic data. Continue BG-32's remaining owner/device checks and investigate immediate search visibility; do not declare full V1 launch.

Private evidence remains in the ignored `.wrangler/bg31-core-release-20261103/` directory. Public JSON records only safe identifiers/hashes, never secret values, private recovery-folder labels, emails or passwords.
