# RecollectFlow — Plain-Language Product and Build Guide

## Current application status — baseline audited 2026-09-12

Guide prepared: **2026-09-13**. Detailed implementation edition, with a linked **100-step checklist per task / 4,000 total**.

This guide starts from `origin/main` commit
`6d5c36b81c9167dc3b53841562d5c997c3c4b3cb`. The preceding
[workflow audit](WORKFLOW_AUDIT_2026-09-12.md) tested that commit. Its results
are historical evidence for that exact baseline, not a claim that every future
checkout passes the same checks.

RecollectFlow already has a substantial backend and a usable review interface.
It can preserve captures, store private attachments, search saved material, run
processing jobs, apply privacy rules, project into Notion, prepare digests, and
export or recover data. However, a saved bare URL cannot currently complete its
expected enrichment path, browser attachment downloads reject the admin session,
and a failed processing job can leave the item looking pending.

The audit recorded **255 passing automated tests and one failing test**. Formatting,
lint, typechecking, the Web build, all 18 migration files through `0021`, and a
Worker deployment dry run passed. One test uses an expired fixed date. The existing
release smoke script also fails because it sends an outdated privacy payload.

Real Notion/Telegram delivery, current production schema/version, production Web
Inbox hosting, physical-iPhone acceptance, sustained digest delivery, and actual
billing were not established by that audit. A production health response alone
cannot establish any of these.

**Purpose of this document**

Explain what remains to build, why it matters, how to implement it in small steps,
when to do each step, and what evidence proves it is complete. A reader should be
able to understand the product without already knowing Cloudflare, databases,
authentication, background workers, or AI terminology.

The Serviq build guide supplied by the owner is a **structure and writing reference**.
Its project instructions, architecture, package manager, ticket IDs, historical
commits, and completion claims do not apply to RecollectFlow.

The numbered tasks below are a forward-looking plan. Writing them does not
implement them, authorize a production operation, create a tracker ticket, or mark
a feature complete. Proposed contracts and filenames are explicitly labeled.
Existing source code and approved RecollectFlow decisions remain authoritative.

### How to navigate this guide

