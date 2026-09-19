# BG-09 — Bounded Source Fetcher Verification

Tracking: GitHub #48 / Linear OPE-329.

Task: **BG-09 — Build a bounded source fetcher**.

## Final status

**COMPLETE.** BG-09 implementation PR #49 merged to `main` at
`c46cc25fe61825a3c7137c88982f19c13b5c531c`.

The implementation head `c167fa32fec36f56a8cc8da82befc693bc1c23ce`
passed the complete repository gate in CI #245 before merge. The exact merged-main
commit then passed the complete repository gate again in CI #246.

BG-10 is therefore unlocked. BG-09 does not claim BG-10 persistence/job-chain
integration, BG-11 owner retry UX, or BG-12/BG-13 aggregate processing-state work.

## Baseline and dependency

- BG-09 base: `102cd9539461fb72173dfdf6717229c789a25d29`.
- That revision is the merged BG-08 final closeout.
- BG-08 was complete and explicitly unlocked BG-09.
- Implementation branch: `agent/ope-329-bg-09-bounded-source-fetcher`.
- Implementation PR: #49.
- Verification environment: deterministic injected fetch fixtures in the
  repository's workerd-backed Vitest suite plus the normal GitHub CI gate.
- No production source host, owner credential, private URL, or uncontrolled
  public-site fetch was required or used for acceptance.

## Authoritative contract implemented

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

The contract's maximum of three automatic transient attempts remains a BG-10
orchestration responsibility. BG-09 exposes retryability without implementing
persistent retry scheduling.

## Implementation

BG-09 adds a sibling URL-acquisition boundary under
`apps/worker-api/src/jobs/extraction/` without overloading the existing R2
attachment extraction service.

Implemented modules:

- `source-destination.ts`: platform URL parsing, scheme/credential/default-port
  admission, normalized IPv4/IPv6 handling, blocked local/private/link-local/
  reserved/metadata destinations, and fragment removal for outbound requests;
- `source-fetcher.types.ts`: frozen limits plus the BG-08 acquisition status,
  coverage, error-code, and result vocabulary;
- `source-response.ts`: bounded stream reads, Content-Length early rejection,
  actual-byte enforcement, cancellation, status classification, timeout helpers,
  and login-content classification;
- `source-document.parser.ts`: Worker-native `HTMLRewriter` parsing, safe
  metadata extraction, script/style/navigation/hidden-content removal, plain-text
  support, whitespace normalization, and Unicode-character truncation;
- `source-fetcher.ts`: one total deadline, manual redirects, independent target
  revalidation, loop/count enforcement, safe request construction, MIME admission,
  parser integration, stable outcomes, and no raw exception leakage.

`wrangler.toml` enables `global_fetch_strictly_public`.

## Runtime destination boundary

BG-09 deliberately does not perform a DNS preflight followed by an independently
resolving fetch. That pattern creates a time-of-check/time-of-use rebinding gap.

The selected Worker boundary is:

1. reject malformed, unsupported, credential-bearing, non-default-port, literal
   private/local/link-local/reserved/metadata, and encoded equivalent destinations
   before network work;
2. repeat that admission for every redirect target;
3. use manual redirects;
4. route global Worker fetches with
   `global_fetch_strictly_public`, the Cloudflare runtime flag for public-Internet
   global-fetch routing.

The ordinary Worker global `fetch()` API does not expose a resolved origin IP for
application-side pinning, so BG-09 does not claim application-level DNS pinning.
The safety guarantee is the combination of deterministic literal/special-address
admission and the strict-public Worker egress boundary.

Reference:
<https://developers.cloudflare.com/workers/configuration/compatibility-flags/>.

## Port policy

V1 permits only the normal HTTP(S) ports: HTTP 80 and HTTPS 443. The WHATWG URL
parser normalizes explicit default ports away, so any remaining port is rejected.

## Parser and content boundary

The selected parser is Cloudflare Workers' native `HTMLRewriter`. No third-party
DOM dependency or webpage JavaScript runtime was added.

The parser:

- accepts only HTML, XHTML, or plain text admitted by the fetcher;
- removes script and style content;
- removes common navigation/header/footer/aside boilerplate and explicitly hidden
  content;
- extracts bounded title, description, site-name, and canonical-hint metadata;
- resolves a source canonical hint as metadata only;
- extracts normalized readable text;
- truncates extracted text to the frozen 250,000-character maximum;
- treats prompt-injection-shaped page text as inert source evidence.

