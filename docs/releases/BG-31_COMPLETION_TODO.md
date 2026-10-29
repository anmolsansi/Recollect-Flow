# BG-31 completion plan

**Updated:** October 29, 2026.

**Status:** 78 of 100 canonical actions checked. Production NO-GO; 22 actions remain open. Source-only Cron/HTTP-dispatch hardening is additional preparation, not closure of a live acceptance gate.

**Safety:** Source-only work, with zero additional cost.

See [GitHub issue #119](https://github.com/anmolsansi/Recollect-Flow/issues/119).

See [merged source-only PR #120](https://github.com/anmolsansi/Recollect-Flow/pull/120).

See [Linear OPE-345](https://linear.app/openclaw-neutron/issue/OPE-345).

## Rules

- Do not deploy, migrate, modify traffic, or incur charges.
- Do not read or write hosted R2 objects.
- Do not call AI, Notion, or Telegram providers.
- Never paste tokens, secret values, chat IDs, or sensitive content.
- The BG-29.078 exception permits development, not a live release.
- Production metadata inspection needs separate scoped authorization.
- Keep unknown checks open until their real evidence is verified.

## Confirmed Cloudflare account and zero-cost provisioning gate

**Owner confirmation (October 24, 2026):** Cloudflare account `a9482fbfb91ace26dee097cbd41293f9` is the intended RecollectFlow production account. The owner authorized metadata-only inspection, not provisioning, deployment, paid usage or messages.

**Observed account overview:**

- Workers: only `recollect-flow-bg29-d1-cron-probe` (1/1). Intended production Worker `recollect-flow` is not listed.
- D1: only `recollect-flow-bg29-staging` (1/1), UUID `b5cbeccc-92fb-4bbc-9597-f0174b84e57d`. Intended `recollect-flow-prod` is not listed.
- R2: only `propertyos-media` listed. Intended `recollect-flow-attachments-prod` is not listed. No R2 objects were opened.

**Important:** The D1 UUID `5fcba514-d0f7-45e7-a632-d4c59233af71` in `wrangler.toml` is a source-declared target, not an observed database in this account. Never reuse the BG-29 staging resources or PropertyOS media bucket for RecollectFlow production.

### October 29 cost-gate assessment (read-only, not a hard cap)

- Owner-opened Cloudflare Billing showed a Workers Free subscription and an
  active, usage-metered R2 subscription in the intended account.
- The current cycle showed no billable usage charges at inspection time.
  Previous visible invoices were also zero, but historical charges cannot
  certify the price of future requests or storage.
- An account-wide budget alert was configured. Cloudflare explicitly states
  that alerts are informational and **do not pause or cap usage**.
- R2 Standard has monthly included storage and operations, then metered rates
  for any usage above those allowances. A paid R2 subscription with a payment
  method on file cannot be treated as an enforced additional-$0 ceiling.
- Private billing details, email recipients, payment information and invoice
  identifiers are deliberately excluded from this public repository.
- **P1 decision: BLOCKED / NOT VERIFIED.** This review did not identify an
  enforceable hard-stop mechanism for the required R2 workload. Leave P1
  unchecked. BG-31 and BG-32 remain **NO-GO**, with no R2 provisioning,
  scheduled operations, remote migrations or deployment authorized.

Sources: [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
and [budget alert behavior](https://developers.cloudflare.com/billing/manage/budget-alerts/).
The reviewed account's live usage is a point-in-time observation, not an
ongoing cost or quota guarantee.

**Gated preparation tasks:**

- [x] **P0 (Assistant):** Confirm the intended account and record resource-list mismatches using only read-only metadata.
- [ ] **P1 (Owner and Assistant):** Prove enforceable zero-additional-charge controls for all required services. Workers Free/D1 Free fail at daily limits; R2 Standard has billable usage beyond its free allowance. Free quota, alerts and a current $0 invoice do not constitute a hard cap. BG-29.078 expressly prohibits hosted R2 provisioning under the current exception. Keep NO-GO if a hard $0 stop is impossible.
- [ ] **P2 (Assistant):** Review and locally test fail-closed configuration with scheduled Cron and real OpenRouter/Notion/Telegram calls disabled. Merged PR #128 removes default Cron declarations; the source still names `openrouter` as its default AI provider. The real provider, network-egress, backup and paid-usage controls remain unverified. Do not deploy before independent strict-$0 proof or weaken original-attachment and recovery guarantees.
  - [x] **P2.1 — Source implementation:** The production `handleScheduled` entry requires **both** `HOSTED_SCHEDULED_WORK_ENABLED` and `HOSTED_EXTERNAL_DISPATCH_ENABLED` to equal exactly `true`. Missing, malformed or explicitly false flags return before any background job starts. All three Cron routes are covered. No flag is set to true in `wrangler.toml`; staging's independent scheduler is unchanged.
  - [x] **P2.2 — Scheduled path:** The same pre-dispatch gate protects scheduled cleanup, external URL acquisition, AI enrichment, Notion sync and digest/Telegram before any queued job starts. Missing D1/R2 bindings fail before calling dependencies when both flags are enabled.
  - [x] **P2.3 — CI proof:** The merged PR #126 scheduler guard passed exact-head CI #40109137736 (attempt 2). The initial run failed an unrelated browser follow-up evaluation; the full retry passed without skipped checks.
  - **P2.4 evidence (October 26 review):** Merged PR [#127](https://github.com/anmolsansi/Recollect-Flow/pull/127), main `3f012aba05136e7776bbecf10299fa7764912a43`, passed [exact main CI #40167287305](https://github.com/anmolsansi/Recollect-Flow/actions/runs/40167287305). This is not hosted/provider or cost proof.
  - [x] **P2.4 — Direct/manual egress admission (merged and CI verified):** Production `handleFetch` now denies identified direct/manual provider and queued-job activation routes unless both `HOSTED_EXTERNAL_DISPATCH_ENABLED` and `HOSTED_HTTP_DISPATCH_ENABLED` equal exactly `true`. These are not configured in committed Wrangler. Existing Hono authentication remains independently required. The explicit route inventory includes manual digest generate/regenerate (potential direct AI), digest deliver/retry (Telegram queue), processing/sync retry, Notion recreate, URL source retry/reprocess, and local-worker job lease. Zero DB/provider/fetch entry is asserted in negative tests.
    - Scheduled-only provider dispatch remains protected by P2.1/P2.2. Direct capture, source URL edit, and item edit create durable work but do not themselves execute external fetch/AI/Notion/Telegram; blocked scheduler/worker lease prevents immediate hosted dispatch.
    - **Not a global network firewall:** HTTP route inventory must be extended if new direct dispatch endpoints are added. This does not prohibit an independently deployed Worker, a code path bypassing the entry, or direct invocations of provider classes by tests/local worker processes. Zero-cost hosting and R2/backup gates are separate and still unresolved.
    - Never turn these opt-in flags on under the prior read-only Cloudflare authorization.
  - [ ] **P2.5 — Final deployment posture:** Ensure future deployment config has **no Cron triggers, real provider credentials or paid/outbound routes** before independent account-level strict-$0 checks. Do not turn either flag on under BG-31 inspection authorization.
    - [x] **P2.5a — $0 source-only Cron disarm (merged):** [PR #128](https://github.com/anmolsansi/Recollect-Flow/pull/128) removed the three default `wrangler.toml` Cron expressions and added offline assertions that no Cron or hosted-egress opt-in is enabled. Its exact-head [CI #40292490848](https://github.com/anmolsansi/Recollect-Flow/actions/runs/40292490848) passed on `049de09c09c235a58aafc93d59927b7553192b0b`, and it merged into `main` as `2360407efce5879b224dce92ec785c269571fb68` on October 29. This verifies source behavior, not deployed configuration, billing or post-merge CI.
    - [ ] **P2.5b — Actual release/config proof:** Reinspect the exact future candidate and confirmed hosted account for scheduled triggers, secret material, provider/HTTP routes and enforceable additional-$0 controls. Source-only guards cannot establish paid-provider contracts, network egress policy, quota hard stops or real backup readiness. No production Worker exists in the observed target account.
- [ ] **P3 (Owner, separately authorized):** Only after P1/P2 and a new operation-specific approval, assess new isolated production Worker/D1/R2 resources. Do not create resources or change billing by following this document.
- [ ] **P4 (Assistant, after authorized creation):** Record actual created resource identities; update the source D1 UUID only from the verified new database ID. Do not fabricate a live migration ledger or assume an empty ledger without authenticated evidence.
- [ ] **P5 (Owner and Assistant):** Verify actual migration order, independent original-byte and purge-receipt backups, isolated recovery, prior deployable artifacts, cost controls, BG-29.078, OPE-247 and explicit exact-release approval. BG-32/V1 stays NO-GO.

**Disposition:** BG-31 remains 78/100 with 22 open actions. Actual deployed production version, D1 applied ledger and Web origin are unknown because the intended resources were **not listed** in the confirmed account. Removing default source Cron scheduling does not provision or authorize anything. Source-only work may proceed; provisioning, SQL, R2 operations, Cron activation, external providers, billing changes and deployment remain unauthorized.

**References:** [Wrangler source](../../wrangler.toml), [BG-29 zero-cost exception](../verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## 1. Choose operators and emergency contact

- [x] Name intended release operator, repository owner (@anmolsansi), self-designated October 23, 2026.
- [x] Name intended restore operator, repository owner (@anmolsansi), self-designated October 23, 2026.
- [x] Choose the emergency communication method: **email only**, confirmed by the owner October 23, 2026. No phone, SMS, or Telegram fallback.
- [x] Owner supplied the intended recipient email in a private conversation on October 23, 2026. Its literal address is **deliberately excluded** from GitHub, Linear, commits, and CI.
- [ ] Independently verify the recipient's inbox and authorized sender/delivery access, and place the intended destination in an owner-controlled private operational record accessible to the release/restore operator. Chat history alone is not a guaranteed operational vault.
- [x] Define owner-approved email incident procedure (October 23, 2026): send one email **only with separate send authorization**; require an explicit owner reply acknowledging the incident; if there is no reply after **15 minutes**, send **exactly one follow-up**, also subject to send authorization; keep the release halted until the owner replies and gives the required operation-specific decision. No phone, SMS, or Telegram fallback.
- [ ] Independently verify sender/recipient delivery and operability of the acknowledgment flow without incurring costs, and only with separate permission for any test email. No delivery test has been run.
- Owner nomination, email-only channel, private intended destination and **notification procedure** are documented, but delivery is **not verified**. Operational authority, independent backup read access and recovery rehearsal remain unverified. Lack of email delivery or reply never grants permission to resume. This record does not authorize sending any message.
- Checklist: `BG-31.079`, `BG-31.081`.

## 2. Inspect live deployment metadata

- [x] Authorize metadata-only, read-only Cloudflare inventory (owner approval, October 24, 2026; strictly $0).
- [ ] Record the Worker version and verified account identity.
- [ ] Confirm the D1 UUID and R2 bucket identity.
- [ ] Confirm the actual HTTPS Web origin.
- Owner and operator action. Do not list or read R2 objects.
- Checklist: `BG-31.021`, `BG-31.024`, `BG-31.025`, `BG-31.026`.

## 3. Compare the actual D1 migration ledger

- [ ] Obtain the ordered applied migration names, read-only.
- [ ] Verify their source account, D1 UUID, and observation time.
- [ ] Run the offline BG-31 migration comparator.
- [ ] Analyze only genuinely pending forward SQL migrations.
- [ ] Review affected tables, indexes, backfills, and compatibility.
- Owner supplies authorized metadata. Engineer reviews offline.
- Checklist: `BG-31.022`, `BG-31.023`, `BG-31.031`, `BG-31.032`.
- Checklist: `BG-31.033`, `BG-31.034`, `BG-31.035`, `BG-31.036`.

## 4. Verify configured destinations and capability

- [ ] Confirm the intended Notion destination safely.
- [ ] Confirm the intended private Telegram destination safely.
- [ ] Confirm secret presence by name, never by value.
- [ ] Verify the actual Web origin.
- [ ] Verify approved AI providers and enabled capabilities.
- Owner grants any metadata-only inspection separately.
- No test messages or provider invocations are authorized.
- Checklist: `BG-31.027`, `BG-31.028`, `BG-31.042`, `BG-31.044`.
- Checklist: `BG-31.045`, `BG-31.046`.

## 5. Establish safe rollback compatibility

- [ ] Identify a preserved previous Worker and Web artifact.
- [ ] Verify its exact bundle identity, configuration, and hash.
- [ ] Check compatibility against the actual live D1 migration delta.
- [ ] If incompatible, document a verified forward-repair path.
- A historic Git commit is not a deployable rollback artifact.
- Checklist: `BG-31.076`, `BG-31.077`.

## 6. Finalize the release approval packet

- [ ] Record exactly which production mutations would be made.
- [ ] Identify the final reviewed Worker and Web release artifacts.
- [ ] Prove independently preserved D1, attachment, and purge backups.
- [ ] Identify the tested restore procedure and approved operators.
- [ ] Confirm the strict zero-additional-cost condition.
- [ ] Obtain dated, exact-build owner authorization when appropriate.
- Checklist: `BG-31.082`, `BG-31.089`.

## Independent blockers

- [ ] BG-29.078 hosted hourly multistage proof remains deferred.
- [ ] OPE-247 hardening acceptance remains incomplete.
- [ ] Independent original-byte and purge-receipt recovery is unverified.
- [ ] BG-32 production deployment is not authorized.
- [ ] V1 launch remains NO-GO.

## Completed source preparation

- [x] Human and JSON release manifests document the missing facts.
- [x] Migration, rollback, recovery, and smoke plans exist.
- [x] Offline manifest, ledger, and readiness tests exist.
- [x] Source-only CI #39882760894 passed on October 23.

## Evidence rules

Record each task ID, observer, UTC time, safe source identity, result,
approved scope, and evidence reference in a private record.

Do not mark live checks complete based only on documents or simulations.
Owner approval must reference exact build hashes and target identities.

BG-31 remains incomplete until its required evidence is verified.
Preparation does not authorize BG-32 or change the strict $0 decision.
