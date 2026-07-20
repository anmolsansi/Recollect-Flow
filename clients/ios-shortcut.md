# Save to Recollect — iPhone Shortcut build sheet

This is the exact, secret-free build specification for the V1 Share Sheet client. Never export, screenshot, or commit the installed Shortcut after adding the real capture token.

## Configuration

- Name: `Save to Recollect`
- Show in Share Sheet: enabled
- Accepted input: URLs, Safari web pages, text, images, PDFs, files and audio
- API base URL: the deployed Worker URL, with no trailing slash
- Capture token: stored only in the private installed Shortcut
- Queue folder: `iCloud Drive/Shortcuts/RecollectFlow/Queue`
- Sent receipts: `iCloud Drive/Shortcuts/RecollectFlow/Sent`
- Client version: `1.0.0`

Create a second `Retry Recollect Queue` Shortcut using the retry section below. The sanitized template must contain `REPLACE_ON_DEVICE` values, never a credential.

## Save to Recollect actions

1. Receive Share Sheet input. If empty, ask for text.
2. Generate a UUID and retain it as `IdempotencyKey` for the entire attempt and every retry.
3. Ask `Add a note?` with dictation enabled and allow an empty answer.
4. Ask `Privacy` with Unknown, Public, Personal and Sensitive; default to Unknown.
5. Detect input:
   - URL or Safari page: `source_type=url`; extract the URL.
   - Text: `source_type=text`; retain the complete shared text.
   - Image: `source_type=image`; retain the original file bytes.
   - PDF or other approved file: `source_type=file`; retain the original bytes.
   - Audio: upload with `source_type=audio`, then capture as `source_type=file`; retain the original bytes.
6. Before networking, create `Queue/<IdempotencyKey>/metadata.json`. It contains the capture payload, state `queued`, creation time, original filename/MIME/size when present, and no token. Copy attachment bytes to the same folder as `attachment.bin`.
7. For attachment inputs:
   1. Calculate file size and SHA-256.
   2. POST `/api/v1/uploads/init` with filename, MIME, exact size, checksum and source type.
   3. PUT the original bytes to the returned `upload_url` with Authorization, Content-Type and Content-Length.
   4. POST the returned attachment ID to `/finalize` with the checksum.
   5. Add the finalized `attachment_id` to the capture payload.
8. POST `/api/v1/captures` with Authorization and JSON:

```json
{
  "idempotency_key": "UUID retained across retries",
  "source_type": "url|text|image|file",
  "source_app": "iOS Share Sheet",
  "url": "URL inputs only",
  "shared_text": "text inputs only",
  "attachment_id": "attachment inputs only",
  "user_reason": "optional note",
  "privacy_level": "unknown|public|personal|sensitive",
  "captured_at": "ISO 8601",
  "client": { "name": "iOS-Shortcut", "version": "1.0.0" }
}
```

9. Interpret the response truthfully:
   - HTTP 201 and `duplicate_of=null`: `Saved`.
   - HTTP 201 and non-null `duplicate_of`: `Saved — already in Recollect; your new note was kept`.
   - HTTP 200: `Already Saved` for an idempotent retry.
   - HTTP 401/403: `Not saved — check the Recollect credential`.
   - HTTP 409 with `UPLOAD_EXPIRED`: `Not saved — queued attachment needs a fresh upload`.
   - HTTP 413/422: `Not saved — fix the reported file/type/input problem`.
   - Network failure or HTTP 5xx: `Not confirmed saved — kept in Retry Recollect Queue`.
10. Only after HTTP 200/201, write a small receipt to `Sent/<IdempotencyKey>.json` and remove its Queue folder. Never show `Saved` before this response.

## Retry Recollect Queue

1. List Queue subfolders oldest first.
2. Read `metadata.json` and reuse its original idempotency key.
3. If it has an attachment, initialize a fresh upload when the prior upload expired, using the preserved bytes and checksum.
4. Repeat capture submission.
5. Remove only entries confirmed by HTTP 200/201. Stop on authentication errors; retain and continue/retry later on network or 5xx errors.

## Device acceptance gate

Run and record the matrix in `clients/ios-shortcut-device-qa.md`. Redact the Authorization action and any configuration screen. OPE-219 remains open until every required real-device row passes.
