# Bounded credential rotation and sessions (BG-24)

ADR-033 requires a default 24-hour overlap, maximum 72 hours and immediate old-key retirement on compromise. These rules apply independently to `CAPTURE`, `ADMIN` and `LOCAL_WORKER`. This is a code/runbook contract; no production keys are changed by implementing it.

## Environment contract

| Scope   | Current secret       | Optional next secret      | Optional stable ID      | Optional schedule JSON        |
| ------- | -------------------- | ------------------------- | ----------------------- | ----------------------------- |
| Capture | `CAPTURE_TOKEN`      | `CAPTURE_TOKEN_NEXT`      | `CAPTURE_TOKEN_ID`      | `CAPTURE_TOKEN_ROTATION`      |
| Admin   | `ADMIN_TOKEN`        | `ADMIN_TOKEN_NEXT`        | `ADMIN_TOKEN_ID`        | `ADMIN_TOKEN_ROTATION`        |
| Worker  | `LOCAL_WORKER_TOKEN` | `LOCAL_WORKER_TOKEN_NEXT` | `LOCAL_WORKER_TOKEN_ID` | `LOCAL_WORKER_TOKEN_ROTATION` |

For each scope, the current secret keeps its existing name (`CAPTURE_TOKEN`, `ADMIN_TOKEN`, `LOCAL_WORKER_TOKEN`). Optional `<SCOPE>_TOKEN_NEXT` is a Worker **secret**. Optional `<SCOPE>_TOKEN_ID` is a stable nonsecret key label, default `current`. Optional `<SCOPE>_TOKEN_ROTATION` is nonsecret JSON configuration:

```json
{
  "next_id": "capture-2026-10",
  "activate_at": "2026-10-14T20:00:00Z",
  "expires_at": "2026-10-15T20:00:00Z",
  "actor": "owner",
  "revoke_current": false
}
```

IDs/actor are 1–64 ASCII letters, digits, underscores or hyphens. Do not use tokens, token hashes, email addresses or content as labels. `next_id` differs from current ID. `activate_at` is required RFC3339; `expires_at` defaults to activation +24h and must be later by at most 72h. `actor` is required for the operator audit trail; unknown fields are rejected. Next secret and rotation metadata must be supplied together. Empty/equal secrets, invalid labels/timestamps, missing fields or an unbounded/overlong window fail closed for the affected scope with a safe configuration error.

Before activation: current only. At activation: current and next. Exactly at expiry: current rejected; next remains the sole active credential awaiting explicit promotion/cleanup. `revoke_current:true` disables current bearer and current-key sessions immediately, even before expiry. Activate the replacement no later than the incident time to avoid an intentional fail-closed outage. None of these changes mutate items, uploads, jobs or projections.

Promote by placing the next secret in the current slot **and carrying its `next_id` into `<SCOPE>_TOKEN_ID`**, then removing next/rotation configuration. Preserving the ID is necessary for admin-session continuity. Never restore a retired key or extend an expired schedule just to roll back code.

## Browser sessions

New cookies contain a signed version, key ID, issued-at and expires-at. The server enforces issued-at ≤ now, expiry > now and lifetime ≤24h, independently of browser expiration. After activation, even login using an eligible old admin bearer signs with the next key. Next-key sessions survive promotion with the same key ID. Old-key sessions stop at retirement, revocation or their own expiry, whichever comes first.

The existing signed `authenticated:<expiry>` cookie remains accepted only with the eligible current key and its existing ≤24h server bound. Unbounded constant `authenticated` cookies remain invalid. New issuance always uses the versioned format. HttpOnly, host-only, SameSite Strict, actual-HTTPS Secure and cookie-write Origin checks remain. An explicit invalid Authorization header cannot borrow a valid browser cookie.

Logout deletes the current browser cookie; it does not revoke an already copied session globally. Revoke/replace its signing key for compromise. This personal-token design is not multi-user identity or per-session server revocation.

## Audit boundary

Rotation authentication emits only safe scope/key IDs, operator label, activation/retirement schedule, revocation flag, observation time and accepted/denied outcome. It never logs tokens, token-derived fingerprints, cookies or request content. These observations complement the Cloudflare deployment/secret-change audit and an operator-owned operation ledger; they do not prove a deployment or promotion was performed. Record each activation, promotion and retirement with scope, labels, actor, effective time, target deployment and verification outcome. No raw secret is stored in D1 or source control.

## Routine operator procedure (separate remote authorization required)

1. Verify the exact account, Worker, deployed code, client owners and old key ID. Run `npm run auth:rotation:test`; preserve safe actor/time/version evidence. Production secrets are never needed for that dummy rehearsal.
2. Choose a fresh random next secret, unique next ID, activation and ≤72h expiry (24h default). Enter the credential privately using a password manager/private editor, never a shell argument, pasted chat, log or Git file. Keep the input JSON outside the checkout with owner-only permissions. For atomic staging, the metadata binding may also be stored as a Worker secret; do not define the same name as both a var and a secret.
3. Prepare one JSON object containing `ADMIN_TOKEN_NEXT` and `ADMIN_TOKEN_ROTATION` (the latter is a serialized JSON string following the contract above). Preserve the current token and current key ID. Substitute CAPTURE or LOCAL_WORKER for the other scopes. Omit unrelated bindings so they are preserved.
4. Stage both changes in one candidate version, inspect its safe binding names/version, then deploy that exact candidate at 100% only after approval. Never deploy a NEXT-only or metadata-only intermediate state. Do not split traffic across pre-revocation and post-revocation versions.

