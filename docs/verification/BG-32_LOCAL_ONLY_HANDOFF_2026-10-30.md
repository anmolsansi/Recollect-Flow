# BG-32 local preparation handoff — October 30, 2026

**Owner decision:** Continue locally under strict additional-$0; defer the
hosted BG-31 requirements and move to permitted downstream local preparation.
The owner selected path 1 explicitly in this chat. No hosted design change,
resource operation, deployment, provider send or billing change is authorized.

**Status:** BG-31 remains 78/100, deferred for hosted completion. BG-32 local
preparation is permitted; production execution and task completion remain
blocked. This handoff is not the immutable authorized release packet required
by BG-32's completion contract.

## Verified baseline and reusable evidence

PR #134 merged at `d383edf7b8c2d22531c6fae344c7f5c2b1118be3`.
Its [PR CI passed](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41052313422).
This records PR CI, not a claim about merged-main CI on this exact SHA.
The accepted fresh-install criteria and current cost gate remain authoritative.

- [Local app acceptance](BG-31_LOCAL_ACCEPTANCE_2026-10-30.md): synthetic capture,
  search, edits, protected original downloads, exports and bundle verification.
- [Initial isolated restore](BG-31_LOCAL_RESTORE_2026-10-30.md): restored records,
  original bytes, integrity/search checks and rejection guards.
- Downloaded encrypted backup rehearsal: owner reported upload/download through
  Google Drive. The supplied Downloads copy matched the creation-time SHA-256,
  unlocked successfully, and passed the existing bundle verifier. It restored
  three records and one 51-byte PDF into a new isolated local target. Foreign
  keys, FTS phrase, project/date/privacy/source/text/lifecycle fields, reset
  leases, original checksum and anonymous-download rejection passed. Missing
  original and repeated nonempty-target apply were correctly rejected.
- Current local source purge ledger was separately checked and remained empty.
  This does not prove a nonempty newest-receipt anti-resurrection scenario.
- Source app retained its three original IDs; the temporary restore server was
  stopped and image ejected. Source data and all backup copies were preserved.

Downloaded encrypted-image SHA-256:
`3acf0d9507f0b5567db20883e7a6ef69c0682379621c2f0becd68ff30cbb2bed`.
Private evidence is ignored under
`.wrangler/bg31-upload/2026-10-30T16-50-23-857Z/download-verification/RESULT.md`
and `.wrangler/bg31-downloaded-restore-20261030/evidence.json`.
Do not commit exported records, object keys, original bytes, credentials or the
separate encryption password. Drive metadata and off-Mac password recovery were
not independently inspected. This is observed recovery from the user-supplied
download, not a hosted disaster-recovery or BG-37 completion claim.

## Local tooling check performed for this handoff

At source baseline `d383edf`, ran:

```bash
node --test scripts/web-release.test.mjs scripts/verify-production-release.test.mjs
```

**Result:** all 12 existing tests passed. Log: `/tmp/bg32-local-tooling-tests.log`.
The test harness needed local loopback-listen permission; the initial sandbox
attempt returned EPERM, and the same command passed with that permission.
No new code or dependency was needed. These tests check packaging/smoke tooling;
they do not package a new production candidate or prove a deployed origin.

## Operating instructions now

1. Continue using the existing local app and its persistent state. If stopped,
   run `.wrangler/bg31-local/start.sh` from the repository and open
   `http://127.0.0.1:8787/`. Do not delete its state directory.
2. Keep Cron, external/HTTP dispatch, hosted backup auto-creation and paid AI
   disabled. Never deploy either local simulator configuration or its secrets.
3. Preserve the verified encrypted backup. After meaningful data changes,
   create a fresh verified dated backup; verify its downloaded copy before
   retiring a previous known-good set. Keep the password separately recoverable.
4. For a concrete local change, use the existing tests and local emulator.
   Packaging/smoke tooling is already present; create no new framework or
   duplicate rehearsal solely to advance a checklist count.
5. Keep all BG-32 canonical action boxes unchanged in this handoff. Its actual
   targets, authorized artifact and production execution are still absent.

## Conditions to resume hosted work

Resolve the cost gate with verified acceptable controls or an explicit owner
policy change, establish authorized fresh target identities and observed
migration baseline, complete required independent recovery/operator evidence,
freeze exact compatible artifacts and green candidate CI, and record exact-build
release authorization. BG-29.078, OPE-247 and other launch prerequisites remain
independent. Then use the canonical BG-32 chapter to execute and verify the
release, recording durable steps and stopping on any mismatch.

**Next permitted work:** local feature or bug work requested by the owner, using
the existing acceptance and recovery evidence. BG-32 has no unperformed local
production step that can honestly replace its blocked hosted completion gate.
