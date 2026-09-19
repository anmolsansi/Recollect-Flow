# URL Source Acquisition Contract

Status: **BG-08 approved design contract, implemented by BG-09/BG-10.**

Design tracking: GitHub #44 / Linear OPE-328. Implementation tracking: GitHub #51 / Linear OPE-330.

Base revision: `f1d1025a11b0a78f54ae511a2e428a8d81f754ca`.

BG-08 defines what honest URL acquisition means. BG-09 implements the bounded
network fetcher. BG-10 persists acquisition evidence and chains processing. BG-11
adds owner recovery and reprocessing behavior. This document deliberately does not
claim that URL fetching exists on the BG-08 branch.

## 1. Problem and invariant

A submitted URL is evidence that the owner saved an address. It is not evidence
that RecollectFlow read the page behind that address.

The system must preserve these invariants:

1. A capture is durably **Saved** before optional source acquisition, extraction,
   enrichment, Notion, or other background work.
2. The submitted URL and capture-event provenance are immutable source evidence.
3. Conservative canonical URL normalization remains a deduplication aid only.
4. A fetched redirect destination is acquisition evidence only. It never rewrites
   the submitted URL and never becomes a deduplication key.
5. User-supplied text, fetched metadata, acquired page text, attachment extraction,
   and generated summaries are different authorities and must remain distinguishable.
6. Coverage reports what evidence exists. It does not report job health or summary
   quality.
7. A terminal limited-coverage outcome is not converted into a fabricated summary
   or an endless retry loop.
8. Source acquisition and AI routing are separate privacy decisions. Permission to
   call an AI provider does not grant permission to contact a source host.

## 2. Existing behavior at the BG-08 baseline

The following fields and behavior already exist and are not redefined by BG-08:

| Existing behavior            | Authority today                                                 | BG-08 rule                                                            |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| submitted URL                | `items.source_url` plus per-share `capture_events.source_url`   | preserve unchanged                                                    |
| conservative canonical URL   | `items.canonical_url`                                           | keep for deduplication only                                           |
| user-supplied shared text    | `raw_text` on the canonical item and capture-event evidence     | never overwrite with fetched text                                     |
| owner reason                 | item/capture-event user note fields                             | preserve separately from source content                               |
| generated summary            | `items.summary`                                                 | derived interpretation, never source evidence                         |
| attachment extraction        | `extraction_records`                                            | existing attachment evidence, not URL acquisition                     |
| extraction `coverage` string | extraction-record detail such as `full`, `none`, or page ranges | do not reuse as the URL acquisition state machine                     |
| lexical search               | D1 FTS5 projection over item fields                             | extend in BG-10 without mutating raw evidence                         |
| enrichment input             | title + note + raw text + successful extraction text            | BG-10 must stop treating a bare URL as if page text had been acquired |

At this baseline, a bare URL can reach enrichment with no usable text and terminate
as `NO_CONTENT_TO_ENRICH`. BG-08 does not hide that defect. It defines the contract
that BG-09 through BG-11 must use to replace it.

## 3. Field authority and provenance

The implementation must keep these concepts separate:

| Concept                         | Meaning                                                                          | Mutability / authority                                     |
| ------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| submitted URL                   | exact address supplied by the owner/client                                       | immutable capture evidence                                 |
| canonical URL                   | conservative normalized value used to locate duplicate canonical items           | derived from submitted URL; never rewritten from redirects |
| fetched final URL               | final HTTP(S) destination after an approved redirect chain                       | versioned acquisition evidence; never a dedupe key         |
| user-supplied text              | text explicitly supplied by the owner/client with the capture                    | immutable source evidence                                  |
| owner reason                    | why the owner saved the item                                                     | immutable per capture event; not page content              |
| fetched metadata                | title, description, site name, canonical hint observed from the fetched response | versioned acquisition evidence                             |
| acquired page text              | parser-produced text from the fetched response                                   | versioned acquisition evidence                             |
| generated summary/topics/action | model or deterministic interpretation                                            | derived data, never evidence                               |
| capture event                   | one share/save event including its own submitted evidence                        | immutable provenance                                       |

