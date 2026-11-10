# Remaining work — packet definitions

Read [execution contract](REMAINING_WORK.md) first. These are 52 outcome packets, not equal effort percentages. Source implementation for conditional future work requires its specified contract prerequisite; verification packets do not authorize runtime edits. R50–R52 belong before the V1 trial and release despite their appended identifiers.

## R01 — Reconcile old open work against actual evidence

**Parent coverage:** BG-01/02/03/11/15/21/22; OPE-320/321/340/341.

**Readiness / dependencies:** READY.

**Goal and user outcome:** Reconcile old open work against actual evidence. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_MICROTASK_CHECKLIST.md`, `docs/verification/BG-30_EVIDENCE.md`, `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`.

**Output / allowed evidence file:** `docs/verification/R01_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare every mapped unchecked criterion with dated source/CI/release evidence. Preserve evidence class and SHA. Move any genuine missing behavior to R02/R10/R13/R14/R15/R16; do not rerun historical setup merely to check a box. Reconcile GitHub #23/#83/#85 and Linear without claiming hosted acceptance from source CI.

**Acceptance, validation and failure assertions:** Every old action has evidence or an explicit remaining packet; completed source is not rebuilt; stale tracker prose is superseded without deleting history.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R02 — Verify the deployed identity and current read-only boundary

**Parent coverage:** BG-21/32; OPE-340/346.

**Readiness / dependencies:** R01.

**Goal and user outcome:** Verify the deployed identity and current read-only boundary. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`, `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`, `package.json`.

**Output / allowed evidence file:** `docs/verification/R02_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare immutable source, Worker/Web IDs, account/D1/R2 identities with authorized authenticated inventory. Run existing bg32:readonly only after reading its command requirements. Separate public headers/routes from authenticated configuration and owner evidence. Reuse valid prior observations where freshness is not required.

**Acceptance, validation and failure assertions:** Correct origin/deep links/API denial/cache behavior and target identity have explicit evidence; a redirect or identity mismatch stops checks; no deployment or synthetic mutation occurs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R03 — Prepare one independent recovery operation packet

**Parent coverage:** BG-32/37; OPE-228.

**Readiness / dependencies:** READY for preparation; live action BLOCKED_INPUT.

**Goal and user outcome:** Prepare one independent recovery operation packet. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_BACKUP_AUTHORIZATION_PACKET_2026-11-09.md`, `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`.

**Output / allowed evidence file:** `docs/verification/R03_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse the existing November 9 Scope B/C/D packet, preserving its separate approvals and ceilings: one existing archive download, one export, ten listing pages, twenty R2 HEAD/GET operations, ten MiB maximum; stop rather than omit objects when exceeded. Do not ask the owner to redesign these settled preparation details. Specify exact source IDs, independent encrypted destination, key custody, full objects/receipt listing, permission/access checks, bounded operations, cost evidence, clean restore target and rollback/stop instructions. Reuse accepted destination/access decisions if available. Present the complete operation packet once for the remaining owner inputs and execution approval.

**Acceptance, validation and failure assertions:** Packet contains no placeholder target or ambiguous storage independence; no paid operation inferred from free allowances; approval identifies operations and scope, not just the ticket name.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R04 — Acquire and verify an independent recovery set

**Parent coverage:** BG-32.021–.030; OPE-228.

**Readiness / dependencies:** R03 approved execution.

**Goal and user outcome:** Acquire and verify an independent recovery set. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`.

**Output / allowed evidence file:** `docs/verification/R04_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Acquire portable JSON, originals and newest independent purge receipts with complete pagination. Record schemaVersion/itemCount/size/hash and source/destination identity. Run existing recovery-bundle verifier on protected files. Read back encrypted destination and confirm recovery-key access. Keep previous good set until replacement passes.

**Acceptance, validation and failure assertions:** Every referenced original matches length/hash; receipt ledger completeness and independence proved; corrupt/missing bytes fail; no private bundle enters Git.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R05 — Prove isolated restore without touching production

**Parent coverage:** BG-32.075–.077; OPE-228.

**Readiness / dependencies:** R04; approved isolated target.

**Goal and user outcome:** Prove isolated restore without touching production. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/verification/BG-28_FINAL_CLOSEOUT.md`.

**Output / allowed evidence file:** `docs/verification/R05_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use explicit dry-run on a clean target, inspect exclusions and attachment readiness, then approved apply. Verify counts, foreign keys, originals, search and safe pending leases. Keep outbound dispatch off. Record first-install containment/forward-repair instead of inventing a previous compatible Worker.

**Acceptance, validation and failure assertions:** Restored system is independently usable; populated target/corruption is rejected; no production traffic switch; this proof does not claim an incident rollback occurred.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R06 — Resolve historical migration evidence and current index proof

**Parent coverage:** BG-32.035/.037/.039.

**Readiness / dependencies:** R01; authorized read-only D1 access.

**Goal and user outcome:** Resolve historical migration evidence and current index proof. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`, `docs/releases/BG-31_CORE_RELEASE_2026-11-03.md`.

**Output / allowed evidence file:** `docs/verification/R06_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Locate original migration process result; if absent retain NOT_EXECUTED evidence gap, do not infer exit zero from ledger. Record failure inspection as NOT_TRIGGERED only with no-failure evidence. Compare required indexes from the actual approved migrations against current read-only schema inventory.

