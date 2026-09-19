# Security, privacy, and data governance

## Assets and trust boundaries

Assets: raw captures, attachments, private notes, tokens, provider credentials, derived content, indexes, exports, citations, audit trails. Boundaries: capture clients ↔ Worker, Worker ↔ D1/R2, Worker ↔ providers/Notion/Telegram, user-provided provider credentials ↔ secure secret storage, admin browser ↔ API.

## Threat model

- Token theft/replay, unauthorized read/write/admin actions.
- Public/enumerable object access and path traversal.
- Oversized/malformed/malicious file or parser abuse.
- SSRF/redirect loops and login/private-source access attempts.
- Prompt injection in webpages, PDFs, transcripts, and notes.
- Sensitive content sent to unapproved external AI/messaging.
- Secrets/raw content in logs, responses, Notion, or source control.
- Cross-item/tenant leakage in future productization.
- Stale/deleted/restricted content in FTS/vector/cache/answers.
- Notion/provider webhooks or retries causing duplicate/destructive changes.
- Silent paid usage, quota exhaustion, or provider-policy change.

## Classification and routing

Policy version `2026-07-31.2` uses Unknown, Public, Personal, and Sensitive.
Sensitive includes confidential/restricted content such as secrets, passwords,
financial or medical records, immigration documents, and private conversations.
Unknown is the default and fails closed.

| Data class | App-managed OpenRouter | User-provided provider key | Gemini free fallback | Cloudflare Workers AI | No AI |
| --- | --- | --- | --- | --- | --- |
| Unknown | Never | Never | Never | Approved when explicitly selected; not the default route | Default |
| Public | Default hosted route | Allowed | Allowed when OpenRouter is unavailable | Approved | Always allowed |
| Personal | Explicit hosted consent plus per-request ZDR and `data_collection=deny`; no fallback | Explicit hosted consent and selected-provider terms apply | Never through the app-managed free fallback | Never | Always allowed |
| Sensitive | Never | Never | Never | Never | Default |

Personal routing never switches providers silently. The app-managed Personal path is
OpenRouter-only and must enforce zero data retention and deny provider data
collection on every request. A user-provided key changes credential ownership, not
the provider's data practices. The selected provider and applicable terms must be
disclosed before consent. Gemini free is used only for Public content. Cloudflare
Workers AI is approved by policy for Public and explicitly requested Unknown
processing, while Unknown still defaults to no AI. Provider unavailability, missing
consent, missing compliance controls, or hosted quota exhaustion fails closed to no
AI. Changing classification invalidates derived fields and jobs, records an audit
event, and requires an explicit `reprocess` or `purge` choice. Already transmitted
provider data cannot be revoked. The current revision was approved under OPE-224.

### URL source-host acquisition is a separate boundary

BG-08 adds a separate rule for contacting a URL's source host. The AI matrix above
does **not** authorize network source acquisition.

For automatic V1 URL acquisition:

| Privacy class | Contact captured source host automatically? |
| --- | --- |
| Public | Yes, only through the bounded BG-09 fetch policy |
| Unknown | No |
| Personal | No |
| Sensitive | No |

Unknown remains the default and must not become Public based on hostname, metadata,
source app, or model output. A non-Public URL capture stays Saved without source-host
network I/O and records a truthful policy-blocked acquisition outcome once BG-10
implements persistence.

Even for Public captures, BG-09 must independently reject unsafe destinations and
redirects. Source acquisition sends no owner/site cookies, browser sessions,
RecollectFlow tokens, or arbitrary client authorization headers. It does not execute
JavaScript, bypass login, solve CAPTCHAs, or perform authenticated scraping.

The detailed limits, status/error vocabulary, provenance rules, and owner messages
are frozen in [URL_ACQUISITION_CONTRACT.md](URL_ACQUISITION_CONTRACT.md).

## Authentication and authorization

Separate capture, admin, and local-worker secrets/scopes; long random values stored as Worker secrets; constant-time verification; rotation/revocation runbooks; rate limits and safe audit IDs. Future multi-user work requires proper user auth, tenant scoping at every query/object/job, session security, consent, and abuse controls—personal tokens are not a SaaS security design.

## Content and file controls

HTTPS, provider-managed encryption at rest, private R2, opaque keys, allowlisted MIME/signature, configured size limits, parser sandbox/limits where feasible, safe redirects/timeouts, malware-risk policy, short-lived authorized access, orphan cleanup, checksums, and no automatic social-video copying.

## Model safety

Source text is data, never instruction. Models receive no credentials, general tools, arbitrary URL permission, or unnecessary full documents. Structured output is validated; citation IDs must belong to supplied context; external facts are forbidden; invalid output is rejected. Provider/model/prompt/content provenance is recorded without raw prompts in routine logs.

## Logging and data minimization

Log request/job/item IDs, status, duration, safe error category, provider/model, and byte/unit counts. Do not log tokens, full raw text, prompts, transcripts, files, private notes, or provider payloads by default. Temporary sampled diagnostics require explicit enablement, access restriction, expiry, and cleanup.

## Notifications and projections

Notion receives only necessary projection fields. Telegram/external messages use titles/neutral labels plus secure links; Sensitive content uses “Private item due for review.” Notion deletion cannot command source deletion.

## Export, retention, and deletion

Complete export: versioned items JSONL/CSV, projects/topics, events/jobs, attachment manifest, original files, checksums, counts, and restore instructions. Two-stage deletion: soft delete/grace, then explicitly confirmed idempotent purge across R2, derived tables, FTS/vector, Notion, answers/caches, and content-bearing logs/events according to policy. Deletion/restriction freshness is security-critical.

## Legal and platform governance

Do not bypass access control, account login, bot protection, platform terms, or content rights. Store user-provided references/files for personal knowledge use. Public productization requires legal review of platform terms, copyright, privacy, controller/processor duties, consent, retention, residency, subprocessors, breach response, and user-rights workflows.

## Security release gate

Pass unauthorized access, token rotation, private-object access, traversal, oversized/malformed file, SSRF/redirect, prompt-injection, privacy-routing, log-secret scan, quota, deletion/invalidation, backup/restore, and Notion/provider outage tests. Any sensitive external leak, stale deleted answer, or silent billing path is release-blocking.
