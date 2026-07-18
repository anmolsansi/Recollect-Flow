# Capture client specification

## iOS Shortcut — primary client

The Shortcut appears in the Share Sheet for URLs, text, images, and approved files. It normalizes incoming type, offers Quick Save / Add Reason / Add Category / Private Save / Save and Remind, generates an idempotency key, uploads attachments when required, submits capture metadata, and returns immediate truthful status without waiting for enrichment.

### Required configuration

- API base URL, capture token, client name/version.
- Supported input/MIME allowlist and configured file-size ceiling.
- Optional default privacy/category and debug-safe diagnostics.
- Token rotation procedure that does not alter stored items.

### Idempotency and offline behavior

URL/text keys derive from normalized source plus a bounded time window/client nonce; files may include a local content hash. A failed POST remains retryable or is presented with an explicit Retry action. A retry always reuses the original key. The client never displays Saved unless the API confirms raw durability.

### User-visible states

- `Saved`: new durable item.
- `Already Saved`: same request replayed.
- `Saved — Processing Pending`: raw item available, optional stages pending.
- `Needs Attention`: user-fixable type/size/auth/configuration problem.
- `Retry`: network/storage unavailable with retained key/payload.

### Device acceptance

Test from Safari, Instagram, Photos, Files, YouTube, LinkedIn, text selection, and manual Shortcut action. Include airplane mode, slow network, repeated tap, large file, unsupported type, expired upload, rotated token, and server/provider outage.

## Responsive web capture — V1 secondary client

Admin-authenticated page for URL, note, pasted text, approved file, reason, project/category/privacy/review date. It shares the same API contracts and does not create a second authority. It is the recovery path when a mobile Shortcut is unavailable.

## Android share target — conditional V1.1/V2

Implement only when Android is a real capture device or iOS limitations justify maintenance. Receive ACTION_SEND text, images, approved video metadata, PDFs, and multiple items only if explicitly designed. Reuse server auth/idempotency/upload contracts and provide the same Saved/Replay/Pending/Retry truthfulness.

## Browser extension — conditional V2

Entry requires measured desktop capture volume. Candidate inputs are current URL/title, selected text, screenshot, reason, project/privacy, and save/remind. It must not scrape behind login without explicit lawful user action and must use scoped auth and minimal permissions.

## Telegram fallback — optional

May accept simple URLs/notes or send digest links if configured. It is not the authority, should not receive sensitive content, and must not become the only capture/recovery path.

## Future voice and recording capture

User-provided lawful audio or screen recording is an attachment. Capture works before transcription. Local or policy-approved transcription generates time-aware source spans. RecollectFlow never automatically downloads social audio/video or bypasses platform controls.