**Acceptance, validation and failure assertions:** Index names/definitions match; historical exit evidence either located or remains an explicit release criterion decision; no migration replay.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R07 — Close only the BG-32 release-execution boundary

**Parent coverage:** BG-32; OPE-346.

**Readiness / dependencies:** R02/R05/R06; unresolved required criterion decisions settled.

**Goal and user outcome:** Close only the BG-32 release-execution boundary. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-32_RELEASE_GATE_2026-11-06.md`.

**Output / allowed evidence file:** `docs/verification/R07_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Consolidate current results above historical chronology. Disposition the 20 previously open actions individually. Carry independent BG-29/OPE-247/device gates forward. Prepare BG-33 handoff with exact source/runtime identities and authorized operation scope.

**Acceptance, validation and failure assertions:** GitHub #141 and OPE-346 have one consistent current status; BG-32 closes only on its criteria; no V1 GO inferred.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R08 — Make isolated hourly proof ready for one approval

**Parent coverage:** BG-29.078; OPE-344.

**Readiness / dependencies:** READY preparation; hosted execution BLOCKED_INPUT.

**Goal and user outcome:** Make isolated hourly proof ready for one approval. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-29_STAGING_ONLY_PLAN.md`, `docs/verification/BG-29_078_ZERO_COST_DOWNSTREAM_EXCEPTION.md`.

**Output / allowed evidence file:** `docs/verification/R08_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Refresh actual account/limits and staging identities; replace historical production guards with both old and current production exclusions. Specify mock integrations, full URL/file multi-stage fixture, separate D1/R2, actual Cron schedule, cleanup and zero-cost feasibility. Preserve existing checker contract.

**Acceptance, validation and failure assertions:** Full test is feasible under accepted cost boundary or explicitly blocked; D1-only subset is not full acceptance; no provider sends or production resources reused.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R09 — Observe actual hosted multi-stage hourly drain

**Parent coverage:** BG-29.078; OPE-344.

**Readiness / dependencies:** R08 approved; exact staging candidate ready.

**Goal and user outcome:** Observe actual hosted multi-stage hourly drain. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/verification/BG-29_STAGING_ONLY_PLAN.md`.

**Output / allowed evidence file:** `docs/verification/R09_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Execute bounded staging packet, capture original scheduled event logs, sweep timestamps, queue transitions/oldest age, preserved originals and account usage. Apply existing hourly evidence checker including at least 55 minutes actual elapsed time. Shut down only owned scheduled resources under approved cleanup.

**Acceptance, validation and failure assertions:** Full stage/attachment path drains within existing contract, originals remain, provenance authenticates ledger and actual cost is established; accelerated logical hours never pass this gate.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R10 — Close deployed security and credential evidence

**Parent coverage:** OPE-247; BG-15/23/24/25.

**Readiness / dependencies:** READY preparation; execution needs isolated approved target.

**Goal and user outcome:** Close deployed security and credential evidence. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TOKEN_ROTATION.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/verification/BG-23_BG-24_ACCEPTANCE.md`, `docs/verification/BG-25_SECURITY_HARDENING.md`.

**Output / allowed evidence file:** `docs/verification/R10_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Map existing auth/session/scope/Origin/rate-limit/log/SSRF/upload/privacy tests to release evidence. Prepare synthetic capture/admin/worker overlap, expiry and compromise-revocation scenarios. Test using dedicated credentials/isolated environment; never revoke owner access for convenience.

**Acceptance, validation and failure assertions:** Correct scope rejects wrong actor; stale credentials fail per contract; Origin/session protections and redaction verified; no sensitive output; source versus hosted proof explicitly separated.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R11 — Verify operations visibility and incident diagnosis

**Parent coverage:** OPE-247; BG-26/27.

**Readiness / dependencies:** READY preparation; deployed observations after R02.

**Goal and user outcome:** Verify operations visibility and incident diagnosis. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/OPERATIONAL_CONTROLS.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/verification/BG-26_OPERATIONS_VISIBILITY.md`.

**Output / allowed evidence file:** `docs/verification/R11_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Inspect protected operations views against authoritative jobs/usage/backup records. Exercise synthetic failed/retry_wait/stale/unknown-delivery cases using isolated fixtures. Confirm unavailable account metrics say not measured. Walk incident runbooks with request/job IDs.

**Acceptance, validation and failure assertions:** Counts/states are truthful; retry never bypasses eligibility; unknown delivery cannot be blindly resent; each incident yields a safe next action and no secret/content logs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R12 — Verify deletion and privacy freshness across surfaces

**Parent coverage:** OPE-247; OPE-228.

**Readiness / dependencies:** READY preparation; isolated approved fixtures.

**Goal and user outcome:** Verify deletion and privacy freshness across surfaces. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R12_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Trace synthetic edit, soft-delete, privacy restriction, grace restore and confirmed purge through canonical/detail/FTS/attachments/projection/digests. Test partial external deletion and stale worker result. Preserve raw originals until the authorized purge state permits deletion.

**Acceptance, validation and failure assertions:** Deleted/restricted content does not leak through stale derived surfaces; partial purge remains visible and resumable; no premature canonical deletion; failed checks create bounded repair packets.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R13 — Prove browser capture and recovery on the deployed core

