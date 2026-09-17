# BG-04 — Smoke Story and Local Setup Evidence

Status: **implementation complete; full branch gate pending**

This record captures BG-04 implementation evidence before the final clean-head CI and merge gates. It is intentionally not a production acceptance record.

## Tracking and identity

- GitHub issue: #31
- Linear: OPE-324
- Base `main`: `67c9ec7df369ca4f3413a40d97ceab03f23e4495`
- Work branch: `agent/ope-324-bg-04-smoke-story-setup`
- Dependency: BG-03 is complete and its authoritative closeout explicitly unlocks BG-04.

## What changed

### Staged release verifier

`scripts/verify-production-release.mjs` now treats smoke verification as named stages instead of one undifferentiated sequence. Each executed stage records its start, expected HTTP behavior, observed HTTP status and semantic result. A failure prints a compact sanitized stage summary to stderr and still leaves the process nonzero, so evidence from earlier passing stages is not erased by a later failure.

The verifier classifies the target as local or remote. Localhost targets are allowed by default. A non-local target requires `ALLOW_REMOTE_SMOKE=true`. The safe target origin and mode are printed before mutating requests. Credentials are never included in that target record.

### Capture truthfulness

The smoke sequence separates two contracts that were previously conflated:

1. an exact replay reuses the same idempotency key and exact payload, returns `200`, reuses the same canonical item and reports `replayed: true`;
2. a normalized duplicate uses a fresh idempotency key, returns a new capture event on the canonical item and reports `duplicate_of` without pretending it was an idempotency replay.

The item detail provenance is then inspected. The replay must not create a third capture event. A separate synthetic note proves raw source text can be retrieved before optional AI processing.

### Privacy and policy

BG-03's server-authoritative `edit_version` flow is preserved. Public, stale-version, Personal-without-consent, compliant Personal and Sensitive cases remain independently asserted. Malformed consent is also required to reject through the existing strict schema.

The verifier no longer hardcodes the stale `2026-07-21.1` policy version. It reads the current version returned by the server and requires the rest of the privacy sequence to remain on that version. Public policy eligibility and the published fallback list remain assertions, but the verifier explicitly does **not** treat policy eligibility as proof that a provider adapter is installed, configured or successfully executed.

### Attachment evidence

The small `%PDF` smoke payload is now labeled `byte-round-trip-only`. It proves upload/finalize integrity, linked capture behavior, authenticated byte download, byte length, SHA-256 equality and anonymous denial. It is not described as parsing proof.

The verifier also constructs a separate minimal parseable PDF with a unique known phrase. That fixture is recorded for extraction acceptance, but BG-04 leaves `parseable-pdf-extraction-acceptance` unavailable rather than claiming extraction success from upload success. This keeps the later extraction defect visible.

The verifier additionally performs the actual browser-cookie setup probe: it creates an admin session, retains the cookie and attempts a cookie-only attachment download. Current routing returns the known `401` because attachment content remains behind the bearer capture/admin guard. BG-04 records this as the BG-07 known gap rather than weakening the route or reporting a false pass.

### Review and recovery smoke

The run-owned canonical item is used for an isolated stale item-edit conflict, then a successful version-aware title edit. The same item is soft-deleted and must disappear from default search, restored with the returned current version and required to reappear in search. JSON export must include the restored item. Permanent purge and clean-target restore remain outside the default smoke path.

### Local startup repair

The root `README.md` now reflects the scripts that actually exist:

1. `npm ci`
2. `cp .dev.vars.example .dev.vars`
3. `npm run db:migrate:local`
4. terminal 1: `npm run dev:api`
5. terminal 2: `npm run dev:web`

It documents the Worker API at `http://localhost:8787`, the Vite `/api` proxy dependency, local Wrangler state, dummy local credentials, local smoke invocation, explicit remote-smoke opt-in and the repository quality/migration gate.

`.dev.vars.example` now includes the previously missing dummy `LOCAL_WORKER_TOKEN`, matching the Worker secret contract without introducing real credentials.

## Focused verification performed before PR

The executable verifier regression was run locally against its synthetic HTTP server after the BG-04 changes:

```text
node --check scripts/verify-production-release.mjs                     PASS
node --check scripts/verify-production-release.test.mjs                PASS
node --test scripts/verify-production-release.test.mjs                 PASS — 5/5 tests
```

Covered regressions:

- staged success with truthful unavailable-capability reporting;
- malformed authoritative item version fails before privacy mutation;
- unexpected current-version conflict fails without retry/overwrite;
- remote target is rejected without explicit opt-in;
- response diagnostics and stage summaries redact configured credentials.

This focused proof is synthetic/local. The repository-wide `npm run check`, local migration command and GitHub Actions clean-head gate remain required before BG-04 can be closed.

## Known unavailable stages intentionally preserved

- `provider-adapter-execution`: policy eligibility is not adapter execution proof.
- `parseable-pdf-extraction-acceptance`: parseable fixture exists, but later extraction acceptance is not inferred.
- `browser-cookie-attachment-download`: known BG-07 bearer-vs-cookie mismatch remains visible.
- `bare-url-acquisition-enrichment`: later URL-acquisition capability remains outside BG-04.

These are not BG-04 failures when they are reported truthfully as unavailable/known-gap stages. BG-04 must not repair them by weakening security or inventing evidence.

## Scope and safety review

- No production API schema was changed.
- No database migration was added or changed.
- No authentication or authorization rule was relaxed.
- No provider configuration or live credential was added.
- No production deployment was performed.
- No permanent purge is run by the default verifier.
- Synthetic fixtures use unique run markers so delete/restore/search actions remain scoped to run-owned records.

## Remaining completion gates

Before BG-04 can be marked complete and BG-05 unlocked:

1. open/update the implementation PR;
2. pass the repository CI quality gate and local-migration job on the exact documentation-complete head;
3. reconcile the authoritative BG-04 100-step checklist against this evidence and CI;
4. merge the validated PR if repository rules permit it;
5. record the final merged completion state in GitHub/Linear verification tracking.
