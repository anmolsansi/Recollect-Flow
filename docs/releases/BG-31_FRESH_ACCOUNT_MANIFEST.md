# BG-31 — Fresh-account release manifest

**Revision:** `BG31-FRESH-2026-10-30.1`.
**Decision:** **NO-GO for Cloudflare execution. Local acceptance completed.**
**Owner direction:** Start fresh because the old Cloudflare account cannot be
recovered; run locally now and deploy on Cloudflare later. Strict additional
$0 remains required. No hosted provisioning, SQL, deployment, object operation,
provider send or billing change is authorized by this packet.

This is the current planning path for [GitHub #119](https://github.com/anmolsansi/Recollect-Flow/issues/119).
It supersedes recovery of the old account as the next prerequisite. The
[original manifest](BG-31_RELEASE_MANIFEST.md) and its JSON remain historical
source/NO-GO records; their old D1 UUID is not a fresh-account deployment target.

## 1. Source and local evidence

The application checkpoint is `e7f95afb7a9531b5ccf23c275f221c3cf317d48c`,
with [successful merged-main CI](https://github.com/anmolsansi/Recollect-Flow/actions/runs/41022109725)
and [observed local acceptance](../verification/BG-31_LOCAL_ACCEPTANCE_2026-10-30.md).
The local app, database, originals and export remain on this Mac.

**Deployable source SHA, exact-candidate CI, Worker bundle hash, Web release
ID/hash and deployed Worker version: NOT FROZEN / NOT VERIFIED.** The local
artifact hashes prove the local checkpoint, not a build configured for new
production bindings. Repackage only after actual new resource identities and
the deployed configuration are reviewed; preserve the resulting exact artifacts.

## 2. Proposed targets, not created resources

| Target     | Proposed value                                              | Actual evidence still required                                                                   |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Account    | `a9482fbfb91ace26dee097cbd41293f9`                          | Reconfirm current owner access and plan before future execution                                  |
| Worker     | `recollect-flow` in that account                            | Fresh deployment version and routing; no existing Worker was found there in the prior inspection |
| Web origin | `https://recollect-flow.openclawneutron.workers.dev`        | Verify only after the new Worker exists; this is not a live accepted origin                      |
| D1         | `recollect-flow-prod-v2`, binding `DB`                      | Newly created UUID and authenticated empty-schema/ledger observation                             |
| R2         | `recollect-flow-attachments-prod-v2`, binding `ATTACHMENTS` | Newly created bucket identity, private access and approved cost controls                         |
| Web assets | `apps/web/dist`, binding `ASSETS`                           | Matching frozen Web manifest and actual Worker artifact                                          |

Do not reuse BG-29 staging D1/Worker resources or the unrelated
`propertyos-media` bucket. Never copy the local simulator UUID or the old
`5fcba514-d0f7-45e7-a632-d4c59233af71` UUID into the fresh production binding.
The old `recollectflow.workers.dev` API remains outside the accessible account;
this plan cannot disable it, revoke its credentials, remove its content or
certify its retention/billing state. Do not repoint it or claim its data migrated.

## 3. Configuration and credential boundary

The future configuration change owns `wrangler.toml` and the canonical human/
JSON manifests and their focused consistency tests. Preserve existing binding
names and the single Worker-served Web/API origin. Update the account, D1
name/actual UUID and R2 bucket only from authenticated new-resource evidence.
Use `npm run release:package` after the reviewed canonical configuration is
correct, so its existing release tooling hashes the configuration actually used.
Never deploy `.wrangler/bg31-local/wrangler.toml` or upload its credentials.

Generate new `CAPTURE_TOKEN`, `ADMIN_TOKEN` and `LOCAL_WORKER_TOKEN` for the
new installation. Set `WEB_INBOX_BASE_URL` only to its verified new origin.
The existing source also requires `NOTION_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`
and `TELEGRAM_CHAT_ID`; conditional OpenRouter access uses
`OPENROUTER_API_KEY`. Reconcile required secret names with the approved enabled
capabilities before packaging. Do not install placeholder secrets to claim
provider readiness. Store values privately and record only presence/names.

Keep Cron absent and `HOSTED_SCHEDULED_WORK_ENABLED`,
`HOSTED_EXTERNAL_DISPATCH_ENABLED`, `HOSTED_HTTP_DISPATCH_ENABLED` and
`HOSTED_BACKUP_AUTOCREATE_ENABLED` disabled. Keep digest AI disabled.
Notion/Telegram destinations and AI provider approval remain unverified.
Before enabling any integration, account for the uncontrolled old installation
to prevent duplicate projections or deliveries. Approve provider tests separately.

## 4. Future mutation sequence — blocked, do not execute now

1. Resolve the financial gate. Confirm the exact account's subscription and
   enforceable additional-$0 controls. R2 free allowances and budget alerts
   are not a verified hard cap; application admission controls alone do not
   certify all account storage/operation charges. If strict $0 cannot be
   proved, keep hosted execution blocked. Do not silently change the policy.
2. Prepare a dated operation-specific approval naming this revision, target
   account, new-resource names and creation/configuration scope. It is separate
   from later exact-build deployment and provider-test approval.
3. Only when authorized, create the new D1 database and private R2 bucket in
   the named account. Preserve actual returned identities; do not modify old
   or staging resources. Recheck whether the proposed names are still available.
4. Inspect the new D1 schema and applied ledger read-only. An observed absence
   of a ledger is evidence only for that authenticated new database. The
   repository has 22 ordered SQL files through
   `0025_bg28_scheduled_backups.sql`; numbering gaps are intentional. Run the
   existing offline ledger/impact utilities on the observed record and review
   every pending file, affected object, data rewrite and interruption condition.
   An empty fixture is not proof of an empty remote database.
5. Review the canonical configuration changes, freeze the source and matched
   Worker/Web artifacts, and obtain passing CI for that candidate. Record
   actual command/config/toolchain identities and independent recovery evidence.
6. Obtain exact-build authorization, then hand the approved immutable packet
   to BG-32 for remote forward migrations and deployment. List the exact
   migration filenames and commands from the verified delta in that packet.
7. Verify the actual new deployment/version, HTTPS origin, homepage/deep links,
   session, anonymous denial, capture/replay, private original download,
   search and stored status. Production smoke mutations need their declared
   scope; provider delivery remains separately gated.

## 5. Data, recovery and first-release rollback

Default fresh-install behavior is a new empty database. No old data has been
imported or declared lost/deleted. Any later import of local or recovered data
requires a separately reviewed portable export, original bytes, newest purge
receipts, dry-run and clean-target verification under the
[recovery procedure](../RECOVERY_OPERATOR_PROCEDURE.md).

The local export now has verified JSON/CSV and a full-byte original copy, but
remains on the same Mac as the local source. Before any release that requires
recovery, verify encrypted owner-controlled storage outside the source failure
domain, complete originals and newest receipts, restore operator access and an
isolated rehearsal. Do not relabel the local copy as independent production proof.

There is no previous deployed artifact in the proposed fresh installation.
Resolve this explicitly as a first-release recovery decision before authorization;
do not pretend the inaccessible old Worker is a rollback artifact. Preserve
the pre-change state and exact new artifact. Stop on identity, migration,
authentication, privacy, data-loss, deep-link or recovery mismatches. Contain
only the new Worker's ingress using an approved account-specific procedure;
preserve D1/R2 data. Code rollback never reverses SQL. Use reviewed forward
repair or isolated restore when schema compatibility is unproven.

## 6. Completion and next decision

See the [fresh-install applicability proposal](BG-31_FRESH_INSTALL_APPLICABILITY.md)
and the [passing isolated local restore rehearsal](../verification/BG-31_LOCAL_RESTORE_2026-10-30.md).
The proposal requires an explicit owner decision before changing acceptance criteria.

BG-31 remains **78/100** and production **NO-GO**. The local pass does not close
the 22 canonical live actions, BG-29.078, OPE-247 or V1 approval. Fresh-install
checklist applicability and first-release recovery must be reconciled explicitly
with real evidence; do not check old-version/old-ledger requirements by invention.

The next hosted decision is an acceptable storage/cost arrangement under the
owner's strict $0 rule. Until that is resolved and the operation-specific
packet is approved, continue using the local app and preserve its private data.