**Parent coverage:** BG-22/33; OPE-248.

**Readiness / dependencies:** R07; approved synthetic writes.

**Goal and user outcome:** Prove browser capture and recovery on the deployed core. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/API.md`, `docs/verification/BG-18_BROWSER_UPLOAD.md`.

**Output / allowed evidence file:** `docs/verification/R13_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Exercise URL/text/note/PDF/image, replay with same key, new share with new reason, upload session expiry and same-operation recovery. Reload detail, inspect raw retrieval and private originals. Verify anonymous denial and no-store response behavior.

**Acceptance, validation and failure assertions:** One canonical result per same-key retry; intentional history retained; file hashes match; failed network/auth preserves draft and truthful status; desktop proof is not iPhone acceptance.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R14 — Prove source acquisition and lexical recall

**Parent coverage:** BG-22/33; OPE-225/223.

**Readiness / dependencies:** R13; approved public sources.

**Goal and user outcome:** Prove source acquisition and lexical recall. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/URL_ACQUISITION_CONTRACT.md`, `docs/TESTING_AND_ACCEPTANCE.md`, `docs/OPE-225_COMPLETION_TASKS.md`.

**Output / allowed evidence file:** `docs/verification/R14_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use distinctive internal website/PDF phrases, exact/combined filters and deleted items; confirm source coverage and no-AI recall. Exercise unavailable URL and retry with current generation. Record time to visibility rather than inventing immediate-search SLO.

**Acceptance, validation and failure assertions:** Internal phrase found from acquired text; URL-only Instagram remains honest; stale retries cannot overwrite current generation; title-only match never substitutes for source indexing.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R15 — Prove approved AI modality, privacy and quota boundaries

**Parent coverage:** BG-22/33; OPE-222/223/227.

**Readiness / dependencies:** R07/R14; approved provider/model and bounded fixture packet.

**Goal and user outcome:** Prove approved AI modality, privacy and quota boundaries. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R15_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Prepare public text and screenshot fixtures separately, exact model provenance, expected facts and forbidden claims. Verify structured output/owner overrides and same deferred job recovery. Prove restricted routing using instrumented synthetic boundaries; never send sensitive content to test rejection. Verify hard quota admission and actual usage.

**Acceptance, validation and failure assertions:** Text and vision are independently evidenced; malformed output cannot corrupt fields; provider outage preserves raw capture; no silent paid/private fallback; quality and schema validity separately judged.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R16 — Prove Notion projection, outage and recreation

**Parent coverage:** BG-34; OPE-221.

**Readiness / dependencies:** R15 and approved synthetic Notion destination.

**Goal and user outcome:** Prove Notion projection, outage and recreation. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/NOTION_INFORMATION_ARCHITECTURE.md`, `docs/OPERATIONAL_CONTROLS.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R16_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Inspect schema/access then project one item and repeat sync. Use isolated 429/outage, save/search while unavailable, resume due attempt and inspect human-owned fields. Remove only approved synthetic page; explicitly recreate through supported admin action.

**Acceptance, validation and failure assertions:** One intended projection; canonical data/originals survive outage/page loss; user fields retained; purged item cannot recreate; live and mocked outage evidence separately labeled.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R17 — Audit actual client gaps before device testing

**Parent coverage:** OPE-219/246; BG-35/36.

**Readiness / dependencies:** READY.

**Goal and user outcome:** Audit actual client gaps before device testing. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R17_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare installed/exported templates with current form contract. Correct obsolete endpoint instructions from frozen current origin. Identify absent durable queue and Quick Save optional-prompt conflict. Produce exact Shortcut action-level implementation packets and file permission/storage design. Carry the November 10 owner decision forward: runnable local Ollama processing is mandatory in V1, owned by R50–R52.

**Acceptance, validation and failure assertions:** Online/queue implementation gaps have concrete contracts before device session; no claim that existing templates already support offline; local-worker API is not called a runnable client.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R18 — Complete the online Shortcut artifact

**Parent coverage:** OPE-219; BG-35.

**Readiness / dependencies:** R17 approved action-level contract.

**Goal and user outcome:** Complete the online Shortcut artifact. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R18_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Implement sanitized current-origin template, input classification and form submission. Quick Save avoids optional questions; separate reason/privacy/reminder modes preserve required fields. Interpret shortcut_action, not HTTP 200 alone. Keep token installation private on device.

**Acceptance, validation and failure assertions:** All supported online types have exact actions and expected envelope handling; failure never displays Saved; exported artifact contains no credentials; device success remains R20.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R19 — Implement durable queue and stable retry artifact

**Parent coverage:** OPE-219; BG-36.

**Readiness / dependencies:** R17/R18 action contract.

**Goal and user outcome:** Implement durable queue and stable retry artifact. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R19_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Persist queue record and original bytes before network with stable UUID/kind/reason/privacy. Retry oldest first with same identity; DELETE_QUEUE alone removes acknowledged record, KEEP_STOP stops, other actions retain. Define atomic persistence/interrupted-write handling and exact file-reselection behavior in action contract before build.

**Acceptance, validation and failure assertions:** Restart/offline cannot lose an acknowledged local queue payload; no token in queue; partial file persistence cannot claim retained success; unrelated entries survive cleanup.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R20 — Run one prepared online physical-iPhone session

