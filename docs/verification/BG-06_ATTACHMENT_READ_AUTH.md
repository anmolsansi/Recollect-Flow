# BG-06 — Attachment Read Authorization

Status: **implementation present; final CI and merge gate pending**

Tracking: GitHub #38 / PR #39 / Linear OPE-326

Base `main`: `13f78b3c4eb1246e044f3a23ed8130de54817434`

Work branch: `agent/ope-326-bg-06-attachment-read-auth`

## Problem reproduced from the repository

The Web Inbox uses an ordinary attachment link, so an authenticated browser presents the signed `admin_session` cookie. Before BG-06, the attachment router applied `requireCaptureToken` to every `/attachments/*` request. That middleware accepts capture/admin bearer tokens but does not inspect the admin session cookie. The wildcard middleware therefore rejected a legitimate browser session before the content handler ran.

The mismatch was an authentication-boundary problem, not an R2 or attachment-lifecycle problem.

## Authorization decision

BG-06 defines the permission matrix below for the attachment content capability.

| Request identity                    | `GET /api/v1/attachments/:id/content` | Attachment upload/write           | `DELETE /api/v1/attachments/:id` |
| ----------------------------------- | ------------------------------------- | --------------------------------- | -------------------------------- |
| Anonymous                           | deny                                  | deny                              | deny                             |
| Invalid bearer                      | deny                                  | deny                              | deny                             |
| Valid capture bearer                | allow                                 | preserve existing capture scope   | deny                             |
| Valid admin bearer                  | allow                                 | preserve existing bearer behavior | allow                            |
| Valid signed admin session cookie   | allow                                 | do not broaden in BG-06           | preserve current denial in BG-06 |
| Local-worker bearer alone           | deny                                  | local-worker routes only          | deny                             |
| Tampered or cleared browser session | deny                                  | deny                              | deny                             |

The admin session cookie is not trusted by name or value alone. It is verified through Hono's existing signed-cookie mechanism with the configured admin secret and must decode to the existing `authenticated` value.

## Mixed-credential precedence

Accepted content-read credentials are alternatives, matching the existing admin-auth pattern.

- A valid capture or admin bearer authorizes the read even if an invalid cookie is also present.
- A valid signed admin session cookie authorizes the read even if an invalid or wrong-scope bearer is also present.
- A local-worker token alone never becomes an attachment-read credential.
- No client-supplied role, query token, R2 key or bucket URL participates in authorization.

This rule avoids a surprising downgrade where an unrelated bad header could disable an otherwise valid browser session, while keeping every accepted credential cryptographically verified in its own scope.

## Implementation

### Shared authentication

`apps/worker-api/src/shared/auth.ts`

- `matchesAdminSession()` centralizes the existing signed-cookie verification.
- `requireAdminToken` reuses that predicate without changing its existing behavior.
- `requireAttachmentContentRead` accepts:
  - capture bearer;
  - admin bearer;
  - verified admin session cookie.
- Failed content-read authentication preserves the existing `401 UNAUTHENTICATED` attachment error vocabulary.

Bearer secret comparisons continue to use the existing constant-time helper.

### Attachment router

`apps/worker-api/src/attachments/attachment.routes.ts`

The former wildcard `/attachments/*` capture guard was removed because it blocked the cookie before content lookup. Authorization is now capability-specific:

```text
GET /attachments/:id/content
  -> requireAttachmentContentRead
  -> lifecycle/status lookup
  -> private R2 lookup
  -> response bytes

DELETE /attachments/:id
  -> requireCaptureToken
  -> requireAdminToken
  -> delete private R2 bytes
  -> tombstone attachment row
```

The explicit two-step delete guard preserves the pre-BG-06 effective behavior. An admin bearer passes both checks. A capture bearer passes the first check but fails the admin check. A cookie-only browser request fails the first check, so BG-06 does not silently expand browser write/delete authority.

The `/uploads/*` wildcard remains unchanged behind `requireCaptureToken`; admin-session cookies therefore do not gain upload permission.

## Lifecycle and data boundary preserved

Successful authentication still does not make arbitrary objects readable.

The existing content handler continues to:

- require a server-owned attachment ID and repository record;
- allow only `finalized` or `linked` attachment states;
- reject expired unlinked finalized uploads;
- derive the private R2 key from stored server data;
- return `404 NOT_FOUND` when the object is missing;
- sanitize the response filename;
- return `Cache-Control: private, no-store`;
- return `X-Content-Type-Options: nosniff`.

No raw R2 object key, bearer credential or cookie value is added to URLs or API responses.

## Regression coverage

`apps/worker-api/test/attachment.test.ts` now exercises the real router and real admin login/logout routes with synthetic in-memory attachment/R2 fixtures.

Coverage includes:

- existing capture-bearer download with exact byte equality;
- existing anonymous denial;
- admin-bearer download;
- signed admin-cookie-only download;
- invalid bearer denial;
- local-worker bearer denial;
- tampered signed-cookie denial;
- cleared browser session after logout denial;
- valid cookie plus wrong-scope worker bearer;
- valid capture bearer plus tampered cookie;
- cookie-only upload initialization denial;
- capture-bearer delete denial;
- cookie-only delete denial;
- admin-bearer delete success;
- authenticated missing-object response remains controlled.

## Validation

PR #39 opened an early CI run against the code-complete authorization changes:

- GitHub Actions CI run #160: **in progress when this evidence record was first written**;
- required workflow commands: `npm ci`, `npm run check`, `npm run db:migrate:local`.

This file must be updated with the actual final-head results before the implementation PR is marked ready or merged. A passing implementation PR is still pre-merge evidence. BG-06.100 remains open until the validated implementation is merged, the resulting `main` head is green, and a post-merge closeout records that state.

## Scope and limitations

BG-06 does not:

- change the browser UI;
- prove an end-user browser actually saves/opens the file, which belongs to BG-07;
- add server-side session-state storage or rotation;
- change session issuance lifetime;
- broaden admin-cookie access to uploads or attachment deletion;
- deploy production;
- apply remote migrations;
- use live credentials.

The current session implementation uses a signed browser cookie with an expiry attribute. BG-06 verifies valid, tampered and cleared/logout browser-cookie behavior. Later authentication-hardening tasks own rotation, revocation and broader session-lifecycle changes.

## Pre-merge completion boundary

The authorization contract and regression suite can be completed on the task branch, but BG-07 stays locked until all of the following are true:

1. final PR-head CI is green;
2. the authoritative BG-06 checklist is reconciled;
3. PR #39 is merged;
4. clean-head `main` CI is green;
5. the post-merge closeout records BG-06.100 satisfied.