A source-provided canonical hint is metadata. It must not silently replace
`items.canonical_url`, merge items, or rewrite earlier capture events.

## 4. Selected storage architecture for BG-10

### Option A: put acquisition fields directly on `items`

This is simple, but it mixes canonical capture evidence with fetched evidence and
cannot represent a later re-acquisition without silently overwriting the earlier
observation.

### Option B: versioned URL acquisition evidence rows

**Selected.** BG-10 should add a dedicated, item-owned URL acquisition record so
source evidence remains separate from the canonical item and future re-acquisition
can be represented without rewriting history.

The exact migration is owned by BG-10, but it must preserve this logical contract.
A suitable representation is a table such as `url_acquisitions` with:

- `id`
- `item_id`
- `source_url_snapshot`
- `privacy_level_snapshot`
- `status`
- `coverage`
- `fetched_final_url`
- `http_status`
- `content_type`
- `response_bytes`
- `redirect_count`
- `source_title`
- `source_description`
- `source_site_name`
- `source_canonical_hint_url`
- `acquired_text`
- `acquired_text_hash`
- `extracted_characters`
- `error_code`
- `retryable`
- `started_at`
- `completed_at`

The migration may normalize metadata into columns or a validated structured object,
but it must not collapse source text, owner-supplied text, and generated content into
one field. Full URLs and acquired text are private data. They must not be copied into
logs, metrics labels, exception messages, or public diagnostics.

## 5. Machine-readable acquisition outcomes

`status` is the latest terminal domain outcome for one acquisition execution. Job
state remains a separate concept.

| Status                | Meaning                                                                        | Job terminal behavior                   | Retry class                                |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------ |
| `acquired_text`       | supported page text was acquired                                               | complete                                | none                                       |
| `metadata_only`       | safe metadata was acquired but no usable page body                             | complete                                | none by default                            |
| `unavailable`         | source returned a stable unavailable result such as 404/410                    | complete                                | none                                       |
| `destination_blocked` | scheme/address/redirect destination violates fetch security policy             | complete                                | none                                       |
| `policy_blocked`      | current privacy classification does not permit contacting the source host      | complete without network I/O            | none until policy/input changes            |
| `login_required`      | source requires authentication or access the fetcher is not allowed to provide | complete                                | none until input/access model changes      |
| `timeout`             | approved network request did not complete inside the total fetch budget        | retry pending, then failed after budget | transient                                  |
| `network_error`       | DNS/connect/reset/temporary network failure                                    | retry pending, then failed after budget | transient                                  |
| `rate_limited`        | source responds 429, optionally with bounded Retry-After                       | retry pending, then failed after budget | transient                                  |
| `server_error`        | source responds 5xx                                                            | retry pending, then failed after budget | transient                                  |
| `unsupported_content` | response type is outside the V1 parser allowlist                               | complete                                | none                                       |
| `too_large`           | response exceeds the V1 byte limit                                             | complete                                | none                                       |
| `redirect_limit`      | redirect loop/count exceeds the V1 limit                                       | complete                                | none                                       |
| `empty`               | request succeeded but deterministic extraction produced no usable evidence     | complete                                | none                                       |
| `parse_failed`        | supported response cannot be parsed safely                                     | complete                                | none unless a later parser version changes |

A completed acquisition job can legitimately carry a limited or unavailable domain
outcome. “Complete” means the acquisition decision finished, not that page text was
obtained.

## 6. Stable safe error codes

The implementation must expose stable, non-secret codes rather than raw exception
text:

- `SOURCE_FETCH_POLICY_BLOCKED`
- `SOURCE_DESTINATION_BLOCKED`
- `SOURCE_LOGIN_REQUIRED`
- `SOURCE_NOT_FOUND`
- `SOURCE_ACCESS_DENIED`
- `SOURCE_TIMEOUT`
- `SOURCE_NETWORK_ERROR`
- `SOURCE_RATE_LIMITED`
- `SOURCE_SERVER_ERROR`
- `SOURCE_UNSUPPORTED_CONTENT`
- `SOURCE_TOO_LARGE`
- `SOURCE_REDIRECT_LIMIT`
- `SOURCE_EMPTY_CONTENT`
- `SOURCE_PARSE_FAILED`

