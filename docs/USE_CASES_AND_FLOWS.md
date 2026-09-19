# Use cases and end-to-end flows

## Primary use cases

| ID    | Use case                     | Intended outcome                                                              |
| ----- | ---------------------------- | ----------------------------------------------------------------------------- |
| UC-01 | Share an Instagram Reel URL  | Save the URL and personal reason immediately; expose actual coverage honestly |
| UC-02 | Share a screenshot           | Preserve original bytes and extract visible text when policy/quota permits    |
| UC-03 | Share a website              | Preserve original/canonical URL, selected text, metadata, and intent          |
| UC-04 | Share a PDF/file             | Store the original, extract supported text, and make it reviewable/searchable |
| UC-05 | Save a thought               | Create a first-class note without an external source                          |
| UC-06 | Recover a vague memory       | Find an item using partial words, concepts, source, date, or project          |
| UC-07 | Review intake                | Confirm/correct derived fields, connect projects, act, archive, or delete     |
| UC-08 | Recover failed enrichment    | Keep the raw item available and retry a failed optional stage                 |
| UC-09 | Ask across saved knowledge   | Receive a grounded answer with direct citations to saved sources              |
| UC-10 | Compare saved sources        | Preserve disagreement and cite each position separately                       |
| UC-11 | Ask an unsupported question  | Receive partial/insufficient evidence and closest relevant items              |
| UC-12 | Capture privately            | Keep restricted content local, pending, or no-AI                              |
| UC-13 | Resurface forgotten material | Receive concise daily/weekly links without exposing sensitive text            |
| UC-14 | Restore after failure        | Rebuild D1/items/attachments from versioned export and checksums              |
| UC-15 | Build a project briefing     | Assemble evidence-linked context for an active project in V3                  |
| UC-16 | Contextual reminder          | Resurface relevant evidence around calendar/project events in V2/V3           |
| UC-17 | Capture from Android/browser | Use conditional secondary clients when measured demand justifies them         |

## Capture interaction modes

- **Quick Save:** one tap after choosing RecollectFlow; no question.
- **Save with Reason:** short typed or dictated intent.
- **Private Save:** explicit privacy choice prevents unapproved hosted processing.
- **Save and Remind:** review date/window for time-sensitive material.

## Universal capture flow

1. User chooses RecollectFlow from a share-capable app.
2. Client classifies input as URL, text, image, file, audio, video, or note.
3. User optionally chooses reason, category, privacy, or reminder.
4. Client creates a stable idempotency key and retains a retryable local payload.
5. Files use upload initialization and private byte upload before capture finalization.
6. API authenticates, validates, stores original input, and returns a stable ID.
7. Client displays Saved, Already Saved, Saved—Processing Pending, or actionable retry.
8. Optional extraction, AI, indexing, Notion, and digest work proceeds independently.

## Source-specific behavior

### URL or website

Store the submitted URL unchanged, derive the existing conservative canonical URL
for deduplication, and create the item before optional source acquisition. Redirect
destinations never rewrite either the submitted capture event or the canonical
deduplication key.

Automatic V1 source acquisition is eligible only for explicitly Public items. The
source fetch is a separate privacy boundary from AI routing. Unknown, Personal, and
Sensitive URL captures remain Saved without contacting the source host.

The bounded fetcher defined by BG-08/BG-09 is deterministic HTTP(S), not a browser:
no owner/site cookies, no RecollectFlow tokens, no JavaScript execution, no login
bypass, and no CAPTCHA handling. Every redirect is revalidated. Login-required,
blocked, unavailable, unsupported, empty, and exhausted transient failures remain
truthful limited-coverage outcomes.

URL-content coverage uses these BG-08 meanings:

- `url_only`: the link/capture provenance exists, but no source metadata/body or
  supplied source text is available;
- `metadata_only`: source metadata exists but no page body or supplied source text;
- `supplied_text`: the owner/client supplied text, but that does not prove the live
  page was fetched;
- `acquired_text`: deterministic source acquisition produced page text.

User-supplied text, acquired page text, fetched metadata, and generated summaries
remain separately attributable. Metadata or a title alone must not be presented as
a summary of the page. If no usable source/supplied/attachment text exists after the
acquisition outcome is known, processing should stop honestly instead of scheduling
an enrichment job that can only fail `NO_CONTENT_TO_ENRICH`.