**Parent coverage:** BG-35; OPE-219.

**Readiness / dependencies:** R18/R19; authorized target and installed device.

**Goal and user outcome:** Run one prepared online physical-iPhone session. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut-device-qa.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R20_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Agent prepares fixtures/expected outcomes and safe evidence sheet first. Owner privately installs token and grants permissions. Run Safari, Instagram, YouTube, LinkedIn, Notes/text, manual note, Photos and Files, supported modes, repeated tap/new reason. Agent correlates server IDs and hashes.

**Acceptance, validation and failure assertions:** Every required source/type row has actual device/iOS/client/build evidence and PASS or a repair ticket; no simulator/desktop substitution; no repeated setup questions within unchanged session.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R21 — Run prepared offline, restart and rotation session

**Parent coverage:** BG-36; OPE-219.

**Readiness / dependencies:** R20; approved isolated failure/credential scenarios.

**Goal and user outcome:** Run prepared offline, restart and rotation session. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `clients/ios-shortcut-device-qa.md`, `docs/TOKEN_ROTATION.md`.

**Output / allowed evidence file:** `docs/verification/R21_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Airplane-mode note/file, terminate/restart, reconnect same key; simulate accepted-but-response-lost, interrupted/expired upload and slow network. Verify invalid/rotated credential guidance, retained queue and retry after repair. Test unsupported/oversize and inaccessible iCloud storage.

**Acceptance, validation and failure assertions:** Exactly one logical event after replay; reason/privacy/time/bytes retained or honest reselection; no false Saved; credential overlap/compromise behavior matches contract; queue deletes only on durable acknowledgement.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R22 — Rehearse independent disaster recovery and anti-resurrection

**Parent coverage:** BG-37; OPE-228.

**Readiness / dependencies:** R05; approved isolated purge/recovery fixtures.

**Goal and user outcome:** Rehearse independent disaster recovery and anti-resurrection. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOVERY_OPERATOR_PROCEDURE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R22_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Restore with only independent artifacts and runbook, without consulting live source for missing data. Include older backup/newer purge receipt, corrupt/missing original, partial purge, owner overrides and derived index rebuild. Record recovery duration and interventions.

**Acceptance, validation and failure assertions:** Recovered records/originals/search match; purged content absent from FTS/objects/projection queues; outbound work stays disabled; missing bytes gives partial recovery, never PASS.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R23 — Prepare and activate bounded daily/weekly delivery

**Parent coverage:** BG-38; OPE-226.

**Readiness / dependencies:** R07/R11/R15/R16/R22; approved private destination and schedule.

**Goal and user outcome:** Prepare and activate bounded daily/weekly delivery. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/OPERATIONAL_CONTROLS.md`.

**Output / allowed evidence file:** `docs/verification/R23_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Freeze eligible-day definition, Asia/Kolkata schedule, stable candidate, exact destination, privacy exclusions and unknown-delivery reconciliation. Prepare one activation packet with cost/disable/stop controls. Verify weekly schedule independently; manual send is separate evidence.

**Acceptance, validation and failure assertions:** Activation has explicit scope and safe stop; no existing disabled flag silently enabled; eligibility and restart rules frozen before first counted day.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R24 — Observe seven consecutive eligible daily sends and weekly review

**Parent coverage:** BG-38; OPE-226.

**Readiness / dependencies:** R23.

**Goal and user outcome:** Observe seven consecutive eligible daily sends and weekly review. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/RECOLLECTFLOW_BUILD_GUIDE.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R24_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Record each scheduled opportunity/run/eligibility/outcome/receipt/link/privacy result; reconcile unknown before counting. Observe weekly selection separately. A missed eligible delivery resets sequence; meaningful scheduler/privacy change invalidates affected evidence only with explanation.

**Acceptance, validation and failure assertions:** Seven actual consecutive eligible scheduled deliveries confirmed, empty days truthfully classified, weekly story proved; manual recovery is not scheduled success; elapsed time not simulated.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R25 — Run the two-week real-use observation

**Parent coverage:** BG-39; OPE-229/250.

**Readiness / dependencies:** R09–R22 and R52 required technical gates; R23 eligible; owner trial dates.

**Goal and user outcome:** Run the two-week real-use observation. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R25_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Freeze candidate, normal use mix and incident/restart rules before start. Track daily capture/search/review, backlog, failure, lost-draft/false-Saved/privacy issues and intervention count. Agent prepares concise prompts and aggregates evidence; owner supplies actual usefulness/friction judgments. Include correction/review rates and useful recollections; preserve the personal-beta guide’s recommended first-week 10 captures/day as an adoption target, not fabricated evidence. May share eligible days with R24.

**Acceptance, validation and failure assertions:** At least 14 actual days with required real-device stories; incidents retained; severe defects repaired and affected flows rechecked; observation windows tied to build identity.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R26 — Reconcile real usage and actual cost

**Parent coverage:** BG-39; OPE-227.

**Readiness / dependencies:** R25 observation data; account billing access.

**Goal and user outcome:** Reconcile real usage and actual cost. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R26_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Compare application counters with actual provider/platform period usage and charges. Separate shared-account use, free allowances, estimates and delayed billing. Identify exact evidence still pending; do not extrapolate a partial invoice.

**Acceptance, validation and failure assertions:** Actual $0 criterion supported for required period and hard threshold tests pass; unavailable invoice remains pending; no silent budget relaxation.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R27 — Assemble one full-V1 acceptance dossier

**Parent coverage:** OPE-247; BG-30/40.

**Readiness / dependencies:** R07/R09–R16/R20–R22/R24–R26/R52.

**Goal and user outcome:** Assemble one full-V1 acceptance dossier. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/verification/BG-30_RELEASE_MATRIX.json`, `docs/RECOLLECTFLOW_BUILD_GUIDE.md`.

