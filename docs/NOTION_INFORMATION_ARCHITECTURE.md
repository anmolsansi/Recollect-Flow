# Notion information architecture and synchronization

## Role and boundary

Notion is a human review and organization projection. D1 remains the system of
record for captures, immutable evidence, privacy, processing, deletion, and
recovery. A Notion outage, deletion, schema edit, or rate limit cannot prevent
capture, raw retrieval, search, export, or recovery.

V1 uses one Notion database for every D1 `source_type`: `url`, `text`, `note`,
`image`, and `file`. PDF, audio, and video files remain D1 `file` items; their
detected MIME and coverage describe the subtype without expanding the D1 enum.

## Approved V1 database properties

| Notion property    | Notion type      | D1 source                              | V1 owner                   | Update behavior                                |
| ------------------ | ---------------- | -------------------------------------- | -------------------------- | ---------------------------------------------- |
| Name               | Title            | `items.title`, then URL/ID fallback    | Human in Notion            | Set only on create; sync never overwrites      |
| Capture ID         | Rich text        | `items.id`                             | D1 immutable               | Always projected; exact idempotency key        |
| Source URL         | URL              | `items.source_url`                     | D1 immutable               | Always projected when present                  |
| Source App         | Select           | `items.source_app`                     | D1 immutable               | Always projected                               |
| Source Type        | Select           | `items.source_type`                    | D1 immutable               | `url`, `text`, `note`, `image`, or `file`      |
| Captured At        | Date             | `items.captured_at`                    | D1 immutable               | Always projected                               |
| Why Saved          | Rich text        | `items.user_note`                      | D1 immutable user evidence | Always projected and never mixed with Summary  |
| Summary            | Rich text        | `items.summary`                        | D1 derived                 | Always projected when present                  |
| Coverage           | Select           | `items.coverage`                       | D1 derived                 | Always projected                               |
| Project            | Select           | `items.project` initial value          | Human in Notion            | Set only on create                             |
| Topics             | Multi-select     | `items.topics_json` initial values     | Human in Notion            | Set only on create                             |
| Importance         | Number           | `items.importance` initial value       | Human in Notion            | Set only on create; 0–100                      |
| Suggested Action   | Rich text        | `items.suggested_action`               | D1 derived                 | Always projected when present                  |
| Status             | Select           | `items.lifecycle_status` initial value | Human in Notion            | Set only on create                             |
| Privacy            | Select           | `items.privacy_level`                  | D1/admin only              | Always projected; Notion edits are overwritten |
| Processing         | Select           | `items.processing_status`              | D1 derived                 | Always projected                               |
| Review Date        | Date             | `items.review_at` initial value        | Human in Notion            | Set only on create                             |
| Duplicate          | Checkbox         | `items.lifecycle_status = 'Duplicate'` | D1 derived                 | Always projected                               |
| Last Synced        | Date             | `items.notion_last_synced_at`          | D1 derived                 | Always projected                               |
| Last Edited        | Last edited time | Notion computed                        | Notion system              | Read-only; used to order the Archived view     |
| Projection Version | Number           | `items.projection_version`             | D1 derived                 | Always projected                               |
| Projection Hash    | Rich text        | `items.projection_hash`                | D1 derived                 | Always projected                               |

`Why Saved` is the user-authored reason and must be shown as its own column next
to `Summary`; Summary is generated/derived content and may never replace or
silently rewrite Why Saved.

### Database schema JSON

Use these exact names and types in the destination database:

```json
{
  "Name": { "title": {} },
  "Capture ID": { "rich_text": {} },
  "Source URL": { "url": {} },
  "Source App": { "select": {} },
  "Source Type": {
    "select": {
      "options": [
        { "name": "url" },
        { "name": "text" },
        { "name": "note" },
        { "name": "image" },
        { "name": "file" }
      ]
    }
  },
  "Captured At": { "date": {} },
  "Why Saved": { "rich_text": {} },
  "Summary": { "rich_text": {} },
  "Coverage": { "select": {} },
  "Project": {
    "select": {
      "options": [
        { "name": "Unassigned" },
        { "name": "Learning" },
        { "name": "Project Ideas" }
      ]
    }
  },
  "Topics": {
    "multi_select": {
      "options": [{ "name": "Learning" }]
    }
  },
  "Importance": { "number": { "format": "number" } },
  "Suggested Action": { "rich_text": {} },
  "Status": {
    "select": {
      "options": [
        { "name": "Inbox" },
        { "name": "Reviewed" },
        { "name": "Actioned" },
        { "name": "Archived" },
        { "name": "Duplicate" },
        { "name": "Deleted" }
      ]
    }
  },
  "Privacy": {
    "select": {
      "options": [
        { "name": "unknown" },
        { "name": "public" },
        { "name": "personal" },
        { "name": "sensitive" }
      ]
    }
  },
  "Processing": {
    "select": {
      "options": [
        { "name": "pending" },
        { "name": "processing" },
        { "name": "complete" },
        { "name": "failed" }
      ]
    }
  },
  "Review Date": { "date": {} },
  "Duplicate": { "checkbox": {} },
  "Last Synced": { "date": {} },
  "Last Edited": { "last_edited_time": {} },
  "Projection Version": { "number": { "format": "number" } },
  "Projection Hash": { "rich_text": {} }
}
```