See [URL_ACQUISITION_CONTRACT.md](URL_ACQUISITION_CONTRACT.md) for the complete
outcome, retry, budget, storage, search, export, and purge contract.

### Instagram

Save the exact URL, timestamp, source app, and owner reason first. Instagram remains
URL/coverage-first and has no scraper promise.

A simple approved Public fetch may retain deterministic public metadata when it is
available. RecollectFlow does not sign in, reuse browser cookies, bypass access
controls, execute the Instagram application, or claim to have watched/heard a Reel.
A login-required result stays `url_only` unless the owner also supplied source
text. Public metadata without body/transcript evidence is `metadata_only`.

Never invent a transcript from a title or preview. When richer evidence is useful,
guide the owner to supply text, a screenshot, or a supported file. Example:

> Saved. This Instagram link is kept with your reason. I did not acquire a
> transcript or Reel content. Add a screenshot or text if you want that evidence to
> be searchable.

### Screenshot/image

Upload original bytes to private R2; record hash, dimensions, MIME type, and size; run OCR/vision only after policy routing; preserve extracted text separately from generated summaries; let the owner inspect the original and correct extraction.

### PDF/file

Validate MIME/signature, size, and risk; use an opaque object key; create a SAVED item before extraction; prefer embedded-text extraction; OCR only when explicitly supported; preserve page count/completeness and source spans; keep the original file authoritative.

### Manual/voice note

Manual notes are first-class items. Voice notes remain usable by title/reason while transcription is pending. User-provided audio is stored privately and processed only by an approved hosted/local path.

## Review flow

1. Open Web or Notion Inbox.
2. Inspect original source, why saved, coverage, extraction, summary, suggested project/topics/action.
3. Confirm, edit, or reject derived fields.
4. Choose Inbox, Reviewed, Actioned, Archived, Duplicate, or Deleted.
5. Optionally add a review date or future task integration.
6. Record edits and lifecycle changes as auditable events; never rewrite original evidence.

## Search and recall flow

1. Enter exact keywords, partial memory, or a natural-language description.
2. V1 searches FTS5 and structured fields without AI.
3. Rank why-saved/title above generic summaries; apply source/date/project/topic/status/privacy filters.
4. Display matching snippet, coverage, source, project, topics, date, and actions.
5. Open source/item, review/archive, and optionally mark Useful, Not Relevant, Already Used, or Outdated.
6. Record retrieval/recollection events without training an external model on private content.

## Ask RecollectFlow flow (conditional V1.5)

1. Parse question, names, constraints, metadata filters, and privacy mode.
2. Retrieve lexical candidates, then semantic candidates when approved.
3. Fuse rankings deterministically; collapse duplicates; preserve source diversity and conflicts.
4. Optionally rerank through a replaceable provider.
5. Select a bounded evidence set with stable citation IDs.
6. Generate one of answered, partially_answered, conflicting_evidence, or insufficient_evidence.
7. Validate every citation against supplied context and stored source spans.
8. Store retrieval/citation provenance and show source inspection controls.
9. On follow-up, use history for reference resolution but retrieve fresh evidence again.

## Failure and recovery flows

- **Network/client failure:** retain retryable payload; same key prevents a duplicate.
- **Storage unavailable:** do not claim Saved; return retry-safe error.
- **AI quota/provider outage:** leave optional job pending; raw retrieval/search continues.
- **Invalid model JSON:** reject, optionally repair once, then mark failed without corrupting fields.
- **Notion outage/rate limit:** queue/retry with backoff; Web/D1 remains usable.
- **Mac/local worker offline:** private job remains pending until the worker returns.
- **Unsupported or inaccessible source:** retain original and truthful partial coverage.
- **Deletion:** hide during grace period, then explicitly purge objects, indexes, projections, derived records, and caches.
- **Lost Notion database:** rebuild projection from D1.
- **Lost token:** rotate secret without data migration and update clients.
- **Corrupted/lost D1:** restore versioned export, verify checksums/counts, rebuild derived indexes and projections.

## Future active-knowledge flows

- Show evidence supporting, contradicting, updating, or deriving an action from another item.
- Assemble a project briefing with current, conflicting, and stale evidence.
- Resurface saved knowledge around calendar events or project milestones.
- Schedule spaced review using usage, relevance, and forgetting signals.
- Explore team/public use only after authentication, tenancy, consent, billing, abuse, legal, and support designs are separately approved.
