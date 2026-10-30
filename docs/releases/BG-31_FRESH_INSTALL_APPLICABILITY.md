# BG-31 fresh-install applicability addendum — accepted criteria

**Revision:** `BG31-APPLICABILITY-2026-10-30.1`.
**Status:** Owner accepted `BG31-APPLICABILITY-2026-10-30.1` on October 30, 2026, in the continuation of this chat: “I accept move to next step and how to complete that next step”. This accepts the immediately preceding fresh-install criteria request; it does not authorize hosted execution or change the strict-$0 policy.
**Current gate:** 78/100 canonical actions; production NO-GO; BG-32 blocked.

The owner cannot recover the old Cloudflare account and chose local execution
now, with a fresh Cloudflare installation later. The
[fresh-account manifest](BG-31_FRESH_ACCOUNT_MANIFEST.md) captures that direction.
PR #132 is merged with passing PR CI. The
[isolated local restore](../verification/BG-31_LOCAL_RESTORE_2026-10-30.md)
now proves the local bundle can recover its synthetic records and original.
Neither fact closes a live action.

The accepted criteria govern the fresh-install path. Evidence requirements remain unsatisfied until observed; all 22 action boxes remain open. The dispositions below retain their original proposal wording for traceability, with acceptance established by this dated record.

## Disposition of all 22 unchecked actions

Every ID below remains unchecked. The proposed replacement evidence applies
only to an explicitly approved new installation, never to the inaccessible old
installation. An approved addendum must be referenced in the canonical checklist
and human/JSON manifests before a changed criterion is used to close an action.

| IDs                                        | Required fresh-install evidence / proposed treatment                                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BG-31.021                                  | Record authenticated account inventory proving the proposed Worker does not exist before first release. Proposed substitute for reading a previous live version; absence is not a fabricated version ID. Actual new version observation belongs to BG-32 after deployment.       |
| BG-31.022                                  | Inspect the actual new D1 schema and ledger read-only after separately authorized creation. Record UUID/time and observed ledger absence or contents. Never substitute an empty fixture.                                                                                         |
| BG-31.023                                  | Compare that observed baseline against the frozen candidate with the existing comparator.                                                                                                                                                                                        |
| BG-31.024                                  | Record the actual new production D1 name/UUID/account.                                                                                                                                                                                                                           |
| BG-31.025                                  | Record the actual private new production R2 bucket/account and approved cost boundary.                                                                                                                                                                                           |
| BG-31.026                                  | Before deployment, approve the precise intended origin and routing target; after deployment BG-32 verifies the actual HTTPS origin. This split is proposed, not currently accepted as an actual-origin pass.                                                                     |
| BG-31.027                                  | Safely verify a real Notion destination, or explicitly approve a disabled capability and establish source/config evidence that no destination or secret is required. No dummy destination counts.                                                                                |
| BG-31.028                                  | Same rule for Telegram; no placeholder chat ID counts.                                                                                                                                                                                                                           |
| BG-31.031, BG-31.032                       | List and order the actual pending migration delta from the observed fresh D1 baseline. All 22 files are pending only if that observation establishes it.                                                                                                                         |
| BG-31.033, BG-31.034, BG-31.035, BG-31.036 | Review affected tables, indexes, backfills and compatibility using that exact delta; existing source impact analysis is preparation, not target observation.                                                                                                                     |
| BG-31.042                                  | Verify required secret names exist in the intended deployment environment without exposing values; first reconcile disabled integrations with actual startup/runtime requirements. Local secrets are insufficient.                                                               |
| BG-31.044                                  | Verify canonical configuration uses the approved intended origin and package hashes that config. Proposed pre-deploy configuration check; BG-32 proves live behavior.                                                                                                            |
| BG-31.045, BG-31.046                       | Approve provider configuration and demonstrate enabled capabilities. If providers stay disabled, explicitly record that scope and prove dispatch is disabled; no sends or paid AI are implied.                                                                                   |
| BG-31.076                                  | Proposed first-release substitute: authenticated evidence of no prior artifact in the new target, preserved exact first-release artifacts, and approved containment/forward-repair/isolated-restore plan. Never claim the inaccessible old Worker is a usable rollback artifact. |
| BG-31.077                                  | Document the actual migration compatibility boundary and recovery decision. An empty new target has no previous app version to roll back to. Stop ingress, preserve D1/R2, then use reviewed forward repair or isolated restore if needed; code rollback does not undo SQL.      |
| BG-31.082                                  | State exact authorized creation/configuration/migration/deployment operations and target identities. Separate provisioning approval from exact-build deployment approval.                                                                                                        |
| BG-31.089                                  | Record a dated owner authorization referencing the final packet revision, actual targets and exact Worker/Web hashes. Approval of this addendum alone cannot satisfy it.                                                                                                         |

## Required closure packet

1. **Completed:** Owner accepted this revision explicitly in the October 30 chat continuation. This is distinct from the earlier document merge.
2. Resolve strict additional-$0 storage/operations controls. Included allowances
   and budget alerts are not a verified hard cap. If no acceptable arrangement
   exists, hosted execution remains blocked; a different storage architecture
   requires its own scoped proposal and implementation.
3. Obtain separately scoped authorization before any hosted provisioning. Record
   actual target identities and schema/ledger observations, then review the
   exact pending migrations. Do not reuse staging or unrelated resources.
4. Reconcile disabled integrations, credentials and canonical config, then freeze
   matched Worker/Web artifacts and passing exact-candidate CI. Preserve verified
   independent encrypted recovery copies and operator access as required by the
   release contract. Local same-machine evidence alone is insufficient.
5. Complete the first-release recovery/containment decision and list exact
   mutations. Present the resulting immutable packet for release authorization.
6. Close BG-31 only against accepted criteria with evidence for every action.
   BG-32 then performs separately authorized deployment and live acceptance.
   BG-29.078, OPE-247 and V1 approval remain independent gates.

## What can proceed now

Local acceptance, export validation and the isolated synthetic restore are
complete. Retain their ignored state/evidence. The applicability decision is accepted; the next hosted prerequisite is the
[cost gate](BG-31_COST_GATE_2026-10-30.md).
This document authorizes no provisioning, billing, remote SQL, deployment,
provider calls, messages, deletion or traffic change.