## Byte, redirect, and time enforcement

The fetcher:

- starts one abort controller/deadline before the first request;
- reuses that signal across the redirect chain and body read;
- rejects an advertised body above the byte limit early;
- does not trust Content-Length;
- counts actual bytes presented by the response stream;
- cancels a streamed/chunked response on overflow;
- adds no second decompression step, so the limit applies to bytes in the
  parser-visible runtime body stream;
- bounds parser input at 2 MiB;
- enforces at most five redirects;
- detects redirect loops;
- rechecks the total timeout after parsing before returning success.

## Failure and privacy behavior

Stable outcomes/error codes cover:

- unsafe destination;
- login/access requirement;
- stable unavailable page;
- timeout;
- network failure;
- rate limit;
- upstream 5xx;
- unsupported content;
- oversized content;
- redirect limit/loop;
- empty content;
- parser failure.

Raw exception messages, response bodies, signed query values, application cookies,
authorization headers, capture/admin tokens, local-worker tokens, and provider keys
are not returned as error details or copied into outbound source requests.

The source fetcher does not mutate the capture or canonical item on failure. Durable
acquisition persistence and capture/job-chain integration remain BG-10, so BG-09
cannot convert a failed optional fetch into loss of the already-saved capture.

## Controlled regression proof

The workerd-backed test suite covers:

- normal HTML extraction and safe metadata;
- bounded plain text;
- relative and multi-hop redirects;
- manual redirect mode and final derived URL;
- redirect loops and redirect-count exhaustion;
- unsafe redirected targets;
- unsupported schemes, embedded credentials, non-default ports, malformed URLs,
  private/local/link-local/reserved IPv4/IPv6, metadata endpoints, and unusual
  IPv4 spellings;
- unsupported binary MIME;
- advertised oversize rejection without body consumption;
- missing Content-Length with streamed/chunked overflow cancellation;
- one total abort signal/deadline;
- 401/403/login-form outcomes;
- 404/410;
- 429 and 5xx retryable outcomes;
- metadata-only and empty pages;
- malformed HTML;
- prompt-injection-shaped text remaining plain evidence;
- normalized parser failure;
- normalized thrown network failure;
- extracted-text truncation;
- absence of Authorization, Cookie, API-key, capture-token, and admin-token headers
  from the outbound request.

## Scope integrity

BG-09 does not:

- add the BG-10 `url_acquisitions` migration;
- persist acquisition evidence;
- overwrite `items.raw_text`;
- change FTS;
- enqueue source-acquisition jobs;
- change item-detail projection;
- change export/restore/purge behavior;
- implement owner retry/reprocessing UX;
- bypass authentication, CAPTCHA, bot protection, or platform controls;
- execute page JavaScript;
- deploy or acceptance-test against arbitrary live websites;
- repair BG-12/BG-13 aggregate processing state.

## Microcommit and CI history

The implementation was kept as reviewable microcommits. CI failures were preserved
and repaired rather than bypassed:

- early runs exposed repository Prettier differences;
- a temporary branch-only Prettier diagnostic emitted the repository's exact pinned
  formatting output and was removed before completion;
- CI #241 reached strict TypeScript and exposed tuple/index/Worker-body typing
  issues;
- four focused microcommits repaired those type boundaries;
- CI #245 passed the full repository gate at
  `c167fa32fec36f56a8cc8da82befc693bc1c23ce`;
- PR #49 merged the implementation to `main` at
  `c46cc25fe61825a3c7137c88982f19c13b5c531c`;
- merged-main CI #246 passed the same complete gate.

CI #245:
<https://github.com/anmolsansi/Recollect-Flow/actions/runs/35440693680>

Merged-main CI #246:
<https://github.com/anmolsansi/Recollect-Flow/actions/runs/35440816676>

Both successful gates include:

- `npm ci`;
- `npm run check`, covering Prettier, ESLint, TypeScript, release smoke,
  Node tests, workerd-backed D1 tests, contracts, web lint/tests, and web build;
- isolated local D1 migration replay;
- Chrome availability;
- real browser-download regression.

## Final reconciliation

BG-09.001 through BG-09.100 are satisfied.

The selected runtime boundary and its limitation are documented without claiming
DNS pinning the Worker API does not provide. Required rejection and limited-coverage
outcomes remain truthful. No application secret reaches the controlled fetch spy.
The implementation preserves BG-08 source/provenance distinctions and does not pull
BG-10+ persistence/recovery work into BG-09.

**BG-10 is unlocked.**