```bash
npx wrangler versions secret bulk /secure/operator/rotation-stage.json --name "<approved-worker-name>"
npx wrangler versions deploy "<verified-candidate-version-id>@100%" --name "<approved-worker-name>"
```

5. Verify current before activation, both during overlap, and denied current at expiry using each scope's actual client path. Admin logins after activation issue next-key cookies. Refresh clients deliberately; do not change captured item records. Record safe outcomes, not credentials or cookie values.
6. For promotion, prepare a separate private JSON object with the promoted secret in `ADMIN_TOKEN`, `ADMIN_TOKEN_ID` equal to the former `next_id`, and JSON **null** for `ADMIN_TOKEN_NEXT` and `ADMIN_TOKEN_ROTATION` (deletion, not empty strings). Stage/deploy the single candidate as above. Verify promoted bearer and its prior next-key session, old bearer denial and unchanged canonical item identity. Repeating the same cleanup leaves the same valid single slot.
7. Record activation/promotion/retirement time, scope, IDs, actor, deployment ID and accepted/denied verification results in the protected operator ledger; retain the platform change audit. Remove private input files under the owner's secret-handling policy. A normal code rollback must keep the new safe credential state.

The installed Wrangler 4.116 toolchain supports staged secret versions. [Cloudflare's command reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/#versions-secret-bulk) documents bulk JSON changes and null deletion; the `versions` form stages a version without immediate deployment. The ordinary `wrangler secret` form deploys immediately, so it is unsuitable for a multi-binding cutover performed as separate commands. No remote command above was executed as part of BG24 implementation.

## Compromise, recovery and rollback

Do not use routine overlap for a compromised credential. In one staged candidate set `revoke_current:true`, activation at or before the incident time, and a **fresh replacement secret and ID**. If the old admin token was already valid during an overlap, assume it could have minted next-key sessions: replace that existing next key too. Retiring current alone cannot invalidate a session already signed by next. The same bulk-stage/deploy commands above are the immediate retirement procedure after exact-target authorization; their change takes effect on requests served by the new deployed version. Verify rollout rather than claiming zero-time global edge propagation.

Immediately prove old bearer denial, old-current cookie denial, previously-issued next cookie denial when that key was replaced, new login success and unaffected-scope continuity. Expect browser reauthentication. Update authorized capture/worker clients with the emergency secret; retained same-key capture operations can replay without item migration. Check safe request/access evidence separately for actions that occurred before revocation: rotating a token cannot undo previous reads or external writes.

Promote the emergency replacement to current and preserve its key ID, deleting both overlap bindings atomically. Record a nonsecret event containing operation, scope, old/replacement IDs, actor, effective time, deployed version and verification outcome. Do not record token hashes or cookies. `credential_rotation_auth` observations verify enforcement, while this ledger/platform audit records the deployment action itself.

Rollback must never restore a compromised/expired current secret or lengthen its old window. Prefer a previously tested rotation-aware code revision with the new safe key configuration. If a legacy-code rollback is unavoidable, first promote the safe replacement to current and retire old slots; expect all versioned sessions to require login because legacy code does not understand them. Pause release if compatibility has not been rehearsed. No code rollback restores D1 data or automatically reverses owner actions.

## Local rehearsal and implementation map

`npm run auth:rotation:test` runs `test/token-rotation.test.ts` plus the migrated local-D1 `test/token-rotation.d1.spec.ts`. Fixtures use dummy keys and a restored controlled clock: before/at/after activation and expiry, 24h/72h limits, invalid config, scope/Shortcut/download permissions, active issuance, legacy/v2 expiry, promotion, fresh-key compromise, cookie Origin/attributes, logout limits, redaction and unchanged capture/replay data. No hosted secrets, billing, messages or physical device are involved.

`apps/worker-api/src/shared/auth.ts` owns schedules, constant-time candidate comparison and verification. `auth/auth.routes.ts` owns login issuance and browser logout. `shortcut/shortcut.routes.ts` uses capture-only scheduled verification. `env.ts` declares optional bindings. No new schema/table, auth service, dependency or operations UI is introduced. Existing no-rotation deployments keep a single active key; their bounded legacy sessions remain supported.

## Deployment compatibility

The optional names are declared in application `Env`; they are deliberately not added to Wrangler's required-secret list, which would break ordinary single-key/local/CI deployments. Omit all next/rotation settings until an actual rotation. In local development supply paired values through ignored `.dev.vars`; do not add empty next-key templates because empty configured slots are invalid. Never copy production `.dev.vars` into an acceptance fixture.

Deploy the tested rotation-aware Worker/Web artifact before scheduling overlap. Preserve optional metadata across subsequent code deployments, using the same binding type selected for rotation. A default key ID is stable until explicitly changed; changing it requires reauthentication for sessions signed under the former ID. Use a new key ID when replacing a key, and retain the same ID only when moving that same secret from next to current. Promotion is configuration-only, requires no migration and has no data rollback step.

This implementation changes source only. Actual hostname/TLS, production bindings, secret values, edge rollout timing and phone-client updates require separate authorized hosted/device evidence. The unfinished BG21/BG22 release checks are not waived by the local rotation rehearsal.
