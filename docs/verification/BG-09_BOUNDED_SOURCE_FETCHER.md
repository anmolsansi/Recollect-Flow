# BG-09 — Bounded Source Fetcher Verification

Tracking: GitHub #48 / Linear OPE-329.

Task: **BG-09 — Build a bounded source fetcher**.

## Baseline and dependency

- BG-09 base: `102cd9539461fb72173dfdf6717229c789a25d29`.
- That revision is the merged BG-08 final closeout from PR #47.
- BG-08 is complete and explicitly unlocks BG-09.
- Work branch: `agent/ope-329-bg-09-bounded-source-fetcher`.
- Verification environment: deterministic injected fetch fixtures in the repository's workerd-backed Vitest suite plus normal GitHub CI.
- No production deployment, production source host, owner credential, private URL, or uncontrolled public-site fetch is required or authorized by BG-09.

## Authoritative contract

BG-09 implements the lower-level fetch boundary frozen by
`docs/URL_ACQUISITION_CONTRACT.md`:

- HTTP(S) only;
- no embedded source credentials;
- validate every initial and redirected destination;
- no RecollectFlow/browser/provider credentials in outbound requests;
- manual redirects;
- one 8-second total deadline;
- at most 5 redirects;
- at most 2 MiB of parser-visible response body;
- at most 250,000 extracted Unicode characters;
- HTML, XHTML, and plain-text only;
- deterministic parsing with no page JavaScript execution;
- stable safe outcomes instead of raw upstream exception/body leakage.

The contract's maximum of three automatic transient attempts is handed to BG-10's
job orchestration. BG-09 exposes transient retryability but does not implement the
processing chain or persistence.

## Existing implementation inspected

The repository has attachment extraction under
`apps/worker-api/src/jobs/extraction/`, but no URL source fetcher. The attachment
worker and `ExtractionService` must remain attachment-specific. BG-09 therefore
adds a sibling lower-level source-fetch module rather than overloading the existing
R2 attachment contract.

`apps/worker-api/src/captures/url-normalizer.ts` is a conservative deduplication
normalizer. BG-09 must not reuse it as fetch admission because source acquisition
must preserve the submitted URL and treat redirect final URLs as separate derived
evidence.

## Staff-engineer review

### Selected parser

Use Cloudflare Workers' native `HTMLRewriter` rather than adding a third-party DOM
dependency. It is runtime-native, streaming, can remove script/style/navigation
content, and can collect deterministic text/metadata without executing page
JavaScript.

### Selected egress boundary

Enable `global_fetch_strictly_public` so Worker global `fetch()` routes as a
public-Internet request. Add deterministic URL/IP/hostname admission before every
request and redirect. The code does not perform a DNS preflight followed by an
independently resolving fetch, because that would create a DNS rebinding
time-of-check/time-of-use gap.

The Worker runtime does not expose the resolved origin IP from ordinary global
`fetch()` for application-side pinning. BG-09 therefore documents the exact
boundary instead of claiming stronger DNS pinning than the runtime provides:
literal/private/special destinations are rejected in application code, and
hostname egress is constrained by the strict-public runtime route.

### Port policy

V1 source acquisition permits only the normal HTTP(S) ports: HTTP 80 and HTTPS 443.
The WHATWG URL parser normalizes explicit default ports away. Non-default ports are
rejected to reduce SSRF surface and avoid turning the source fetcher into a general
network client.

### Scope boundary

BG-09 does not add a migration, mutate `items.raw_text`, enqueue acquisition jobs,
change FTS, alter item detail, change export/restore, or repair aggregate processing
state. Those remain BG-10+ work.

## Planned proof

Controlled tests must cover:

- public HTML extraction and metadata;
- plain text;
- relative/multi-hop redirects;
- redirect loops and redirect limits;
- unsafe literal and encoded destinations;
- unsupported schemes, credentials, and ports;
- unsupported MIME;
- false/missing Content-Length and streamed overflow;
- one total timeout budget;
- 401/403/login-form behavior;
- transient 429/5xx/network outcomes;
- malformed and empty HTML;
- extracted-text truncation;
- source canonical hints as metadata only;
- prompt-injection-shaped page text remaining plain data;
- absence of Cookie, Authorization, capture/admin/local-worker tokens, or provider
  keys from outbound requests.

## Verification state

Initial repository/source reconciliation: **PASS**.

Implementation: **IN PROGRESS**.

Focused workerd proof: **PENDING**.

Repository CI: **PENDING**.

BG-09.100 remains open until the implementation is merged and merged-main CI
proves the completion boundary.