Raw DNS messages, response bodies, signed query parameters, cookies, authorization
headers, source text, and complete source/final URLs must not become error codes or
logs.

## 7. URL content coverage

URL coverage is the strongest source-content evidence available for the item. It is
not the same as the existing free-form attachment extraction `coverage` string.

BG-10 must expose a machine-readable URL coverage value with these meanings:

| Coverage        | Meaning                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `url_only`      | submitted URL, capture provenance, and owner reason are available, but no source metadata/body or supplied source text is available |
| `metadata_only` | source metadata was acquired, but no page body or supplied source text is available                                                 |
| `supplied_text` | owner/client supplied source text is available; this does not prove the live page was fetched                                       |
| `acquired_text` | deterministic source acquisition produced page text                                                                                 |

When more than one evidence type exists, the strongest coverage value may be shown
for compact UI, but the underlying provenance fields remain separate. An acquired
page does not erase supplied text. Supplied text does not become fetched page text.

## 8. Privacy and source-host disclosure

### Selected V1 rule

Automatic network source acquisition is eligible only when the canonical item's
current D1-owned `privacy_level` is explicitly `public`.

- `public`: acquisition may be attempted subject to the network safety policy.
- `unknown`: retain URL/source evidence, record `policy_blocked`, do not contact
  the source host.
- `personal`: retain URL/source evidence, record `policy_blocked`, do not contact
  the source host.
- `sensitive`: retain URL/source evidence, record `policy_blocked`, do not contact
  the source host.

The default remains `unknown`. A hostname, title, page metadata, source app, or AI
classification must never silently promote an item to `public`.

The existing AI-provider matrix remains authoritative for AI calls after source
evidence exists. Public source-fetch eligibility does not imply AI eligibility, and
AI eligibility does not imply source-fetch eligibility.

If privacy changes while an acquisition job is waiting or leased, BG-10 must reject
stale policy snapshots before making or persisting a source request. A later explicit
change to Public may make a new acquisition eligible. BG-11 owns the owner-facing
retry/reprocess flow.

## 9. Network safety contract for BG-09

BG-09 must implement a deterministic HTTP(S) fetcher. It is not a browser.

It must:

- accept only `http:` and `https:`;
- validate the initial destination and every redirect target;
- deny loopback, link-local, private, reserved, metadata-service, and otherwise
  prohibited destinations after resolution;
- never send owner cookies, browser sessions, capture/admin/local-worker tokens,
  source-site credentials, or arbitrary client headers;
- never execute page JavaScript;
- never solve CAPTCHAs, bypass login walls, or impersonate a signed-in browser;
- use manual redirect handling so every hop is revalidated;
- treat fetched content as untrusted data, never instructions.

### V1 fetch budgets

These values are the BG-08 contract for BG-09. They are intentionally small and may
change only through an explicit contract change backed by measurement.

| Budget                       |                                      V1 value | Reason                                                                      |
| ---------------------------- | --------------------------------------------: | --------------------------------------------------------------------------- |
| total wall-clock budget      |                                     8 seconds | bounds Worker occupancy across the whole redirect chain                     |
| redirects                    |                                     5 maximum | enough for ordinary canonical redirects without unbounded loops             |
| response body                |      2 MiB maximum as delivered to the parser | bounds memory/work for article-style text pages                             |
| extracted text               |            250,000 Unicode characters maximum | aligns with the existing extraction-result upper bound                      |
| automatic transient attempts | 3 maximum for the same source/policy snapshot | prevents the generic job ceiling from becoming an endless source retry loop |

A declared `Content-Length` above 2 MiB can be rejected early, but the header is
not trusted. The fetcher must stop reading and cancel the body when the actual
parser-visible stream exceeds the limit.

