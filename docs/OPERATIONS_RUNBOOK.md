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

## Zero-cost controls

No payment method without a separate owner decision. Maintain internal usage estimates even when providers expose counters. Soft warnings at 70% and 90%; hard threshold pauses optional AI/embedding/transcription/reranking/generation. Capture, raw retrieval, and exact search continue. Revalidate pricing/limits quarterly and before release/provider changes. If hosted AI disappears, use deterministic extraction plus local Ollama; if Notion changes, use Web Inbox/export.

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

## Deployment and rollback

Preview environment uses separate D1/R2/secrets/Notion resources. CI runs secret-free gates. Production deploy requires migration plan, compatibility assessment, smoke test, and owner-controlled secrets. Roll back code only when schema remains compatible; database rollback is manual and data-preserving. `migrations/` contains forward SQL only; rollback guidance stays under `docs/sql`.
