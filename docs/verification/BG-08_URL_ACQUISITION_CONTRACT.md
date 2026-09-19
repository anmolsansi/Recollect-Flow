# BG-08 — URL Acquisition Contract Verification

Tracking: GitHub #44 / Linear OPE-328.

Task: **BG-08 — Define honest URL acquisition and coverage**.

## Baseline and dependency

- BG-08 base: `f1d1025a11b0a78f54ae511a2e428a8d81f754ca`.
- That revision is the merged BG-07 final closeout from PR #43.
- BG-07 is therefore complete and the build-guide dependency for BG-08 is
  satisfied.
- Work branch: `agent/ope-328-bg-08-url-acquisition-contract`.
- Environment selected for BG-08: repository/source inspection plus GitHub CI.
- No production source host, production Worker, credential, or real private URL is
  required or authorized for this contract-definition task.

## Existing implementation inspected

BG-08 was reconciled against the current repository rather than designed from the
ticket title alone.

### Capture and source authority

`apps/worker-api/src/captures/capture.service.ts` currently derives
`canonicalUrl = normalizeUrl(input.url)` and uses it for conservative duplicate
lookup.

`apps/worker-api/src/captures/capture.repository.ts` stores `source_url`,
`canonical_url`, `raw_text`, owner note/privacy data, and independent
`capture_events`. This supports the existing invariant that multiple share events
can point to one canonical item without erasing each event's evidence.

### Enrichment

`apps/worker-api/src/jobs/enrich.service.ts` currently builds model input from:

- item title;
- owner note;
- `raw_text`;
- completed/partial extraction text and image descriptions.

A bare URL provides none of those by itself. When the assembled text is empty, the
job terminates with `NO_CONTENT_TO_ENRICH`. BG-08 preserves this as baseline
evidence rather than relabeling it as working URL acquisition.

### Coverage

`apps/worker-api/src/jobs/extraction/extraction.schema.ts` currently defines
extraction completeness but leaves `coverage` as a free-form string up to 100
characters. Current extractors use values such as `full`, `none`, `0 pages`,
and page ranges.

That value describes an extraction result. It is not a safe machine-readable URL
acquisition state machine, so BG-08 does not overload it.

### Privacy

`apps/worker-api/src/policy/policy.service.ts` currently uses policy version
`2026-07-31.2` and separates Unknown, Public, Personal, and Sensitive AI routing.
The OPE-224 approval record also names `2026-07-31.2`.

The previous security-governance prose still referenced `2026-07-21.1` and omitted
the later Cloudflare approval. BG-08 reconciles that documentation to the approved
current policy before adding the separate source-host rule.

### Search

Migration `0016_add_item_search_fts.sql` builds `item_search_fts` from item
fields including title, raw text, owner note, summary, topics, project, people, and
companies. There is no URL-acquired page-text field today.

BG-08 therefore requires BG-10 to add a derived source-text projection rather than
copy fetched page text into `items.raw_text`.

### Export and recovery

The current portable export groups an item with capture events, attachments,
processing jobs, and sync attempts. CSV includes canonical item fields but no URL
acquisition evidence because that evidence does not exist yet.

BG-08 requires the future durable acquisition record to participate in JSON
export/restore, schema-versioning, and purge.

### Job/retry framework

The generic job service permits a larger implementation-level attempt ceiling, and
the admin retry service separately bounds manual retries. BG-08 does not use that
generic ceiling as the source-fetch product contract. URL acquisition gets a
specific maximum of three automatic transient attempts for unchanged input/policy.

## Devil's-advocate review

### Risk: reuse `raw_text` for fetched page text

Rejected. It would erase the distinction between owner-supplied source evidence and
network-acquired evidence. It would also make later re-acquisition overwrite history.

### Risk: reuse `canonical_url` for redirect final URL

Rejected. A redirect is an observation from one fetch. Making it canonical identity
could silently merge items or rewrite the owner's original evidence.

### Risk: treat the AI privacy matrix as source-fetch permission

Rejected. Fetching contacts a third-party host even when no model is called. The
owner may have saved a private/signed URL. Automatic fetching therefore needs a
separate fail-closed permission boundary.

### Risk: make every unavailable source a failed job

Rejected. Login-required, unsupported, policy-blocked, destination-blocked, empty,
and metadata-only outcomes can be truthful terminal acquisition decisions. A failed
worker execution and a limited domain outcome are different concepts.

### Risk: use the generic 20-attempt job ceiling for source networking

Rejected. Repeated requests to an unchanged login wall or unavailable page add cost,
latency, and external traffic without creating evidence. Only transient
timeout/network/429/5xx outcomes retry, at most three automatic attempts.

### Risk: parse arbitrary URL content

Rejected. Initial BG-09 scope is deterministic text pages only:
`text/html`, `application/xhtml+xml`, and `text/plain`. Existing attachment
capture remains the path for supported files.

## Selected contract

The authoritative design is
[../URL_ACQUISITION_CONTRACT.md](../URL_ACQUISITION_CONTRACT.md).

### Provenance

Separate:

- submitted URL;
- conservative canonical URL;
- fetched final URL;
- supplied text;
- fetched metadata;
- acquired page text;
- generated summary;
- capture-event provenance.

Submitted/capture-event evidence remains immutable. Redirect final URL and a page's
canonical hint never become duplicate keys.

### Durable outcome vocabulary

Planned statuses:

- `acquired_text`
- `metadata_only`
- `unavailable`
- `destination_blocked`
- `policy_blocked`
- `login_required`
- `timeout`
- `network_error`
- `rate_limited`
- `server_error`
- `unsupported_content`
- `too_large`
- `redirect_limit`
- `empty`
- `parse_failed`

These are planned BG-10 domain values, not claims about fields already deployed.

### URL-content coverage

Planned compact coverage values:

- `url_only`
- `metadata_only`
- `supplied_text`
- `acquired_text`

Coverage is the strongest available URL-content evidence. The underlying provenance
fields remain distinct even when one compact value is shown.

### Privacy

Automatic source-host network I/O:

| Privacy | Automatic source acquisition |
| --- | --- |
| Public | eligible, subject to BG-09 destination safety |
| Unknown | no network I/O |
| Personal | no network I/O |
| Sensitive | no network I/O |

Unknown remains the default. No automatic classification promotes it to Public.

### Fetch budgets

- total deadline: 8 seconds;
- redirects: maximum 5;
- parser-visible response body: maximum 2 MiB;
- extracted source text: maximum 250,000 Unicode characters;
- automatic transient attempts: maximum 3 per unchanged source/privacy snapshot;
- supported types: HTML, XHTML, and plain text.

Every redirect gets the same destination validation. The fetcher sends no browser
cookies, RecollectFlow tokens, source-site credentials, or arbitrary authorization
headers and executes no page JavaScript.

### Retry rules

Automatic retry:

- timeout;
- temporary network error;
- 429/rate limit;
- 5xx/server error.

No automatic retry for unchanged input:

- privacy policy block;
- unsafe destination;
- login/access wall;
- stable unavailable result;
- unsupported/too-large content;
- redirect limit;
- empty extraction;
- parser failure;
- metadata-only completion.

### Enrichment eligibility

Acquired page text, owner-supplied source text, and existing attachment extraction
can provide content evidence.

Metadata/title only, URL only, and owner reason alone do not justify a full-page
summary. When no usable content exists after the acquisition outcome is known,
BG-10 must avoid enqueuing work that can only fail `NO_CONTENT_TO_ENRICH`.

No-AI capture, acquisition, exact retrieval, and lexical search remain valid.

## Owner-visible examples

### Login-required article

> Saved. This page requires login, so only the link and your supplied evidence are
> available.

### Policy-blocked URL

> Saved. Source fetching is off for this privacy level.

### Instagram URL

> Saved. This Instagram link is kept with your reason. I did not acquire a
> transcript or Reel content. Add a screenshot or text if you want that evidence to
> be searchable.

These messages separate Saved durability from source coverage.

## Contract propagation

### Storage

BG-10 will use an item-owned versioned URL acquisition record. Exact migration code
is intentionally deferred to BG-10, but it must preserve the fields/authorities in
the contract and must not overwrite raw source evidence.

### Item detail

BG-10 will expose latest acquisition status, coverage, final URL, source metadata,
acquired text representation, safe error, retryability, and fetch measurements in a
separate `source_acquisition` object.

### FTS

BG-10 will extend the rebuildable search projection with source text. It will not
copy acquired page text into `items.raw_text`.

### Jobs

Source acquisition reaches a terminal domain outcome before enrichment eligibility
is decided. Limited outcomes can complete acquisition without fabricating content.
BG-12/BG-13 still own aggregate `items.processing_status` repair.

### Export/restore

Portable JSON must include acquisition evidence and bump the portable schema version
when the new record becomes durable. CSV may expose a useful latest summary. Restore
must preserve supported acquisition evidence.

### Purge

Explicit purge deletes acquisition evidence and acquired page text with the item.
Existing backup purge receipts continue to prevent resurrection.

## Test contract handed to BG-09/BG-10

The contract includes acceptance cases for:

- acquired public article;
- metadata-only page;
- 404/410;
- 401/403/login wall;
- 429;
- 5xx;
- timeout/network failure;
- unsafe/private/reserved destination;
- Unknown/Personal/Sensitive policy block with zero network I/O;
- unsupported binary type;
- >2 MiB body;
- >5 redirects;
- empty page;
- Instagram login wall;
- owner-supplied text when fetch is unavailable;
- prompt-injection-shaped page text remaining untrusted data;
- export/restore/purge behavior once evidence becomes durable.

## Scope integrity

BG-08 changes documentation/contracts only.

It does not:

- implement a fetcher;
- add a migration;
- change capture or deduplication behavior;
- change runtime enrichment behavior;
- change FTS today;
- change portable export today;
- deploy or call a production source;
- repair the BG-12/BG-13 aggregate status defect.

That boundary is intentional. Implementing those changes in BG-08 would collapse
three sequential build-guide tasks and make review/rollback harder.

## Microcommits before checklist closeout

1. `2c4efab` — define the URL acquisition contract.
2. `e3dd5e1` — freeze BG-08 ADRs.
3. `d3dc24a` — reconcile AI policy documentation and separate source-fetch privacy.
4. `739cb4e` — make website/Instagram flows coverage-honest.
5. `e18248a` — define the planned item-detail acquisition projection.

This evidence record is the sixth logical microcommit. Checklist reconciliation and
build-guide status are separate commits so each change remains reviewable.

## Verification state

Repository-source reconciliation: **PASS**.

Security/privacy boundary review: **PASS**.

Scope review: **PASS**. Runtime files, migrations, dependencies, deployment
configuration, and secrets are unchanged.

PR CI: **pending until the implementation PR is opened on the completed branch
head**.

The final BG-08.100 parent gate remains pending until the contract PR is merged,
merged-main validation is green, and the final closeout records BG-09 as unlocked.
