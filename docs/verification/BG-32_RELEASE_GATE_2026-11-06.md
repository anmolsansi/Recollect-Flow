# BG-32 — core deployment reconciliation and remaining release gates

**Status: In progress, not full V1 release acceptance.** Tracking: [GitHub #141](https://github.com/anmolsansi/Recollect-Flow/issues/141) and [Linear OPE-346](https://linear.app/openclaw-neutron/issue/OPE-346/bg-32-verify-deployed-core-release-boundaries-and-close-production).

## Baseline and task boundary

The current source baseline for this work is main at `f7c487808539cc0809cd407f4b3f1debe6834b3a` (November 3, 2026). The approved immutable production artifact is **not** that documentation head. The [BG-31 core release record](../releases/BG-31_CORE_RELEASE_2026-11-03.md) reports that source `81e82806700519b90b6fbd5c1ebb233ed5def9d2`, Web release ID `3b455e5d2150e5a38c24f340164b220fe74b05163604c2e159572affbdd8def6`, and Worker version `ff5ba1ce-32b0-499c-ae67-f561ec09c93a` were deployed on November 3 after the exact owner approval `BG31-CORE-81e828067005-2026-11-03.3`. This is historical, owner-approved evidence, not a new live observation.

Target: `https://recollect-flow.openclawneutron.workers.dev`, account `a9482fbfb91ace26dee097cbd41293f9`, D1 `recollect-flow-prod-v2` / `76bd35c6-c833-4987-a47e-6aa8238bb832`, private R2 `recollect-flow-attachments-prod-v2`. This is a **fresh installation** with no earlier compatible application artifact. The historical 22-migration ledger, required secret-name presence, safe auth and routing smoke, three synthetic items and one 639-byte PDF are recorded by BG-31. Do not reapply migrations or rerun its write-bearing smoke to inflate BG-32 progress.

## Already performed, with scoped evidence

- Approved core-only forward migrations through `0025`, first Worker/Web deployment and runtime secret installation.
- Homepage, direct route, health, anonymous/wrong-scope rejection, session, capture/replay, PDF original/private denial, edits, eventual search, CSV/JSON exports and a bounded safe-log sample.
- Provider/Cron/Notion/Telegram work intentionally disabled. No provider execution, automatic backup, full device or destructive recovery acceptance is established.

## Missing evidence and stop conditions

- A **new, independently recoverable encrypted export** of the hosted data including original bytes and any latest purge receipts, with an isolated restore proof, must be confirmed before relying on real hosted data or any further production mutation. The October 30 local backup only covered earlier local synthetic data.
- Operator/device login, session and private downloads remain owner-reported, not independently verified on the intended device.
- Immediate first search missed and then succeeded on read-only retry. Do not claim instantaneous search correctness or a latency SLO. Default Python urllib User-Agent encountered Cloudflare error 1010/403; known application User-Agent succeeded. Investigate before universal client acceptance.
- Confirm current Worker version, deployment identity, D1 ledger and current binding/secret-name presence through authorized read-only authenticated platform inspection. Public smoke alone cannot prove any of these.
- Skipped BG-29.078 hourly sweep and incomplete OPE-247 security/operations remain independent gates. R2 is metered, and a budget alert is not a hard billing cap.

**Authorization:** The November 3 approval applied to the exact first-install core packet and bounded operations. It does **not** permit another deploy, remote SQL mutation, R2 write, destructive restore, provider/notification send, Cron activation or billing change. Stop if artifact/target checks mismatch or a new operation lacks explicit scoped approval.

## November 6 public browser observations

A connected Opera browser made direct, unauthenticated navigations to the
approved origin. These are **new public UI/body observations**, not a full
protocol/header smoke or authenticated Cloudflare inventory.

- `/`: the SPA showed an Admin Access form. No credential was entered.
- `/api/v1/health`: the JSON body reported `data.status = "ok"`.
- `/items/bg32-readonly-route-probe`: the direct route showed the
  Admin Access form rather than a route-not-found page.
- `/api/v1/items/bg32-readonly-route-probe`: anonymous JSON returned
  `error.code = "FORBIDDEN"`.
- `/api/v1/bg32-readonly-no-route`: JSON returned
  `error.code = "NOT_FOUND"`.
- `/assets/bg32-missing-aBcD1234.js`: the page displayed
  `Asset unavailable`, not the SPA login form.
- `/release-manifest.json`: the displayed source SHA and Web release ID
  matched the approved frozen record.

No login, mutation, provider call, SQL, secret read or billed action was made.
The browser accessibility view does **not** establish exact HTTP statuses,
`Cache-Control`, `Content-Type`, redirect policy, currently deployed Worker
version, live binding state, or private file access. Those checks remain open
until directly verified. This evidence must not be labeled an end-to-end pass.

## Source-level hardening on the BG-32 branch

The public GET-only verifier now rejects a substituted local release record
even if that record contains syntactically valid hashes and UUIDs. It pins the
owner-approved packet, exact source/Web revision, account, Worker/deployment
IDs, D1 identity, private R2 bucket and disabled Cron scope. Regression tests
cover these substitutions and verify that a failed step stops subsequent
requests. These are local deterministic tests, not fresh platform facts.

## November 6 authenticated Cloudflare dashboard inventory (read-only)

This inspection used the owner's existing signed-in Opera Cloudflare dashboard
for account `a9482fbfb91ace26dee097cbd41293f9`. It involved only page
navigation and reading visible metadata; **no deployment, SQL query, object
read/write, configuration edit, secret disclosure, token usage, or other
production mutation was performed**.

- **Account:** The dashboard shows exact intended account ID
  `a9482fbfb91ace26dee097cbd41293f9`.
- **Worker:** `recollect-flow` is present under the approved `workers.dev`
  hostname.
- **Deployment:** Active version prefix `ff5ba1ce` is `100% Ready` and
  receives `100%` of traffic. Wrangler is listed as the deployment source.
  The full active version UUID was not exposed.
- **D1:** `recollect-flow-prod-v2` has the approved UUID
  `76bd35c6-c833-4987-a47e-6aa8238bb832`. The dashboard shows 35
  tables and about 602 kB of storage.
- **Migration ledger:** D1 Studio lists `d1_migrations`, but its rows were
  not read and the current 22-file applied sequence was not rechecked.
- **R2:** `recollect-flow-attachments-prod-v2` uses Standard storage;
  public access is disabled. Its reported size is about 824 B. No original
  object bytes or checksums were inspected.
- **Worker bindings:** `AI`, `ASSETS`, `ATTACHMENTS`, `DB`, and
  `LOGIN_RATE_LIMITER` are present. The named D1/R2 targets match.
  Runtime binding access was not tested.
- **Secret names:** `ADMIN_TOKEN`, `CAPTURE_TOKEN`, `LOCAL_WORKER_TOKEN`,
  and `WEB_INBOX_BASE_URL` are present as encrypted secrets. No secret
  values were viewed.
- **Disabled operations:** `HOSTED_EXTERNAL_DISPATCH_ENABLED`,
  `HOSTED_HTTP_DISPATCH_ENABLED`, `HOSTED_SCHEDULED_WORK_ENABLED`,
  `HOSTED_BACKUP_AUTOCREATE_ENABLED`, and `DIGEST_AI_ENABLED` all
  display `false`.
- **Scheduled triggers:** Worker Settings says
  `No cron triggers configured`.

**Remaining limits:** The live D1 ledger's rows, full active Worker version UUID,
R2 original-object checksums, end-to-end runtime binding access, private
session verification, authenticated operational logs, and independent hosted
backup/recovery proof have **not** been verified by this inventory. The
November 3 BG-31 record provides earlier 22-migration and full-version proof,
but cannot be relabeled as a current SQL read. No BG-32 production deployment
or new-operation authorization follows from this audit.

<!-- prettier-ignore-start -->

## November 6 owner-device authentication and PDF metadata (read-only)

The owner reported logging in privately on the connected Opera browser. The
verification assistant neither received nor read the admin token, session cookie,
or secret values. These are observed browser/UI and authenticated API results,
not a claim that the complete download security contract is accepted.

- **BG-32.054 / admin login — PASS (observed):** the previously anonymous
  landing page changed to the logged-in Web Inbox, with navigation and a
  Logout control rather than the Admin Access form. Three existing synthetic
  items were visible. No login credential was exposed to the assistant.
- **BG-32.055 / session persistence — PASS (observed):** same-tab navigation
  back to the canonical home origin caused a fresh page load and then
  returned the authenticated Inbox. New Opera tabs opened direct item URLs
  without showing the Admin Access form. This verifies same-browser reload
  and new-tab persistence, not cookie attributes or cross-device lifetime.
- **Authenticated read — PASS (observed):** a read-only GET in the
  authenticated browser to
  `/api/v1/items/302e4bea-3225-4708-8b41-9c5661bf4d17`
  returned a file-source synthetic item with a linked PDF attachment. The
  detail page showed the same attachment and a Download link. The PDF
  attachment ID is `2a8afecc-eab3-4f43-a3aa-e430013435fd`,
  size `639` bytes, declared and detected type `application/pdf`, and
  stored SHA-256
  `b9e46d9bb5dda15caef690fcda522cc286ce7c0d32e39c3d654be187eb34842a`.
  The synthetic filename is
  `bg31core663c3ef516e6480da9e0ab2cdfccbeae.pdf`.
  These are *stored metadata*, not an independently rehashed download.
- **Private unauthenticated denial — observed earlier on November 6:** before
  the owner logged in, a GET to
  `/api/v1/attachments/bg32-anonymous-probe/content`
  returned JSON `UNAUTHENTICATED`, with safe request ID
  `ef785ae9-0f21-4543-815a-2f078045e885`.
  This uses a nonexistent probe ID, so it verifies authentication is enforced
  before exposing unknown attachment content. It is not a replacement for
  anonymous denial on the *actual* attachment URL.
- **Actual private original download — NOT YET VERIFIED:** navigating to the
  real PDF content URL triggered a transient new tab that Opera's connector
  could not inspect (`Tab with id 295029052 was not found`). This may be a
  browser-managed download, but neither an HTTP 200 response nor saved PDF
  bytes/size/hash was exposed. Do not label this attempt a successful or
  failed byte-integrity download solely on that browser-connector error.

**Remaining device-side proof:** on the owner's Mac, use the existing
synthetic item detail page to download its PDF, then verify the downloaded
file is exactly 639 bytes with SHA-256
`b9e46d9bb5dda15caef690fcda522cc286ce7c0d32e39c3d654be187eb34842a`.
Verify unauthorized access to the *actual attachment ID* in a separate logged-out
or private browser session, without logging out the owner's existing session.
Record results without tokens, cookies, private PDF contents, or personal file
paths. This test did not inspect HTTP status/headers or cookie attributes.

No new capture, update, deletion, migration, deployment, R2 write, billing,
provider call, secret read, or scheduled task was performed. The historical
BG-31 PDF download proof remains distinct from this new owner-device check.
Do not close BG-32 or claim full V1 acceptance from these two checklist passes.

## November 6 owner-confirmed downloaded PDF integrity

The owner supplied macOS Terminal output for the downloaded existing BG-31
synthetic PDF after clicking its authenticated Download link. The file's reported
byte length was **639**, and `shasum -a 256` returned
`b9e46d9bb5dda15caef690fcda522cc286ce7c0d32e39c3d654be187eb34842a`.
Both values **exactly match** the previously observed production attachment
metadata. This confirms owner-device download integrity for the synthetic
original. The assistant did not directly read local bytes or file contents.
The owner's private home path is deliberately omitted.

An additional read-only probe against the **actual** attachment URL from a
separate unauthenticated browser was **inconclusive**. The browser showed
`ERR_QUIC_PROTOCOL_ERROR` and no HTTP status or JSON error was available.
This did not expose the PDF, but it cannot prove the server denied anonymous
access. Retest the exact URL in an Opera private window without session
cookies, expecting a JSON `UNAUTHENTICATED` response and no PDF body. Do
not replace the pending actual-object security check with the earlier
unknown-ID unauthenticated probe.

**Outcome:** authenticated PDF bytes/length/hash **PASS (owner-confirmed)**;
actual-object anonymous denial, HTTP status/headers, and cookie attribute
inspection remain **OPEN**. No production change or credential handling
occurred.

## November 6 owner-confirmed anonymous denial for actual synthetic PDF

After the inconclusive independent browser attempt above, the owner supplied
the JSON response from the requested unauthenticated/private-window check
against the **existing synthetic attachment content URL** ending in
`/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content`:

```json
{"error":{"code":"UNAUTHENTICATED","message":"A valid capture token is required."},"meta":{"request_id":"963929e1-85e8-4517-90d4-1c05687f2026"}}
```

This is **owner-reported confirmation**, consistent with the earlier request
to open the actual attachment URL in an Opera private window without logging
in. The response contains an authentication error, not PDF bytes. It
supersedes the earlier **pending** actual-object anonymous-denial status,
but does not turn the separate browser's `ERR_QUIC_PROTOCOL_ERROR` into an
HTTP response. The assistant did not independently inspect that private
window or verify response status/headers.

**Updated Step 3 outcome:** admin login, authenticated session persistence,
private synthetic PDF download (639 bytes with exact expected SHA-256), and
unauthenticated denial of the actual PDF attachment **PASS** based on
direct Opera inspection and owner-supplied device evidence as identified.
HTTP status/headers, cookie attributes, and the **remaining BG-32 release
gates** are outside this completed functional Step 3 verification. Do not
close BG-32, BG-33, or full V1 based solely on this section.

<!-- prettier-ignore-end -->

## November 7 Step 4 operational health review (read-only)

**Outcome: operational review performed with unresolved observability and release blockers. Not BG-32 acceptance or V1 GO.** The existing production deployment was not changed. This is new evidence gathered through the owner's authenticated Opera Cloudflare session and GET-only hosted endpoints on 2026-11-07 UTC. Do not confuse dashboard counts or successful current requests with complete retrospective logs, integration success, or an independently restored backup.

### Fresh, directly observed evidence

- **Deployment and baseline:** Cloudflare still lists `recollect-flow` as Ready at active Worker prefix `ff5ba1ce` with 100% traffic. The public `/release-manifest.json` still shows approved source `81e82806700519b90b6fbd5c1ebb233ed5def9d2` and Web release `3b455e5d2150e5a38c24f340164b220fe74b05163604c2e159572affbdd8def6`. These checks do not independently prove full active Worker UUID.
- **Public health:** a new browser GET to `/api/v1/health` returned `data.status: ok` with safe request ID `f775fd8c-768d-4930-b304-ab2612ccdd30`. Opera supplied the body, not independently inspected HTTP response status, cache or content-type headers.
- **Worker error counts:** Cloudflare Worker Overview listed 40 invocations and zero errors over the last 24 hours. The dedicated Errors chart for active version `ff5ba1ce` also showed 0 in its last-24-hours window. This **does not** prove no application-level errors or failures outside that window.
- **Logs and issues:** Workers Logs and Traces are displayed as Enabled, but the Worker Observability view returned **No events found** for its selected last-one-hour window, and the Worker Issues page offered **Enable issue detection** (not enabled). Thus no individual runtime, auth, migration or binding-failure events were available for review through these displays. Do not label these failure signals cleared. Enabling issue detection would change production settings and was not attempted.
- **Hosted operational summary:** an authenticated, read-only GET to `/api/v1/operations/summary` returned an application-generated timestamp of `2026-11-07T08:39:26.206Z` and safe request ID `43d78bbf-8a79-4e7c-86c7-ab54940fbec0`. The D1-backed summary proves this particular DB read route worked, not every binding or job execution path. It reported:
  - Processing `acquire_url`: **1 pending**, oldest 2026-11-03T11:14:22.376Z.
  - Processing `enrich`: **1 pending**, oldest 2026-11-03T11:14:21.243Z.
  - Processing `extract`: **1 pending**, oldest 2026-11-03T11:14:26.869Z.
  - Notion sync: **3 pending**, oldest 2026-11-03T11:14:21.243Z.
  - All backlog groups showed no sample error code and no next-available timestamp; `truncated: false`. The known intentionally disabled Cron/provider/Notion dispatch explains why this backlog is not progressing, but that is **not** proof the jobs will succeed once enabled.
  - Recovery summary: **0 partial purges**, **0 failed backups**, **0 ambiguous digests** and **0 missing Notion projections** reported. Latest stored verified backup was recorded at `2026-11-06T19:58:20.854Z` with 11,746 bytes and expiry `2026-12-06T19:58:17.633Z`. This is application-state evidence only; the independent encrypted off-device backup and complete isolated restore remain **OPEN**.
  - D1 attachment metadata showed **1 recorded object / 639 bytes**, **0 recorded orphan objects**. The endpoint explicitly disclaims authoritative R2 provider inventory, and its R2 object count/byte fields were null.
- **Web assets:** the exact CSS `/assets/index-DWlwdqDW.css` and JS `/assets/index-Vu2u9WfB.js` from the frozen manifest both displayed nonempty source content in direct Opera GETs. The intentionally absent `/assets/bg32-missing-aBcD1234.js` displayed `Asset unavailable`, not the SPA login shell. These are body/UI observations, **not** independent HTTP 200/404, cache header, integrity or full real-browser asset-loading proofs.

### Known failures and incomplete investigations

1. The November 3 immediate search miss before a later successful read-only retry remains documented; do not claim immediate search consistency or a latency SLO from this review.
2. The historical Python `urllib` default User-Agent encountered Cloudflare 1010/403 while an application User-Agent worked. This read-only review did not reproduce or fix it. Universal client compatibility remains unaccepted.
3. No detailed live log events were available in the observed one-hour window. Migration error signals, specific Worker exceptions, unexpected auth failures and binding-failure events remain **unverified**, even though the aggregate 24-hour Worker error count was zero.
4. Exact private-response `Cache-Control` / `Content-Type` / redirect headers were **not measured** in Opera. Source-code expectations are not production header proof.
5. Six pending jobs are intentionally held while scheduled work and third-party dispatch remain disabled. Do not enable Cron/Notion/providers as a diagnostic without separately approved scope.
6. The independent recoverable off-device export/isolated restore, complete runtime binding and migration/inventory corroboration, BG-29.078, OPE-247 and final V1 acceptance remain separate gates. Owner-confirmed Step 3 private-file verification is not reclassified as incomplete by this review.

### Step 4 disposition and safety

**Completed bounded checks:** production reachability and manifest comparison, last-24-hour runtime-error metrics inspection, read-only D1-backed job backlog and recovery-status inspection, and public asset availability/missing-asset behavior. Corresponding BG-32 checklist actions `.063`, `.066` and `.068` can be marked performed with the evidence limits above.

**Still OPEN:** BG-32.062, .064, .065 and .067 need relevant detailed logs / binding signal / authentication failure evidence / actual cache headers. A missing event stream is not a pass. This review records the absence of evidence, preserves the existing **NO-GO** gate, and does not authorize new production changes.

No deployment, D1 query in Studio, remote SQL mutation, private R2 read/write, secret exposure, paid change, logging-setting update, synthetic capture, provider/notification call, Cron activation, rollback or destructive recovery was performed.

<!-- prettier-ignore-start -->

## November 8–9 seven-day log and operational inspection (read-only)

**Disposition: BG-32.062, .064 and .065 inspected at the available evidence level; this is not a blanket absence-of-errors claim or BG-32/V1 acceptance.** The owner selected **Last 7 days** on the production `recollect-flow` Worker Observability Events page in authenticated Opera. The resulting URL had `timeframe=7d` and showed **258 events** and **0 in the Errors counter**. The default visible event rows were informational request logs, including GETs for the session, item and operations-summary routes. No event-level error was identified in that visible sample. This is a seven-day dashboard summary, **not** a complete filter-by-status audit of all 258 invocations, and not a substitute for historical Wrangler migration command output.

- **Migration error signals, BG-32.062:** Reviewed the seven-day Worker error counter and earlier approved November 3 BG-31 migration execution record, which reports successful execution, ledger checks and integrity probes. PR #144 independently records the authenticated D1 Studio `d1_migrations` ledger of **22 ordered entries, IDs 1–22**, matching tracked files through `0025_bg28_scheduled_backups.sql`. Current Opera D1 Studio still exposes the production `d1_migrations` table; the entire table was **not** queried again in this inspection. No seven-day Worker error event surfaced, but Worker logs cannot retrospectively prove each Wrangler CLI output. Mark the *inspection* performed, not a new migration or an exhaustive error-free history.
- **Binding-failure signals, BG-32.064:** Re-inspected Cloudflare production Settings. `DB` targets `recollect-flow-prod-v2`, `ATTACHMENTS` targets `recollect-flow-attachments-prod-v2`, and `AI` and `LOGIN_RATE_LIMITER` bindings are listed; the previously confirmed static `ASSETS` binding and encrypted secret names remain documented by November 6 inventory. The authenticated production GET `/api/v1/items/302e4bea-3225-4708-8b41-9c5661bf4d17` again returned item and PDF metadata with safe request ID `7e257396-6674-4eff-b544-072583ffabfa`. Previously verified authenticated operations-summary and synthetic original-PDF steps provide bounded D1/R2 functional evidence. Neither the dashboard error count nor these reads prove all bindings or the intentionally disabled AI/dispatch/Cron paths work.
- **Unexpected authentication failures, BG-32.065:** The authenticated GET `/api/v1/admin/session` returned `data.authenticated=true`, safe request ID `48e952fa-b470-4867-bcf3-c7c67d429f7e`. The protected item GET succeeded. Existing November 6 Step 3 evidence covers signed-in session persistence, actual synthetic PDF original access and expected anonymous denial. The seven-day dashboard reports **0 Errors**, with no exception-classified auth event surfaced in the visible log sample. **Expected 401/403 denials may be informational responses rather than logged exceptions.** Specific status-level 401/403/429 breakdown was not independently extracted from all seven-day events; therefore unexpected user-facing denials are not categorically ruled out.

**Tracking decision:** BG-32.062, .064 and .065 are marked checked solely because their scoped inspections were performed and the available historical/current evidence reviewed. An unchecked item is not converted into a full system pass by a lack of error logs. BG-32.067 (live private cache and content-type response headers) remains **OPEN**. All broader hosted backup, isolated recovery, disabled integration, BG-29.078, OPE-247, and launch NO-GO gates remain unchanged.

No new migration, Studio SQL execution, secret read, paid/logging setting change, Worker deployment, Cron activation, provider send, R2 write, backup restore or other production mutation was performed.


### November 9 private caching inspection: source verified, live header gate still open

- Read the exact approved/deployed source revision `81e82806700519b90b6fbd5c1ebb233ed5def9d2`: the production `handleFetch()` wrapper adds `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` to `/api/*`; the private PDF route sets these headers plus PDF `Content-Type` and length. The existing private PDF route test and production-release smoke contract explicitly assert these headers.
- Prior BG-31 release smoke was approved and recorded as passing, and the synthetic PDF was subsequently verified on the owner's Mac as 639 bytes with matching SHA-256. The Cloudflare Worker version prefix `ff5ba1ce` remains consistent with the frozen core release.
- An independent standard-browser, anonymous read-only attempt on November 9 to inspect GET response headers for `/api/v1/health` and the existing synthetic attachment encountered `net::ERR_QUIC_PROTOCOL_ERROR`, **before receiving any HTTP response**. No actual current HTTP status or response headers were observed. This is a transport/access limitation in the separate browser environment, not evidence of a cache defect.
- **BG-32.067 remains OPEN** because current private HTTP response headers have not been captured from the authenticated owner-device browser. The safe 3-GET, header-only, no-credential owner-browser check is in [BG-32_PRIVATE_CACHE_BROWSER_CHECK.md](BG-32_PRIVATE_CACHE_BROWSER_CHECK.md). Do not claim a live cache-header pass until its sanitized results are inspected.
- No deployment, data mutation, new credential or logging/billing/config change was undertaken; the broader BG-32 and V1 **NO-GO** status remains unchanged.


### November 9 owner-session cache header verification (BG-32.067 PASS)

The owner performed a read-only, same-origin, authenticated Opera Console `fetch()` check and supplied the sanitized three-row header result. These are owner-confirmed actual **response headers**, not independently captured browser network records. All requests returned HTTP 200. `/api/v1/admin/session` and the existing synthetic `/api/v1/items/302e4bea-3225-4708-8b41-9c5661bf4d17` returned `Content-Type: application/json`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and no declared Content-Length. The existing `/api/v1/attachments/2a8afecc-eab3-4f43-a3aa-e430013435fd/content` returned `Content-Type: application/pdf`, `Content-Length: 639`, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`.

This satisfies the scoped private-response caching inspection `BG-32.067`, corroborated by the frozen deployed Worker implementation and existing prior original-file integrity/anonymous-access evidence. Missing Content-Length on JSON is acceptable. Neither private CDN-cache metadata nor a new SHA-256 computation is implied. The earlier isolated browser `net::ERR_QUIC_PROTOCOL_ERROR` produced no HTTP response and was not an application cache failure.

**BG-32 / 07 Step 4 is now 10/10 inspections performed when the checklist update merges.** This does **not** accept the overall BG-32 release, backup/recovery, disabled providers/Cron, BG-29.078, OPE-247 or V1 GO. No production state/configuration change was made.

### November 9 owner-reported anonymous PDF and CDN-cache follow-up (BG-32.067 corroboration)

The owner supplied **sanitized Opera Network results** after the authenticated cache-header verification above. An unauthenticated request for the **existing synthetic private PDF** returned **HTTP 401 Unauthorized** and **no private PDF body**. For the authenticated private requests already observed as HTTP 200 with `Cache-Control: private, no-store` (session, item, PDF), the owner reported **`CF-Cache-Status: DYNAMIC`** and an **absent `Age` header**. The existing PDF response was `Content-Type: application/pdf`. No cookies, auth headers, private URL or document contents were collected or included here.

**Assessment:** BG-32.067 is complete as an evidence-bounded inspection. The tested unauthenticated request denied PDF access, and the checked authenticated responses neither permitted shared caching by HTTP directive nor showed a Cloudflare cached HIT. `DYNAMIC` with no `Age` supports non-cached treatment for **these observed responses**. This is user-reported sanitized header evidence, not an independently reproduced network capture, a comprehensive Cloudflare Cache Rules audit, or proof across every authenticated endpoint, user, edge region, signed-URL variant or future deployment. It does not certify all intermediary caches, and a single observed 401 does not exhaust authorization edge cases. Investigate any later `HIT`, `public`, `s-maxage`, unexpected PDF 200 while unauthenticated, or caching-rule change before relying on this gate for release.

**Release posture:** BG-32 Step 4 remains **10/10 scoped inspections checked**, while full BG-32 / V1 remains **NO-GO** due to separate backup/recovery, disabled provider/Cron and other outstanding release gates. This evidence update involved no deployment, production data write, Cloudflare settings change or paid operation.

<!-- prettier-ignore-end -->

## Verification approach

Keep the historical evidence separate from new observations. Use a read-only checker for health, public routing, exact published Web release ID, anonymous private denial and missing asset behavior. The checker must never make a mutating request or use credentials. A passed public check supports reachability and routing only, not private session, DB inventory, billing, backup or final release acceptance.

The canonical [BG-32 100-step checklist](../RECOLLECTFLOW_MICROTASK_CHECKLIST.md#bg-32--100-executable-microtasks) remains the truth for completeness. Check items only after their evidence and review are recorded. Do not close BG-33 or full V1 by inheriting this bounded initial deployment.