The runtime may transparently decode HTTP content encoding. RecollectFlow must not
add an unbounded second decompression step. The 2 MiB safety check applies to bytes
actually consumed from the body stream presented to the parser.

The total 8-second deadline includes redirects and body reading. Timeout cancellation
must abort the in-flight request and cancel the response body where available.

### V1 content types

The deterministic page parser allowlist is:

- `text/html`
- `application/xhtml+xml`
- `text/plain`

Parameters such as `charset=utf-8` are allowed. Missing or conflicting content
types must fail closed unless BG-09 safely identifies a supported textual response
without accepting arbitrary binary data.

PDF, image, audio, video, archives, executable content, and other binary responses
remain unsupported for URL acquisition in this V1 contract. The owner can capture a
supported file through the existing attachment path. Expanding URL-to-file fetching
requires its own size, MIME, storage, and malware/abuse review.

## 10. Deterministic parsing and content eligibility

BG-09 may extract source metadata and visible document text without AI.

Allowed deterministic metadata includes:

- document title;
- meta description;
- site name;
- source-provided canonical URL hint, as metadata only.

Scripts, styles, hidden control content, page instructions, and executable content
must not be treated as trustworthy instructions.

### Evidence eligible for enrichment

- **Acquired page text:** nonblank deterministic text from a supported fetched
  response. It may be sent to an AI provider only if the separate AI policy permits.
- **User-supplied source text:** nonblank text explicitly supplied with the capture.
  It may support enrichment according to the AI privacy policy, but generated output
  must not claim RecollectFlow fetched or read the live page.
- **Attachment extraction:** continues under the existing extraction contract.
- **Metadata only:** may populate/display deterministic source metadata. It does not
  justify a full-page summary.
- **Title only:** does not justify a full-page summary.
- **URL only:** does not justify a summary of page contents.
- **Owner reason only:** remains intent/provenance. It must not be presented as page
  contents.

If acquisition is terminal and none of acquired text, supplied text, or existing
attachment extraction is usable, BG-10 must not enqueue a doomed enrichment job that
can only return `NO_CONTENT_TO_ENRICH`. The item remains Saved with truthful limited
coverage.

No-AI operation remains valid. Source acquisition, metadata display, source text
storage, exact retrieval, and FTS indexing must not require a model.

## 11. Retry classification

Only these source outcomes automatically retry:

- `timeout`
- `network_error`
- `rate_limited`
- `server_error`

Automatic retries are bounded to three acquisition attempts for the same submitted
source/policy snapshot. Existing job backoff/lease mechanics may be reused, but the
generic processing-job maximum is not the product contract for source acquisition.

The following do not automatically retry unchanged input:

- `policy_blocked`
- `destination_blocked`
- `login_required`
- `unavailable`
- `unsupported_content`
- `too_large`
- `redirect_limit`
- `empty`
- `parse_failed`
- `metadata_only`

BG-11 may allow an owner-triggered retry after a meaningful change, such as a privacy
change, parser release, source update, or newly supplied evidence. Manual retry must
not bypass privacy, destination, byte, content-type, or credential boundaries.

## 12. Owner-visible outcomes

| Outcome                                    | Owner-visible result                                                                          | Suggested next action                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| acquired text                              | “Saved. Page text was acquired and is available for search.”                                  | none                                               |
| metadata only                              | “Saved. I could read page metadata, but not the page body.”                                   | supply text or screenshot if needed                |
| unavailable/not found                      | “Saved. The link is kept, but the page is unavailable.”                                       | check the link or supply evidence                  |
| login required                             | “Saved. This page requires login, so only the link and your supplied evidence are available.” | supply text, screenshot, or file                   |
| privacy blocks fetch                       | “Saved. Source fetching is off for this privacy level.”                                       | keep as-is or explicitly reclassify if appropriate |
| blocked destination                        | “Saved. The source address is not allowed for server fetching.”                               | keep URL or supply evidence                        |
| timeout/network/server error after retries | “Saved. The source could not be reached after bounded retries.”                               | retry later                                        |
| unsupported content                        | “Saved. This URL returns a format the page fetcher does not read.”                            | capture the supported file directly                |
| too large                                  | “Saved. The page exceeded the safe fetch limit.”                                              | supply selected text or a smaller supported source |
| empty                                      | “Saved. The page returned no usable text.”                                                    | supply text or screenshot                          |