- [Part I — Understand the product](#part-i--understand-the-product)
- [Part II — Read the execution order](#part-ii--read-the-execution-order)
- [Part III — Priority 1: repair the verification foundation](#part-iii--priority-1-repair-the-verification-foundation)
- [Part IV — Priority 2: repair the broken user workflows](#part-iv--priority-2-repair-the-broken-user-workflows)
- [Part V — Priority 3: finish web capture and hosting](#part-v--priority-3-finish-web-capture-and-hosting)
- [Part VI — Priority 4: operational hardening and truthful documentation](#part-vi--priority-4-operational-hardening-and-truthful-documentation)
- [Part VII — Priority 5: prove the real system and approve V1](#part-vii--priority-5-prove-the-real-system-and-approve-v1)
- [Part VIII — Exact working references](#part-viii--exact-working-references)
- [Part IX — Maintaining this guide](#part-ix--maintaining-this-guide)

---

# Part I — Understand the product

## 1. What is RecollectFlow?

RecollectFlow is a private place to save something now and find it when it becomes
useful later.

Imagine seeing a useful article while travelling. You save its link with the note:

> “Use this when I build the upload screen.”

Weeks later, you remember neither the title nor the website. You remember “upload
screen.” RecollectFlow should find the saved article using your reason, the actual
page text if it was acquired, and other trustworthy fields.

The complete experience is:

1. Save a URL, thought, selected text, screenshot, PDF, or supported file.
2. Receive an honest confirmation that the original is stored.
3. Let optional processing extract or summarize what is available.
4. Find the item using search, filters, the Web Inbox, or a digest link.
5. Inspect the original and correct the generated fields.
6. Keep, act on, archive, delete, export, or restore it.

The strongest product promise is **the original survives even when optional
services fail**. AI can be unavailable. Notion can be down. A digest can fail.
Those problems must not turn an acknowledged capture into lost information.

## 2. The architecture in everyday language

Think of a private library with a receiving desk, a records book, a locked cabinet,
a librarian, a catalogue, and a reminder service.

| Library component | RecollectFlow component           | Responsibility                                      |
| ----------------- | --------------------------------- | --------------------------------------------------- |
| Receiving desk    | Worker API                        | Check the request and accept a capture              |
| Records book      | D1 database                       | Preserve the authoritative item and its history     |
| Locked cabinet    | Private R2 bucket                 | Preserve original attachment bytes                  |
| Work slips        | Processing jobs                   | Remember optional work that still needs doing       |
| Librarian         | Extraction and enrichment workers | Read supported inputs and propose useful fields     |
| Catalogue         | D1 FTS5                           | Find saved words without needing AI                 |
| Reading desk      | Web Inbox                         | Inspect, edit, retry, and recover items             |
| Display copy      | Notion projection                 | Present selected fields outside the canonical store |
| Reminder service  | Digests and Telegram              | Resurface useful items through private links        |
| Disaster kit      | Exports, backups, purge receipts  | Recover data without undoing deliberate deletion    |

```text
Share Sheet or browser
          |
          v
Authentication and validation
          |
          v
D1 item + capture event -----> private R2 attachment, when applicable
          |
          +----> immediate Saved response
          |
          +----> durable optional jobs
                     |
                     +----> extract supported source content
                     +----> enrich approved content
                     +----> synchronize Notion
                     +----> prepare privacy-safe digests

D1 + extraction evidence ----> FTS search ----> Web review
D1 + attachment manifest ----> export/backup ----> verified recovery
```

A Notion page is a display copy. Deleting that page must not delete the source
item. A summary is an interpretation. It must not replace the original text.
A successful upload is not yet a completed capture if linking the attachment to
an item has not succeeded.

## 3. Five distinctions that prevent misleading completion claims

### Saved versus processed

Saved means the canonical capture is durable. Processed means an optional stage
has reached its intended result. The first must not wait for the second.

### Coverage versus quality

Coverage describes what the system actually acquired. A URL-only Instagram save
has no transcript. A partially extracted PDF has incomplete text. An impressive
summary cannot increase the source coverage.

### Item versus capture event

One article can have one canonical item and several share events. Each event can
carry a different reason. Deduplication should reduce duplicate items without
erasing why the owner shared the article again.

### Implementation versus release

Code can pass local tests without being deployed. A deployment can succeed without
passing a real user journey. Record these as separate states.

### Backup metadata versus original files

The current portable JSON export explicitly says `attachmentBytesIncluded: false`.
It preserves attachment references and metadata. It does not contain a copy of each
original file. A complete disaster rehearsal must account for the original bytes
separately.

## 4. What already exists and should be reused

| Area                           | Baseline evidence                              | Remaining qualification                         |
| ------------------------------ | ---------------------------------------------- | ----------------------------------------------- |
| Capture and duplicate handling | Unit/integration tests and local requests pass | Browser creation UI still absent                |
| Attachments                    | Token-authenticated byte round trip passes     | Browser cookie download fails                   |
| PDF and image extraction       | Stored-PDF and screenshot D1 tests pass        | Live provider quality not certified             |
| Hosted enrichment              | Mocked pipeline works                          | Bare URL path fails without source text         |
| Job recovery                   | Lease/retry/stale recovery tests pass          | Aggregate item status needs repair              |
| Privacy/capacity               | Policy and admission tests mostly pass         | Date-dependent usage test fails                 |
| Search and review              | Search, edit, feedback, delete/restore pass    | More user-facing creation/operator work remains |
| Notion                         | Projection/retry logic and tests exist         | Live outage/recreation acceptance remains       |
| Digests                        | Selection/privacy/delivery-state tests exist   | Real destination and sustained delivery remain  |
| Recovery                       | Export/backup/purge/restore tests exist        | Complete production disaster rehearsal remains  |

Do not rebuild these systems merely to make a new task look self-contained.
Extend their existing contracts and add the missing connections.

---

# Part II — Read the execution order

## 5. The priority order

This follows the audit's recommended order: make checks usable, repair user
failures, finish web capture/hosting, harden operations, then prove the real release.
The small IDs are guide-local references, not newly created Linear tickets.

| Order | Task                                                                               | Main outcome                                             | Start after |
| ----- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- |
| 01    | [BG-01](#7-bg-01--freeze-a-reproducible-starting-point)                            | Reproducible baseline and isolated test environment      | Start here  |
| 02    | [BG-02](#8-bg-02--make-the-usage-test-independent-of-todays-date)                  | Clock-stable usage test                                  | BG-01       |
| 03    | [BG-03](#9-bg-03--carry-edit-versions-through-the-smoke-script)                    | Version-aware release smoke                              | BG-02       |
| 04    | [BG-04](#10-bg-04--finish-the-smoke-story-and-repair-setup-instructions)           | Complete smoke stages and correct setup instructions     | BG-03       |
| 05    | [BG-05](#11-bg-05--close-priority-1-with-one-complete-gate)                        | Green verification foundation                            | BG-04       |
| 06    | [BG-06](#12-bg-06--define-who-may-read-an-attachment)                              | Explicit attachment authentication matrix                | BG-05       |
| 07    | [BG-07](#13-bg-07--make-the-browser-download-link-work)                            | Working browser download and regression                  | BG-06       |
| 08    | [BG-08](#14-bg-08--define-honest-url-acquisition-and-coverage)                     | URL acquisition/coverage contract                        | BG-07       |
| 09    | [BG-09](#15-bg-09--build-a-bounded-source-fetcher)                                 | Bounded, privacy-aware URL fetch                         | BG-08       |
| 10    | [BG-10](#16-bg-10--persist-url-evidence-and-chain-processing-safely)               | Durable URL evidence and processing chain                | BG-09       |
| 11    | [BG-11](#17-bg-11--handle-unavailable-urls-retries-and-old-captures)               | URL failure/retry/reprocessing experience                | BG-10       |
| 12    | [BG-12](#18-bg-12--define-one-aggregate-processing-state-rule)                     | One aggregate processing-state rule                      | BG-11       |
| 13    | [BG-13](#19-bg-13--update-transitions-atomically-and-reject-stale-workers)         | State transitions and concurrency protection             | BG-12       |
| 14    | [BG-14](#20-bg-14--prove-the-repaired-workflow-in-a-browser)                       | Browser story proving the repaired workflow              | BG-13       |
| 15    | [BG-15](#21-bg-15--define-browser-write-authentication)                            | Browser write authentication and request boundaries      | BG-14       |
| 16    | [BG-16](#22-bg-16--build-the-url-pasted-text-and-note-form)                        | URL/text/note capture form                               | BG-15       |
| 17    | [BG-17](#23-bg-17--retain-stable-retries-and-define-draft-lifetime)                | Stable retries and safe draft lifecycle                  | BG-16       |
| 18    | [BG-18](#24-bg-18--add-browser-file-upload-finalize-and-link)                      | Browser file upload/finalize/link                        | BG-17       |
| 19    | [BG-19](#25-bg-19--complete-follow-up-fields-and-accessible-successerror-behavior) | Project/review-date follow-up and accessible feedback    | BG-18       |
| 20    | [BG-20](#26-bg-20--choose-the-production-web-inbox-origin)                         | Same-origin production hosting design                    | BG-19       |
| 21    | [BG-21](#27-bg-21--build-assets-route-deep-links-and-package-one-release)          | Asset routing, deep links, deployment artifact           | BG-20       |
| 22    | [BG-22](#28-bg-22--close-priority-3-with-the-complete-browser-creation-story)      | Web capture/hosting release candidate                    | BG-21       |
| 23    | [BG-23](#29-bg-23--make-an-operational-control-inventory)                          | Operational scope and control inventory                  | BG-22       |
| 24    | [BG-24](#30-bg-24--implement-bounded-token-rotation-and-session-behavior)          | Token overlap, revocation and session rotation           | BG-23       |
| 25    | [BG-25](#31-bg-25--harden-authentication-session-requests-and-logs)                | Auth abuse, session and log hardening                    | BG-24       |
| 26    | [BG-26](#32-bg-26--show-usage-backlog-and-recovery-state-truthfully)               | Usage, backlog and safe operational visibility           | BG-25       |
| 27    | [BG-27](#33-bg-27--make-digest-review-and-delivery-uncertainty-operable)           | Digest review and ambiguous-delivery handling            | BG-26       |
| 28    | [BG-28](#34-bg-28--make-backup-restore-and-purge-procedures-complete)              | Backup, restore and purge operator procedures            | BG-27       |
| 29    | [BG-29](#35-bg-29--run-resilience-capacity-and-performance-acceptance)             | Resilience, capacity and performance gate                | BG-28       |
| 30    | [BG-30](#36-bg-30--reconcile-completion-records-and-close-hardening-evidence)      | Reconciled completion records and OPE-247 evidence       | BG-29       |
| 31    | [BG-31](#37-bg-31--prepare-a-concrete-release-manifest)                            | Concrete release manifest and recovery plan              | BG-30       |
| 32    | [BG-32](#38-bg-32--apply-the-authorized-production-release)                        | Authorized production migration/deployment               | BG-31       |
| 33    | [BG-33](#39-bg-33--prove-production-capture-search-downloads-and-approved-ai)      | Live capture, search, private download and AI acceptance | BG-32       |
| 34    | [BG-34](#40-bg-34--prove-notion-projection-outage-and-recreation)                  | Live Notion outage/recreation acceptance                 | BG-33       |
| 35    | [BG-35](#41-bg-35--complete-the-physical-iphone-online-stories)                    | Physical-iPhone online workflow                          | BG-34       |
| 36    | [BG-36](#42-bg-36--prove-iphone-offline-retention-retries-and-rotation)            | Physical-iPhone offline/retry/rotation workflow          | BG-35       |
| 37    | [BG-37](#43-bg-37--rehearse-disaster-recovery-independently)                       | Independent disaster recovery and purge rehearsal        | BG-36       |
| 38    | [BG-38](#44-bg-38--observe-seven-eligible-consecutive-daily-deliveries)            | Seven eligible daily digest deliveries                   | BG-37       |
| 39    | [BG-39](#45-bg-39--complete-two-weeks-of-real-use-and-verify-actual-cost)          | Two-week real-use and actual-cost acceptance             | BG-38       |
| 40    | [BG-40](#46-bg-40--record-the-v1-gono-go-decision)                                 | Explicit V1 go/no-go                                     | BG-39       |

“Start after” means the predecessor's required evidence is available. Some research,
fixture preparation and documentation can happen earlier. Dependent implementation
must not assume an unsettled API, authentication or state contract. Calendar-based
observation for BG-38/BG-39 may overlap once the same release candidate is stable;
the completion gates remain in the listed order.

## 6. How a small task is completed

### Microtask edition — 100 steps per task

Each of BG-01 through BG-40 now contains **100 microtasks**, totaling **4,000**.
Each task has ten groups of ten: a context group, eight task-specific work groups,
and a verification/closure group. The original explanation remains immediately
above its detailed checklist, so short checklist actions retain their rationale,
implementation constraints and acceptance criteria.

Use identifiers such as `BG-07.042` in implementation notes. All checkboxes start
unchecked: this expansion is a plan, not evidence that the underlying work is done.
An existing verified implementation can satisfy a step; record its evidence and
avoid unnecessary edits. Conditional steps require either the relevant work or a
specific nonapplicability explanation. A blocked prerequisite remains blocked.

A microtask is a small action or decision, **not** a mandatory commit, new file,
new test, or separate tool call. Related steps may be performed together. Inspect
one valid result once and reference it where several criteria depend on it; do not
rerun passing tests or deployments solely to fill checkboxes. For decisions and
human gates, the work is inspection, measurement and evidence, not invented code.

Execution order is unchanged. Within a task, run `.001` through `.100`, respecting
conditional dependencies. Read-only preparation may proceed while an external
gate is unavailable, but dependent writes cannot. BG-38's real scheduled days and
BG-39's minimum real-use duration cannot be replaced by simulated checklist ticks.
The numeric breakdown creates no new production, messaging, tracker, or launch
authorization.

### Read the explanation before executing the checklist

Each of the forty chapters now walks through the actual mechanism: the current
behavior, the proposed change, why the boundaries matter, concrete data or request
flows, failure/recovery cases and the evidence needed for completion. The ordered
implementation steps remain beside those explanations. Existing behavior and
proposed designs are distinguished throughout.

The [microtask companion](RECOLLECTFLOW_MICROTASK_CHECKLIST.md) holds all 4,000
original checklist entries, with links back to the corresponding explanations.
Use this main guide to understand and implement the feature; use the companion to
track the small actions. A checked action never substitutes for the chapter's
completion evidence.

Each numbered task has:

- **What and why:** the user problem and the improvement.
- **When:** the dependency that makes it safe and useful to start.
- **Where:** existing code or clearly proposed files.
- **Small implementation steps:** ordered, reviewable behavior changes.
- **Proof:** observable success, failure and lifecycle checks.
- **Completion boundary:** what this task does not yet establish.

One small change should introduce one behavior, one contract adjustment, or one
meaningful regression check. Do not manufacture a commit count. A documentation
change does not need a new test that merely repeats the same text.

Use the project graph tools for code discovery. Existing paths below are starting
points, not permission to skip inspecting their current implementation. After any
base update, check whether a task is already implemented before changing it.

---

# Part III — Priority 1: repair the verification foundation

## 7. BG-01 — Freeze a reproducible starting point

**What and why.** Record what is being tested so a later green result can be tied
to an actual revision. An old passing screenshot cannot validate a new commit.

**When.** First, before fixes. **Where.** Root `package.json`, `package-lock.json`,
`.github/workflows/ci.yml`, `vitest.node.config.ts`, `vitest.d1.config.ts`,
`wrangler.toml`, and the audit.

### Why the first deliverable is a reproducible environment

Suppose a test fails on your Mac and passes in CI. Before changing application
logic, we need to know whether both runs used the same code, runtime, dependencies
and database. Otherwise we may “fix” an application that was actually reading an
old local database or running a different Node version.

BG-01 produces a small evidence record that identifies those inputs. The Git SHA
names the code. The lockfile names the dependency tree. The selected Node version
names the JavaScript runtime. The Wrangler configuration and persistence directory
name the local database and objects. Together, they make the result reproducible.

### What the local environment must contain

Use one isolated configuration with dummy capture, admin and worker tokens. Give
it its own D1/R2 persistence directory. Apply migrations with that configuration,
then start Wrangler using the same configuration and directory. A migration run
against directory A does not prepare the database read by a server using directory B.

```text
isolated configuration + persistence directory
             |
             +--> local migration command
             +--> local Worker process
             +--> synthetic fixture requests
```

The Web application should point its development proxy to that Worker. Verify this
by creating a uniquely named synthetic item and retrieving it from the Web app.
The purpose is to prove the connection, not merely see two processes say “ready.”

Keep external providers mocked in this environment. Existing `.dev.vars` files may
contain actual integration settings; do not assume a command ignores them. Inspect
configuration-loading behavior and confirm the effective target without printing
secret values. Preserve unrelated user files while establishing this environment.

### How to record a useful baseline failure

Save the command, exit code, runtime version and first meaningful error. In the
September audit, a localhost permission error prevented the Worker tests from
starting. After that environmental restriction was removed, the suite reached a
real assertion failure. Those are two different findings and should remain separate.

The output of this task is a runnable isolated environment and a baseline ledger.
It is complete when another run can reproduce the same application behavior from
the recorded inputs. It does not require a new runtime abstraction or any feature
code change.

### Small implementation steps

1. Record the current SHA, branch/detached state and worktree changes. Preserve
   unrelated files, especially local environment files and the audit report.
2. Compare the target SHA with the audited SHA. If different, rerun the failing
   stories before assuming they still fail.
3. Use the lockfile and CI-compatible Node 22 for release evidence. The audit's
   Node 25 run is useful evidence but does not replace this environment.
4. Install through `npm ci` in the intended checkout. Do not mix npm with the
   Serviq guide's pnpm commands.
5. Create isolated local D1/R2 state with dummy tokens and separate configuration.
   Point both migrations and the Worker at that exact state directory.
6. Keep live Notion/Telegram credentials out of this configuration. Mock provider
   responses for automated tests. Do not let a scheduled test accidentally use
   production `.dev.vars` values.
7. Capture a baseline gate log and a short failure ledger containing command,
   environment, exit code, test name, expected result and observed result.

### Proof and completion boundary

Run the existing quality gate. Reproduce the dated-window failure and obsolete
privacy payload on the audited base, or document why a newer base fixed them.
Verify a synthetic capture is visible only in the chosen local state. BG-01 ends
with a trustworthy environment, not a repaired application.

### Execution checklist

Follow the [100 microtasks for BG-01](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-01--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 8. BG-02 — Make the usage test independent of today's date

**What and why.** The test creates August quota windows and asks September's API
to return active windows. The API correctly excludes them. Fix the test clock,
not the meaning of “active.”

**When.** After BG-01. **Where.**
`apps/worker-api/test/capacity-usage.d1.spec.ts`,
`apps/worker-api/src/jobs/ai/capacity-status.service.ts`, and
`apps/worker-api/src/jobs/ai/capacity.repository.ts`.

### What the failing test actually asks the application to do

A quota window is a period during which a provider allows a certain amount of work.
A minute window that ends at 20:16 should not appear in a query for active capacity
at 20:17. This is why the repository currently selects rows using:

```sql
WHERE window_end > ?1
```

The bound value is the query time. The test reserves capacity at the fixed instant
`2026-08-09T20:15:00.000Z`, but its HTTP request uses the real clock. The service's
existing signature makes that visible:

```ts
async status(now: Date = new Date())
```

After August 9, the test is asking for expired capacity and expecting it to remain
active. Returning an empty array is correct application behavior. Changing the SQL
to include old windows would damage the feature to satisfy a broken test.

### How one clock should control the story

Keep the real HTTP route in the regression. Establish an instant T, reserve at T,
and make the route evaluate active windows at T. If the test framework's clock
control affects the actual Worker runtime, use it and restore it after the test.
If it only changes the outer Node process, the test still contains two clocks.
Prove the runtime behavior before relying on that mechanism.

If a small clock injection is required, supply it through server construction or an
internal service dependency. Production keeps the current wall-clock default. Do
not accept a query parameter such as `?now=...` from API callers: a test seam must
not let a user choose the operational quota clock.

### The boundary cases that make the test meaningful

Use a window ending at 20:16 and query it at three instants:

```text
20:15:59.999 -> present
20:16:00.000 -> absent
20:16:00.001 -> absent
```

The exact-end assertion protects the `>` boundary. A new reservation in the next
window must appear independently. A daily window may remain active after its minute
window expires, so test each window's identity rather than expecting the whole
response to disappear at the first expiry.

Keep the admin-only and redaction assertions. Stabilizing time should not remove
checks that the capture token is rejected or that private fixture text is absent.
Completion is a deterministic route test plus expiry coverage, followed by the D1
suite. Moving the fixed date far into the future merely postpones the defect.

### Small implementation steps

1. Follow `AiCapacityService.admit()` into the window creation code. Follow
   `/usage` into `AiCapacityStatusService.status()` and `listActiveWindows()`.
2. Write down the exact boundary: windows ending at or before the query time are
   expired. Preserve that database predicate.
3. Use one controlled timestamp for reservation and HTTP request. Prefer an
   existing test clock mechanism if the workerd harness supports it; verify that
   it affects code inside that runtime, not only the outer test process.
4. If reliable runtime clock control is unavailable, introduce a narrow server
   clock dependency or test factory, keeping production default `new Date()`.
   Do not add a public query parameter that lets callers select the quota clock.
5. Restore any fake clock after the test. Avoid fake timers that break leases,
   migrations or unrelated suites.
6. Add the complementary expiry assertion: after the window ends it disappears
   from active usage. Check exact reset-boundary behavior separately.
7. Keep the authorization and secret-redaction assertions already in the test.

### Proof and completion boundary

Run this D1 test, then the D1 suite. Demonstrate active-before-end and
expired-at/after-end behavior with deterministic times. Do not weaken the assertion
to accept an empty array. Completion means the test verifies real behavior on any
date; it does not change provider limits.

### Execution checklist

Follow the [100 microtasks for BG-02](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-02--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 9. BG-03 — Carry edit versions through the smoke script

**What and why.** `edit_version` is the item's revision number. The API requires it
so an old screen or script cannot silently overwrite newer changes.

**When.** After BG-02. **Where.** `scripts/verify-production-release.mjs`,
`apps/worker-api/src/policy/policy.schema.ts`, the item detail contract, and privacy
routes/services.

### Why the privacy request needs a revision number

Imagine opening an item in two tabs. Tab A changes privacy to Sensitive. Tab B is
still showing the old Public state. If B can submit an unversioned update, it may
undo A's newer decision without noticing. `edit_version` makes that conflict visible.

The smoke script predates this contract. It sends the desired privacy and action,
but no version, so the server rejects the request with 422 before changing anything.
The repair belongs in the script's request construction; removing version validation
from the API would reintroduce lost-update behavior for every client.

### How to build the version-aware mutation helper

Fetch `GET /api/v1/items/:id` using admin authentication and read
`data.item.edit_version`. Validate that it is a positive integer. Then construct the
privacy payload with that value and the scenario's explicit privacy controls.

The following is proposed control flow, not a new API endpoint:

```text
detail = GET item
version = validate(detail.data.item.edit_version)
PATCH privacy with scenario fields + edit_version = version
require expected response
GET item again before the next independent mutation
```

Refetching matters because several successful operations may advance the version.
Do not write `version += 1` and assume the local counter is authoritative. Equally,
do not interpret all database change counts as version increments: FTS triggers may
write index rows without defining the item revision.

### A real conflict must remain a failed scenario

If another writer changes the item after the GET, the PATCH should reject the stale
version. The verifier should report the conflict and stop that scenario. It should
not silently refetch and overwrite until it “wins.” Such a loop would hide the very
concurrency behavior the version is meant to protect.

For example, an illustrative current-version payload is:

```json
{
  "edit_version": 7,
  "privacy_level": "sensitive",
  "derived_data_action": "purge"
}
```

Here `purge` refers to the privacy contract's derived-data action. It is not the
separate permanent canonical-item purge workflow. The script must preserve that
distinction in its labels and evidence.

Validate both outcomes: a current version succeeds, and a deliberately stale version
is rejected without altering the current item. Then run the full privacy sequence
and check the process exits nonzero on unexpected failure. This proves more than
simply removing the original 422.

### Small implementation steps

1. Read the current `GET /api/v1/items/:id` response. The item version is under
   `data.item.edit_version`; do not assume capture creation returns it.
2. After creating the synthetic capture, fetch its detail using the admin token.
3. Introduce a small script helper that reads the current item and extracts a
   valid positive integer version. Fail clearly if the response is malformed.
4. Add that version to each privacy PATCH. After each successful mutation, obtain
   the next version from a documented response field or refetch detail.
5. Do not blindly increment a local number. Other mutations may have changed the
   server state, and FTS triggers do not define the edit version.
6. On `VERSION_CONFLICT`, report a conflict and stop that stage. The smoke is not
   an automatic overwrite tool. A retry must reconsider the current item.
7. Preserve `derived_data_action`, consent, credential-source and privacy fields
   required by the exact scenario. A version fix must not weaken privacy tests.
8. Make the script return a nonzero process exit status on any failed assertion.
   A shell wrapper must preserve that status instead of returning the status of
   a later `cat` command.

### Example sequence

```text
Create test item -> GET detail, version 1
PATCH public/reprocess with version 1 -> success
GET detail -> actual next version
PATCH personal/no-consent with that version -> success
GET detail -> actual next version
Continue remaining scenarios
```

### Proof and completion boundary

The original 422 disappears. A deliberately stale version still fails. All privacy
steps execute using current contracts. This task does not prove the remaining smoke
stages or authorize running the script against production.

### Execution checklist

Follow the [100 microtasks for BG-03](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-03--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 10. BG-04 — Finish the smoke story and repair setup instructions

**What and why.** A script that stops halfway cannot establish end-to-end readiness.
A README command that does not exist prevents a new contributor from even starting.

**When.** After BG-03. **Where.** The release verifier, root README, API/policy
contracts, and attachment tests.

### Why a smoke script needs an explicit story

The existing verifier is intended to create neutral records and prove the main
contracts against a running Worker. Its first privacy failure prevents later
attachment assertions from running. Therefore “the verifier ran” is not equivalent
to “attachments passed.” Each stage needs its own observed outcome.

Organize the script around named stages with an expected HTTP status and a semantic
assertion. A duplicate stage checks IDs and event behavior. An attachment stage
checks bytes. A policy stage checks eligibility and required controls. Merely receiving
HTTP 200 cannot prove all three meanings.

### Separate permitted routing from executable capability

The policy may publish a fallback that is not enabled in a particular local setup.
A policy test should verify the approved rule. A provider execution test should
verify the configured adapter. Combining them into one assertion can make a missing
local credential look like an incorrect policy, or make a permitted fallback look
like successful real execution when no request happened.

Keep fixed expectations for approved behavior rather than deriving every expected
value from the response itself. At the same time, refresh genuinely stale policy
version and payload assumptions against the governing source contract.

### What file verification must demonstrate

A signature-valid test PDF is sufficient for upload/download byte preservation if
that is the server admission contract. It is not sufficient for proving PDF parsing.
Use two named fixtures: a small byte-round-trip fixture and a parseable document
containing a known phrase. This prevents a passing hash assertion from being reported
as extraction acceptance.

The default smoke should not permanently purge data. Give it unique fixture markers
and limit any cleanup to records that the run owns. The separate purge and restore
rehearsals have stronger target and confirmation requirements.

### Why the README is part of this task

A new contributor following `npm run dev` currently reaches a nonexistent script.
Explain the two-process setup: one terminal runs `dev:api`, another runs `dev:web`,
and the Web proxy must reach the prepared local Worker database. Include the quality
gate and explain that the script stops at the first failed command.

After this task, the verifier must honestly report reached, passed, failed and
unavailable stages. Known BG-07/BG-10 defects remain visible until repaired; they
must not be converted to passing assertions to make Priority 1 look green.

### Small implementation steps

1. Audit every hardcoded assertion against source: policy version, provider
   eligibility, fallback list, authentication status, duplicate semantics and
   attachment finalization response.
2. Distinguish policy eligibility from installed provider capability. A policy
   permitting a fallback does not prove an adapter is configured to execute it.
3. Give each test run a unique marker and retain only synthetic input. Write a
   compact stage summary so a later failure does not hide earlier outcomes.
4. Finish duplicate, replay, all privacy cases, upload/finalize/link/download,
   anonymous denial and raw retrieval while optional processing is unavailable.
5. Label the small signature-valid PDF as a byte-preservation fixture. Use a real
   parseable PDF with a known internal phrase for extraction acceptance.
6. Add search, cookie-login/download, edit-conflict, soft-delete/restore and export
   smoke stages where the repaired contracts permit them. Keep destructive purge
   and clean-target restore in a separate explicitly selected scenario.
7. Correct README startup to separate `npm run dev:api` and `npm run dev:web`.
   Document migration state, dummy secrets, API port and Vite proxy dependency.
8. Keep remote execution explicit. A script should print its target origin before
   it writes synthetic records and should never infer production from a missing
   local URL. Production cleanup must not delete arbitrary existing items.

### Proof and completion boundary

Run all stages locally and inspect each result. Following the README in a clean
local setup must start the API and Web app. The completed script remains a
verification tool; it is not a deployment command.

### Execution checklist

Follow the [100 microtasks for BG-04](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-04--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 11. BG-05 — Close Priority 1 with one complete gate

**What and why.** Stop carrying an expected failure into every later change.

**When.** After BG-04. **Where.** Existing npm scripts, CI, audit evidence.

### What “green foundation” means at this point

Priority 1 repairs the tools used to judge later work. It does not secretly complete
all of Priority 2. The automated repository gate should pass after fixing its dated
test. The smoke runner should execute supported stages correctly and report known
application failures honestly.

Treat these as two columns in the evidence record: the repository quality result
and the user-workflow result. If browser download still fails at this point, label
it as the already identified BG-07 blocker. Do not call the entire product green.

### How to run a gate that means something

Use a single candidate revision with the intended Node version and lockfile. Run
`npm run check` as written. Record the real exit code. If it fails, later checks can
still be run for diagnosis, but their success does not transform the original command
into a pass.

Apply the migration chain to an empty local state to establish that a new install
can start. A working developer database is insufficient because it may contain
manual fixes absent from migration files. Build the Web bundle and perform a Worker
dry run from the same candidate so source and artifact evidence stay connected.

### Why testing the same successful thing repeatedly adds little

A passing focused regression answers whether the changed behavior works. A passing
full suite answers whether surrounding contracts were affected. Run another check
when code changed, a failure remains unexplained or a new risk needs evidence. Do
not turn the 100-step tracker into 100 identical full-suite runs.

The completion record should identify the candidate, commands, test counts,
migration result and remaining user-workflow blockers. That gives BG-06 a stable
starting point without hiding the defects it is supposed to repair.

1. Run `npm run check` under Node 22 without skipping the dated test.
2. Apply all current migrations to fresh local D1 and retain the migration list.
3. Run the Worker deployment dry run and Web build for the same source revision.
4. Run the corrected smoke against isolated state, preserving a failing exit code.
5. Record exact test counts, SHA, versions, commands and unresolved qualifications.
6. If any gate fails, fix that cause before declaring Priority 1 complete. Do not
   replace a failed gate with an unrelated passing subset.

**Done when:** the foundation gate is green and the verifier reaches all currently
supported stages. The later known application defects may have explicit expected
reproduction checks; they must not be silently labeled passing acceptance.

### Execution checklist

Follow the [100 microtasks for BG-05](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-05--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

---

# Part IV — Priority 2: repair the broken user workflows

## 12. BG-06 — Define who may read an attachment

**What and why.** The browser presents a valid admin session cookie. The attachment
middleware currently only understands bearer tokens. These are two ways to prove
identity, and their intended permissions need to agree.

**When.** After BG-05. **Where.** `apps/worker-api/src/shared/auth.ts`,
`apps/worker-api/src/auth/auth.routes.ts`, and
`apps/worker-api/src/attachments/attachment.routes.ts`.

### The required permission table

| Request identity           | Download attachment content                        | Upload/write behavior                               |
| -------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Anonymous or invalid token | Reject                                             | Reject                                              |
| Valid capture bearer token | Preserve baseline read permission                  | Preserve capture-scoped permissions                 |
| Valid admin bearer token   | Allow                                              | Preserve admin permissions                          |
| Valid admin session cookie | Allow                                              | Expand only through BG-15's explicit write contract |
| Local-worker token alone   | Preserve current denial unless separately designed | Only local-worker routes                            |
| Expired/tampered session   | Reject                                             | Reject                                              |

### Why the same owner is accepted on one route and rejected on another

The login route signs an `admin_session` cookie. `requireAdminToken` understands
that cookie as well as an admin bearer token. `requireCaptureToken` only examines
the Authorization header, although it accepts either the capture or admin secret
there. The browser's ordinary Download link sends cookies, not a custom bearer header.

That produces the current mismatch:

```text
Web login -> valid signed cookie
Item detail -> admin guard accepts cookie
Download -> capture guard sees no bearer header -> 401
```

The permission decision is about reading original content. We should settle that
capability explicitly before editing router middleware.

### Why middleware order is part of the implementation

The attachment router installs a wildcard guard on `/attachments/*`. That guard
runs before the content handler. Adding cookie support only inside the handler
will not help because the request never reaches it.

The proposed design is a reusable content-read authentication check that accepts
the existing capture/admin bearer forms and the verified admin cookie. Apply it to
the read-content path, and preserve admin-only checks for destructive operations.
Exact helper naming is an implementation detail; the permission matrix is the contract.

Do not “fix” this by accepting any cookie named `admin_session`. Verify the signature
using the existing library and compare the expected signed value. A caller can type
a cookie name; only a valid signature establishes the intended session.

### Authentication does not replace object-lifecycle checks

The current handler allows finalized or linked attachments, rejects unavailable
statuses, checks expiry for finalized uploads and reads the object using the stored
R2 key. These checks answer whether this particular attachment is still available.
They remain necessary after the request identity is accepted.

The baseline allows capture-token reads. Preserve that approved behavior unless a
separate authorization decision changes it. Do not narrow it accidentally while
adding cookie access, and do not broaden local-worker access without a content
permission contract.

### The output is a tested access decision

Exercise valid and invalid bearer tokens, valid/tampered/expired sessions, anonymous
requests and mixed header/cookie requests. Decide mixed-identity precedence once and
use it consistently. A test must also verify capture credentials still cannot invoke
admin-only deletion. BG-06 is complete when the route's permission rules are explicit
and executable; BG-07 then proves the original actually downloads in the browser.

### Small implementation steps

1. Inspect middleware order. The existing wildcard `/attachments/*` guard runs
   before the content route. Adding a second permissive handler after that guard
   will not fix the rejection.
2. Identify read-content authorization separately from upload, usage and deletion
   authorization. Preserve any admin-only second guard on destructive operations.
3. Reuse existing constant-time bearer comparisons and signed-cookie validation.
   Avoid copying cryptographic logic into the attachment module.
4. Specify behavior when both cookie and Authorization are present. Keep one
   documented rule across routes; test malformed and wrong-scope headers too.
5. Keep object identity server-owned. The client supplies attachment ID, never a
   raw R2 key or bucket URL.
6. Inspect expired, missing, purged and unlinked object handling. Authentication
   success must not make every historical object downloadable.
7. Use a route-specific read guard or a small shared guard with a precise name.
   Do not make all capture-token routes accept cookies as an accidental side effect.

### Implemented BG-06 access decision

BG-06 implements the read boundary as a capability-specific guard on
`GET /api/v1/attachments/:id/content`. The guard accepts a valid capture bearer,
a valid admin bearer, or a verified signed admin session cookie. These credentials
are alternatives: one valid permitted credential is sufficient, so an invalid or
wrong-scope Authorization header does not suppress an otherwise valid signed admin
cookie, and an invalid cookie does not suppress an otherwise valid permitted bearer.

Upload routes keep their existing capture/admin bearer guard. Attachment deletion
keeps its previous effective boundary explicitly as `requireCaptureToken` followed
by `requireAdminToken`: an admin bearer can delete, while a capture bearer and a
cookie-only browser session cannot. Any broader browser write permission remains
owned by BG-15 rather than being introduced as a side effect of BG-06.

Signed-cookie verification continues to use the existing Hono helper and admin
secret. Browser expiry removes the credential before the request reaches the
server; tampered and cleared/logout cookies fail verification. Object lifecycle,
stored R2-key lookup, private/no-store caching and safe filename behavior remain
unchanged after authentication succeeds.

Implementation and regression evidence lives in
[`docs/verification/BG-06_ATTACHMENT_READ_AUTH.md`](verification/BG-06_ATTACHMENT_READ_AUTH.md).

### Proof and completion boundary

Exercise every row with the real route. A valid cookie reaches the content lookup;
anonymous callers do not. Admin-only deletion remains admin-only. This task defines
and tests access; BG-07 proves the browser actually receives the file.

### Execution checklist

Follow the [100 microtasks for BG-06](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-06--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 13. BG-07 — Make the browser Download link work

**What and why.** The owner must be able to inspect the original file behind an
extraction. Otherwise the review page cannot substantiate its derived text.

**When.** After BG-06. **Where.** Attachment route, `apps/web/src/App.tsx`, browser
acceptance harness and attachment integration tests.

### Keep the existing file response; repair the path that reaches it

The current content handler already streams `object.body` from private R2 and sets
useful headers: detected MIME type, byte length, a sanitized attachment filename,
`Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. The default
change should preserve this working response rather than replace it with a new
base64 download API.

Apply BG-06's guard so a legitimate cookie request can reach that handler. Keep the
ordinary same-origin anchor in the Web app. This lets the browser handle downloading
without exposing credentials or buffering the whole file in React state.

### Why byte equality is stronger than a successful page

A server can return HTTP 200 with an HTML login page, error text or the wrong file.
The test must compare the downloaded bytes with the uploaded original. For a PDF,
record size and SHA-256 before upload, then compare both after following the actual
Download link. Repeat with an image so the test is not accidentally coupled to PDF
content type.

The story is deliberately cross-layer:

```text
real login form -> signed cookie -> attachment route guard
                 -> D1 attachment lookup -> R2 object -> browser download
```

A test that places an Authorization header directly on fetch skips the failing
boundary. Keep that bearer test for compatibility, but do not use it as the browser
regression.

### How reload, logout and object removal should behave

Reloading item detail should keep the valid session usable. Logging out removes the
browser cookie, so a new private request from that browser is denied. This does not
claim that logout revokes every copied cookie worldwide; BG-24/BG-25 address session
revocation semantics separately.

If the attachment was purged, the UI must receive the route's controlled unavailable
result, not a stale public cache response. Preserve private caching headers and test
a fresh anonymous request after an authenticated download.

Completion means the owner gets the exact original with the expected safe filename,
while unauthorized and unavailable-object cases still reject. The resulting evidence
should include the actual browser path and matching hashes. A screenshot showing a
Download button proves only that a button exists.

### Small implementation steps

1. Implement the approved guard and remove only the conflicting middleware path.
2. Keep the normal same-origin link if the cookie route now works. There is no
   need to expose an admin token to JavaScript or append one to a query string.
3. Verify response MIME type, safe filename, content disposition and byte stream.
   Treat filenames as untrusted metadata; prevent header injection.
4. Choose private download caching deliberately. A shared cache must not replay a
   previous authenticated response to an anonymous user.
5. Test PDF, image and a supported generic file. Compare SHA-256 and size against
   the upload fixture, not only HTTP status.
6. Log in through the actual session endpoint, retain its cookie, then download.
   This catches the gap that bearer-only tests missed.
7. Repeat after page reload and logout. Reload should retain a valid session;
   logout should prevent a new authenticated download request.
8. Verify missing/purged attachment behavior and a tampered cookie. Do not weaken
   the route to make the happy-path test pass.

### Before and after

```text
Before: Login -> open item -> Download -> authentication error JSON
After:  Login -> open item -> Download -> original bytes and safe filename
```

**Done when:** the exact browser failure is gone, bytes match, and anonymous access
still fails. Record both the browser story and the route authorization matrix.

### Implemented BG-07 browser contract

BG-07 preserves the BG-06 authorization decision and the existing Web anchor. The
attachment route continues to accept a capture bearer, admin bearer or verified
signed admin session cookie for eligible content reads. Upload and delete boundaries
remain unchanged.

The download response now has explicit regression coverage for exact bytes, MIME,
Content-Length, ETag, `private, no-store`, `nosniff`, safe ASCII filenames and
Unicode `filename*` handling. Hostile filename metadata cannot inject response
headers. Missing, deleted/purged, unavailable and missing-object states remain
controlled failures, and attachment IDs never become R2 keys.

The release verifier treats signed-cookie download as a required pass rather than a
known unavailable stage. Its regression suite also proves that a cookie-path `401`
fails release smoke.

The dedicated `browser:download:test` acceptance starts isolated local Wrangler
state, the real Worker, the real Vite app and headless Chrome. It logs in through the
actual password form, verifies the HttpOnly `admin_session`, navigates to real item
detail pages and clicks the existing same-origin Download anchor. PDF, PNG and text
fixtures must save with the expected filename, byte length and SHA-256.

The same browser story verifies reload continuity plus fresh `401` denial after
logout, a tampered session and an expired session. The synthetic admin token is not
stored in browser local/session storage and no credential is added to the download
URL.

Implementation/browser evidence lives in
[`docs/verification/BG-07_BROWSER_DOWNLOAD.md`](verification/BG-07_BROWSER_DOWNLOAD.md),
with checklist reconciliation in
[`docs/verification/BG-07_CHECKLIST_RECONCILIATION.md`](verification/BG-07_CHECKLIST_RECONCILIATION.md).

BG-07's final implementation/documentation head passed GitHub Actions CI run #208,
including the full repository, local migration and Chrome acceptance gates.
Implementation PR #42 merged into `main` at
`27aa0dad8cf82c8e8c483baaf1b302c4772d170d`. The authoritative checklist is
100/100 on a documentation-only closeout branch created directly from that merged
application tree. When the closeout is validated and present on `main`, BG-07 is
complete and BG-08 is unlocked.

### Execution checklist

Follow the [100 microtasks for BG-07](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-07--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 14. BG-08 — Define honest URL acquisition and coverage

**What and why.** A web address is a pointer, not the page itself. A model cannot
summarize an article that the application has never acquired.

**When.** After BG-07. **Where.** Capture scheduling, extraction services, enrichment,
`docs/USE_CASES_AND_FLOWS.md`, source coverage contracts and approved privacy policy.

### A bookmark and an acquired article are different records of knowledge

Saving `https://example.test/article` gives RecollectFlow an address. It does not
give it the article's paragraphs. In the current enrichment path, usable text comes
from title, user note, raw text and attachment extractions. A bare URL supplies none
of those, so `NO_CONTENT_TO_ENRICH` is predictable.

The desired feature is source acquisition before optional interpretation. Keep the
original URL unchanged, derive a canonical URL for conservative deduplication, and
record a fetched final URL as acquisition evidence. A redirect must not rewrite the
original share event or silently merge two canonical items.

### Define outcomes before choosing a parser

Consider four captures:

```text
Public article -> readable body acquired -> source text can be indexed
Login page -> article unavailable -> original URL and reason remain
Instagram link -> no transcript acquired -> URL_ONLY remains truthful
Private link -> fetch not approved -> retain without contacting source host
```

Each is a durable capture. Their coverage differs. Coverage says what was acquired;
processing status says whether the intended stages have finished; summary quality
says whether the derived interpretation is useful. One field cannot honestly replace
all three concepts.

### Why fetching needs its own privacy decision

Even without AI, requesting a URL contacts another server. The URL may contain a
private resource identifier or a signed access token. The approved AI matrix does
not automatically authorize every source request. Begin with the proposed narrow
Public-only acquisition behavior and record any broader policy before implementing it.
Unknown must not silently become Public just to make article processing succeed.

Use existing coverage values when their meanings fit. If full webpage text needs a
new value, add it consistently to persistence, API, UI and tests. Do not label full
HTML extraction as screenshot text, and do not claim a Reel was watched because its
title was visible.

### The owner-visible result must explain the useful limit

For an inaccessible article, say that the link and reason are saved but the page
requires login. Offer supplying text or a screenshot where appropriate. Such an
outcome should not repeatedly consume retries with no prospect of changed input.
BG-08 finishes with a state/outcome contract and examples; BG-09 implements network
acquisition and BG-10 makes the evidence durable and searchable.

### Small implementation steps

1. Separate original URL, conservative canonical URL, fetched final URL, acquired
   text, metadata and generated summary. They have different meanings.
2. Keep the original URL and share event immutable. Redirects must not silently
   rewrite the owner's submitted evidence or change duplicate ownership.
3. Define outcomes before coding: acquired text, metadata only, unavailable,
   disallowed destination, login required, timeout, unsupported content and empty
   extraction. Reuse approved coverage terms where they fit.
4. If a new machine-readable coverage value is necessary, update the data/API/UI
   contract deliberately. Do not invent a string only one component understands.
5. Decide which privacy classes permit source fetching. A page request itself
   contacts an external host, even when no AI call happens. Recommended initial
   scope: explicitly public HTTP(S) sources only; preserve Unknown/Personal/
   Sensitive URL-only captures unless an approved policy says otherwise.
6. Decide what makes a URL worth enriching: acquired text or user-supplied text,
   with exact provenance. A title alone supports a very limited interpretation,
   not a full-page summary.
7. Record proposed fetch limits and outcome/error vocabulary in the extraction
   specification. Distinguish configuration recommendations from existing values.
8. Specify unsupported Instagram behavior: retain URL and reason, show URL-only
   coverage, and explain that a screenshot or supplied text can add evidence.

### A useful design example

> “Saved. This page requires login, so only its link and your note are available.”

That is a successful save with limited coverage, not a false claim that the article
was read. It must not generate an endless Retry loop for an unchanged login page.

**Done when:** every outcome has a durable representation, user message and retry
classification. This is a contract decision; the fetcher comes next.

### Execution checklist

Follow the [100 microtasks for BG-08](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-08--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 15. BG-09 — Build a bounded source fetcher

**What and why.** Fetching a user-supplied address creates a new network boundary.
It needs limits so one saved URL cannot cause unbounded downloads or access to
private infrastructure.

**When.** After BG-08. **Where.** A proposed URL acquisition module under
`apps/worker-api/src/jobs/extraction/`; reuse repository adapter conventions.

### Why arbitrary URL fetching is a new security boundary

A fetcher runs from the Worker, not from the owner's phone. A submitted address
could point at an internal service, loop forever through redirects or return an
unbounded body. The feature must control destination, duration, bytes and parsing
before treating the response as source text.

Use the platform URL parser. Reject unsupported schemes and embedded credentials.
Validate normalized addresses, including IPv6 and unusual IPv4 representations.
Checking whether a string contains `localhost` is not a destination policy.

### How the fetch operation should be divided

The proposed internal flow is:

```text
parse and authorize destination
  -> start total deadline
  -> request without application credentials
  -> validate status/type/redirect target
  -> bounded stream read
  -> bounded text extraction
  -> normalized source outcome
```

Every redirect passes through destination validation again. A safe-looking first
URL may redirect to a forbidden target. Do not forward the owner's admin cookie,
capture token or provider key to the source host.

The earlier guide proposes initial budgets of 10 seconds, three redirects, 2 MiB
response bytes and 100,000 extracted characters. These are design starting points,
not existing platform guarantees. Measure the selected parser in workerd and record
the final contract before release.

### Why checking Content-Length is not sufficient

An upstream server may omit or lie about Content-Length. Read through a bounded
stream, count actual admitted bytes and cancel when the limit is exceeded. Account
for compressed content and expansion so a tiny compressed transfer does not create
an enormous parser input. A timeout should bound the entire operation, including
redirects, not restart the budget on every hop.

Destination validation also needs an actual runtime enforcement story. A DNS lookup
followed by an independently resolving fetch can still be vulnerable to changed
resolution. If the runtime cannot enforce the intended protection, use a reviewed
restricted acquisition mechanism or allowed-host scope and keep other inputs URL-only.
Do not describe a hostname check as a complete solution to that problem.

### Parsing produces evidence, not trusted instructions

Use a maintained runtime-compatible parser to extract readable text and metadata.
Do not execute scripts. Store source text as data even if it says “ignore your rules”
or asks the model to reveal a key. Test redirects, loops, private destinations,
chunked overflow, malformed HTML, timeouts and login-only pages with controlled
responses. Completion requires bounded behavior on all of these paths, not just a
successful fetch of one public article.

### Small implementation steps

1. Parse with the platform URL parser. Reject unsupported schemes, embedded
   username/password values and malformed addresses before network work.
2. Enforce destination policy for loopback, private/link-local addresses, metadata
   endpoints and restricted ports. Normalize IPv4/IPv6 and encoded forms before
   judging them. A substring check for `localhost` is insufficient.
3. Document how the deployed runtime enforces destination resolution and redirect
   safety. A DNS lookup followed by an unrelated fetch can be vulnerable to a
   changed resolution. Do not call that design safe without runtime evidence.
4. If the chosen runtime cannot enforce the required boundary, use a reviewed
   restricted acquisition mechanism or a constrained allowed-host mode. Keep
   unsupported inputs URL-only; do not ship an unrestricted workaround.
5. Handle redirects explicitly with a bounded count. Validate every new target and
   never forward admin/capture cookies, Authorization or provider keys.
6. Bound total wall-clock time, response bytes and extracted characters. A proposed
   starting budget is 10 seconds, 3 redirects, 2 MiB response bytes and 100,000
   extracted characters; measure and record final approved values before release.
7. Enforce the byte bound while reading the stream, including missing/false
   Content-Length and compressed-body expansion considerations. Cancel on overflow.
8. Accept only intentionally supported response content types. Do not try to parse
   a binary download as HTML or execute webpage scripts.
9. Extract readable content and safe metadata. Remove script/style/navigation
   clutter using a maintained parser compatible with the Worker runtime. Select
   the parser after a local bundle/runtime trial, not by an unverified API guess.
10. Normalize fetch/parser failures into stable safe outcomes. Keep full response
    bodies and signed URL query values out of routine logs.
11. Treat acquired text as source data, not instructions for tools or credentials.

### Proof

Test a normal page, multi-hop redirect, loop, private destination, misleading MIME,
large/chunked body, timeout, login page, malformed HTML and empty page. Use local or
injected fetch fixtures; automated tests should not depend on arbitrary public
websites staying unchanged. Verify no application secret reaches the fetch spy.

**Done when:** every network path is bounded and every rejection preserves capture.
The task does not bypass login, bot protection or platform controls.

### Execution checklist

Follow the [100 microtasks for BG-09](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-09--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 16. BG-10 — Persist URL evidence and chain processing safely

**What and why.** Fetching into a temporary variable is not enough. The acquired
source must remain inspectable and searchable after the Worker exits.

**When.** After BG-09. **Where.** Capture repository scheduling, extraction workers,
enrichment service, migration files, item detail, FTS synchronization, export/restore
and purge services.

### Why fetching into memory does not complete the feature

If the Worker fetches an article, generates a summary and discards the article text,
the owner cannot inspect the source later and lexical search cannot reliably find
its internal phrases. A restart also loses any unfinished intermediate result.
Source acquisition therefore needs a durable representation separate from summaries.

The existing extraction schema is attachment-oriented. Do not fabricate an attachment
row to make a webpage fit it. Prefer a small additive URL-evidence representation,
with exact names finalized during implementation. It needs an item reference,
source/input revision, fetch time, requested/final URLs, parser version, content hash,
acquired text, metadata, coverage and a safe outcome/error.

### What the database change must preserve

The next available forward migration creates the chosen representation and indexes
its item/current-evidence lookup. Keep the canonical item and capture events intact.
Test the migration on both an empty database and a populated prior schema; a fresh
install passing does not prove existing captures survive an upgrade.

The source revision identifies which input a result belongs to. Without it, an old
fetch can overwrite newer evidence after the owner changes privacy or requests a
fresh acquisition. Reuse sufficient existing revision information; add a new marker
only when the existing contract cannot express this identity.

### The durable handoff between stages

Capture should persist the original and queue acquisition without waiting for the
network. The acquisition worker leases that job, checks current eligibility, fetches
outside the database transaction, then rechecks eligibility before accepting the result.

```text
canonical capture committed
  -> acquisition job leased
  -> bounded fetch
  -> guard current item, privacy, revision and lease
  -> commit evidence + eligible enrichment job together
```

The final database change must not leave “evidence saved but next job forgotten” or
“next job created twice after retry.” Use existing conditional D1/batch patterns to
make replay converge. A stale lease writes no accepted evidence.

### Search, recovery and deletion are part of this feature

Teach enrichment to read the acquired evidence while preserving owner overrides.
Teach FTS synchronization and its rebuild to index the source text without AI.
Expose the evidence in item detail using escaped text.

Also add it to export, restore, purge and integrity. Otherwise a backup silently
loses the new source material, or a permanent purge leaves it behind. Acceptance
uses a page whose internal phrase is absent from its URL and title: acquire it with
AI disabled, find that phrase, round-trip the item through isolated restore, then
verify purge removes the source evidence and search terms.

### Small implementation steps

1. Inspect the current attachment extraction table. Do not create a fake attachment
   merely to fit a URL into an attachment-only schema.
2. Choose a small additive URL-evidence table or a compatible generalized extraction
   representation. Proposed fields: ID, item ID, input/source revision, requested
   and final URLs, fetch time, parser name/version, content hash, acquired text,
   metadata, coverage, safe error code and outcome.
3. Allocate the next migration number available at implementation time. Do not
   assume `0022` remains unused when this guide is executed.
4. Add foreign keys, bounded fields and indexes for item lookup/current evidence.
   Test both a fresh database and a populated database upgraded from the prior head.
5. Queue URL acquisition after raw persistence. Reuse the lease/retry mechanism;
   do not fetch inside the capture request or create an untracked `waitUntil` task.
6. Carry item/input/privacy identity through the lease. Recheck current deletion,
   purge and privacy state before fetching and before committing its result.
7. Commit accepted evidence and creation of eligible enrichment work in one
   durable transaction/batch. Replaying a completed lease must not duplicate work.
8. Have enrichment read the new source evidence explicitly. Preserve user overrides
   and keep source text separate from generated fields.
9. Make acquired text searchable without AI. Update FTS trigger/rebuild behavior
   together with search regression fixtures; do not merely place text in a detail
   response and assume the index knows about it.
10. Extend portable export, clean-target restore, purge cleanup and integrity
    checks to cover the new evidence. Otherwise the new feature disappears during
    restore or survives after deliberate purge.
11. Expose URL coverage/source text in item detail with escaped text rendering.

### Proof

A local page fixture contains a phrase absent from its URL/title. Save the URL, run
acquisition with AI disabled, then find that phrase through FTS. Verify detail,
export/restore and purge agree. Simulate a crash after evidence write and replay;
there must be no duplicate enrichment job or lost evidence.

**Done when:** the URL's actual content survives process restarts and reaches search.
A generated summary alone is not sufficient evidence.

### Execution checklist

Follow the [100 microtasks for BG-10](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-10--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 17. BG-11 — Handle unavailable URLs, retries and old captures

**What and why.** Not every page can be read. The system should retain a useful
bookmark and explain the limitation instead of presenting a permanent mystery.

**When.** After BG-10. **Where.** URL acquisition outcomes, job service, item UI,
manual retry controls and migration/reprocess tooling.

### Explain a failed acquisition without destroying the capture

A saved URL and a fetched article are different durable results. If a website
returns 403, the owner still saved the URL successfully. Preserve that item and
show that source acquisition failed; do not roll back the capture or present an
empty summary as successful extraction. Implement this after BG-10 establishes
where acquisition evidence lives, because retry must update that evidence rather
than manufacture another item.

Classify failures by the action that can resolve them. A temporary timeout may
qualify for bounded retry. A destination rejected by the privacy/network policy
must not be retried until the policy or input changes. An unsupported document may
remain metadata-only. A login wall should explain that the owner can paste text;
it must not invite storing website credentials in the fetcher.

### Make retry an explicit transition

For a proposed retry command, read the item and current acquisition generation,
check authorization and privacy, then enqueue at most one active acquisition for
that generation. Return an existing pending attempt when the command is repeated.
If the URL changed, increment the source revision and invalidate results from the
old URL. The old in-flight request may finish, but its revision no longer permits
it to replace current evidence.

```text
URL A / revision 4 starts fetching
owner changes URL to B / revision 5
A returns -> reject stale write
B returns -> persist evidence for revision 5
```

Keep attempt count, next eligible retry time and a safe error code available to
the UI. Error text must not include response bodies or signed query secrets. Show
“Retry available” only when the backend would accept that transition. Prove the
behavior with a timeout followed by success, two repeated retry requests and a
URL change while an earlier fetch is waiting. Each case must retain one canonical
item and only current source evidence.

### Small implementation steps

1. Classify transient errors separately from permanent/unsupported outcomes.
   Timeouts and some server failures can retry; login-required and disallowed
   destinations need changed input or policy, not blind repeated fetching.
2. Map a successfully retained URL-only item to an honest completed/limited
   processing outcome under BG-12's rules. Preserve the specific limitation.
3. Use bounded attempts and backoff for transient fetch failures. Keep raw capture
   retrievable during every wait and do not charge terminal retries for quota
   deferrals governed by ADR-030.
4. Make manual retry consult current privacy, deletion, capacity and input state.
   Do not bypass the destination guard because the owner clicked Retry.
5. When an owner supplies text later, retain it with provenance and create only the
   newly needed processing generation. Do not fabricate old page coverage.
6. Design a bounded reprocessing command for existing bare-URL failures. Preview
   candidate count/IDs, exclude deleted/private/ineligible items, and process in
   batches. A deployment must not automatically fetch every old saved URL.
7. Expose a specific message and relevant next action in Web detail. Preserve the
   original link even when the external site has disappeared.
8. Record source change on re-fetch using content hash/version. Prevent a late old
   fetch from replacing a newer accepted result.

**Proof:** unavailable Instagram, deleted page, transient failure then success,
manual retry with changed privacy, duplicate scheduler invocation and an old
URL-only fixture. The original capture/event remains unchanged throughout.

### Execution checklist

Follow the [100 microtasks for BG-11](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-11--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 18. BG-12 — Define one aggregate processing-state rule

**What and why.** An item is the library record; jobs are the work slips. A record
must not say “waiting” forever when all relevant work slips have finished or failed.

**When.** After BG-11; BG-08 can identify required outcomes earlier.
**Where.** `items.processing_status`, job services, item detail/search contracts,
manual retries, extraction/enrichment workers.

### Proposed aggregate rules to finalize before coding

The current stored enum is `pending`, `processing`, `complete`, `failed`.
`retry_wait` is a job/API projection, not a stored status. Reuse this enum unless a
reviewed contract change is necessary.

| Relevant current processing jobs                       | Suggested item result | Explanation                                                      |
| ------------------------------------------------------ | --------------------- | ---------------------------------------------------------------- |
| A required stage terminally failed                     | failed                | Show which stage failed, even if unrelated optional work remains |
| No terminal blocker; active valid processing lease     | processing            | Work is currently owned                                          |
| No terminal blocker; runnable or deferred current work | pending               | Show waiting reason and next eligible time separately            |
| Every required stage finished or deliberately skipped  | complete              | Coverage still explains limited/no-AI results                    |
| No processing required under current policy            | complete              | Saved does not require hosted AI                                 |

Notion synchronization has its own state. A failed Notion projection must not turn
successful source extraction into failed processing. A deleted item remains governed
by lifecycle visibility; status reconciliation must not restore or requeue it.

### Decide what “processing” actually promises

The audit found an item still marked pending after its job had failed. The
problem is not simply the wrong badge color: the owner cannot tell whether to
wait or act. Before editing writes, define which jobs contribute to the item's
processing result and which belong to independent integrations. A Notion outage
should not make successfully acquired source content disappear.

Create a truth table for current-generation required work. For example, required
work with an active lease is processing; eligible queued work is pending;
terminal failure that prevents a required result is failed; required results
persisted successfully are complete. Resolve mixed states explicitly: if one
required job failed while another is running, decide whether the UI first shows
failure or ongoing work with a failure detail. Record that choice and test it.
These are proposed semantics, not a claim that the current implementation already
uses this aggregation.

### Separate stored state from useful presentation

The current stored vocabulary is pending, processing, complete and failed. A
future retry time can produce a “Waiting to retry” presentation without adding a
fifth database enum. The response should explain the reason and next eligible
time using job evidence. Do not infer waiting merely from an old updated_at value.

Use a small example table as the contract before implementation:

| Required work for current generation  | Intended explanation         |
| ------------------------------------- | ---------------------------- |
| Queued and eligible                   | Waiting for a worker         |
| Lease held and valid                  | Processing                   |
| Retryable failure scheduled in future | Waiting to retry, with time  |
| Required attempts exhausted           | Failed, with recovery action |
| All required outputs committed        | Complete                     |

Clarify optional AI and unsupported-source outcomes here. “Complete” must not
silently mean that full article extraction happened when only a title was saved.
Coverage remains a separate field. BG-13 may begin once every reachable job
combination has an agreed aggregate outcome and the owner-facing wording follows
that same definition.

### Small implementation steps

1. Inventory every writer of processing state and every place the UI filters it.
2. Define “relevant current job.” Old failed attempts from an earlier privacy/input
   revision cannot keep a successfully reprocessed item failed forever.
3. Reuse existing input/policy version information where sufficient. If it cannot
   distinguish processing generations, add the smallest explicit generation marker
   and migrate/backfill deliberately.
4. Specify how partial attachment success is represented: aggregate status plus
   per-attachment outcomes. Do not hide one failed required file behind another's
   successful extraction.
5. Specify precedence for simultaneous terminal failure and active unrelated work.
   Adopt and test one rule rather than relying on last writer wins.
6. Create a pure decision helper or a documented SQL projection suitable for unit
   testing. Keep clock-sensitive lease validity explicit.
7. Document expected status after manual retry, capacity pause, intentional no-AI,
   unsupported source, restoration and privacy reprocessing.

**Done when:** a reviewer can compute the same item state from a set of jobs.
The proposed table becomes a tested contract, not an informal UI guess.

### Execution checklist

Follow the [100 microtasks for BG-12](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-12--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 19. BG-13 — Update transitions atomically and reject stale workers

**What and why.** A correct status formula still fails if a late worker overwrites
the result of a newer action.

**When.** After BG-12. **Where.** `JobService`, extraction result submission,
enrichment completion, privacy mutation, manual retry and item lifecycle services.

### Update the job and the item as one outcome

At the inspected baseline, failJob updates the job's attempts, status, retry time
and lease fields, then writes an audit event. It does not update the item's
aggregate processing status. Updating the item only in that one function would
repair one path but leave completion, cancellation, exhausted leases and
reprocessing inconsistent. Use BG-12's contract to enumerate every transition
that changes required work, then route those transitions through a shared
aggregation mechanism.

The important boundary is the committed outcome. When a worker commits a terminal
job failure, the item must not remain indefinitely pending because the process
crashed between two independent writes. Use the repository's supported D1 atomic
batch/transaction mechanism for dependent database writes. Do not hold that
boundary open while making provider requests.

### Guard against workers that have lost ownership

A worker can pause long enough for its lease to expire. A second worker may then
claim the job. The first worker's eventual response must not overwrite the new
worker's result. Include current job state, lease owner, lease validity and source
generation in the conditional write as applicable. Check the affected-row result;
a rejected conditional update is not a successful completion.

```text
claim -> perform external work -> recheck ownership and revision
      -> atomically commit job result + evidence + aggregate outcome
```

Add a reconciliation path for rows already inconsistent before this change.
Calculate from current-generation jobs; do not mark every historical failed item
failed if a later reprocessing generation completed. Validate normal success,
retry deferral, terminal failure, expired ownership and a crash-boundary recovery.
The acceptance invariant is that a fresh item read explains the committed work,
including after a restart, not just immediately after a UI refresh.

### Small implementation steps

1. Call the shared state rule after lease acquisition, success, failure, deferral,
   retry, cancellation/supersession and restoration where applicable.
2. Keep job mutation and materialized item state consistent in a D1 batch or use a
   guarded recomputation whose semantics are proven under concurrency.
3. Require current lease owner, nonexpired lease, processing generation and item
   eligibility when accepting results. A failed guard must write no derived data.
4. Ensure the last stage cannot mark an item complete before its downstream job is
   durably created. Reconcile against the post-transition job set.
5. On terminal failure, update item state without altering raw source, user notes,
   overrides, duplicate ownership or capture history.
6. On retry, restore pending only for the current generation. Preserve bounded
   attempt accounting and quota checks.
7. Keep FTS triggers and optimistic `edit_version` semantics intact. Database
   change counts inflated by triggers are not proof that an item edit succeeded.
8. Reconcile existing inconsistent items in bounded batches. Preview differences,
   derive from current evidence and leave ambiguous old state visible for review.
9. Expose the same state in list/detail/filter results; do not fix only a label in
   React while API queries still return pending.

### The race to test

```text
Worker A leases old input
Owner changes privacy or starts new processing
Worker B completes current input
Worker A returns late
Expected: A is rejected; B's evidence/state remain authoritative
```

**Proof:** the audit's bare URL no longer has failed job/pending item disagreement;
parallel completion, stale result, retry, no-AI and deletion tests all agree.

### Execution checklist

Follow the [100 microtasks for BG-13](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-13--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 20. BG-14 — Prove the repaired workflow in a browser

**What and why.** The audit found a cookie/download defect despite passing backend
attachment tests. A regression should cross the same boundary as the real user.

**When.** After BG-13. **Where.** An existing browser harness if available; otherwise
one small repeatable local harness and fixture setup. Proposed test filenames are
implementation choices, not claims that browser tests already exist.

### Reproduce the journey at the browser boundary

An API client can attach a bearer token that a normal browser download link never
sends. That is why API-only coverage missed the audited attachment defect. Build
a browser story that signs in through the actual UI, opens a seeded item and
activates its Download link. The browser must receive the original bytes through
the same credentials and routing that the owner uses.

Use the isolated Worker, database and object store from BG-01. Seed deterministic
fixtures through supported APIs or a narrowly scoped fixture setup. Give each run
its own identifiers. Wait for observable state rather than an arbitrary delay:
for example, wait until the detail response exposes a linked attachment, then
click Download and hash the saved bytes.

### Make failures tell us which boundary broke

Capture the failed request's method, path, status and safe response code alongside
the browser assertion. A screenshot of an empty panel does not distinguish an
authorization rejection from a parser error. Redact cookies and tokens from
traces. Preserve a trace on failure and keep successful-run artifacts small.

Include logout and an anonymous private read, a stale version conflict and a
processing failure with its recovery message. These belong in the browser suite
because their presentation or credential behavior matters. Keep broad input
combinations in faster contract/service tests. The browser suite is ready when it
fails against a deliberately reproduced user-visible regression and passes after
the real fix; a suite that only checks headings does not establish the workflow.

1. Start isolated Worker, D1/R2 and Vite processes with explicit ports/state.
2. Seed or create a text item, parseable PDF, image and bare public URL fixture.
3. Log in through the real form; no browser network stubs for API/auth behavior.
4. Open an attachment, download it and compare bytes; repeat after reload.
5. Run URL acquisition, search for an internal page phrase and inspect coverage.
6. Cause a processing failure; confirm item state, job state, message and available
   retry action agree. Retry a recoverable condition and verify convergence.
7. Edit a derived field, reprocess and prove the owner override survives.
8. Soft-delete/restore, verify search visibility and log out. Verify new private
   content requests are rejected after logout.
9. Check a mobile viewport, keyboard navigation and visible error text. Capture
   screenshots only when useful; do not substitute screenshots for HTTP/state proof.
10. Shut down only the test processes created by the harness and retain compact
    sanitized evidence. Make repeat runs independent of previous fixture state.

**Done when:** the original broken journeys have repeatable regression coverage and
Priority 2 no longer relies on a manual assurance that the screen “looks right.”

### Execution checklist

Follow the [100 microtasks for BG-14](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-14--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

---

# Part V — Priority 3: finish web capture and hosting

## 21. BG-15 — Define browser write authentication

**What and why.** Logging into the Web Inbox currently creates an HttpOnly cookie.
The capture/upload routes expect bearer credentials. A new form must have a secure
server path; it must not recover or expose the raw admin token from browser storage.

**When.** After BG-14. **Where.** Shared auth middleware, capture/upload/Shortcut
routes, `apps/web/src/api.ts`, session routes and authorization tests.

### Give browser creation an explicit permission boundary

The Web API helper sends relative /api/v1 requests with credentials included. A
browser form therefore expects the signed session cookie to authorize capture.
The inspected capture guard accepts bearer tokens only. Before creating the form,
define which capture and upload operations an authenticated owner session may
perform, then apply that policy at the routes which currently reject it.

Reuse verified session handling. Reading a cookie named admin_session is not
verification; its signature and supported lifetime must be checked. Keep the
capture token as a separate client credential for the iPhone capture flow. Do not
copy an admin token into browser storage to bypass the missing cookie path.

### Protect writes from cross-site requests

A cookie is attached by the browser, so write authorization needs a deliberate
cross-site policy. Establish the expected origin for production and local
development, validate appropriate Origin information on browser writes, and use
the selected CSRF strategy consistently. SameSite is useful defense but should
not be treated as an explanation of every request path. Define how legitimate
nonbrowser bearer clients are handled without making an absent Origin an
unconditional cookie-auth bypass.

Prove a signed-in owner can submit the intended capture request, an anonymous
browser cannot, a tampered cookie cannot and a disallowed browser origin cannot.
Also retain the approved capture-token path. This task is complete when the
permission contract is enforceable independently of the form; BG-16 can then
focus on input and recovery instead of embedding authentication workarounds.

### Small implementation steps

1. List the exact browser operations: capture POST, upload init, byte PUT,
   finalize, optional cleanup and post-capture review updates.
2. Choose reuse of existing routes with an explicit admin-session capability as
   the default design. Add a separate browser wrapper only if a concrete protocol
   difference requires it; do not duplicate canonical capture logic.
3. Preserve capture-token scope for iPhone and admin-only scope for operations.
   A browser session must not give the capture token access to administrative data.
4. Add same-origin protections for cookie-authenticated mutations. Validate the
   expected request origin and/or an established CSRF mechanism; SameSite cookies
   alone are not the complete design for every deployment configuration.
5. Do not break bearer clients that legitimately have no browser Origin header.
   Branch the request checks by proven credential type, not by a client-supplied
   claim that it is a Shortcut.
6. Check each HTTP method and payload type. Raw byte PUT and JSON POST must both
   follow the same intended session permission boundary.
7. Keep `credentials: 'include'` in the Web API helper. Return stable 401/403 and
   validation errors without reflecting token values.
8. Define expired-session behavior mid-upload: retain the pending operation,
   request login, then resume safely using confirmed server state.

**Proof:** valid cookie success, anonymous denial, capture-token compatibility,
wrong-scope denial, cross-origin browser mutation rejection and session expiry.
No raw admin token appears in localStorage, query strings or application logs.

### Execution checklist

Follow the [100 microtasks for BG-15](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-15--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 22. BG-16 — Build the URL, pasted-text and note form

**What and why.** The Web Inbox can review existing captures but cannot create one.
This task makes it a practical secondary capture client when the Shortcut is absent.

**When.** After BG-15. **Where.** `apps/web/src/App.tsx`, `apps/web/src/api.ts`,
shared contracts. Proposed focused component: `CaptureForm.tsx` in the Web source.

### Translate a form into the existing capture contract

The current capture schema supports url, text and note inputs, with separate
fields for shared_text, url, user_reason and category. Build a small form that
makes those distinctions visible. A pasted article belongs in shared_text; the
owner's reason for keeping it belongs in user_reason. Combining both into one
field would later make extracted source content indistinguishable from an owner
annotation.

For text and note modes, reject blank content before submission while preserving
the server as the final validator. For URL mode, validate syntax and explain the
acquisition coverage selected in BG-08. A valid URL does not guarantee a readable
article. Respect the schema's current size limits rather than inventing different
frontend limits. Recheck the schema at implementation time because this guide
records an audited baseline, not a permanently frozen API.

### Walk through one submission

The user selects Note, writes content and optionally supplies a reason. The form
creates one capture operation key, assembles the strict payload including client
metadata, then sends it through the authenticated helper. Disable conflicting
submission actions while that operation is in flight, but do not erase the
fields. On a confirmed response, use the returned canonical item identifier to
open its detail page and show processing separately from capture success.

A validation response should associate field errors with the corresponding
controls. A network failure should retain the draft and offer retry using BG-17's
operation identity. Keyboard submission, labels and visible focus must work
without a mouse. The result is a saved item that survives reload; seeing a toast
or appending a temporary row to component state does not prove persistence.

### Small implementation steps

1. Add one visible “Save something” action and a dedicated capture route or panel.
   Keep navigation back to Inbox and an unambiguous cancel action.
2. Offer URL, pasted text and note modes. Switching mode should retain intentional
   input or explicitly clear incompatible fields, not submit hidden stale values.
3. Bind fields to the actual payload: `url`, `shared_text`, `user_reason`,
   `quick_category`, `privacy_level`, `captured_at`, `client` and
   `idempotency_key`. There is no capture field named `text`.
4. Default privacy to `unknown`. Explain its no-unapproved-AI behavior. Do not
   select Public merely to make the first demo generate a summary.
5. Enforce current lengths in the UI while retaining server validation: URL 2,048,
   shared text 100,000, reason 2,000, idempotency key 12–200 characters.
6. Use the exact category enum in Appendix A. Avoid a second hardcoded list that
   differs from the shared/server contract.
7. Set `source_app` to a documented Web identifier and include a real client
   version. Use an offset-aware ISO capture time.
8. Show required-field errors next to their inputs, preserve values on rejection,
   and move keyboard focus to the first actionable error.
9. Send through the authenticated helper. Disable repeated submit during one
   in-flight operation, while retaining server idempotency as the actual defense.
10. After a durable response, display Saved or Already Saved using `replayed` and
    show the returned canonical item link. Do not wait for AI or Notion.
11. If `duplicate_of` is present, explain canonical reuse without claiming the new
    reason was discarded. Verify the event history preserves it.

### What this improves

A thought becomes a first-class item without an external URL. A webpage can be
saved from a desktop browser. A mobile user can still capture when the Shortcut
is unavailable.

**Done when:** each mode creates a retrievable item, invalid submissions preserve
input, and optional-provider failure does not change the truthful Saved response.

### Execution checklist

Follow the [100 microtasks for BG-16](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-16--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 23. BG-17 — Retain stable retries and define draft lifetime

**What and why.** A timed-out request may already have reached D1. Retrying with a
new key can create duplicate work or lose the original request's meaning.

**When.** After BG-16. **Where.** A small proposed Web capture-operation module,
form state and browser persistence adapter if selected.

### Keep one operation identity across an uncertain response

Consider a capture that commits successfully just before the connection drops.
The browser cannot know whether the server saved it. If Retry generates a new
idempotency key, the next request can create a second item. Generate the key once
for the logical submission, retain the exact submitted payload and reuse both
until the outcome is resolved.

Draft identity and operation identity serve different purposes. A draft can be
edited freely before submission. Once an uncertain operation exists, changing
its payload while keeping its key makes the request ambiguous. Either reconcile
that original operation first or start an explicitly new capture after informing
the owner. Follow the backend's actual duplicate-key and payload-mismatch
contracts rather than assuming every repeated key succeeds.

### Persist only the state required for recovery

Define which text fields and operation metadata survive reload, how long they
remain and how logout clears them. Browser draft storage is a convenience; the
canonical saved item remains server-side. Avoid persisting admin secrets or
large original file bytes in ordinary localStorage. File reselection may be
necessary after reload and should be explained honestly.

Validate three distinct interruptions: before the request leaves, after the server
commits but before the response arrives, and after success is shown. The first two
must recover without duplicate items. The third must not reopen a completed
submission as a pending draft. Clear recovery state only after a confirmed
canonical result, and test a second intentional capture of the same text to prove
that deduplication is tied to the operation, not a permanent ban on similar content.

### Small implementation steps

1. Represent one logical submission as an immutable operation: key, payload,
   capture time, selected privacy, optional file reference/hash, current stage and
   any server-issued attachment/item IDs.
2. Generate the key once for that submission using a strong UUID. Keep it unchanged
   after timeout, reconnect, reauthentication and retry.
3. If the owner edits the payload after an ambiguous submission, treat it as a
   new operation only after explaining/reconciling the old one. Never reuse a key
   for different bytes or a different note.
4. Separate draft editing from submitted-operation state. The UI can allow a new
   draft while retaining the prior operation's retry record.
5. Specify reload behavior before selecting storage. Minimum in-memory retry is
   not durable offline support. If cross-reload recovery is required, use a
   versioned browser store such as IndexedDB and prove restoration after reload.
6. Record local-storage privacy behavior: what content/bytes remain on this device,
   how long, how the owner clears them and what logout does. Recommended design:
   explicit durable-draft enablement with a clear nonpersistent mode for shared
   devices; never persist application credentials with the draft.
7. Keep unavailable-file states truthful. A stored filename is not stored bytes;
   if the bytes were not retained, require file reselection and verify the hash.
8. On confirmed success, clear retry content and retain only needed navigation
   state. On permanent validation error, keep editable input without auto-retrying.
9. Bound queued count/bytes and handle browser storage quota errors. Show that the
   draft was not retained if persistence failed.
10. Provide explicit Retry and Discard controls. Discarding a local retry record
    does not delete an item that might already exist on the server.

### Proof

Drop the response after server commit, retry the same operation and get the same
capture ID. Test offline before send, reload with supported durable mode, session
expiry, storage quota failure and changed-file reselection. Never show Saved based
only on local draft persistence.

**Done when:** retry behavior is deterministic and the stated retention promise
matches actual browser behavior. Physical-iPhone queue acceptance is separate.

### Execution checklist

Follow the [100 microtasks for BG-17](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-17--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 24. BG-18 — Add browser file upload, finalize and link

**What and why.** Uploading bytes and creating an item are separate stages. A user
needs progress that describes both, especially on a weak mobile connection.

**When.** After BG-17. **Where.** Web capture form/operation module, attachment
routes/schemas and the existing capture service.

### Treat upload and capture as separate durable stages

A selected file is not yet an attachment, and uploaded bytes are not yet a linked
item. Follow the existing initialize, upload, finalize and capture/link protocol.
Persist the identifiers returned by each successful stage so a retry resumes from
the last known durable boundary. Do not restart initialization after every UI
error and leave a trail of abandoned objects.

```text
select file -> initialize reservation -> transfer bytes -> finalize
            -> capture item with attachment ID -> linked original
```

Use the server's accepted media types and limits. The initialization API accepting
an audio type does not imply that capture has an audio source_type; at the
inspected baseline such a capture uses file. Display an unsupported-file error
before transfer when possible and retain authoritative server validation.

### Explain recovery at each boundary

If transfer fails, retry the permitted transfer operation within its lifetime. If
finalization succeeded but item creation failed, keep the finalized attachment ID
and retry the capture with the same logical capture key. If that reservation has
expired, explain why reselection or a new upload is necessary instead of looping
on the old ID. On cancellation, use only the supported cleanup behavior; do not
issue a broad attachment purge.

Show progress separately for transferring and saving. The completion proof is an
item whose linked attachment can be downloaded through the signed-in browser
with a matching hash. Add cases for a rejected type, size failure, interrupted
transfer and uncertain capture response. These exercise protocol boundaries;
pretending every stage is one atomic POST hides the failures the owner will see.

### Small implementation steps

1. Add one-file selection for the supported V1 scope. Do not imply multi-file batch
   support until ordering, cancellation and partial success are designed.
2. Read allowed types and configured size ceiling from an agreed configuration
   contract. The baseline deployment limit is 25,000,000 bytes; an older roadmap
   recommendation of 20 MB must not silently override the running setting.
3. Validate obvious type/size errors in the browser. The server remains authoritative
   for signature, length, checksum and lifecycle validation.
4. Compute SHA-256 using bounded browser processing appropriate to the file size.
   Store hash and byte length with the pending operation.
5. POST upload init with `filename`, `mime_type`, `size_bytes`, optional
   `content_hash`, and upload `source_type`.
6. Retain the returned attachment ID and upload URL. Upload original bytes using
   the expected content type; the browser manages Content-Length itself.
7. Finalize only after successful byte upload. Send the expected checksum and
   inspect the server's finalization result.
8. POST capture with the finalized `attachment_id`, original stable key, reason,
   privacy and timestamp. A file/image capture without this ID is invalid.
9. Preserve the distinction between upload source types and capture source types:
   upload accepts `audio`, but capture only accepts URL/text/note/image/file.
   Approved audio uses the file capture contract; transcription is not promised.
10. On ambiguous failure, resume from confirmed state. Do not create a fresh R2
    object automatically for every Retry. If existing APIs lack needed resume
    visibility, add the smallest scoped status contract with authorization tests.
11. Handle expired uploads by deliberately reinitializing and updating the pending
    operation. Ensure old orphan cleanup remains responsible for abandoned bytes.
12. If final capture fails after finalization, retain enough state to link on retry.
    Never delete an attachment after a race in which it may already be linked.
13. Use honest labels: Uploading, Finalizing, Saving item, Saved, Retry needed.
    Use indeterminate progress if exact byte progress is unavailable.

**Proof:** PDF/image round trip, interrupted PUT, interrupted finalize, response loss
on capture, expired upload, bad signature, over-limit file and repeated retry.
Exactly one canonical item and intended linked object remain after successful replay.

### Execution checklist

Follow the [100 microtasks for BG-18](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-18--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 25. BG-19 — Complete follow-up fields and accessible success/error behavior

**What and why.** The mobile specification asks for project and review date, but
those are not fields in the current capture schema. Adding them to a strict capture
payload would cause rejection.

**When.** After BG-18. **Where.** Capture form, item update/status/privacy schemas,
versioned action helpers and date formatting.

### Save follow-up metadata through its actual API

Project and review_at are item-edit fields, not fields accepted by the inspected
strict capture schema. First capture the item, then submit a versioned item patch
using the returned or freshly read edit_version. If that second step fails, the
capture still exists. Show “Saved; follow-up details need retry” and retry the
patch rather than creating another item.

A project selection must distinguish an existing project identifier from a label
used only for display. Read the current contract before deciding whether creating
a new project is in scope. Preserve a user's selection during a recoverable
failure and expose server validation next to the corresponding field.

### Convert review time deliberately

A datetime-local input represents wall-clock time without a timezone. Slicing a
UTC string to its first sixteen characters places UTC clock digits into a local
input and can shift the intended reminder. Parse the stored timestamp, render
local calendar components, then convert the edited local value into the API's
accepted offset/UTC representation on save.

For example, an owner choosing 09:00 in India expects 03:30Z for that day. Test
that conversion plus clearing the date and a user in a timezone with daylight
saving changes. Define how an ambiguous or nonexistent local time is handled.
Do not silently invent a review time when the field is empty.

Finish with keyboard and screen-reader checks for field labels, grouped errors,
focus after failure and the partial-success message. The important outcome is
that the owner can tell what was already saved and correct only what remains.

### Small implementation steps

1. Separate immediate capture fields from later item review fields. Use the
   existing item update route for project/review date unless a deliberate additive
   capture-contract change is justified.
2. After capture succeeds, fetch detail and apply optional follow-up metadata with
   its current `edit_version`. Keep this a visibly separate stage.
3. If follow-up fails, say “Saved; project/reminder needs retry.” Do not say the
   original save failed or create a second capture.
4. On canonical duplicate reuse, avoid silently overwriting the existing project's
   or reminder's value. Ask for an explicit item edit or preserve existing metadata.
5. Convert a local datetime selection to an ISO instant when sending. Convert the
   ISO instant back to local calendar fields when rendering. Simply slicing a UTC
   string into `datetime-local` shifts the displayed time outside UTC.
6. Test Asia/Kolkata conversion and a daylight-saving timezone. Empty dates remain
   null; invalid dates do not become a malformed request.
7. Make validation, pending state and result announcements accessible to screen
   readers. Label all fields and preserve keyboard focus after async completion.
8. Keep primary actions usable on narrow screens; display long URLs and errors
   without horizontal overflow. Keep draft recovery visible after login refresh.
9. Explain capture success, duplicate replay and pending processing in ordinary
   language. Keep internal migration/job implementation details out of the form.

**Proof:** save plus project/reminder, failed follow-up, duplicate target with existing
metadata, reload, keyboard-only submission, narrow viewport and timezone round trip.
This task also verifies the existing review-date editor rather than assuming it is
correct because it builds.

### Execution checklist

Follow the [100 microtasks for BG-19](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-19--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 26. BG-20 — Choose the production Web Inbox origin

**What and why.** Vite currently forwards `/api` to localhost. That development
proxy is not a production deployment. Cookie login and private links need an actual
reachable same-origin arrangement.

**When.** After BG-19. **Where.** `wrangler.toml`, Worker entry/app, Web build config,
`apps/web/src/api.ts`, hosting/runbook documents.

### Choose where a browser request actually goes

The production Worker returned 404 at its root during the audit. That proves the
Worker did not serve the Web application at that tested URL; it does not prove
that no separate Web deployment exists. Inventory the actual domains and hosting
configuration before choosing the production topology.

Draw the proposed route for the HTML document, static JavaScript, /api/v1 calls,
session cookie and direct item links. A same-origin arrangement can preserve the
Web helper's relative API requests. A separate origin requires an explicit API
base, CORS/credentials policy and cookie behavior. Choose based on the intended
operational setup, then document the exact hostnames or configuration inputs.

### Resolve authentication before writing deployment configuration

A login response setting a cookie for one host does not automatically authorize
requests sent to another host. Likewise, an SPA fallback that returns index.html
for /api/v1 errors can make a broken API look like a JSON parsing problem. Write
the route precedence explicitly: API requests reach the Worker API; supported
client routes reach the application shell; missing assets remain missing.

Record how local development maps to that topology and how rollback restores the
previous Web and Worker combination. This is a design gate for BG-21. Its proof is
a reviewed request map and concrete configuration plan, including login, reload,
download and logout, rather than an assumption that a successful Vite build is a
hosted application.

### Small implementation steps

1. Inspect existing hosting/deployment records before creating anything. The audit
   verified only that the documented Worker root returned 404; it did not prove
   that no separate Web host exists.
2. Prefer serving the built Web assets and `/api/v1` through one production origin,
   using the existing Worker if the runtime/configuration supports the required
   routing. This matches the current relative API client and cookie design.
3. If a separate asset host is already required, specify the trusted proxy or
   cross-origin session/CORS/CSRF design explicitly. Do not just change API_BASE.
4. Set one canonical Web Inbox base URL for digest item links. Keep preview URLs
   separate from production links and secrets.
5. Define route precedence: API routes must reach the Worker; client routes should
   receive the SPA document; missing static assets should return proper failures.
6. Define public assets versus private API responses. Loading JavaScript is not
   permission to read an item; every data endpoint still authenticates.
7. Record the decision, canonical origin, DNS/host ownership and deployment artifact
   in the operations documentation. No production deployment is performed here.
8. Check current official Cloudflare configuration guidance when implementing;
   asset APIs and deployment options are versioned operational dependencies.

**Done when:** the plan names the actual origin and explains cookies, API routing,
deep links and digest URLs. A screenshot of localhost does not close this task.

### Execution checklist

Follow the [100 microtasks for BG-20](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-20--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 27. BG-21 — Build assets, route deep links and package one release

**What and why.** A digest opens `/items/<id>` directly. A frontend that only works
when navigating from `/` will fail exactly when a reminder is most useful.

**When.** After BG-20. **Where.** Root build scripts, `wrangler.toml`, Worker routing,
Web static output and CI.

### Deploy the application shell without swallowing API errors

Implement the hosting arrangement decided in BG-20. Build Web assets with the
locked dependency tree, identify the output directory and connect that directory
to the selected host. If Worker static assets are chosen, add the supported asset
binding and routing configuration; if a separate host is chosen, implement its
API routing deliberately. These are alternative designs, not two simultaneous
requirements.

Route a direct item-detail URL to the application shell so reload works. Keep
/api/v1 paths outside that fallback: a nonexistent API endpoint should return the
API's error response, not a 200 HTML document. Missing hashed JavaScript assets
should also return a real error, because serving HTML as JavaScript hides a stale
deployment or cache problem.

### Keep the release artifact internally consistent

The HTML references the assets generated by its own build. Publish them together
and choose cache behavior appropriate to hashed assets versus the HTML shell.
Record which Worker API revision the Web build expects. A rollback must restore a
compatible pair, particularly after capture contracts change.

Check the root page, a direct detail link, a reload, login, an API error and an
original attachment download against the built artifact. Development-server
success is insufficient because its proxy and fallback rules can differ from
production. BG-21 closes when the chosen hosting configuration serves those paths
correctly in the authorized preview/test environment; production promotion remains
BG-32.

### Small implementation steps

1. Build the Web app before packaging the release. Ensure the Worker deployment
   artifact uses those assets rather than a stale local `dist` directory.
2. Add the chosen static asset binding/configuration using the installed toolchain's
   supported mechanism. Keep source maps/private build output policy explicit.
3. Route `/api/v1/*` before SPA fallback. Unknown API routes must return JSON 404,
   not HTML with HTTP 200.
4. Serve `/` and `/items/<id>` through the SPA entry, including hard reloads. Serve
   new capture/operator routes the same way.
5. Give hashed assets suitable caching and keep HTML freshness under release
   control. Keep private item/download/export responses out of shared caching.
6. Verify secure cookie behavior behind the chosen production proxy/TLS origin.
   Avoid trusting an arbitrary forwarded header to determine security context.
7. Package Worker code, schema compatibility information and Web assets under one
   release identifier. Record how a rollback selects a matching pair.
8. Run local/preview tests from the production-like asset path, not only Vite. Test
   missing asset, unknown API, direct item link, login redirect and page reload.
9. Make CI build the same artifact intended for deployment. Do not make a developer's
   untracked local `dist` a hidden release prerequisite.

**Proof:** a production-like preview serves the homepage, direct item and capture
routes; API errors remain JSON; cookie login/download work; no token enters assets.

### Execution checklist

Follow the [100 microtasks for BG-21](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-21--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 28. BG-22 — Close Priority 3 with the complete browser creation story

**What and why.** This is the first gate where the owner can create and recover
items entirely from a browser.

**When.** After BG-21. **Where.** Browser acceptance harness and release evidence.

### Prove that browser creation produces durable, usable items

Run this acceptance after the form, retries, uploads and hosting paths are ready.
Start from a clean browser session and use the interface for login and capture.
Create a URL, a text entry, a note and a supported file. For each, record the
returned item identity, reload the application and find the item again through
its intended list/search path.

The evidence should distinguish saving from enrichment. A captured URL can be
saved while acquisition is pending; the UI must show that state accurately. A
file can be linked while optional AI is unavailable; original download should
still work. Do not require a provider to succeed just to prove canonical capture.

### Include the partial-success stories

Simulate an uncertain capture response and verify one item after retry. Let
capture succeed while the project/review patch fails and verify that retry changes
the existing item. Interrupt a file transfer and check the supported resume or
restart explanation. Finally, sign out and confirm protected reads and writes
are denied for that browser session.

Record the tested artifact and environment with a concise result table. For each
failure, name the broken boundary rather than marking the whole application
“failed.” Close this gate only when the required stories pass or an explicit scope
decision removes a story and updates the release criteria. A screenshot of the
new form establishes appearance, not this acceptance.

1. Open the production-like preview in a fresh browser session and log in.
2. Save URL, text, note, image and PDF through the real form.
3. Search each by supplied reason or known acquired phrase; open its exact detail.
4. Download originals, edit metadata, refresh, and verify the persisted result.
5. Repeat one capture with an ambiguous network response and the same key.
6. Test a canonical duplicate with a new reason and confirm event preservation.
7. Disable optional providers; repeat capture and raw retrieval.
8. Test expired session during a pending upload and recover without duplicate bytes.
9. Open a direct item URL as if it came from a digest, including after browser restart.
10. Run the full repository gate and archive the artifact identity, browser version,
    fixture IDs, HTTP outcomes and unresolved qualifications.

**Done when:** creation, processing visibility, search and original inspection work
through the deployable Web path. Production/device trials still follow Priority 4.

### Execution checklist

Follow the [100 microtasks for BG-22](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-22--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

---

# Part VI — Priority 4: operational hardening and truthful documentation

## 29. BG-23 — Make an operational control inventory

**What and why.** A backend endpoint is not automatically a usable operator tool.
The owner needs to recognize a problem and know which safe action resolves it.

**When.** After BG-22. **Where.** OPE-247 requirements, operations runbook, usage,
digest, recovery and job APIs.

### Decide which operational actions need an interface

The backend already exposes operational capabilities, while several have no Web
control. Inventory each capability from current routes and the operator's actual
job: inspect usage, view failed work, retry an eligible operation, preview a
digest, export data and inspect recovery status. Record current authentication,
request shape, response shape and destructive consequences before drawing UI.

Select the minimum release scope from that inventory. A read-only backlog page
may be enough for routine diagnosis while a dangerous restore remains an explicit
operator procedure. An API's existence does not automatically justify a button,
and a missing button does not mean the backend feature is unimplemented.

### Define each selected control as a contract

For a retry control, specify which states enable it, which identifier it sends,
what repeated activation does and which refreshed result confirms acceptance. For
an export, specify that the response is a download rather than a JSON envelope.
The current general Web API helper parses JSON envelopes, so binary/CSV responses
need an appropriate path.

Produce a small mapping of owner need to existing route, proposed screen and
proof. This becomes the scope for BG-24 through BG-28. Keep deferred controls
visible in the backlog with their manual alternative. Completion means an
implementer can identify the exact operational boundary of each screen without
inventing new backend behavior from a vague “admin dashboard” requirement.

### Small implementation steps

1. Map every required operational action to an existing endpoint, Web control or
   verified command. Mark absent surfaces plainly.
2. Use the following recommended V1 split: normal review/capture in Web; a small
   protected operations page for usage and failures; advanced clean-target restore
   through a documented operator procedure. Do not build a generic admin platform.
3. Include usage/headroom, stalled work, Notion failures, digest state, last verified
   backup, partial purges and last restore rehearsal in the inventory.
4. For each write control, define eligibility, required version/confirmation,
   expected response, audit event and idempotency behavior.
5. Identify which controls are read-only, reversible, externally visible or
   destructive. This determines the UI explanation and verification needed.
6. Check endpoint authentication rather than relying on hiding navigation links.
7. Record genuinely unsettled product choices. The existence of this guide does
   not silently expand V1 into a full dashboard for every backend table.

**Proof:** for each incident in the runbook, an operator can name a control and
expected outcome. APIs without a UI have complete request/response instructions.

### Execution checklist

Follow the [100 microtasks for BG-23](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-23--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 30. BG-24 — Implement bounded token rotation and session behavior

**What and why.** Rotating a credential should let the owner update authorized
clients without an indefinite period in which two old keys remain usable.

**When.** After BG-23. **Where.** Shared auth, session routes, Env/binding types,
secret configuration and rotation runbook. This implements ADR-033.

### Existing decision

Current/next slots, a normal 24-hour overlap, an absolute 72-hour maximum and
immediate old-key revocation on suspected compromise. No raw token values in audit
records. These are approved RecollectFlow rules, not new suggestions from Serviq.

### Make token rotation a bounded handover

An iPhone may still hold the old capture token when a new token is deployed.
ADR-033 describes a current/next overlap with a default 24-hour window and a
maximum of 72 hours. Verify that implementation against the current source, then
expose or document the exact start, expiry and completion procedure. Do not turn
“temporary overlap” into two permanently accepted secrets.

For routine rotation, establish the next credential, update the client during the
bounded window, prove the new credential works and prove the old one stops at
expiry. For suspected compromise, the recovery path is immediate revocation;
continuity for an offline client must not silently extend a compromised token's
life. Record only token identifiers/fingerprints, never the full secret.

### Treat browser sessions as a separate credential lifecycle

At the inspected baseline, the signed admin cookie contains the constant value
'authenticated' and the browser receives a 24-hour expiration. That expiration
tells the browser when to discard it; it does not by itself give the server an
issued-at timestamp to validate in a copied cookie. Decide the required server
lifetime/revocation semantics and implement them explicitly if the release relies
on them.

Test before, at and after the overlap boundary, plus the compromise path and
logout behavior. Distinguish deleting the current browser's cookie from revoking
all copied sessions. The operational instructions must describe the actual
invalidation mechanism so the owner knows which action resolves which exposure.

### Small implementation steps

1. Define current/next secret references and nonsecret activation/expiry metadata
   for capture, admin and local-worker scopes. Proposed environment names must be
   documented before introducing them; do not embed token values in D1.
2. Validate overlap configuration at startup/use. Refuse a window beyond 72 hours,
   an expiry before activation or an indefinitely active secondary credential.
3. Compare eligible token candidates using existing constant-time verification.
   Preserve each scope's endpoint permissions.
4. Enforce expiry at request time. Deployment of a next key must not make an old
   key valid forever just because a cleanup command was forgotten.
5. Define promotion/retirement: next becomes current, old is removed, overlap
   metadata is cleared, and clients continue without changing item records.
6. Design cookie signing across admin rotation. A cookie signed using the new key
   must remain valid after promotion. An old-key cookie must stop working after
   revocation/expiry. Use an explicit accepted-key schedule or session key/version
   contract rather than accidentally extending old sessions.
7. Make new logins sign with the designated active issuance key. During overlap,
   accepting an old login token must not mint a session with unlimited old-key life.
8. For compromise, revoke old bearer and old signed sessions immediately. Explain
   the expected reauthentication to the owner; do not keep overlap for convenience.
9. Record scope, key slot identifier, activation/retirement time, actor and outcome.
   Never log a token, digest useful for guessing weak tokens, or cookie value.
10. Provide a rehearsal using dummy credentials and a controlled clock. Keep real
    secret-setting commands interactive or safely supplied, not pasted into logs.

### Proof

Old/new accepted during the valid window; wrong scope denied; old denied exactly at
expiry; next works after promotion; tampered/missing metadata fails safely;
compromise invalidates old sessions immediately. Existing captured data is unchanged.

### Execution checklist

Follow the [100 microtasks for BG-24](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-24--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 31. BG-25 — Harden authentication, session requests and logs

**What and why.** A personal app still stores private originals. Login abuse,
credential reflection or cached private responses can undermine that boundary.

**When.** After BG-24. **Where.** Auth/session middleware, request logging, error
normalization, deployment headers and OPE-247 acceptance.

### Harden the boundaries used by the new browser features

Build from BG-15's authorization rules and BG-24's credential lifetime. Enumerate
login attempts, cookie-authenticated writes, bearer capture, uploads and privileged
recovery operations. Give each boundary its own expected rejection behavior.
A single “auth works” test cannot establish rate limits, CSRF handling, payload
bounds and session expiry.

For login abuse controls, choose a bounded key and storage strategy supported by
the deployment. Avoid unbounded per-input keys or logs containing attempted
tokens. For request limits, reject oversized input before expensive parsing or
provider work where the runtime permits it. Retain server-side schema validation
even when the browser already prevents the same input.

### Keep diagnostics useful without copying private content

Log operation identifiers, safe failure codes, timings and counters. Do not log
Authorization headers, signed cookies, raw attachment bytes or full private
capture text. Review exception paths as well as normal logging: upstream errors
can contain response bodies and URLs with credentials in their query strings.

Validate allowed and rejected origins, missing/tampered/expired credentials,
oversized requests and repeated failed login attempts. Check that legitimate
capture-token clients still work under the browser-specific controls. Completion
requires observable enforcement and safe diagnostics, not just adding security
headers unrelated to the failing boundary.

### Small implementation steps

1. Inventory unauthenticated entry points, including login, capture rejection,
   upload initialization and health. Separate liveness from private operational data.
2. Apply an appropriate bounded login-abuse control supported by the chosen
   platform. Specify keying, window, response and recovery; do not introduce a
   permanent lockout that an attacker can trigger against the owner.
3. Test SameSite, HttpOnly, Secure and cookie expiry on the actual deployed origin.
   Keep logout behavior explicit and compatible with the chosen stateless/session
   model; deleting a browser cookie alone is not global stolen-cookie revocation.
4. Verify same-origin/CSRF defenses on every cookie mutation from BG-15 and new
   operations controls. CORS must not reflect arbitrary requesting origins.
5. Apply bounded request sizes to JSON, multipart and byte routes at the earliest
   supported point. Parser validation after a huge body is buffered is not a
   complete admission limit.
6. Inspect logs and error bodies using synthetic marker secrets in input headers,
   malformed JSON, URLs and upstream error text. Assert markers are absent from
   routine logs and unauthorized responses.
7. Escape source snippets, filenames and errors in the UI. Never render acquired
   HTML through an unsafe insertion mechanism.
8. Verify private R2 access cannot be obtained by guessing a key, changing an item
   ID, using the wrong token scope or replaying a stale upload URL.
9. Review security headers/caching with the final asset/API origin. Keep details
   compatible with download behavior rather than copying a generic header list.
10. Add focused regression tests for discovered failures. Keep sanitization tests
    representative of actual boundary paths instead of copying implementation code.

**Done when:** the security matrix in `SECURITY_PRIVACY_GOVERNANCE.md` has current
pass evidence or named blockers. A scanner passing alone is not this acceptance.

### Execution checklist

Follow the [100 microtasks for BG-25](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-25--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 32. BG-26 — Show usage, backlog and recovery state truthfully

**What and why.** “AI paused” is manageable when the owner knows why and when it can
resume. “Pending” with no explanation looks like lost work.

**When.** After BG-25. **Where.** `GET /api/v1/usage`, job inspection, attachment usage,
operations page/commands and structured metrics.

### Explain why work is waiting, not just how much work exists

The inspected capacity service returns active usage windows, thresholds, circuit
breakers, deferred work and the last successful provider call. Present these as
different signals. A full minute quota suggests waiting for a short window; a
circuit breaker suggests provider recovery; a terminal failure needs an action.
Combining them into one red “usage” number makes diagnosis harder.

Display the response's generated_at time and preserve each window's scope and
unit. Requests, tokens and storage bytes cannot be added into a meaningful total.
Use the server's warning thresholds rather than duplicating constants in the UI.
An empty active-window list means no returned active window, not proof that all
historical usage was zero.

### Make refresh and failure states honest

Fetch on entry and use a modest, documented refresh policy if polling is needed.
When refresh fails, either clear the values or visibly label retained values as
stale. Do not keep a green status indefinitely with no timestamp. Link a deferred
count to an actionable filtered view only when that view/API actually exists.

Use fixtures for normal usage, approaching a limit, deferred work, an open breaker
and an unavailable status request. Verify units and timestamps as well as colors.
The owner should be able to answer “what is waiting, why, and what can I do?”
without inspecting raw JSON or mistaking stale data for current health.

### Small implementation steps

1. Reuse the usage response: policy version, active quota windows, consumed and
   reserved units, remaining headroom, breakers, deferred counts and last success.
2. Label missing/unpublished dimensions as unavailable, not zero or unlimited.
   Distinguish application estimates from provider-account measurements.
3. Show 70%, 90% and hard-limit states using the existing policy. Never suggest
   manual retry will bypass the hard threshold.
4. Present job counts by type/state, oldest eligible age, next retry time and safe
   error code. Keep extraction, enrichment and Notion sync separate.
5. If a global backlog endpoint is missing, add a bounded aggregate query instead
   of downloading every item into the browser. Check D1 query plan/rows read.
6. Expose partial purge, failed backup and ambiguous digest states with the exact
   corresponding operator action. Do not present generic Retry for every error.
7. Include R2 bytes/objects/orphan pressure and D1 capacity where available. Clearly
   mark readings requiring provider dashboards or operator refresh.
8. Add stale-data/loading/error labels and restrained refresh intervals. Display
   last successful measurement time so an outage cannot masquerade as zero usage.
9. Make the operational surface admin-only and content-minimal. Counters and IDs
   are usually sufficient; prompts and source text do not belong in dashboards.
10. Verify capture and FTS continue under forced AI hard-stop while the page shows
    the deferred backlog. That continuity is the actual zero-cost promise.

**Proof:** active usage, no activity, expired windows, provider unavailable,
reservation expiry, hard stop and query failure produce distinguishable states.

### Execution checklist

Follow the [100 microtasks for BG-26](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-26--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 33. BG-27 — Make digest review and delivery uncertainty operable

**What and why.** A network timeout can mean Telegram received a message but the
Worker did not receive confirmation. Automatic resend can create duplicates.

**When.** After BG-26. **Where.** Digest routes/schema/service, Telegram client,
operations UI or documented commands.

### Separate previewing a digest from delivering it

A preview should let the owner inspect candidate content without sending a
Telegram message or advancing delivery history. Trace the existing preview and
send contracts and preserve that separation in the UI. Show the relevant period,
selected items and any exclusion reasons the API supports. Do not imply that a
preview guarantees later delivery: eligibility and provider availability can
change before the scheduled run.

### Handle the “provider may have accepted it” case

A timeout after a send request is ambiguous. Telegram might have delivered the
message even though the Worker never received confirmation. Blind retry can send
a duplicate. Represent the existing unknown-delivery state distinctly from a
confirmed rejection, and provide the documented reconciliation procedure.

```text
confirmed accepted -> record delivery evidence
confirmed rejected -> follow permitted retry policy
response lost       -> reconcile unknown outcome before another send
```

An operator resolving an unknown outcome needs the run identifier, period,
request timing and safe provider evidence. Never invent a successful message ID
or classify a timeout as definite non-delivery. Validate preview with no external
send, a confirmed delivery, a rejection and an ambiguous response. The control is
complete when each state leads to the appropriate action and repeated clicks do
not bypass the backend's duplicate/unknown protections.

### Small implementation steps

1. Map existing generation, inspection, review, regeneration, queue and reconcile
   routes from source. Do not invent a `/send` endpoint in the client.
2. Show digest type, period, timezone, eligible item count, review state, delivery
   state and safe error. Period dates must be understandable in Asia/Kolkata.
3. Generate a preview without implicitly queueing external delivery. Preserve the
   backend distinction between preparing, reviewing and scheduling delivery.
4. Render restricted items using approved neutral labels. Recheck current privacy
   and deletion again at delivery time, not only preview time.
5. For known transient failure such as a definite rate-limit rejection, expose the
   eligible retry timing governed by the backend.
6. For `unknown` delivery, require reconciliation. If evidence proves sent, require
   its message ID; if evidence proves not sent, use the supported failed state and
   a reviewed retry. Never guess solely because the message is not immediately seen.
7. Regeneration must follow current eligibility and version rules. It must not
   silently mutate a previously sent message or create two deliveries for a period.
8. Verify item links use the production Web Inbox origin and open the exact item
   behind authentication, including a logged-out browser.
9. Document the empty-period outcome separately: suppressed empty delivery is not
   a failed delivery and cannot count as an eligible successful day.

**Proof:** deterministic preview, changed privacy before send, deleted item,
definite 429, ambiguous timeout and reconciled sent/failed outcomes. Automated tests
use fake delivery; a live send belongs to the explicitly authorized release trial.

### Execution checklist

Follow the [100 microtasks for BG-27](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-27--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 34. BG-28 — Make backup, restore and purge procedures complete

**What and why.** Recovery is only useful if an operator can execute it under
pressure and verify that both retained and deliberately deleted data behave correctly.

**When.** After BG-27. **Where.** Recovery routes/services and operations runbooks.

### Explain what an export actually preserves

The portable JSON format excludes attachment bytes. A successful JSON export
therefore does not by itself back up a user's original PDFs or images. Show that
boundary before download and document the separate original-byte strategy,
including how metadata maps to object identifiers and how byte hashes are
verified. Do not label a metadata-only archive a complete backup.

Backup verification and retention are separate mechanisms. The baseline includes
readback verification and 30-day retention behavior; verify these against the
implementation. A cleanup cron is not proof that new backups are being created
on a schedule. State who or what initiates creation, where failures surface and
how a verified backup is identified.

### Make restore and purge procedures precise

At the inspected restore route, only dry_run=true selects a dry run; omitting the
parameter performs a real restore. Every rehearsal command must therefore include
an explicit dry-run value and an isolated target. Explain the expected report
before providing the real-apply step. A dry run that parses JSON does not prove
objects can be recovered.

Preserve the purge ledger during recovery so an older backup cannot resurrect
intentionally removed content. Test a synthetic item that is backed up, purged
and then encountered in an older restore. It must remain excluded under the
supported recovery policy. This task produces usable controls/runbooks; BG-37
later proves an independent end-to-end recovery with those instructions.

### Small implementation steps

1. Document JSON export as the restorable format and CSV as a readable export.
   Preserve the exact schema version, item count and credential/attachment disclosures.
2. List attachment references and explain the separate original-byte backup or
   replication procedure. A same-bucket metadata backup is not proof of survival
   after loss of that bucket's attachment objects.
3. Show backup ID, verified hash/size, created/verified/expiry times and state.
   A created R2 object is not a completed backup until read-back verification succeeds.
4. Clarify automation: current scheduled code cleans expired backups; that is not
   evidence that it creates periodic backups. Select and document an actual backup
   creation schedule/mechanism if periodic creation is a release requirement.
5. Preserve immutable hosted backup retention for 30 days under ADR-031. State that
   owner-downloaded copies are outside remote deletion control.
6. Document explicit `POST /restore?dry_run=true`. Omitting that query currently
   means a real restore attempt; every example must make the mode visible.
7. Require a clean intended target for real restore. Verify target identity,
   compatible migrations, counts, references, attachment bytes and purge receipts.
8. Describe soft-delete -> purge-request with current version -> separate phrase
   confirmation -> queued processing -> per-step inspection. No single misleading
   “Delete everything” action may collapse these boundaries.
9. Keep partial failure visible. Failed Notion archival or R2 deletion must stop
   canonical deletion according to the existing workflow, not report global success.
10. Preserve non-content purge receipts independently enough to survive the disaster
    being rehearsed. Restore an older backup only after merging the newer ledger.
11. Verify newly introduced URL evidence from BG-10 participates in export, restore,
    purge and integrity; update documentation and tests together.
12. State recovery order during incidents: stop harmful mutations, preserve evidence,
    verify backup/target, restore, validate, then switch traffic. Do not experiment
    on the only remaining copy.

**Proof:** local/isolated rehearsal includes backup corruption, nonempty-target
rejection, missing attachment, partial purge and old-backup anti-resurrection.
Production data deletion is not a prerequisite for proving the local workflow.

### Execution checklist

Follow the [100 microtasks for BG-28](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-28--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 35. BG-29 — Run resilience, capacity and performance acceptance

**What and why.** A reliable system needs predictable degraded behavior, not only
correct responses when every dependency is healthy.

**When.** After BG-28. **Where.** D1/runtime/browser suites, runbooks and fixture sets.

### Test pressure as a sequence with a recovery outcome

A load test that merely generates requests says little about a private capture
system. Choose representative small text captures, bounded attachments and
provider-dependent jobs. Define the arrival rate, duration and acceptable latency
before running the test. Use synthetic content and an isolated target so the
exercise cannot consume uncontrolled production provider quota.

Observe capture latency separately from background completion latency. Canonical
capture may remain fast while enrichment waits for capacity; the UI should expose
that wait. Measure backlog growth, oldest eligible work, retry volume and time to
drain after the load stops. An application that accepts quickly but never drains
its queue has not passed resilience acceptance.

### Introduce one controlled failure at a time

Simulate a provider timeout, capacity exhaustion and a worker interruption. Check
that retry scheduling stays bounded, leases recover and original content remains
available. Restore the dependency and measure recovery rather than ending the
test at the first failure. Compare observed usage with the configured ceilings.

Keep the result tied to workload and environment. A local mocked-provider result
proves queue behavior under that model; it cannot establish actual provider price
or production latency. Record unresolved bottlenecks as concrete blockers with
reproduction steps, and feed real billing verification into BG-39.

### Small implementation steps

1. Build an input/privacy matrix: URL, text, note, image and PDF/file across the
   applicable Unknown/Public/Personal/Sensitive cases.
2. Disable AI and Notion independently and together. Save/retrieve/search originals.
   Record that every acknowledged item remains accessible.
3. Inject malformed AI JSON and bounded repair failure. Confirm no corrupt derived
   fields, hidden retries, lost overrides or leaked provider payloads.
4. Exhaust quota under concurrent requests and verify one shared final-unit
   reservation. Test expiry, reset, breaker half-open concurrency and manual retry.
5. Revalidate operational provider/free-tier limits against official sources at
   release time. The August 2026 values are historical configuration, not timeless
   guarantees. Update policy only through the approved decision process.
6. Measure capture P50/P95 separately from upload and optional work. Compare with
   the runbook's P95 ≤2 seconds target under documented personal traffic.
7. Seed representative 10,000/100,000-item search corpora where feasible; measure
   latency and D1 rows read/written. Do not claim scale from a four-item demo.
8. Test upload near the configured size bound, cancellation and parser limits.
   Measure Worker resource behavior using the actual bundled runtime.
9. Test backlog drain. The baseline cron is hourly and workers lease bounded
   batches; record worst-case multi-stage delay and sustainable drain rate. If it
   misses product expectations, adjust cadence/batch/concurrency with capacity
   evidence, preserving leases and zero-cost limits.
10. Rehearse interrupted workers, stale results, clock/reset boundaries, FTS drift
    rebuild, expired upload cleanup and expired backup cleanup.
11. Record each defect with exact trigger and impact. Distinguish a test-environment
    restriction from an application failure, without hiding either limitation.

**Done when:** security/data-loss/cost blockers are resolved and measured behavior
meets the agreed V1 targets. A numerical result needs fixture size, load and environment.

### Execution checklist

Follow the [100 microtasks for BG-29](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-29--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 36. BG-30 — Reconcile completion records and close hardening evidence

**What and why.** The baseline documentation mixes old missing-feature lists with
new merged implementation notes. That makes it hard to choose the next task safely.

**When.** After BG-29. **Where.** `BUILD_STATUS.md`, `repo_context.md`,
`TRACEABILITY.md`, relevant ticket files, this guide and the operations runbook.

### Reconcile evidence before changing completion labels

Compare the guide, audit, current source, tests and available issue/CI records.
For each claim, identify the behavior and its evidence level. A merged backend
route can be implemented while a required browser workflow remains incomplete.
A local passing suite can coexist with unverified hosted CI or an untested real
integration. Preserve those distinctions in the completion record.

Review the referenced OPE-247 scope against its actual acceptance criteria before
closing it. Do not infer completion from a similarly named task or from the
existence of scoped worker job endpoints. In particular, the audited repository
did not establish a working local Ollama client. If that runtime client is
required, specify its remaining implementation and execution proof; otherwise
record it as deferred scope with a clear boundary.

### Leave a record another person can verify

For each completed behavior, link the implementation revision and the relevant
result. For each remaining behavior, name the missing action and its dependency.
Update obsolete roadmap wording so the next implementer does not rebuild an
existing capability. Keep external issue updates separate unless authorized;
preparing a local reconciliation document does not imply an issue was closed.

This gate is complete when the release manifest can inherit a consistent account
of what exists, what passed locally and what still needs production/device/time
proof. It should eliminate contradictory labels, not eliminate honest unknowns.

### Small implementation steps

1. Create one status row per feature/ticket with implementation SHA, local evidence,
   CI evidence, deployed version, production evidence and remaining gate.
2. Replace obsolete “branch pending” wording for merged work with verified current
   facts. Keep historical counts labeled historical instead of deleting provenance.
3. Mark the audit defects resolved only with regression evidence and fixing SHA.
4. Reconcile OPE-225/226/248/227/228 implementation versus production acceptance.
   Do not infer tracker Done merely because the merge exists.
5. Collect OPE-247's security, rotation, logging, operational visibility, incident,
   privacy, capacity and recovery evidence in one checklist.
6. Record the optional local-worker decision. APIs alone do not prove a runnable
   Ollama client. If V1 explicitly requires local processing, create its bounded
   implementation/acceptance work before launch; otherwise record no-AI behavior
   and approved deferral without claiming the client exists.
7. Keep RAG/Android/extensions and future productization out of current completion
   percentages. Their entry conditions are separate.
8. Update external tracker state only through the normal authorized workflow, using
   verified ticket IDs. The BG IDs are document references, not tracker identities.

**Done when:** a reader can answer “implemented?”, “tested?”, “deployed?” and
“accepted?” independently for every V1 capability. Priority 4 closes only when
hardening evidence is current and remaining release gates are explicit.

### Execution checklist

Follow the [100 microtasks for BG-30](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-30--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

---

# Part VII — Priority 5: prove the real system and approve V1

## 37. BG-31 — Prepare a concrete release manifest

**What and why.** A release should identify exactly what will change, how success
will be checked and how data will be recovered if something fails.

**When.** After BG-30. **Where.** Release/runbook records and deployment configuration.

### Name the exact release that is ready for approval

A release manifest turns “deploy the fixes” into a reviewable operation. Record
the Git revision, Web artifact, Worker configuration, migration set, target
bindings, required secret names and the validation already completed. Reference
secret names only. Include outstanding acceptance gates and the person responsible
for running each one after deployment.

List migrations in their actual order and explain whether old and new application
versions remain compatible during rollout. Do not assume rolling application code
back reverses a database migration. For an incompatible change, document the
forward-repair or restore procedure and its data-loss implications before release.

### Define stop conditions before touching production

Specify which failed checks stop the release: for example, a binding mismatch,
unexpected migration state, health failure or a protected route becoming public.
Identify the previous deployable artifact and how its configuration is recovered.
Capture a verified backup reference where the migration/recovery procedure needs
one; “a backup probably runs nightly” is insufficient.

The output is a concrete manifest the owner can approve without asking which code,
which database or which tests are meant. BG-31 prepares that artifact; it does not
itself authorize or execute BG-32. Keep the approval record associated with the
manifest so later changes cannot silently inherit approval for a different build.

### Small implementation steps

1. Name the candidate Git SHA, CI run, Worker bundle and matching Web assets.
2. Compare the live migration list with the candidate migration list through a
   read-only check. Do not assume production already has `0020`/`0021`.
3. Record only pending forward migrations, affected tables/indexes and old/new code
   compatibility. Identify whether rollback of code remains safe after migration.
4. Record target Worker, D1, R2, Web origin, Notion database and private Telegram
   destination using safe identifiers. Keep secret values outside the document.
5. Validate required configuration/secret presence without printing values. Record
   provider capability and approved privacy/free-tier constraints.
6. Create the backup and restore plan, including original attachments and purge
   receipts. Specify how verification will prove the backup is usable.
7. List post-deploy smoke stages and exact rollback/stop triggers: auth failure,
   lost capture, wrong privacy route, private download leak, migration error or
   broken Web deep links.
8. Name the operator and required owner release authorization under the existing
   runbook. Present a finished manifest for review rather than a vague deploy request.

**Done when:** the release is concrete and reviewable. Preparing this manifest does
not perform a production write or imply approval for external test messages.

### Execution checklist

Follow the [100 microtasks for BG-31](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-31--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 38. BG-32 — Apply the authorized production release

**What and why.** This moves locally proven code into the actual environment while
preserving a known recovery path.

**When.** After BG-31 and the required release authorization.

### Execute the approved manifest in its stated order

Start only with authorization for the concrete production operation. Compare the
checkout/artifacts and target bindings with BG-31, then run the manifest's
migration and deployment sequence. Stop on a mismatch rather than improvising a
different database or rebuilding from an unrecorded dirty checkout.

Record each completed durable step. If a migration succeeds and deployment fails,
the database is already changed; recovery must start from that state. Re-running
the whole checklist blindly can obscure what actually happened. Use the supported
migration history and deployment identifiers as evidence.

### Verify the deployed boundaries immediately

Check health, the application shell, a direct client route and rejection of an
anonymous protected request. Confirm the deployed revision where the platform
supports it. These checks establish reachability and basic routing; BG-33 covers
the deeper product journey and external provider behavior.

If a stop condition triggers, use the manifest's rollback or forward-repair
procedure and record the result. Do not mark a release successful merely because
the deploy command exited zero. Completion requires the intended artifact running
against the intended bindings with the immediate checks passing, or an explicitly
recorded rollback outcome and remaining blocker.

### Small implementation steps

1. Verify target identifiers again immediately before mutation. Avoid accidental
   local/remote confusion and do not rely on the database name alone.
2. Take and verify the agreed pre-change backup. Record non-content hash/count/time
   evidence and a protected storage location.
3. Apply approved pending forward migrations in order. Stop on failure; inspect
   actual schema state before any retry. Do not blindly rerun data-changing SQL.
4. Deploy the matching Worker/Web artifact. Record the deployed version ID and SHA.
5. Verify homepage, direct item route, health, session, anonymous rejection and
   authorized retrieval using the new origin.
6. Run the revised synthetic release smoke with current contracts. Keep test
   records identifiable and never automatically purge unrelated owner data.
7. Inspect safe request/job logs, errors and bindings. A green deploy command does
   not prove the database or external integrations are configured correctly.
8. On a stop trigger, execute the manifest's compatible code rollback or recovery
   plan. Never assume a forward database migration has an automatic down migration.
9. Record what actually happened and any deviation. Keep launch unapproved if a
   required smoke stage remains blocked.

**Done when:** the manifest's deployed artifact and basic production smoke agree.
Live integration and device acceptance are separate tasks below.

### Execution checklist

Follow the [100 microtasks for BG-32](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-32--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 39. BG-33 — Prove production capture, search, downloads and approved AI

**What and why.** Local fakes validate application boundaries; they do not prove a
real credential, model, deployment or provider response works.

**When.** After BG-32. Use only approved neutral fixtures and provider operations.

### Verify real services with a small identifiable fixture set

After deployment, create a small authorized set of synthetic captures through the
actual production entry points. Include searchable text, a supported URL and an
attachment. Record item identifiers and expected distinctive phrases so later
searches cannot accidentally match old fixtures. Download the attachment and
compare its bytes with the original.

Where approved AI is in scope, verify an actual provider call and its persisted
result. Check the provider/model identity through safe operational evidence and
inspect whether the output corresponds to the source. Mocked tests prove contract
handling, not real-provider quality. Keep AI-disabled or privacy-excluded cases
in the matrix so canonical capture remains useful without enrichment.

### Follow the item beyond the success toast

Reload, search, open detail and inspect processing/coverage explanations. Verify
that source content is searchable under the chosen contract, that failure states
are actionable and that private downloads require authorization. A title match
alone does not establish full-page indexing.

Record each story as passed, failed or not executed with a reason. Preserve the
source revision and deployed identifiers beside the evidence. Remove synthetic
fixtures only through the approved cleanup path, after recording the relevant
results; never use a broad purge to tidy a small acceptance run.

1. Save public URL, text/note, parseable PDF and screenshot through intended clients.
2. Record capture IDs and verify raw retrieval before optional completion.
3. Replay the same request; confirm stable ID and no extra event/object where the
   replay contract promises none. Share the canonical URL under a new key/reason
   and confirm the new event is preserved.
4. Fetch an allowed webpage and search an internal phrase without relying on AI.
   Verify unavailable-source coverage separately.
5. Run a small approved public AI fixture. Inspect structured output validity,
   model/provider provenance, actual usage and owner-override preservation.
6. Test Unknown/Sensitive and Personal without consent using synthetic private
   markers and instrumented/fake outbound boundaries where appropriate. Do not
   send real sensitive data just to see whether a provider rejects it.
7. Download the production fixture through the browser session and compare hashes.
   Repeat anonymously and confirm denial; check private cache behavior.
8. Edit, refresh, soft-delete and restore the synthetic item. Confirm search and
   detail reflect each transition.
9. Record provider quota/guard evidence and separate it from semantic output quality.
   A model can return valid JSON containing an unhelpful summary.

**Done when:** the actual deployed path works for the approved fixtures and private
paths remain constrained. A successful text call does not certify image capability
or every configured fallback provider.

### Execution checklist

Follow the [100 microtasks for BG-33](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-33--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 40. BG-34 — Prove Notion projection, outage and recreation

**What and why.** Notion should remain a useful view even when its API is slow or a
page disappears, without becoming the authority for canonical deletion.

**When.** After BG-33, with an approved synthetic Notion destination/story.

### Prove that Notion is a projection of canonical data

Create an eligible item and verify its projected Notion page contains the intended
fields. Keep the canonical item identifier and external page identifier together
in the evidence. A successful API response from the projection worker is useful,
but acceptance also requires inspecting the actual destination content.

Then introduce a controlled integration failure using a safe test destination or
an explicitly authorized production procedure. Canonical capture, search and
original retrieval must remain available. The projection job should show a
bounded retry/failure state rather than rolling back the saved item.

### Restore the dependency and test recreation

Recover the integration and confirm that retry updates the intended projection
without creating duplicate pages. Exercise the supported missing-page/recreation
path with a synthetic page. Distinguish a missing external page from a permanently
purged canonical item: recreation must never resurrect content whose canonical
lifecycle forbids it.

Record observed external content, job transitions and canonical availability
during the outage. Mocked Notion tests remain valuable for edge cases, but they do
not close this live integration gate. If the destination or credentials are
unavailable, leave the gate explicitly unexecuted and name that dependency.

### Small implementation steps

1. Verify the configured database schema/property mapping against the current sync
   implementation. A token existing is not proof of database access.
2. Project one synthetic item, record its Capture ID/page ID and inspect intended
   machine-owned versus human-owned fields.
3. Replay/schedule the same sync and confirm no duplicate page.
4. Introduce an isolated outage/429 fixture or use a separately controlled test
   integration. Do not disrupt the owner's live knowledge store merely for a test.
5. While sync is unavailable, save and search another item through D1/Web.
6. Recover the integration and verify due retry respects timing and converges to
   one page. Check user-owned fields remain intact.
7. Remove/deny a synthetic projection. Verify canonical item and R2 original remain,
   and the server exposes missing-page recovery eligibility.
8. Explicitly request recreation using the supported admin action. Verify one new
   projection and the superseded attempt's retry restrictions.
9. Record safe IDs, timestamps, request outcomes and any manual action. Do not
   call simulated outage coverage a real outage rehearsal if it was only mocked.

**Done when:** Notion fails independently, recovers without duplicates and cannot
cause canonical purge. This closes live projection evidence, not the digest trial.

### Execution checklist

Follow the [100 microtasks for BG-34](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-34--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 41. BG-35 — Complete the physical-iPhone online stories

**What and why.** A desktop-generated Shortcut cannot prove iOS Share Sheet input
handling, permissions or file magic-variable behavior.

**When.** After BG-34. **Where.** `clients/ios-shortcut.md`, the actual Shortcut,
`clients/ios-shortcut-device-qa.md` and production/approved test destination.

### Use the physical device and the intended capture surface

Run the installed iPhone workflow on the owner's actual supported iOS environment.
A desktop browser with a narrow viewport cannot prove share-sheet input handling,
Shortcut permissions, file selection or background behavior. Record the device,
iOS version, client/Shortcut version and target deployment without recording its
secret token.

Share a URL from the intended app, submit text and send a supported file. Observe
which fields the source application actually supplies: a shared URL may arrive
with a title, text, both or neither. Verify the resulting canonical item and its
coverage rather than assuming the share sheet always gives full article content.

### Check the transitions the device user sees

Verify the permission prompt, successful submission, understandable failure and
return to the source app. Use a distinctive fixture to find the saved item in the
Web app. For a file, compare the retrieved original bytes. Check that client
metadata identifies the actual tested client version.

Record limitations by source app where inputs differ. Do not generalize one
Safari URL success to all share-sheet sources. This gate closes the documented
online device matrix; offline retention and token transition remain BG-36.

### Small implementation steps

1. Record physical device model, iOS version, Shortcut version, API environment and
   date. Keep tokens and private configuration out of screenshots.
2. Install the intended Shortcut and verify its Share Sheet input types and secure
   configuration. Do not assume an exported template has working owner settings.
3. Share a normal Safari page; verify link, source, capture time and optional reason.
4. Share Instagram and YouTube links; confirm conservative normalization and honest
   URL-only behavior where no content is available.
5. Share selected text/Notes and create a manual note. Verify Unicode, whitespace
   and the reason survive according to the documented normalization contract.
6. Share a Photos image and Files PDF/generic supported file. Download them from
   Web and compare expected content/hash evidence.
7. Use Quick Save, Add Reason and Private Save. Quick Save must not force optional
   questions; Private Save must apply the intended policy.
8. Repeatedly tap the same pending operation. Confirm same-key replay behavior.
   Share again intentionally with a new reason and verify separate event history.
9. Record each row as Pass/Fail with evidence, not merely “tested on iPhone.”

**Done when:** every required online row passes on the real device. Device QA rows
cannot be closed by an agent running curl or by a simulator screenshot.

### Execution checklist

Follow the [100 microtasks for BG-35](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-35--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 42. BG-36 — Prove iPhone offline retention, retries and rotation

**What and why.** Capture often happens while travelling. A retry queue must retain
the actual payload and stable key, not just display an encouraging message.

**When.** After BG-35. **Where.** Shortcut queue/retry actions and device QA record.

### Establish what survives an offline interruption

Begin with a physical device and the client tested in BG-35. Disable connectivity,
initiate a capture and observe whether the client retains the payload and its
operation key. Do not assume iOS or a Shortcut automatically supplies a durable
queue. If the implemented client cannot retain that work, record the exact gap
and implement or revise the agreed offline scope before claiming success.

Reconnect and retry the same logical operation. Verify exactly one canonical
item, including the ambiguous case where the original request reached the server
but its response was lost. Restart the relevant client between attempts to test
persistence beyond a single in-memory execution.

### Combine recovery with the token handover

Exercise a queued request across the routine rotation window defined in BG-24.
Within the supported overlap, verify the intended credential behavior. After
expiry, the client must explain how to update credentials and retry the retained
capture without changing its logical operation identity unnecessarily. For
compromise revocation, immediate rejection is expected even if work is queued.

The acceptance record must distinguish retained text/metadata from retained file
bytes, since the device may lose access to a temporary shared file. Test the
actual file lifecycle and document any reselection requirement. A desktop API
retry test supports the server contract but cannot substitute for these device
storage and lifecycle observations.

### Small implementation steps

1. Enter airplane mode before sharing a note and a file. Verify the Shortcut never
   claims server Saved and retains the same logical operation.
2. Exit the Shortcut, reopen it and inspect the retry path. Verify file bytes still
   exist or the UI honestly requests recovery/reselection.
3. Restore connectivity and retry. Compare retained key, capture timestamp, reason,
   privacy and file hash with the eventual server event.
4. Simulate an ambiguous response after the server accepts a save. Retry and confirm
   no duplicate event/object beyond the documented same-key contract.
5. Test slow transfer, expired upload and interrupted finalization. Ensure the
   queue clears only after acknowledged canonical capture.
6. Use invalid/rotated dummy or authorized test credentials. Verify actionable
   authentication guidance, retained payload and successful retry after repair.
7. Test unsupported signature, oversized file and server/R2 unavailability. Keep
   validation correction distinct from network retry.
8. Verify iCloud queue availability/permissions on the actual device, including
   restart behavior. Record any OS limitation rather than hiding it in a happy path.
9. Check that retries do not change default privacy or silently drop the owner's
   reason. Confirm queue cleanup after success does not erase unrelated entries.

**Done when:** all offline/failure rows pass with evidence and no false Saved claim.
If device access is unavailable, keep this as a named human blocker and continue
independent documentation/fixture preparation; do not invent acceptance.

### Execution checklist

Follow the [100 microtasks for BG-36](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-36--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 43. BG-37 — Rehearse disaster recovery independently

**What and why.** A backup that can be downloaded is not yet a backup that can
restore the system. A pre-purge backup must also respect later deletion decisions.

**When.** After BG-36. Use isolated recovery targets and authorized synthetic records.

### Recover into an independent target using only the runbook

A recovery rehearsal should establish that the system can be rebuilt when its
primary state is unavailable. Provision an isolated target and use the documented
backup artifacts, original-byte archive and configuration inventory. Do not fill
missing data by reading the still-working production database; that would hide a
backup gap.

Start with explicit dry-run restore and review its report. Apply only to the
isolated target, then verify representative text, metadata, attachment bytes and
search behavior. Where indexes are derived, rebuild them through the supported
procedure and prove that distinctive source phrases can be found.

### Test the item that must stay gone

Include a synthetic item that existed in an older backup but was subsequently
purged. Carry the supported purge ledger into recovery and confirm that neither
its canonical content nor derived search/projection data returns. Successful
restoration of ordinary items does not establish anti-resurrection behavior.

Measure recovery time and record prerequisites, manual steps and unavailable
artifacts. If original bytes cannot be recovered, describe the result as partial
recovery. Feed every undocumented intervention back into BG-28's runbook, then
repeat only the affected recovery boundary. Completion requires an independently
usable recovered system under the agreed scope, not merely valid archive JSON.

### Small implementation steps

1. Prepare a fixture set with multiple capture events, owner overrides, privacy
   classes, linked attachments, extraction evidence, jobs and searchable phrases.
2. Export metadata and preserve original attachment bytes plus a hash manifest.
   Preserve the non-content purge ledger through the chosen independent procedure.
3. Restore into a clean D1/R2 target with compatible migrations. Use explicit dry
   run first, inspect its plan and then explicitly select real restore.
4. Confirm canonical item count, event count, ownership references, hashes, overrides,
   privacy and source URLs. Check foreign keys and known search phrases.
5. Verify attachment bytes from the new target, not from the original bucket or a
   cached browser response.
6. Confirm transient leases become safe pending work and no unauthorized external
   projection/delivery begins during the isolated rehearsal.
7. Purge a synthetic item through the explicit two-stage workflow in the test
   environment. Retain its newer receipt, then restore the older backup elsewhere.
8. Verify the purged item is skipped and does not reappear in FTS, attachments or
   projection queues. Check duplicate references to missing targets are safe.
9. Introduce one missing/corrupt attachment and one partial purge; confirm integrity
   reports the actual problem without deleting canonical records automatically.
10. Measure recovery time and record every manual action, missing prerequisite and
    limitation. If full R2 loss cannot be recovered, state the exact residual risk.

**Done when:** the system is demonstrably recoverable from the selected independent
artifacts, and recovery does not resurrect deliberately purged content.

### Execution checklist

Follow the [100 microtasks for BG-37](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-37--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 44. BG-38 — Observe seven eligible consecutive daily deliveries

**What and why.** A single send does not exercise daily scheduling, changing privacy,
empty days, real item links or multi-day reliability.

**When.** After BG-37, with a stable candidate and an explicitly approved private
Telegram destination. Calendar observation can overlap BG-39 once both are eligible.

### Observe the scheduler on the real calendar

The inspected configuration schedules daily delivery at 02:00 UTC, or 07:30 in
India. The hourly background cron and weekly digest have different purposes;
do not count their executions as daily-delivery evidence. Revalidate the deployed
schedule before starting the observation window.

Record seven consecutive eligible scheduled daily opportunities. For each,
preserve the scheduled time, run identifier, eligibility result, delivery outcome
and safe provider confirmation. Define eligibility from the product contract
before the window starts; do not retroactively exclude failed days to obtain
seven green rows.

### Distinguish manual recovery from scheduled success

A manual send can verify repair after an incident, but it does not prove that the
missed scheduled run succeeded. Record it separately. An unknown delivery outcome
must be reconciled using BG-27 before it can count as confirmed delivery. Record
empty/ineligible days according to the agreed criterion rather than inventing a
message that should not have been sent.

This gate needs elapsed calendar time and real integration evidence. Replaying
seven jobs in a minute or running mocked cron tests cannot complete it. Prepare
the ledger and observation procedure now; mark the gate complete only after the
required actual sequence has been observed and reviewed.

1. Record candidate SHA, destination identifier, Web origin and Asia/Kolkata schedule.
2. Seed/use ordinary eligible items without exposing sensitive content. Leave the
   normal scheduler responsible for daily delivery; repeated manual sends do not
   count as seven scheduled days.
3. For each eligible period, record scheduled time, digest ID, eligible count,
   delivery state, message ID, received time and link-open result.
4. Inspect neutral labels and link authentication. Change a synthetic item's privacy
   after generation and verify delivery uses current eligibility.
5. Distinguish empty suppression, definite failure, retry and unknown delivery.
   Reconcile unknown outcomes rather than blindly resending.
6. A missed eligible delivery breaks the consecutive-success evidence. Record the
   cause and restart the required consecutive sequence after the fix.
7. If a meaningful scheduler/privacy change occurs mid-trial, identify which prior
   evidence is invalidated. Do not combine incompatible builds into one clean run.
8. Verify the weekly review separately when its scheduled period arrives. Daily
   acceptance does not automatically prove weekly selection.

**Done when:** seven eligible consecutive scheduled daily deliveries have real
receipt/link/privacy evidence. Time cannot be simulated away for this gate.

### Execution checklist

Follow the [100 microtasks for BG-38](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-38--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 45. BG-39 — Complete two weeks of real use and verify actual cost

**What and why.** The owner must be able to find useful information in normal life,
not only operate a set of synthetic fixtures.

**When.** After the preceding technical gates; finalize after BG-38. This can share
calendar days with the digest trial once the release candidate is stable.

### Observe sustained use rather than extrapolating one good day

Agree the two-week observation period, normal capture patterns and acceptable
failure/cost boundaries before starting. Record daily capture availability,
backlog age, unresolved processing failures, integration incidents and owner
friction. Use ordinary real usage with privacy-safe aggregate evidence; the goal
is to see whether the product remains useful under its intended workload.

When a defect occurs, record its impact and repair. Do not erase the incident
from the observation record because the latest deployment passes. Decide whether
the changed behavior requires extending or restarting the relevant acceptance
period based on the original criterion.

### Reconcile counters with actual billed usage

Collect provider/platform usage and billing for the observation period when it
becomes available. Separate actual charges, included/free usage and estimates.
Internal token counters can explain a cost trend, but they are not the invoice.
Likewise, a partial billing period may not yet include delayed provider charges.

Compare costs with the agreed budget and explain the main drivers: capture
volume, attachment storage, acquisition requests, AI work and retries. Record any
unavailable billing evidence as pending. This gate cannot be closed from local
performance tests or a projected monthly total alone; it requires the elapsed
period and the actual usage/cost evidence specified by the release criteria.

### Small implementation steps

1. Define the trial start/build and the everyday use mix: webpage, note, image,
   PDF, duplicate share, review, search and reminder.
2. Record friction when it occurs: steps to save, failed shares, confusing coverage,
   search misses, wrong timestamps, lost drafts and repeated manual intervention.
3. Use a small daily note with item IDs and observed behavior rather than copying
   private source content into issue descriptions.
4. Track acknowledged-capture loss, unintended disclosure, false Saved and silent
   billing as launch blockers. Fix and rerun the relevant acceptance immediately.
5. Verify provider/platform spend from actual account evidence for the trial period.
   Internal `estimated_cost_micros = 0` alone is not proof of a $0 bill.
6. Compare operational counters with account usage, accounting for other tools that
   may share the same provider account pool. Do not attribute all account usage to
   RecollectFlow without evidence.
7. Review FTS usefulness separately from semantic/RAG expectations. V1 exact search
   should be useful, but it must not promise answers across unseen sources.
8. Close severe friction, record accepted limitations, and rerun affected stories
   after fixes. Preserve the relationship between evidence and deployed revision.

**Done when:** at least two weeks of real-device use and required fixes are complete,
with actual cost evidence and no unresolved launch blocker.

### Execution checklist

Follow the [100 microtasks for BG-39](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-39--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

## 46. BG-40 — Record the V1 go/no-go decision

**What and why.** A release is complete when the required behavior and evidence are
accepted, not when there are no more easy coding tasks left.

**When.** Last, after BG-39. **Where.** OPE-229 acceptance record, testing checklist,
BUILD_STATUS and this guide.

### Make the release decision from the evidence ledger

Bring together implementation status, local verification, deployed acceptance,
physical-device results, recovery proof and elapsed observation gates. Label each
required criterion completed or not completed, with its evidence reference.
Separate optional deferred scope from unresolved required behavior. A large
number of finished microtasks must not outweigh one missing release-critical
capability.

For each remaining blocker, state the user impact, the smallest resolving action,
the responsible role and the evidence required to remove it. For a proposed scope
exception, explain the resulting limitation in product terms. Only the owner can
accept the final scope/risk decision; the guide should make that decision clear,
not silently treat an unexecuted test as accepted.

### Record exactly what “V1 complete” means

Name the deployed revision, observation dates and approved scope. Link the
remaining backlog and operational runbooks. If a required gate is still pending,
record no-go or the owner's explicit conditional decision using the project's
agreed release policy. Do not backdate completion to the day implementation ended.

The final record should let a future maintainer answer which product behavior was
accepted, which environment was tested and which limitations were known. That is
the completion artifact for BG-40. It is not another automated test and cannot be
produced merely by checking every box in this document.

1. Review every V1 acceptance checkbox against current evidence.
2. List exact deployment SHA/version, migrations, Web origin and validated clients.
3. Confirm iPhone online/offline evidence, private download, source search,
   privacy/override preservation, Notion recovery, digest sequence and disaster test.
4. Confirm OPE-247 hardening and actual-cost evidence.
5. Separate accepted limitations from unresolved failures. A limitation cannot be
   used to rename a missing required V1 behavior into a completed feature.
6. Record any optional local-processing deferral explicitly. If its requirement
   remains mandatory, launch stays blocked until its separate acceptance passes.
7. Have the owner record go/no-go with date and reasons. Do not auto-approve this
   human launch gate because CI passed.
8. Update the completion matrix and retain historical evidence with its SHA.

**Done when:** the owner records an informed go/no-go. A no-go should name the
remaining task and evidence needed; it is a useful result, not a hidden failure.

### Execution checklist

Follow the [100 microtasks for BG-40](RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-40--100-executable-microtasks) after reading this chapter. Preserve the explanation and proof requirements when recording each result.

---

# Part VIII — Exact working references

## 47. Appendix A — Current capture contract, field by field

This is a baseline source snapshot. Recheck
`apps/worker-api/src/captures/capture.schema.ts` after changing branches.

| Field             | Current meaning and bound                    | UI/implementation implication                   |
| ----------------- | -------------------------------------------- | ----------------------------------------------- |
| `idempotency_key` | 12–200 characters                            | One stable key per logical submitted payload    |
| `source_type`     | `url`, `text`, `note`, `image`, `file`       | Do not submit `audio` here                      |
| `source_app`      | 1–80 characters                              | Identify the actual capture client              |
| `url`             | URL, maximum 2,048 characters                | Required for URL type; enforce HTTP(S) policy   |
| `shared_text`     | Maximum 100,000 characters                   | Nonblank for text/note; not named `text`        |
| `attachment_id`   | UUID                                         | Required for image/file; finalized object       |
| `user_reason`     | Maximum 2,000 characters                     | Preserve intent as source evidence              |
| `quick_category`  | Fixed enum below                             | Reuse exact wire values                         |
| `privacy_level`   | `unknown`, `public`, `personal`, `sensitive` | Default Unknown; never auto-upgrade             |
| `captured_at`     | ISO datetime with offset                     | Preserve original operation time during retries |
| `client.name`     | 1–80 characters                              | Required nested client metadata                 |
| `client.version`  | 1–40 characters                              | Required; identify deployed client behavior     |

Category wire values:

```text
learn, build, try, buy, visit, share_later, project_idea, reference
```

Minimal illustrative note request, with a fresh real timestamp/key supplied at use:

```json
{
  "idempotency_key": "example-operation-key-0001",
  "source_type": "note",
  "source_app": "web",
  "shared_text": "Remember to verify original attachment downloads.",
  "user_reason": "Release checklist",
  "privacy_level": "unknown",
  "captured_at": "2026-09-13T09:00:00+05:30",
  "client": { "name": "web", "version": "example-version" }
}
```

The schema is strict. Unknown fields are rejected. Project/review date are item
update fields today, and explicit consent belongs to the privacy contract rather
than being inferred from a Public-looking UI label.

## 48. Appendix B — Existing route families and their jobs

Paths below are existing baseline routes, not proposed endpoints.

| Route                                    | Purpose                       | Detail that callers must preserve                    |
| ---------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| `POST /api/v1/captures`                  | Save original capture         | Stable key; 201 new/200 replay                       |
| `POST /api/v1/uploads/init`              | Reserve upload                | Filename/type/size and optional hash                 |
| `PUT /api/v1/uploads/:id/content`        | Upload bytes                  | Original bytes; server-issued ID                     |
| `POST /api/v1/uploads/:id/finalize`      | Validate stored upload        | Checksum and lifecycle checks                        |
| `GET /api/v1/attachments/:id/content`    | Original download             | BG-06/07 repairs cookie authorization                |
| `POST /api/v1/admin/session`             | Login                         | JSON `{ "token": "..." }`; do not log it             |
| `GET /api/v1/admin/session`              | Check session                 | Valid admin authentication                           |
| `DELETE /api/v1/admin/session`           | Browser logout                | Rotation/revocation still separate                   |
| `GET /api/v1/items`                      | List/search items             | Filters, cursor and structured snippets              |
| `GET /api/v1/items/:id`                  | Authoritative detail          | Version, evidence, jobs and recovery state           |
| `PATCH /api/v1/items/:id`                | Edit derived fields           | Current `edit_version`                               |
| `PATCH /api/v1/items/:id/privacy`        | Change processing policy      | Version + explicit derived-data action               |
| `POST /api/v1/items/:id/delete`          | Reversible deletion           | Current version                                      |
| `POST /api/v1/items/:id/restore`         | Restore soft-deleted item     | Current version; not bulk restore                    |
| `POST /api/v1/items/:id/notion/recreate` | Recreate missing projection   | Server-confirmed eligibility                         |
| `GET /api/v1/usage`                      | Capacity status               | Admin-only safe metadata                             |
| `GET /api/v1/export?format=json`         | Portable export               | Top-level export envelope, not ordinary data wrapper |
| `GET /api/v1/export?format=csv`          | Readable export               | CSV is not the restore input format                  |
| `POST /api/v1/backups`                   | Create verified hosted backup | Completion requires read-back verification           |
| `GET /api/v1/backups/:id/download`       | Read verified backup          | Hash reverified on retrieval                         |
| `POST /api/v1/items/:id/purge-request`   | Begin purge confirmation      | Current version; item already soft deleted           |
| `POST /api/v1/purges/:id/confirm`        | Confirm exact workflow        | Server-issued phrase; expiry applies                 |
| `GET /api/v1/purges/:id`                 | Inspect workflow and steps    | Partial is not complete                              |
| `POST /api/v1/restore?dry_run=true`      | Preview portable restore      | Explicit mode; clean-target rules                    |
| `POST /api/v1/integrity-checks`          | Run integrity inspection      | Findings do not initiate canonical deletion          |

Most API responses use `{ data, meta }`; export/download endpoints intentionally
return another format. The Web helper must not assume an ordinary envelope when
handling a file export.

## 49. Appendix C — File responsibilities in plain language

| Existing location                         | What to look for                                        |
| ----------------------------------------- | ------------------------------------------------------- |
| `apps/worker-api/src/app.ts`              | Route composition and request/error handling            |
| `apps/worker-api/src/index.ts`            | Scheduled work orchestration                            |
| `apps/worker-api/src/shared/auth.ts`      | Authentication scope boundaries                         |
| `apps/worker-api/src/auth/auth.routes.ts` | Admin-session cookie lifecycle                          |
| `apps/worker-api/src/captures/`           | Canonical persistence and share-event semantics         |
| `apps/worker-api/src/attachments/`        | Private byte lifecycle and authorization                |
| `apps/worker-api/src/jobs/`               | Leases, retries, enrichment and capacity deferral       |
| `apps/worker-api/src/jobs/extraction/`    | PDF/image extraction and proposed URL extension         |
| `apps/worker-api/src/jobs/ai/`            | Provider registry, quota and circuit-breaker boundaries |
| `apps/worker-api/src/policy/`             | Approved privacy/consent routing                        |
| `apps/worker-api/src/search/`             | FTS queries, pagination and snippets                    |
| `apps/worker-api/src/items/`              | Review, versioned edits and lifecycle                   |
| `apps/worker-api/src/sync/`               | Notion projection and recovery                          |
| `apps/worker-api/src/digests/`            | Selection, review and external delivery state           |
| `apps/worker-api/src/recovery/`           | Exports, backups, purge, restore and integrity          |
| `apps/web/src/App.tsx`                    | Existing Inbox/detail UI and route composition          |
| `apps/web/src/api.ts`                     | Browser request/session/error handling                  |
| `packages/contracts/src/`                 | Shared validation and response shapes                   |
| `migrations/`                             | Forward database changes; inspect full chain            |
| `scripts/verify-production-release.mjs`   | Existing synthetic release verifier                     |
| `scripts/rebuild-item-search-index.sql`   | FTS rebuild/verification procedure                      |

A folder is not a mandate to create a new abstraction for every small feature.
Place a focused helper where it follows existing responsibilities. Extract a new
module when it gives a clear behavior/testing boundary, not to increase file count.

## 50. Appendix D — Commands and what they establish

These are repository commands checked at the baseline. Run from the project root.
Supply reviewed local settings and do not expose real credentials in command logs.

```sh
# Reproduce CI's dependency tree after selecting Node 22.
npm ci

# Complete repository gate.
npm run check

# Focused existing checks while implementing a behavior.
npm run typecheck
npm run contracts:check
npm run web:lint
npm run web:test
npm run web:build

# Specific usage regression under the Worker test harness.
npx vitest run --config vitest.d1.config.ts apps/worker-api/test/capacity-usage.d1.spec.ts

# Start API and Web in separate terminals, with isolated local configuration.
npm run dev:api
npm run dev:web

# Package the Worker without publishing a deployment.
npx wrangler deploy --dry-run
```

For isolated migration/runtime work, pass the same explicit local configuration and
`--persist-to` directory to Wrangler migration and dev commands. A production-named
binding can still be local when `--local` is used; the mode and target must be clear.
Check installed command help before automating changed flags.

The current `npm run check` executes formatting, root lint, TypeScript, Node+D1 tests,
contracts, Web lint/tests and Web build in sequence. It stops at the first failure.
If continuing later checks for diagnosis, report them separately; do not call the
combined gate green.

Remote migration/deploy commands belong in BG-31's reviewed release manifest, not
an ordinary contributor quick-start block. Browser, physical-device and sustained
real-use gates are additional to `npm run check`.

## 51. Appendix E — Failure behavior a reviewer should be able to explain

| Event                                | Durable state                                  | Correct owner-facing behavior             |
| ------------------------------------ | ---------------------------------------------- | ----------------------------------------- |
| Network fails before capture         | Local retry operation, if retained             | Retry; no Saved claim                     |
| Response lost after D1 commit        | Canonical item may already exist               | Retry same key                            |
| File uploaded, capture not confirmed | Uploaded/finalized attachment plus retry state | Continue saving; not complete capture yet |
| Source inaccessible                  | Original URL/reason retained                   | Saved with limited coverage               |
| Hosted AI not allowed                | Raw evidence available                         | No unapproved provider call               |
| AI quota exhausted                   | Deferred job; raw search works                 | Explain pause/next eligibility            |
| Terminal extraction failure          | Item/job state reconciled                      | Specific failure with valid next action   |
| Owner edit races old worker          | New owner state wins                           | Reject stale result                       |
| Notion unavailable                   | Canonical data remains                         | Sync delay/recovery, not lost item        |
| Telegram outcome ambiguous           | Unknown delivery                               | Reconcile; no blind resend                |
| Soft deletion                        | Reversible hidden item                         | Offer restore with current version        |
| Purge partially fails                | Durable per-step state                         | Report partial; preserve safe retry       |
| Restore older backup                 | Purge ledger applied                           | Purged items remain absent                |
| Admin credential compromised         | Old credential/session revoked                 | Reauthenticate; no data migration         |

## 52. Appendix F — Evidence record for every task

Copy this short template when executing a task. It is a proposed record format,
not evidence that any BG task has already passed.

```markdown
### BG-XX — Task title

- Status: Not started / In progress / Local verified / Released / Accepted / Blocked
- Requirement or existing ticket:
- Base SHA:
- Implemented SHA:
- What changed:
- Why this change was needed:
- Existing contracts preserved:
- New/changed contract and migration, if any:
- Automated checks: command, environment, result
- Browser/device story: trigger, expected result, observed result
- Failure/concurrency checks:
- Deployed version, if applicable:
- Remaining limitation or exact blocker:
- Next task unlocked:
```

A blocker must identify the missing dependency and what resolves it. “Needs testing”
is too vague. “Physical iPhone unavailable; BG-36 airplane-mode file retry remains
unverified” is actionable. Do not include secrets or private source content.

## 53. Appendix G — Short glossary

**API:** the agreed requests and responses through which one part of the system
asks another part to do work.

**D1:** the database holding authoritative records and relationships.

**R2:** object storage holding file bytes; it is not the same thing as D1 metadata.

**FTS5:** a word index that makes text search efficient without an AI model.

**Idempotency key:** the name of one logical operation, reused so a retry does not
create a new operation accidentally.

**Canonical item:** the main saved record reused when conservative duplicate rules
recognize the same source.

**Capture event:** one occurrence of sharing/saving, including its own reason.

**Lease:** a temporary claim that one worker owns a job. Expiry lets work recover
after that worker disappears.

**Optimistic version:** an item revision supplied during an edit to reject stale
writes instead of overwriting someone else's newer changes.

**Coverage:** what source information was actually available, such as URL-only or
extracted screenshot text.

**Circuit breaker:** a temporary pause after repeated provider failures, followed
by a bounded recovery probe.

**Purge receipt:** non-content evidence of permanent deletion that prevents an old
backup from restoring deliberately deleted material.

**Dry run:** an operation that prepares or validates without performing the final
change; verify the specific command's semantics rather than assuming its name.

---

# Part IX — Maintaining this guide

## 54. Keep one cumulative explanation, with current status first

Recommended maintenance practice for RecollectFlow: update this guide alongside
completed work so the next reader sees the latest state before historical detail.
This recommendation does not silently install repository instructions or alter
other projects' workflow rules.

After each completed task:

1. Add the real change and why it improves the owner's workflow.
2. Replace planned wording only for the part actually implemented.
3. Record exact validation evidence and current remaining limitations.
4. Keep existing ticket IDs where verified; do not invent external tracker records.
5. Update the top status/matrix when a release or acceptance state changes.
6. Preserve historical evidence with its SHA and date instead of presenting it as
   the result of a new test run.
7. If implementation reveals a new dependency, insert a clearly identified small
   task in the appropriate priority stage and explain the dependency. Do not move
   optional RAG work ahead of unfinished capture/recovery guarantees.

## 55. What follows V1, and what does not block this plan

RAG remains conditional on V1 acceptance, at least 100 useful captures, demonstrated
lexical-search limitations and an approved evaluation set. Android, a browser
extension, richer local multimodal processing and multi-user productization need
separate entry decisions. Their absence is not a reason to delay a valid V1 release
unless the owner has explicitly made one a V1 requirement.

A local Ollama client needs a separate scoped plan if selected: runnable client,
secure content access, one-job concurrency, heartbeat/lease loss, validated results,
Mac-off recovery, startup/shutdown and actual privacy acceptance. The existing
worker-token endpoints alone do not establish those behaviors. BG-30/BG-40 must
record whether this is required or intentionally deferred.

The endpoint of this guide is an owner who can reliably save something, find it,
inspect the original, correct it, receive useful reminders and recover from failure
without losing private data or silently paying for optional processing.