**Output / allowed evidence file:** `docs/verification/R27_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Map every V1 scenario to latest valid evidence and capability-specific source/runtime/device identity. Include recovery, security, hourly proof, AI modalities, Notion, delivery, costs and local-client applicability. Resolve tracker drift with links, not copied percentages. Prepare the required one-page owner operating guide covering install, capture types, coverage/privacy/status, search/review, retry, rotation, export, deletion and recovery.

**Acceptance, validation and failure assertions:** No required gate omitted or satisfied by wrong environment; each residual blocker has impact/owner/next action; agent can recommend GO only if all mandatory criteria pass.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R28 — Record owner V1 go/no-go

**Parent coverage:** BG-40; OPE-229.

**Readiness / dependencies:** R27.

**Goal and user outcome:** Record owner V1 go/no-go. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R28_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Present concise capability results, residual risks, observed usefulness and recommendation. Owner records dated decision for exact release scope. Update current release summary and parent trackers after actual decision.

**Acceptance, validation and failure assertions:** Explicit decision preserved; NO-GO names unresolved packets; V1 GO does not authorize RAG or public productization.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R29 — Convert measured friction into bounded V1.1 fixes

**Parent coverage:** OPE-250.

**Readiness / dependencies:** R28; two-week evidence R25.

**Goal and user outcome:** Convert measured friction into bounded V1.1 fixes. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R29_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse trial evidence rather than demand a second identical two-week run. Rank observed friction by lost data/privacy/false status and user effort. Architect creates exact fix packets with fixtures/contracts; owner only approves new product changes. Rerun affected acceptance.

**Acceptance, validation and failure assertions:** Each proposed improvement has observed demand and acceptance; required serious fixes resolved; speculative expansion stays out; RAG readiness includes usefulness judgment.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R30 — Decide whether RAG should begin

**Parent coverage:** OPE-230.

**Readiness / dependencies:** R28/R29; at least 100 useful captures and search evidence.

**Goal and user outcome:** Decide whether RAG should begin. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R30_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Count useful captures with safe aggregate evidence; show lexical-search misses and representative questions. Prepare explicit start/hold recommendation, privacy and zero-cost feasibility. Owner decides separately from V1 GO.

**Acceptance, validation and failure assertions:** Entry evidence exists and explicit start recorded, or later RAG packets remain CONDITIONAL; no semantic feature built merely because ticket exists.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R31 — Freeze evidence-only answer and trust policy

**Parent coverage:** OPE-230.

**Readiness / dependencies:** R30.

**Goal and user outcome:** Freeze evidence-only answer and trust policy. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R31_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Preserve evidence-only facts, four answer states, factual-block citations, coverage labels, conflicting-source separation and duplicate independence rules. Specify source-trust ordering and staleness behavior with examples. Architect resolves technical details; owner approves changed product guarantees only.

**Acceptance, validation and failure assertions:** Answer/refusal/conflict/trust rules are testable with positive/negative examples; external model knowledge never becomes corpus evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R32 — Approve gold questions and model evidence before integration

**Parent coverage:** OPE-240.

**Readiness / dependencies:** R30/R31.

**Goal and user outcome:** Approve gold questions and model evidence before integration. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R32_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Prepare at least 50 versioned cases with expected evidence/claims/answerability: at least 20% partial/unanswerable and 10% changing/conflicting. Owner validates representativeness. Benchmark permitted model candidates under bounded cost/privacy scope; freeze dimensions/context/latency budgets from measured evidence.

**Acceptance, validation and failure assertions:** Gold set and provisional model/config candidates approved from component benchmarks, without claiming end-to-end RAG thresholds before implementation; R46 establishes release quality. Thresholds preserve Recall@5 >=85%, citation precision >=95%, coverage >=90%, insufficient-evidence accuracy >=90%; no guessed provider capability.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R33 — Publish exact RAG contracts before builders start

**Parent coverage:** OPE-230/231/236.

**Readiness / dependencies:** R31/R32.

**Goal and user outcome:** Publish exact RAG contracts before builders start. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`, `docs/DATA_MODEL.md`.

