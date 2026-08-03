# Reliability, observability, cost, backup, and recovery runbook

## Reliability objectives

| Capability              | Target                                       | Degraded mode                       |
| ----------------------- | -------------------------------------------- | ----------------------------------- |
| Capture acknowledgement | 99.9%; P95 ≤2s excluding upload              | Client retains same-key retry       |
| Raw item retrieval      | 99.9% personal target                        | Restore/export path                 |
| Notion sync             | Best effort/eventual                         | Web Inbox/D1 remains available      |
| AI enrichment           | No availability promise                      | Pending/partial item remains useful |
| Eligible daily digest   | ≥98%                                         | Manual regeneration                 |
| RAG                     | V1.5 quality gate, no blanket uptime promise | Lexical/retrieval-only evidence     |

## Structured events

Every API/job attempt has request/job IDs. Record safe entity ID, stage, status, duration, provider/model, byte/unit counts, retry decision, and error category. Never log secrets or content-bearing payloads by default. Alert on capture/storage failures, authentication anomalies, stuck leases, backlog age, repeated provider/schema failures, sync lag, purge failure, backup failure, and quota thresholds.

## Operations dashboard

- Captures today/week and success/latency.
- Pending/leased/retry/failed jobs by type and age.
- Errors by safe code and provider/model/prompt version.
- Workers AI/optional provider usage and free headroom.
- R2 bytes/objects/orphans; D1 rows read/written/storage.
- Notion sync lag/failure/duplicate count.
- FTS/vector index freshness and RAG cache invalidations.
- Last export/restore rehearsal, purge backlog, token rotation date.

## Retry policy

| Failure                            | Retry behavior                                       |
| ---------------------------------- | ---------------------------------------------------- |
| Network timeout/transient 5xx      | Exponential backoff with jitter and bounded attempts |
| Provider 429                       | Respect Retry-After; never auto-downgrade privacy    |
| Notion 429/529                     | Queue and retry after required wait                  |
| Invalid model JSON                 | One bounded repair attempt, then Failed              |
| Unsupported/malformed file         | No retry; truthful partial/error state               |
| Private content with Mac off       | Pending until local worker returns                   |
| Deleted/inaccessible URL           | Keep URL-only record; avoid frequent retry           |
| Storage unavailable during capture | No Saved claim; same-key client retry                |

Stale leases expire safely. Result submission is idempotent and version-checked. Manual retry cannot bypass privacy, deletion, or hard-quota policy.

Local workers report processing failures through
`POST /api/v1/worker/jobs/:id/fail`. They may supply a stable uppercase error
code, retryability, and a bounded `retry_after_seconds`; they cannot raise the
server-owned maximum-attempt limit. A non-retryable failure must not include a
retry delay.

`retry_wait` is an operator/API projection, not a stored database status:
`status = pending AND available_at > now`. A failed job may be manually retried
at most three times and keeps its original attempt count. Deleted items, stale
privacy snapshots, ineligible provider policy and the
`optional_processing_paused` control fail closed.

When Notion reports a stored page as missing, do not clear the page ID directly.
Verify the owner wants recreation, then call
`POST /api/v1/items/:id/notion/recreate` with the admin token. This creates an
audit event and one new retry-safe sync attempt.

## Zero-cost controls

No payment method without a separate owner decision. Maintain internal usage estimates even when providers expose counters. Soft warnings at 70% and 90%; hard threshold pauses optional AI/embedding/transcription/reranking/generation. Capture, raw retrieval, and exact search continue. Revalidate pricing/limits quarterly and before release/provider changes. If hosted AI disappears, use deterministic extraction plus local Ollama; if Notion changes, use Web Inbox/export.

Cloudflare budget alerts are required before any future pay-as-you-go enablement.
On the current free configuration, provider hard limits and the application
thresholds above are the active spending controls. Record D1 rows/storage, R2
bytes/operations, Workers requests, and Workers AI use during each quarterly
review. Never describe a budget alert as enabled without dashboard or API
evidence.

## Notion and Telegram credentials

### Notion limits and rotation

Throttle each connection to an average of three requests per second and also
respect the plan-scaled workspace limit. Treat HTTP 429 and 529 as retryable,
honor `Retry-After`, and use bounded backoff. Keep requests below 500 KB and
1,000 blocks; validate individual property limits before sending.