## Human editing and source-of-truth rules

There is no timestamp-wins rule in V1. It is ambiguous under clock skew and
cannot distinguish a user edit from an integration edit.

- **Human-owned in Notion:** Name, Project, Topics, Importance, Status, Review
  Date. The sync worker sets their initial values only when creating a page and
  omits them from every update.
- **D1-owned:** Capture ID, source fields, Captured At, Why Saved, Summary,
  Suggested Action, Privacy, Processing, Coverage, duplicate indicator and all
  projection metadata.
- **Privacy is admin-only:** changing the Notion Privacy select does not
  reclassify the D1 item or authorize provider processing. Use
  `PATCH /api/v1/items/:id/privacy`, which records policy evidence.
- A future reconciliation endpoint may import only the human-owned allowlist
  with Notion `last_edited_time`, D1 version checks, and an audit event. Until
  that endpoint is accepted, human fields remain intentionally Notion-only
  after their initial projection.

## Required views

Create these views in the single destination database:

| View                           | Filter                                                                     | Sort/group                             | Required visible fields                            |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| Inbox                          | Status is `Inbox`                                                          | Captured At descending                 | Name, Why Saved, Summary, Source App, Captured At  |
| Unprocessed                    | Processing is `pending`, `processing`, or `failed`                         | Processing then Captured At descending | Name, Processing, Why Saved, Last Synced           |
| Worth Reviewing                | Status is not `Actioned`/`Archived`; Importance ≥ 70 or Review Date is due | Importance descending                  | Name, Why Saved, Summary, Importance, Review Date  |
| Learning                       | Project is `Learning` or Topics contains `Learning`                        | Captured At descending                 | Name, Why Saved, Summary, Topics                   |
| Project Ideas                  | Project is `Project Ideas`                                                 | Importance descending                  | Name, Why Saved, Suggested Action, Importance      |
| Active Projects                | Status is not `Archived`/`Deleted` and Project is not empty                | Group by Project                       | Name, Status, Importance, Review Date              |
| Archived                       | Status is `Archived`                                                       | Last edited descending                 | Name, Project, Topics, Captured At                 |
| Failed Syncs / Needs Attention | Processing is `failed`, or Last Synced is empty after capture              | Captured At ascending                  | Capture ID, Name, Processing, Last Synced, Privacy |

## Retention and archive behavior

- `Archived` is a review state, not deletion. D1 and the Notion page are retained
  until an explicit deletion workflow is approved and executed.
- Trashing a Notion page never deletes D1. The worker records
  `NOTION_PAGE_MISSING` and stops automatic retries.
- `POST /api/v1/items/:id/notion/recreate` is the owner/admin approval action.
  It clears the stale page ID, audits the decision, and enqueues one new sync.
- D1 soft deletion and purge follow the grace/purge policy in
  `docs/DATA_MODEL.md`; Notion never initiates purge.

## Retry-safe sync contract

- Capture ID is queried with an exact rich-text filter before every create.
- Zero matches creates one page; one match adopts and updates that page; two
  matches fail terminally as `NOTION_DUPLICATE_PAGES`.
- Page updates omit every human-owned property.
- Rich text is truncated to 2,000 Unicode code points. Select values are capped
  at 100 code points, topics at 100 values, and URLs over 2,000 code points fail
  safely.
- Requests time out after 15 seconds. HTTP 429 and 529 honor `Retry-After`;
  transient network/5xx failures use bounded job backoff.
- Error storage uses stable safe codes and never stores provider response bodies,
  tokens, raw content, or stack traces.
- D1 stores the Notion page ID, projection version/hash, missing timestamp and
  last successful sync time.

## Destination access boundary

The Notion internal connection must be shared with only the RecollectFlow
destination database. Before production acceptance, the owner must open the
connection’s **Access** tab and verify no unrelated page, teamspace, or database
is granted. Record the verification date and database ID, never the token.

Production verification on 2026-07-30 confirmed that the connection is attached
directly to Knowledge Inbox database
`3a21b726-4ada-80a3-bfe1-ef808e3c293f`. Token-scoped search returned only the
destination database and its existing child page; the former parent page was
not accessible.

## Recovery

A lost Notion database is recreated from this schema and view table, then fully
reprojected from D1 with rate-aware batching. Recovery verifies Capture ID
uniqueness, page counts, failed jobs, human-owned-field preservation, and sample
source links before declaring success.
