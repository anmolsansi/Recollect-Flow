import { SourceFetcher } from './source-fetcher';
import type { SourceFetch, SourceFetchOutcome } from './source-fetcher.types';

/**
 * Synthetic URL sources for BG-29.078 only. Never use this adapter in the
 * production Worker entry point; the real SourceFetcher remains the default.
 */
export const BG29_STAGING_URLS = Object.freeze(
  Array.from(
    { length: 12 },
    (_, index) =>
      `https://example.com/bg29-078/source-${String(index + 1).padStart(2, '0')}`,
  ),
);

export interface Bg29StagingSourceOptions {
  /** Simulate exactly one HTTP 503 before the permitted fixture succeeds. */
  failOnceFor?: string;
}

function deniedDestination(): SourceFetchOutcome {
  return {
    status: 'destination_blocked',
    coverage: 'url_only',
    retryable: false,
    errorCode: 'SOURCE_DESTINATION_BLOCKED',
    redirectCount: 0,
  };
}

/**
 * Deterministic transport with a strict exact-URL allowlist.
 *
 * SourceFetcher still performs its production URL safety checks, bounded
 * response handling and document parsing; only its HTTP transport is
 * substituted. The transport has no delegate to global fetch, so an
 * unexpected request cannot escape to the network.
 */
export function createBg29StagingSourceFetcher(
  options: Bg29StagingSourceOptions = {},
): Pick<SourceFetcher, 'fetch'> {
  const permitted = new Set<string>(BG29_STAGING_URLS);
  if (options.failOnceFor !== undefined && !permitted.has(options.failOnceFor)) {
    throw new Error('BG29 staging failure target is not a permitted fixture');
  }

  const attempts = new Map<string, number>();
  const fetchImpl: SourceFetch = async (input) => {
    if (
      !(input instanceof Request) ||
      input.method !== 'GET' ||
      input.redirect !== 'manual' ||
      !permitted.has(input.url)
    ) {
      throw new Error('BG29_STAGING_EGRESS_DENIED');
    }

    const url = input.url;
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    if (url === options.failOnceFor && count === 1) {
      return new Response('Synthetic transient source failure', {
        status: 503,
        headers: { 'retry-after': '1', 'content-type': 'text/plain' },
      });
    }

    const fixtureNumber = BG29_STAGING_URLS.indexOf(url) + 1;
    const document = `<!doctype html><html lang="en"><head>
      <title>BG29 synthetic source ${fixtureNumber}</title>
      <meta name="description" content="Offline deterministic acquisition fixture ${fixtureNumber}">
      </head><body><main><h1>BG29 acquisition fixture ${fixtureNumber}</h1>
      <p>BG29_STAGING_URL_SENTINEL_${String(fixtureNumber).padStart(2, '0')}
      This source text must be parsed and saved by the real acquisition
      service rather than injected as an extraction result.</p></main></body></html>`;
    return new Response(document, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  };

  const bounded = new SourceFetcher({ fetchImpl });
  return Object.freeze({
    fetch(input: string): Promise<SourceFetchOutcome> {
      // Check before the production source parser or HTTP transport runs.
      // No wildcard hosts, subdomains, altered paths or query strings.
      if (!permitted.has(input)) return Promise.resolve(deniedDestination());
      return bounded.fetch(input);
    },
  });
}
