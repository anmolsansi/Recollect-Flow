# Notion information architecture and synchronization

## Role and boundary

Notion is a human review and organization surface. D1 remains authoritative. A Notion outage, deletion, schema edit, or rate limit cannot prevent capture, raw retrieval, search, export, or recovery.

## RecollectFlow database properties

| Property         | Type              | Purpose                                                                    |
| ---------------- | ----------------- | -------------------------------------------------------------------------- |
| Name             | Title             | Current display title, user-edited or AI-suggested                         |
| Capture ID       | Text              | Stable unique RecollectFlow key                                            |
| Source URL       | URL               | Original source link                                                       |
| Source App       | Select            | Instagram, Safari, YouTube, LinkedIn, Files, Manual, etc.                  |
| Source Type      | Select            | URL, text, image, PDF, audio, video, note                                  |
| Captured At      | Date              | Original capture time                                                      |
| Why Saved        | Text              | Immutable user intent projection                                           |
| Summary          | Text              | Grounded derived summary                                                   |
| Coverage         | Select            | URL only, metadata, extracted text, screenshot text, transcript, full file |
| Project          | Select/relation   | Active project association                                                 |
| Topics           | Multi-select      | Suggested and owner-editable topics                                        |
| Importance       | Number            | 0–100 with owner override                                                  |
| Suggested Action | Text              | Optional next step                                                         |
| Status           | Select            | Inbox, Reviewed, Actioned, Archived, Duplicate, Deleted                    |
| Privacy          | Select            | Public, Personal, Sensitive, Unknown                                       |
| Processing       | Select            | Pending, Ready, Partial, Failed                                            |
| Review Date      | Date              | Future resurfacing                                                         |
| Attachment       | Files/secure link | Original or authorized access path                                         |
| Duplicate Of     | Relation/text     | Canonical item reference                                                   |
| Last Synced      | Date              | Projection timestamp                                                       |

## Required views

- **Inbox:** Status = Inbox; daily review queue.
- **Unprocessed:** Processing Pending/Failed; owner visibility and retry path.
- **Projects:** grouped by active project.
- **High Value:** importance/reason/action filters.
- **Review Due:** review date due or overdue.
- **Cold Storage Candidates:** stale low-use items, review-before-archive.
- **Duplicates:** Duplicate status/group reference.
- **Private:** privacy-sensitive projection with minimal exposed fields.
- **Daily Digest / Weekly Review:** generated page or linked database views.

## Sync contract

- Upsert only by Capture ID; never title.
- Sync is an independent retryable job.
- Respect `Retry-After`, exponential backoff, jitter, payload/property limits.
- Payload includes only needed fields and privacy-safe content.
- Store Notion page ID and projection version/hash in D1.
- Repeated delivery creates no duplicate page.
- Notion page deletion marks projection missing and requests explicit owner action; it never deletes D1.

## Reconciliation

V1 either makes edits in Web Inbox or imports an allowlist: title, project, topics, importance, status, review date, privacy, and suggested action. Raw URL/text/user reason/attachment are not mutable from Notion. Concurrent changes use version/timestamp conflict handling and create audit events. Unknown properties are ignored safely; destructive schema drift is surfaced operationally.

## Recovery

A lost Notion database is recreated from the documented schema, then fully reprojected from D1 with rate-aware batching. The runbook verifies page counts, capture-ID uniqueness, failed jobs, and sample source links before declaring recovery complete.
