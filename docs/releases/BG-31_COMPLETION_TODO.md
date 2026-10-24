# BG-31 completion plan

**Updated:** October 24, 2026.

**Status:** 78 of 100 canonical actions checked. Production NO-GO; 22 actions remain open.

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

## Account decision: target confirmed, resources not listed

**Owner confirmation:** October 24, 2026. The Cloudflare account
`a9482fbfb91ace26dee097cbd41293f9` is the **intended** RecollectFlow
production account. The owner authorized read-only, metadata-only inspection
within strict $0. This is **not** authorization to provision, deploy, change
routes, run SQL, touch R2 objects, invoke providers or spend.

The owner-opened overview pages in this account report:

- Workers & Pages: 1/1 listed, `recollect-flow-bg29-d1-cron-probe`; no
  `recollect-flow` production Worker listed.
- D1: 1/1 listed, `recollect-flow-bg29-staging`, UUID
  `b5cbeccc-92fb-4bbc-9597-f0174b84e57d`; no
  `recollect-flow-prod` database listed.
- R2: only `propertyos-media` listed; no
  `recollect-flow-attachments-prod` bucket listed. **No R2 objects were
  opened.**

The currently committed `wrangler.toml` names `recollect-flow`, production
D1 UUID `5fcba514-d0f7-45e7-a632-d4c59233af71`, and
`recollect-flow-attachments-prod`. These are **intended source bindings**,
not observed resources in the confirmed account. Never attach production
code to the BG-29 staging database or the PropertyOS bucket. Do not assume
the configured D1 UUID is a valid new database UUID.

### Gated zero-additional-cost provisioning preparation

- [x] **P0 — Account reconciliation (Assistant):** Confirm intended account,
  compare the three account listings against committed names and UUIDs,
  and preserve the missing-resource outcome. Only safe account metadata
  was viewed.
- [ ] **P1 — Financial hard stop (Owner + Assistant):** Require a verified
  enforceable **zero-additional-charge boundary** for **every** intended
  provider and resource. Workers Free and D1 Free have limit failures;
  R2 Standard has free allowances but metered overage. An estimate,
  free allocation, bill showing $0, budget alert or manual monitoring
  does **not** satisfy a hard $0 guarantee. Existing BG-29.078 financial
  decision prohibits hosted R2 provisioning. If no proven hard stop,
  keep hosting/attachment activation and release **NO-GO**.
- [ ] **P2 — Offline release guardrails (Assistant):** Inspect source and
  prepare a separate later patch/CI proof that prevents real external
  OpenRouter, Notion, Telegram and other unexpected provider calls,
  prevents scheduled/background execution, disables any unapproved
  paid or optional integration path, and makes invalid bindings fail
  closed. Do not weaken required capture, privacy or recovery semantics.
  Do **not** deploy today's `wrangler.toml` unchanged: it declares three
  Cron triggers and a default `openrouter` AI provider.
- [ ] **P3 — Resource creation proposal (Owner later):** Only after P1/P2
  and a separately scoped operation-specific approval, consider a new,
  isolated `recollect-flow-prod` D1 database and
  `recollect-flow-attachments-prod` R2 bucket, without touching the
  staging DB or `propertyos-media`. Check free plan/account eligibility
  before any account or billing action. No resource creation is
  authorized by this document.
- [ ] **P4 — Identity reconciliation (Assistant after approval):** Record
  each genuinely created resource identity. A new D1 database receives
  its own actual UUID; separately review replacing the stale source
  `database_id`, binding/target checks, and a frozen revision. Never
  invent or reuse the current configured UUID. A freshly created
  empty D1 has **no prior production migration history**; do not
  fabricate an applied ledger or claim pending migrations until an
  authorized observation proves the exact state.
- [ ] **P5 — Migration, recovery and release gate (Owner + Assistant):**
  Independently verify original-byte/purge-receipt recovery, backup
  location and restore rehearsal, real migrations, production artifacts,
  provider-free/cost controls, BG-29.078 and OPE-247, and the exact
  operation-specific authorization. Production D1 writes, hosted R2,
  Worker publish, enabled Cron, real AI/providers, messages and BG-32
  require separate approvals. **Do not convert this plan into GO.**

**Current disposition:** account selected; the expected production
resources are not listed in that account; **no live production version,
production D1 ledger or Web origin exists in the reviewed evidence**.
Keep the canonical BG-31.021–.028 and migration-dependent actions open.
The zero-cost BG-29 downstream exception supports **source-only work**,
not hosted R2 provisioning or deployment.

### Authoritative references

- Source: [Wrangler bindings](../../wrangler.toml) and
  [BG-29 $0 exception](../verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md).
- [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/),
  [D1 Free pricing](https://developers.cloudflare.com/d1/platform/pricing/),
  [R2 pricing](https://developers.cloudflare.com/r2/pricing/), and
  [R2 prerequisite](https://developers.cloudflare.com/r2/get-started/).
- [GitHub BG-31 issue](https://github.com/anmolsansi/Recollect-Flow/issues/119)
  contains the private-account viewer provenance and authorization
  disposition, without copying credentials or sensitive objects.

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