“Saved” refers to canonical capture durability, not successful optional processing.

## 13. Instagram contract

Instagram is coverage-first, not scraper-first.

For an Instagram/Reel URL:

1. Save the exact URL and the owner's reason immediately.
2. Do not claim the Reel was watched, heard, transcribed, or understood unless
   corresponding evidence actually exists.
3. Do not use authenticated scraping, browser cookies, login bypass, or automation
   to obtain private/guarded content.
4. If a public deterministic fetch yields only safe metadata, coverage is
   `metadata_only`.
5. If the source requires login, coverage remains `url_only` unless the owner also
   supplied text.
6. Offer a screenshot, file, or supplied-text path for richer evidence.

Example:

> Saved. This Instagram link is kept with your reason. I did not acquire a
> transcript or Reel content. Add a screenshot or text if you want that evidence to
> be searchable.

## 14. BG-10 propagation

BG-10 must make the contract durable without silently changing current source fields.

### Item detail API

The admin item detail should expose a `source_acquisition` object containing the
latest acquisition evidence, including at minimum:

- status;
- URL coverage;
- fetched timestamp;
- fetched final URL;
- HTTP status when available;
- content type;
- response bytes;
- extracted character count;
- structured source metadata;
- acquired text or an explicitly documented owner-only source-text representation;
- safe error code;
- retryable flag.

The response must continue to expose submitted/canonical URL, owner-supplied text,
owner note, and generated summary as separate fields.

### Search / FTS

Do not copy acquired page text into `items.raw_text`.

BG-10 should extend the rebuildable `item_search_fts` projection with a derived
source-text field populated from the latest eligible URL acquisition evidence.
Metadata-only title/description may be included in that derived projection. The FTS
projection is rebuildable search data, not source authority.

### Job chain

For URL captures:

1. persist capture and return Saved;
2. create/resolve the source-acquisition outcome first;
3. after acquisition reaches a terminal outcome, evaluate available evidence;
4. enqueue enrichment only when usable evidence exists and AI routing permits;
5. do not create `NO_CONTENT_TO_ENRICH` work for unchanged URL-only input.

A `policy_blocked`, `login_required`, `metadata_only`, `empty`, or unsupported
outcome can be a successful terminal acquisition decision even when enrichment is
not applicable.

BG-12/BG-13 remain responsible for the separate aggregate `items.processing_status`
repair. BG-10 must not silently redefine that later contract.

### Export and restore

Portable JSON export must include URL acquisition evidence and the export schema
version must change when the new records become durable. Restore must restore that
evidence or explicitly reject a schema it cannot restore.

CSV should expose a useful latest acquisition summary. It need not flatten every
historical acquisition field if JSON remains the complete portable representation.

### Purge

Explicit item purge must delete URL acquisition evidence and acquired text with the
canonical item. Soft delete follows the existing recoverable lifecycle. Purge
receipts/backups must continue preventing a later restore from resurrecting purged
acquisition evidence.

## 15. Observability and security

BG-09/BG-10 evidence should record:

- safe acquisition status/error code;
- duration;
- response byte count;
- extracted character count;
- redirect count;
- content type;
- retry count;
- whether network I/O was skipped by privacy policy.

Do not log:

- complete source or final URLs;
- URL query strings or fragments;
- source page text;
- owner notes;
- cookies;
- authorization headers;
- provider secrets;
- raw response bodies.

Tests must include prompt-injection-shaped page text to prove source content remains
data and cannot alter processing instructions.

## 16. Acceptance matrix

BG-09/BG-10 are expected to prove at least these cases:

