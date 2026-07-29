# Save to Recollect — iPhone Shortcut build sheet

This is the exact, secret-free build specification for the V1 Share Sheet client. Never export, screenshot, or commit the installed Shortcut after adding the real capture token.

## Configuration

- Name: `Save to Recollect`
- Show in Share Sheet: enabled
- Accepted input: URLs, Safari web pages, text, images, PDFs, files and audio
- Endpoint: `https://recollect-flow.recollectflow.workers.dev/api/v1/shortcut/captures`
- Capture token: stored only in the private installed Shortcut
- Queue folder: `iCloud Drive/Shortcuts/RecollectFlow/Queue`
- Client version: `1.1.0`

Create a second `Retry Recollect Queue` Shortcut using the retry section below. The sanitized templates must contain `REPLACE_ON_DEVICE`, never a credential.

## Exported Mac template scope

The exported `Save to Recollect (Template v1.1)` and
`Retry Recollect Item (Template v1.1)` files provide an online-save and manual-retry
baseline for transferring to an iPhone. They intentionally contain no credential.
They do not yet implement the durable iCloud queue below. URL/text behavior and the
file magic-variable coercion must be verified on the physical iPhone; complete the
remaining actions in this build sheet before treating the Shortcut client as
offline-safe.

## Queue record

Create the queue record before networking. Its filename is the generated idempotency key. Preserve:

- `idempotency_key`
- `kind_hint`: `url`, `text`, or `attachment`
- complete URL/text or original attachment bytes
- optional `user_reason`
- `privacy_level`

The queue never contains the API token. Persist `kind_hint` explicitly because iCloud may return queued URL or text content as a File during retry.

## Save to Recollect actions

1. Receive Share Sheet input. If empty, ask for text.
2. Generate a UUID and keep it unchanged for every retry.
3. Ask `Add a note?`; allow an empty answer.
4. Ask `Privacy`: Unknown, Public, Personal, or Sensitive. Default to Unknown.
5. Classify the input:
   - URL or Safari page: `kind_hint=url`; use the complete URL.
   - Text: `kind_hint=text`; use the complete shared text.
   - Image: convert to JPEG for the current allowlist, then use `kind_hint=attachment`.
   - PDF, approved file, or approved audio: use `kind_hint=attachment` and preserve the bytes.
6. Save the queue record before networking.
7. Run one `Get Contents of URL` action:
   - URL: the configured endpoint above.
   - Method: `POST`.
   - Headers: `Authorization` = `Bearer REPLACE_ON_DEVICE`.
   - Request Body: `Form`.
   - Form fields:
     - `idempotency_key`: retained UUID.
     - `kind_hint`: retained classification.
     - `content`: URL, text, or file magic variable.
     - `user_reason`: optional note.
     - `privacy_level`: lowercase `unknown|public|personal|sensitive`.
     - `client_version`: `1.1.0`.
8. Read the response dictionary:
   - `DELETE_QUEUE`: show `Saved` or `Already saved`, then delete the queue record.
   - `KEEP_RETRY`: show `Not confirmed saved — kept for retry`; retain the queue record.
   - `KEEP_FIX`: show the response `message`; retain the queue record for correction.
   - `KEEP_STOP`: show the authentication guidance and stop; retain the queue record.
9. If `Get Contents of URL` itself fails and returns no response, do not claim success. Retain the queue record.

The Worker performs attachment size, MIME, signature and checksum validation; private R2 write and verification; attachment finalization; D1 linking; and capture creation inside this one client request.

## Retry Recollect Queue

1. List queued records oldest first.
2. Read one record and reuse its exact original idempotency key, `kind_hint`, content, note and privacy level.
3. Submit the same one-request form.
4. Delete only when `shortcut_action=DELETE_QUEUE`.
5. Stop when `shortcut_action=KEEP_STOP`.
6. Retain and continue later for `KEEP_RETRY`, `KEEP_FIX`, or a network failure.

## Device acceptance gate

Run and record the matrix in `clients/ios-shortcut-device-qa.md`. Redact the Authorization action and every token/configuration screen. OPE-219 remains open until every required real-device row passes.