**Output / allowed evidence file:** `docs/verification/R33_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Architect specifies exact schema/migrations, API request/response/errors/auth, privacy modes, adapters, invalidation epoch, numeric token/chunk/query/concurrency/time budgets, prompt schema and UI states. Resolve legacy /v1/rag/query versus app /api/v1 prefix explicitly. Materialize exact source/test paths and caller maps for R34–R45 against then-current repo.

**Acceptance, validation and failure assertions:** No missing field/type/status/default/limit; migration/recovery and deletion contracts explicit; all downstream implementation packets pass intake with zero FAILs. This design task creates no RAG runtime.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R34 — Implement versioned RAG storage and provenance

**Parent coverage:** OPE-231.

**Readiness / dependencies:** R33 frozen schema and exact implementation packet.

**Goal and user outcome:** Implement versioned RAG storage and provenance. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/DATA_MODEL.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R34_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Apply approved additive migration for versions/chunks/embedding records/retrieval runs/answers/citations/conversations with uniqueness and ownership. Include export, soft-delete, purge and compatibility behavior. Preserve canonical capture.

**Acceptance, validation and failure assertions:** Local migration/recovery tests prove idempotency, citation lineage and deletion behavior; no orphaned references or capture regression.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R35 — Implement bounded source-aware chunking

**Parent coverage:** OPE-232.

**Readiness / dependencies:** R34/R33 numeric chunk contract.

**Goal and user outcome:** Implement bounded source-aware chunking. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R35_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Preserve exact source/version/spans, keep short notes intact and split long inputs at source boundaries within hard maximum. Record Unicode/PDF/OCR/transcript/empty/boilerplate handling and coverage; rechunk only changed configuration/content.

**Acceptance, validation and failure assertions:** Every span resolves; no silently dropped text; stable rerun identity; URL/summary-only evidence cannot masquerade as full source.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R36 — Implement approved embedding/index lifecycle

**Parent coverage:** OPE-233.

**Readiness / dependencies:** R35/R37; R33 provider/index contract.

**Goal and user outcome:** Implement approved embedding/index lifecycle. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R36_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Use existing job/admission patterns; dedupe by content/model/version, validate dimensions and retry partial batches safely. Build replacement index before explicit activation; exclude superseded/deleted chunks. Use deterministic fake adapters first.

**Acceptance, validation and failure assertions:** No duplicate embeddings on retry; pending on quota; old index recoverable during migration; restricted content never enters hosted vector provider.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R37 — Implement privacy and invalidation before serving retrieval

**Parent coverage:** OPE-231/233/241/242.

**Readiness / dependencies:** R34/R33 lifecycle contract.

**Goal and user outcome:** Implement privacy and invalidation before serving retrieval. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R37_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Apply current visibility/deletion/version checks at every retrieval boundary. Invalidate embeddings/retrieval/answer caches and citation access on edits/restrictions/purge; reject stale worker commits. Include local/hosted separation and export/purge audit behavior.

**Acceptance, validation and failure assertions:** Concurrent delete/restrict versus retrieval/result commit cannot expose old evidence; stale cache/vector entry cannot bypass canonical check; failures fail closed.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R38 — Implement hybrid retrieval with lexical fallback

**Parent coverage:** OPE-234.

**Readiness / dependencies:** R36/R37/R33 retrieval contract.

**Goal and user outcome:** Implement hybrid retrieval with lexical fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R38_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Run bounded lexical/vector candidates with approved filters and deterministic fusion; retain scores/provenance and stable search pagination. Timeout/backend failure degrades per contract without changing privacy mode.

**Acceptance, validation and failure assertions:** Exact names/URLs/phrases and paraphrases covered; no-result explicit; unauthorized chunks filtered before generation; one failed backend retains permitted results.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R39 — Implement diversity, conflicts and deterministic reranking fallback

**Parent coverage:** OPE-235.

**Readiness / dependencies:** R38/R31.

**Goal and user outcome:** Implement diversity, conflicts and deterministic reranking fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R39_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Collapse duplicate clusters without losing provenance; apply frozen trust/diversity budgets, preserve contradictory evidence, record inclusion/exclusion reasons. Use approved reranker with deterministic fallback.

**Acceptance, validation and failure assertions:** Reposts cannot inflate support; conflicts survive; one-source corpus works; reranker failure preserves stable permitted ordering.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R40 — Implement bounded context and query orchestration

**Parent coverage:** OPE-236.

**Readiness / dependencies:** R39/R33 exact API contract.

**Goal and user outcome:** Implement bounded context and query orchestration. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/API_SPEC.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R40_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Validate query/filter/conversation/privacy inputs and auth; persist retrieval trace; build exact citation IDs and bounded context before provider call. Treat source text as untrusted; offer retrieval-only output and explicit timeout/no-evidence states.

**Acceptance, validation and failure assertions:** Overflow/malicious text cannot change instructions or exceed approved limits; citation IDs resolve; unauthorized/stale conversations rejected; failure retains safe evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R41 — Implement grounded answer validation and fallback

**Parent coverage:** OPE-237.

**Readiness / dependencies:** R40/R31/R33 answer schema.

**Goal and user outcome:** Implement grounded answer validation and fallback. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/PROMPTS_AND_SCHEMAS.md`.

