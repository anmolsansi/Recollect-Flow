# Bounded credential rotation and sessions (BG-24)

ADR-033 requires a default 24-hour overlap, maximum 72 hours and immediate old-key retirement on compromise. These rules apply independently to `CAPTURE`, `ADMIN` and `LOCAL_WORKER`. This is a code/runbook contract; no production keys are changed by implementing it.

## Environment contract

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
