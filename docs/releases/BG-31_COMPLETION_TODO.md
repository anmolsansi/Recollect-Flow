# BG-31 completion plan

**Updated:** October 23, 2026.

**Status:** 77 of 100 source/evidence actions verified. Production NO-GO.

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

## 1. Choose operators and emergency contact

- [x] Name intended release operator, repository owner (@anmolsansi), self-designated October 23, 2026.
- [x] Name intended restore operator, repository owner (@anmolsansi), self-designated October 23, 2026.
- [x] Choose the emergency communication method: **email only**, confirmed by the owner October 23, 2026. No phone, SMS, or Telegram fallback.
- [x] Owner supplied the intended recipient email in a private conversation on October 23, 2026. Its literal address is **deliberately excluded** from GitHub, Linear, commits, and CI.
- [ ] Independently verify the recipient's inbox and authorized sender/delivery access, and place the intended destination in an owner-controlled private operational record accessible to the release/restore operator. Chat history alone is not a guaranteed operational vault.
- [ ] Confirm reply acknowledgment, a retry/escalation interval, and the risk of no independent backup communication channel.
- Owner nomination, email-only channel and intended destination have been supplied, **not delivery verified**. Operational authority, independent backup read access, recovery rehearsal and acknowledgment rules remain unverified. This record does not authorize sending any message.
- Checklist: `BG-31.079`, `BG-31.081`.

## 2. Inspect live deployment metadata

- [ ] Authorize metadata-only, read-only Cloudflare inventory.
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