**Output / allowed evidence file:** `docs/verification/R41_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Generate structured answer states; validate citations against supplied current context and reject unsupported claims according to policy. Preserve provenance/model/prompt/context hash. Provider or schema failure returns safe evidence/refusal, never fabricated success.

**Acceptance, validation and failure assertions:** Answerable/partial/conflict/insufficient cases and prompt injection tested; unknown citations rejected; limited coverage labeled; owner judgments included in quality eval.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R42 — Implement evaluation before enabling answers

**Parent coverage:** OPE-239.

**Readiness / dependencies:** R32/R33 evaluation schema.

**Goal and user outcome:** Implement evaluation before enabling answers. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R42_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Build deterministic fixture runs and bounded approved model evaluations; report retrieval ranking separately from groundedness/citations, privacy/deletion, latency and actual cost. Version cases/config/baseline; preserve holdout failures.

**Acceptance, validation and failure assertions:** Harness detects intentionally bad citations, missing relevant items, restricted leakage and false answers; no existence-only tests counted; repeatable comparison artifacts.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R43 — Implement accessible conversational evidence UI

**Parent coverage:** OPE-238.

**Readiness / dependencies:** R40/R41/R42/R33 UI/API contract.

**Goal and user outcome:** Implement accessible conversational evidence UI. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R43_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Build approved Ask surface: query/filters/privacy, loading/empty/error and four answer states, source/citation inspection and follow-ups. Retrieve fresh each turn; history resolves references only. Preserve input on failure and keyboard/screen-reader access.

**Acceptance, validation and failure assertions:** User can inspect exact evidence/limitations/conflicts; stale session/network/double submit/navigation scenarios covered; previous assistant answers never used as evidence.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R44 — Implement approved private local RAG worker

**Parent coverage:** OPE-241.

**Readiness / dependencies:** R33/R34/R37; R51/R52 runnable V1 local worker verified.

**Goal and user outcome:** Implement approved private local RAG worker. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`.

**Output / allowed evidence file:** `docs/verification/R44_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Implement approved local embeddings/answers/index using scoped leases, heartbeat, bounded one-job concurrency, output validation and safe shutdown. No cloud localhost calls. Verify Mac-off, model unavailable, low memory, partial index, lease loss, stale result and local quota/outage behavior. Use encrypted transport, parallel private index migration and same item/chunk citation model; hosted-to-local fallback requires the approved privacy policy, never local-to-hosted leakage.

**Acceptance, validation and failure assertions:** Restricted bytes never leave approved boundary; Mac-off yields pending/lexical-only state; no hosted fallback; recovery preserves operation identity and provenance.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R45 — Complete RAG quota, cache and operational controls

**Parent coverage:** OPE-242.

**Readiness / dependencies:** R37/R40/R41/R44; R33 numeric budgets.

**Goal and user outcome:** Complete RAG quota, cache and operational controls. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/OPERATIONS_RUNBOOK.md`.

**Output / allowed evidence file:** `docs/verification/R45_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Reuse capacity/operations patterns with separate embedding/vector/rerank/generation accounting; cache only complete version/policy/filter/model identity. Enforce bounded lifetimes and invalidation, redacted traces, safe degraded states and kill switches. Include the required protected admin view for index freshness, embedding backlog, quota status, quality feedback and failed RAG jobs.

**Acceptance, validation and failure assertions:** Concurrent admission cannot overspend; stale/private results cannot hit cache; provider outage preserves lexical/evidence-only; operators can diagnose without prompt/content logs.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R46 — Run independent V1.5 acceptance

**Parent coverage:** OPE-243.

**Readiness / dependencies:** R34–R45; approved live/device/model packet.

**Goal and user outcome:** Run independent V1.5 acceptance. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/TESTING_AND_ACCEPTANCE.md`, `docs/AI_AND_RAG_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R46_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Run gold/holdout and real user recall with exact/paraphrase/comparison/synthesis/timeline/follow-up, duplicate/conflict/stale/limited coverage. Exercise edits/deletes/privacy, vector/generation/local outages, restart and actual cost. Human samples citation support.

**Acceptance, validation and failure assertions:** All approved metrics and zero-cost/privacy/deletion guarantees pass; no critical unsupported-claim defect; reproducible evidence tied to model/prompt/index/source.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R47 — Record owner V1.5 go/no-go

**Parent coverage:** OPE-243.

**Readiness / dependencies:** R46.

**Goal and user outcome:** Record owner V1.5 go/no-go. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/TESTING_AND_ACCEPTANCE.md`.

**Output / allowed evidence file:** `docs/verification/R47_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Present retrieval and answer quality separately, actual costs, privacy/recovery, usefulness and known limits. Owner decides exact candidate. Preserve NO-GO with resolving packets when any required gate remains.

**Acceptance, validation and failure assertions:** Explicit dated V1.5 decision; no automatic expansion authorization.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R48 — Evaluate V2 candidates individually from demand

**Parent coverage:** OPE-244.

**Readiness / dependencies:** R47 GO; measured demand.

**Goal and user outcome:** Evaluate V2 candidates individually from demand. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`, `docs/MOBILE_CAPTURE_SPEC.md`.