Rotate the internal-connection token from its Notion Developer portal
Configuration tab, securely replace the Worker secret, and then verify database
read plus disposable page create/read/update/read-back. Confirm the destination
still grants only the required content access and capabilities. Record dates and
safe page IDs, never the token.

### Telegram privacy and rotation

Use only a private chat or non-public private group/channel. A digest may contain
a neutral title/label and authenticated application link. For Sensitive items,
send only `Private item due for review.` Never include raw captures, notes,
summaries, excerpts, attachments, provider tokens, or private query strings.

Rotate with `@BotFather`, securely replace `TELEGRAM_BOT_TOKEN`, run `getMe`,
confirm the destination with `getChat`, and deliver one neutral `sendMessage`
test. Store `TELEGRAM_CHAT_ID` as a secret and repeat the destination check after
any chat migration. Record only safe result metadata.

## Backup schedule

At least weekly metadata export with schema version, row counts, attachment manifest, checksums, projects/topics/events/jobs, and deletion state. Store latest backups outside primary D1—R2 plus periodic Mac download. Protect exports like source data. Track creation, verification, retention, and restore-rehearsal timestamp.

## Restore rehearsal

1. Provision clean test D1/R2 or isolated local equivalents.
2. Validate export schema/checksums/counts before import.
3. Apply compatible migrations and import canonical entities.
4. Restore/verify attachments and ownership/hashes.
5. Rebuild FTS, chunks/embeddings/vector indexes, caches, and Notion projection rather than trusting derived backup state.
6. Verify sample raw items, searches, privacy, deletion tombstones, and source links.
7. Record timing, discrepancies, operator, and go/no-go result.

## Incident playbooks

### Capture/storage failures

Confirm D1/Worker status and request IDs; do not enable optional providers as workaround. Tell clients to retry with same key. Validate no false Saved response. Reconcile any ambiguous item by idempotency key.

### Lost/compromised token

Rotate affected Worker secret, revoke old value, update only authorized clients/workers, run unauthorized-access check, inspect safe auth audit events, and document incident. No data migration.

### Notion outage or database loss

Pause/retry sync, keep capture/search live, recreate schema/views, reproject by Capture ID in rate-aware batches, verify counts/duplicates/sample fields.

### AI/provider outage or quota exhaustion

Pause eligible optional jobs; preserve backlog; keep deterministic extraction/search live; route approved work to local only if policy already permits; never create billing.

### Corrupted/lost D1

Stop mutations if corruption suspected, preserve forensic/export evidence, restore into clean database, rebuild derived systems, rotate tokens if exposure is possible, and perform acceptance sampling before switching traffic.

### Deletion/index freshness defect

Disable RAG/affected retrieval if deleted/restricted content can surface. Purge/invalidate by item/content/index/cache version, verify absence across all surfaces, audit previous answers where feasible, and treat as security-critical.

### Search index recovery

If the D1 FTS5 `item_search_fts` index drifts from the `items` table, use the rebuild script to cleanly truncate and re-populate it from authoritative canonical data.

#### Local rehearsal only

- **Fresh local migration:** choose an empty operator-owned directory, then run `npx wrangler d1 migrations apply recollect-flow-prod --local --persist-to /path/to/empty-d1-state`.
- **Populated pre-0016 migration:** seed an isolated database through migration 0015, then apply migration 0016 and verify its backfill.
- **Local rebuild:** `npx wrangler d1 execute recollect-flow-prod --local --file=scripts/rebuild-item-search-index.sql`.
- **Local verification:** the rebuild script emits missing, orphaned/deleted, duplicate, canonical, and indexed counts. Every drift count must be zero and all population counts must match.
- **Local corruption and idempotency rehearsal:** corrupt an isolated local FTS index and run the rebuild twice. Both runs must restore the same searchable IDs without duplicates.
- **Local smoke tests:** run `npm run check` rather than the test command alone.

#### Production only after backup and approval