| Case                                         | Expected acquisition                        | Expected coverage                              | Automatic retry                   |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| public HTML article with body                | `acquired_text`                             | `acquired_text`                                | no                                |
| public HTML with metadata but no body        | `metadata_only`                             | `metadata_only`                                | no                                |
| public 404/410                               | `unavailable`                               | `url_only`                                     | no                                |
| public 401/403/login wall                    | `login_required`                            | `url_only`                                     | no                                |
| public 429                                   | `rate_limited` until retry budget exhausted | `url_only` unless supplied text exists         | yes, max 3                        |
| public 5xx                                   | `server_error` until retry budget exhausted | `url_only` unless supplied text exists         | yes, max 3                        |
| timeout                                      | `timeout` until retry budget exhausted      | `url_only` unless supplied text exists         | yes, max 3                        |
| private/reserved destination                 | `destination_blocked`                       | `url_only`                                     | no                                |
| Unknown/Personal/Sensitive item              | `policy_blocked` with zero network I/O      | supplied-text if present, otherwise `url_only` | no                                |
| binary/unsupported response                  | `unsupported_content`                       | supplied-text if present, otherwise `url_only` | no                                |
| >2 MiB body                                  | `too_large`                                 | supplied-text if present, otherwise `url_only` | no                                |
| >5 redirects                                 | `redirect_limit`                            | supplied-text if present, otherwise `url_only` | no                                |
| empty supported response                     | `empty`                                     | supplied-text if present, otherwise `url_only` | no                                |
| Instagram requiring login                    | `login_required`                            | supplied-text if present, otherwise `url_only` | no                                |
| URL + owner-supplied text, fetch unavailable | acquisition outcome remains truthful        | `supplied_text`                                | based only on acquisition outcome |

## 17. Completion boundary

BG-08 is complete when this contract is reconciled with the build guide, privacy
governance, use cases, decisions, issue/Linear tracking, and the authoritative
100-step checklist.

BG-08 does not become incomplete merely because BG-09/BG-10 code does not yet exist.
Its output is the explicit contract those tasks must implement. Conversely, BG-09 is
not unlocked by prose alone until the BG-08 contract branch passes repository CI and
its merged closeout records the parent gate.

## 15. Implemented BG-10 persistence binding

BG-10 binds this contract to migration `0022_add_url_acquisition_evidence.sql`.
The durable evidence table is `url_acquisitions`, keyed by immutable row ID and a
unique acquisition `job_id`. It stores the source/privacy snapshots, source
revision, status/coverage, bounded response metadata, deterministic source metadata,
acquired text/hash, safe error/retry state, parser identity and timestamps.

The active acquisition job type is `acquire_url`. Its `input_hash` is
`url-source-v1:<source_revision>`. Acceptance is conditional on the current
processing lease, undeleted/non-purging item, unchanged source URL/revision and the
same privacy snapshot. Fetching happens outside D1. Evidence persistence, eligible
enrichment handoff, audit evidence and acquisition-job terminal transition are
submitted together as one D1 batch.

The current lexical projection adds `source_text` to `item_search_fts`. It is
derived from the newest URL evidence whose source revision and privacy snapshot
match the current item. The rebuild script uses the same derivation. Portable
export schema `2026-09-19.1` includes URL acquisitions, and restore, purge and
integrity checks treat them as item-owned evidence.

BG-11 owns explicit retry/reprocess UX. BG-10 intentionally does not add a public
retry command.

### BG-10 implementation notes

The durable BG-10 evidence row also records `attempt_count`, `duration_ms`,
and `network_io_skipped_by_policy`. D1 constrains URL/metadata/text sizes,
redirect count, response bytes, and the three-attempt automatic retry ceiling so
portable restore cannot bypass the service-layer bounds.

Portable JSON remains the complete history. CSV exposes a compact current
`url_acquisition` summary for owner-readable export.

The preexisting generic failed-job retry endpoint rejects `acquire_url` jobs.
Reusing the same job ID would conflict with immutable one-observation-per-job
evidence. BG-11 owns the explicit generation-aware retry/reprocess command.
