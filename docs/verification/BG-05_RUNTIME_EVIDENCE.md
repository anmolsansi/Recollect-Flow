# BG-05 — Worker Dry-Run and Smoke Evidence

Verification candidate: `3179b1d1601142d8d071285d06aa3630e3f0742c`

Successful proof source: GitHub Actions **BG-05 Candidate Proof run #3**, run ID `35263570610`, job `candidate-proof`, executed on 2026-09-17 UTC / 2026-09-18 Asia/Kolkata.

The temporary proof workflow deliberately checked out the exact candidate commit rather than the documentation branch head. This keeps source/runtime evidence tied to the same application revision while BG-05 documentation is developed independently.

## Toolchain

- Node: `v22.23.2`
- npm: `10.9.8`
- Wrangler: `4.116.0`
- Runner: Ubuntu 24.04

`npm ci` completed from the committed lockfile. npm also reported 10 dependency advisories, 3 moderate and 7 high. BG-05 records that qualification rather than silently treating dependency audit as part of this gate. The task did not authorize unrelated dependency upgrades.

## Worker deployment dry-run

Command:

```text
npx wrangler deploy --dry-run --outdir .bg05-worker-bundle
```

Result: **PASS**.

Observed bundle evidence:

- total upload: 3011.70 KiB
- gzip: 687.64 KiB
- generated `index.js`, `index.js.map` and bundle README
- configured bindings were resolved for D1 `DB`, R2 `ATTACHMENTS`, Workers AI `AI`, and the checked-in non-secret environment variables
- Wrangler ended with `--dry-run: exiting now.`

No deployment occurred.

## Fresh migrations in the proof run

The proof harness removed prior local Wrangler D1 state and ran:

```text
npm run db:migrate:local
```

Result: **PASS**. All 18 committed migrations applied to local D1 state. Wrangler explicitly reported `Resource location: local` and stated that `--remote` would be required to access the remote database.

## Initial harness attempt

Candidate Proof run #1 correctly exposed a harness-only limitation before smoke could execute. Plain `wrangler dev` attempted to establish a remote proxy for the Workers AI binding and required a Cloudflare API token in the non-interactive runner.

This was not treated as an application pass or failure. BG-05 changed only the temporary proof harness to start Wrangler with `--local`; no application contract, secret requirement or source behavior was weakened. Run #3 then completed successfully without Cloudflare credentials.

## Corrected isolated smoke

The successful harness:

1. copied `.dev.vars.example` to temporary `.dev.vars`;
2. started `npm run dev:api -- --local`;
3. waited for `GET /api/v1/health` on `127.0.0.1:8787`;
4. ran `scripts/verify-production-release.mjs` with the synthetic local capture/admin tokens;
5. removed `.dev.vars` and terminated owned local processes through its cleanup trap;
6. used no remote target opt-in.

Smoke result: **overall passed**.

### Stage totals

- passed: **24**
- failed: **0**
- unavailable: **4**

### Supported behavior proved

The passing stages include:

- health check;
- anonymous capture denial;
- primary capture;
- exact idempotent replay;
- normalized duplicate handling;
- provenance/source retrieval;
- raw text retrieval without AI;
- malformed privacy consent rejection;
- public, personal and sensitive privacy transitions;
- stale edit-version conflict protection;
- attachment init/upload/finalize/link;
- bearer attachment byte download;
- anonymous attachment denial;
- stale item-edit conflict plus successful edit;
- soft delete/search exclusion;
- restore/search restoration;
- JSON export containing the run item.

The exact replay returned HTTP 200 and `exact_replay=true`. The attachment round trip used a 102-byte synthetic fixture whose downloaded SHA-256 matched `0aceedb1b815e5846a4d2f48838bb9e2fddccca422e1d824e1db9b9f29332647`. This proves byte preservation only, not PDF parsing.

The privacy sequence also proved `VERSION_CONFLICT` for a stale version while successful transitions continued from server-authoritative edit versions.

### Intentionally unavailable stages

The runner kept these later-stage gaps explicit rather than turning them into false passes:

1. `browser-cookie-attachment-download` — known BG-07 gap; admin session cookie path currently returns 401 at attachment content.
2. `provider-adapter-execution` — provider policy eligibility is verified, but configured provider execution is separate capability evidence.
3. `parseable-pdf-extraction-acceptance` — a parseable fixture is prepared, but extraction acceptance is separate processing evidence.
4. `bare-url-acquisition-enrichment` — later build-guide capability.

The successful smoke result therefore means every currently supported stage passed and every known unsupported stage was surfaced truthfully.

## Remote-action boundary

The proof workflow used `wrangler deploy --dry-run`, local D1 migrations, `wrangler dev --local`, and a `127.0.0.1` smoke target. It did not contain a remote migration, remote smoke opt-in or deploy command capable of publishing the Worker.
