# BG-31 — Local acceptance, October 30, 2026

**Result:** PASS for the local flows below. Production remains **NO-GO**;
BG-31 remains **78/100**, with 22 canonical live actions open.

**Owner direction:** The original Cloudflare account cannot be recovered.
Run locally now and prepare a fresh deployment in the accessible account for
later. This supersedes account recovery as the required next action; it does
not relax the strict additional-$0 boundary or authorize hosted operations.

## Environment and source

- Local origin: `http://127.0.0.1:8787`.
- Application source: `e7f95afb7a9531b5ccf23c275f221c3cf317d48c`.
- [Merged-main CI #41022109725](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41022109725)
  passed on that source. This report does not attest CI on later documentation.
- Local Web release ID:
  `d6d612ccafe95bb51660a73178ef8afd1cc676b64302605ed9dc8e8245455cdf`.
- Local Web manifest SHA-256:
  `438be5224c89fcfb8892621ffb56e4bdf66116cce5a5c6e18799398c093043c7`.
- This asset manifest hashes the canonical source configuration. The running
  local Worker uses the separate local override below; these values do not
  establish a matched Cloudflare deployment artifact pair.
- All 22 migrations through `0025_bg28_scheduled_backups.sql` were previously
  applied to the isolated local D1 target; original files use simulated R2.
- `.wrangler/bg31-local/wrangler.toml` uses local D1/R2 bindings, no Workers AI
  binding, no Cron triggers, and false scheduled/HTTP/external-dispatch flags.
  Credentials are local-only. AI/Notion/Telegram work remains queued.

## Observed acceptance

| Flow                 | Actual proof                                                                                                       | Result           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Note capture         | Reused the labeled synthetic note saved in the earlier local setup; API and export retain its canonical item       | PASS             |
| URL capture          | Saved a labeled `example.com` URL through the browser; found it using Inbox search; no external page fetch         | PASS             |
| File capture         | Reopened the synthetic PDF item and its linked original                                                            | PASS             |
| Browser download     | Clicked Download using the signed-in browser; saved 51 original bytes and matched SHA-256                          | PASS             |
| Project edit         | Edited only the synthetic note to project `BG31 local acceptance`; API and browser reload retain it                | PASS             |
| Review date          | November 2, 2026, 10:00 in `America/New_York` persists as `2026-11-02T15:00:00.000Z`; reload shows the local clock | PASS             |
| JSON export          | HTTP 200, expected format/schema, three canonical items, matching `itemCount`, and all test IDs/edits present      | PASS             |
| CSV export           | Standard CSV parser reads three rows; canonical IDs match the JSON export                                          | PASS             |
| Credential exclusion | Actual generated local auth/provider credential values are absent from JSON                                        | PASS             |
| Export access        | Unauthenticated JSON export returns HTTP 403                                                                       | PASS             |
| Original-byte copy   | Copied the one linked original separately and verified size/hash against export metadata                           | PASS             |
| Bundle verification  | Existing `verifyRecoveryBundle` verifies three items, one object, 51 bytes, and zero current purge receipts        | PASS, local only |

The first generic automation fill changed the date's DOM value without
persisting React state. The repository's native input-setter plus input/change
event method persisted the date; API readback and a reload confirmed the
result. No application defect was established and no runtime code was changed.

## Protected export record

The export snapshot was taken at **2026-10-30 08:02:52 UTC**. The ignored local
directory is `.wrangler/bg31-local/acceptance-2026-10-30T08-02-52.642Z/`.
It contains `portable.json`, `readable.csv`, `objects/`, the separately queried
`current-local-receipts.json`, `verified-bundle.json`, a browser-downloaded
original, and `acceptance.json`. Files use mode 0600 and the directory uses 0700. Do not commit these files or treat permissions as encryption.

| Artifact               | Bytes / count         | SHA-256                                                            |
| ---------------------- | --------------------- | ------------------------------------------------------------------ |
| `portable.json`        | 13,683 bytes; 3 items | `1591dfecccfe2b48e1850b90eeded4d00adc2af171c2e2b4d7ef949bb039b5f6` |
| `readable.csv`         | 5,353 bytes; 3 rows   | `7d642898366af539138c10f0febc0a347b17c5582b69018022bc55c834b2d543` |
| Synthetic original PDF | 51 bytes              | `904636248025ad20fb9c6bd8b700179a2a42edb5df3636e926c7e09055ee3f75` |

The current local `purge_receipts` table was queried separately from the
historical export and returned zero rows. The verifier used that observed
ledger, not an invented empty array. A nonempty purge/anti-resurrection scenario
was not exercised in this pass. Existing source tests cover that behavior.

## Limits and handoff

This same-machine copy is not an encrypted off-device backup, proof of
independent failure-domain separation, or an isolated restore rehearsal. JSON
and CSV do not embed original attachment bytes. No production data was imported
from the inaccessible account. The earlier local setup separately verified
record and original-byte persistence after a server restart.

No Cloudflare resource was provisioned, deployed or migrated, and no real AI,
Notion, Telegram, email or billing action was performed. Physical-device,
hosted HTTPS, real-clock, production configuration, cost and disaster-recovery
acceptance remain unverified.

Next: review the [fresh-account manifest](../releases/BG-31_FRESH_ACCOUNT_MANIFEST.md).
Keep the local app running; defer hosted execution until its gates are met.