**Output / allowed evidence file:** `docs/verification/R48_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** For each existing candidate (browser, context/calendar, multimodal/transcription, secondary client), show demand, smallest usable scope, maintenance/privacy/cost and alternatives. Owner includes/defers/rejects each independently; architect creates exact contracts only for included candidates.

**Acceptance, validation and failure assertions:** Every candidate has explicit disposition; no bundled approval, speculative build, background scraping or new account access.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R49 — Evaluate V3 and public productization separately

**Parent coverage:** OPE-245.

**Readiness / dependencies:** R47; at least 1000 useful captures and stable retention/value evidence.

**Goal and user outcome:** Evaluate V3 and public productization separately. This removes the corresponding unresolved behavior or evidence gap without repeating completed work.

**Files to inspect:** `docs/LAUNCH_AND_PRODUCTIZATION.md`.

**Output / allowed evidence file:** `docs/verification/R49_RESULT.md` (new, created on execution). The shared allowed-file and no-runtime-change rules apply.

**Work in order:** Assess evidence relationships, project briefings and proactive/spaced recall from measured use. Treat multi-user/public product as separate PRD covering tenancy/security/deletion/billing/support and legal inputs. Preserve independent candidate decisions.

**Acceptance, validation and failure assertions:** Personal expansion decisions and public-product decision separate; no V3 implementation until exact approved contracts; no implicit SaaS scope.

**Completion:** evidence addresses every assertion above, records unmet conditions rather than guessing, and the parent links this result. Runtime repairs require the shared repair packet and regression check. Documentation/design completion alone cannot close this packet’s live or device conditions.

## R50 — Freeze the V1 local-processing client contract

**Parent:** OPE-246/OPE-247/OPE-229. **Readiness:** READY for architect work. Owner explicitly requires runnable local AI in V1 on November 10. R17 client inventory and the existing worker API are inputs; RAG is not a prerequisite.

**Files to inspect:** `docs/AI_AND_RAG_SPEC.md`, `docs/API.md`, `docs/tickets/OPE-246.md`, `docs/SECURITY_PRIVACY_GOVERNANCE.md`, `docs/repo_context.md`. Discover current lease/content/result/heartbeat routes with the graph, verify source at the working SHA, and attach exact owning files and tests to the implementation handoff. The existing graph is not trusted as a fresh runtime contract.

**Allowed output:** new `docs/tickets/V1_LOCAL_WORKER_CONTRACT.md` and a scoped current-context addendum. No runtime modification in this packet.

**Work:** specify the runnable Mac entry point, existing Node/toolchain reuse, explicit start/stop, scoped credential storage, permitted-content fetch, Ollama text model invocation, schema/provenance validation and result submission. Freeze one-job concurrency, exact lease/heartbeat/timeouts, request/response/error shapes, retry ownership, output limits, redaction and shutdown behavior from actual server contracts. Select an installed compatible model after bounded local capability inspection; ask only for unavailable hardware/model input or a new download/resource commitment. Keep embeddings/vector/RAG out of this V1 client. Do not permit hosted fallback for restricted content. Include exact new/existing source/test paths and a complete builder packet before R51 starts.

**Acceptance:** no missing route, field, model capability, numeric bound or credential handling decision; server lease duration and client timeout/heartbeat are compatible; a model failure leaves canonical capture untouched. Owner's V1 applicability decision is not asked again. Any actual API incompatibility is returned to the architect with a minimal contract change proposal before coding.

## R51 — Implement the runnable V1 Mac worker

**Parent:** OPE-246/OPE-229. **Readiness:** BLOCKED_DEPENDENCY on R50 exact contract and approved model/access. **Inputs:** `docs/tickets/V1_LOCAL_WORKER_CONTRACT.md` (future R50 output), `docs/AI_AND_RAG_SPEC.md`, plus R50's verified source/test handoff.

**Allowed files:** exact source/tests named by R50; `docs/verification/R51_RESULT.md` and the local-worker runbook named there. Do not change schema, server authorization or add an unapproved provider.

**Work:** implement explicit startup configuration validation, single-job lease loop, scoped permitted-content read, local inference, strict result validation and provenance, heartbeat, bounded failure/release and graceful stop. Reuse server job ownership/generation rules. Protect credential storage; never log prompts or original content. Startup with missing credentials/model must fail clearly before leasing. Run deterministic adapter/server tests before a real local inference.

**Acceptance/tests:** no eligible job is harmless idle; duplicate/stale result is rejected; malformed model output cannot overwrite fields; timeout/lease loss prevents late commit; shutdown releases only owned work; Mac-off leaves work pending; no external model request for restricted fixture; canonical raw record and owner edits survive every failure. Relevant Vitest/Node tests and existing job regressions pass. Record actual executable command and installation steps, not just endpoints or pseudocode.

## R52 — Verify local AI on the actual Mac and join V1 acceptance

**Parent:** OPE-246/OPE-247/OPE-229. **Readiness:** BLOCKED_DEPENDENCY on R51, recoverability and approved target/scoped worker access. **Inputs:** R50 contract, R51 runbook/result, `docs/TESTING_AND_ACCEPTANCE.md`. **Allowed output:** `docs/verification/R52_RESULT.md` and affected runbook corrections.

**Work:** agent prepares synthetic private text and expected grounded fields. Run the client on the intended Mac; inspect actual permitted job, local provider/model provenance and validated result. Stop/restart worker, make Ollama unavailable, exhaust configured local resources safely, interrupt heartbeat/lease and revoke a dedicated test credential under approved scope. Verify no restricted source enters external model requests or logs. Use an isolated test target for disruptive scenarios; do not revoke the owner's working credential.

**Acceptance:** real local inference works; private source never reaches hosted AI; startup/shutdown/restart and Mac-off behavior are truthful; stale results cannot overwrite newer state; operator can run and diagnose the client from the runbook. R25 and R27 require this evidence. R44 later extends this existing client for RAG instead of treating local processing as a new foundation.