- **Require approval before remote changes.**
- **Require a D1 export before migration or rebuild:** `npx wrangler d1 export recollect-flow-prod --remote --output=/secure/operator/path/recollect-flow-prod-pre-ope225.sql`. Confirm the export exists and is non-empty before continuing.
- **Use `--remote` explicitly.**
- **Exact database name:** `recollect-flow-prod`
- **Migration verification:** `npx wrangler d1 migrations list recollect-flow-prod --remote`
- **Migration execution after approval/export:** `npm run db:migrate:remote`.
- **Rebuild verification:** Execute `npx wrangler d1 execute recollect-flow-prod --remote --file=scripts/rebuild-item-search-index.sql`; its final row must report zero for every drift count and equal canonical/indexed/distinct population counts.
- **Rollback or recovery guidance:** If the index is corrupt, run the rebuild script. If the database itself is corrupt, restore from the backup taken prior to operations.
- **Commands for capturing deployment and request evidence:** Use Cloudflare Dash logs or `wrangler tail` to capture real-time request IDs.

## Deployment and rollback

Preview environment uses separate D1/R2/secrets/Notion resources. CI runs secret-free gates. Production deploy requires migration plan, compatibility assessment, smoke test, and owner-controlled secrets. Roll back code only when schema remains compatible; database rollback is manual and data-preserving. `migrations/` contains forward SQL only; rollback guidance stays under `docs/sql`.

## Daily digest and weekly review operations

### Schedule and period rules

- Hourly background work: `17 * * * *` UTC.
- Daily digest: `0 2 * * *` UTC, 07:30 Asia/Kolkata, for the previous completed
  IST calendar day.
- Weekly review: `15 2 * * 1` UTC, Monday 07:45 Asia/Kolkata, for the previous
  completed Monday-to-Monday IST week.
- Delayed invocations use the scheduled event timestamp, not wall-clock duration
  subtraction. Repeated invocations converge on one period/version and one
  destination claim.

Set `WEB_INBOX_BASE_URL` to the authenticated Web Inbox origin before enabling
production delivery. Local development uses `http://localhost:5173`. Keep
`DIGEST_AI_ENABLED=false` until the optional wording path is explicitly approved;
deterministic generation and delivery remain fully functional without AI.

### Selection and privacy projection

Daily output includes item count, public topic groups, ranked items, failed
processing references and generic suggested actions. Weekly output adds repeated
public themes, Inbox items at importance 70 or higher, public projects inactive
for 30 days, items 7 days from the 90-day archive threshold, and an explicit note
that contradictions are not evaluated until a source-backed relation exists.

Before each send, every referenced item is re-read:

- Public: neutral title/label and authenticated Web Inbox link.
- Personal and Unknown: `Private item` and authenticated link.
- Sensitive: `Private item due for review.` and authenticated link.
- Deleted and Duplicate: omitted.

Raw text, notes, summaries, excerpts, attachments, restricted topics, credentials
and source URLs are never sent. Messages are plain text and deterministically
bounded below Telegram's 4,096-character limit.

### Delivery, retry and reconciliation

Telegram delivery uses a lease and owner-checked finalization. HTTP 429 honors
Telegram `retry_after`; definite network and 5xx failures use bounded backoff;
401/403 and configuration errors fail terminally. A timeout or malformed success
response becomes `unknown` because Telegram may have accepted the message.
`unknown` is never automatically retried.

Authenticated operator routes:

- `POST /api/v1/digests/generate`
- `GET /api/v1/digests/:id`
- `POST /api/v1/digests/:id/regenerate`
- `POST /api/v1/digests/:id/review`
- `POST /api/v1/digests/:id/deliver`
- `POST /api/v1/digest-deliveries/:id/retry`
- `POST /api/v1/digest-deliveries/:id/reconcile`
- `POST /api/v1/digest-deliveries/:id/cancel`

Only definite `failed` deliveries can be retried. Reconcile an `unknown` result
as `sent` with the observed Telegram message ID or as `failed` after checking the
private destination. Empty periods are recorded as `skipped` and do not call
Telegram.

### Credential rotation and rollback

Rotate the bot token with `@BotFather`, replace `TELEGRAM_BOT_TOKEN`, run `getMe`,
verify `TELEGRAM_CHAT_ID` with `getChat`, and send one neutral message. Never log
the token, chat ID or message text. To roll back delivery without affecting
capture/search, remove or disable the two digest cron expressions while retaining
the hourly cron. Existing runs and delivery evidence remain readable.
