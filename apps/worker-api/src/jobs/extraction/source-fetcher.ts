import { validateSourceDestination } from './source-destination';
import { parseSourceDocument } from './source-document.parser';
import {
  abortableSourceOperation,
  cancelSourceBody,
  classifySourceHttpStatus,
  isSourceLoginDocument,
  readBoundedSourceBody,
  REDIRECT_STATUSES,
  sourceAbortError,
  sourceMediaType,
  sourceMetadataCoverage,
} from './source-response';
import {
  SOURCE_FETCH_CONTENT_TYPES,
  SOURCE_FETCH_LIMITS,
  type SourceFetch,
  type SourceFetchMetadata,
  type SourceFetchOutcome,
} from './source-fetcher.types';

type SourceParser = typeof parseSourceDocument;

export interface SourceFetcherOptions {
  fetchImpl?: SourceFetch;
  parseImpl?: SourceParser;
  deadlineMs?: number;
  maximumRedirects?: number;
  maximumResponseBytes?: number;
  maximumExtractedCharacters?: number;
}

export class SourceFetcher {
  private readonly fetchImpl: SourceFetch;
  private readonly parseImpl: SourceParser;
  private readonly deadlineMs: number;
  private readonly maximumRedirects: number;
  private readonly maximumResponseBytes: number;
  private readonly maximumExtractedCharacters: number;

  constructor(options: SourceFetcherOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.parseImpl = options.parseImpl ?? parseSourceDocument;
    this.deadlineMs = options.deadlineMs ?? SOURCE_FETCH_LIMITS.totalDeadlineMs;
    this.maximumRedirects =
      options.maximumRedirects ?? SOURCE_FETCH_LIMITS.maxRedirects;
    this.maximumResponseBytes =
      options.maximumResponseBytes ?? SOURCE_FETCH_LIMITS.maxResponseBytes;
    this.maximumExtractedCharacters =
      options.maximumExtractedCharacters ??
      SOURCE_FETCH_LIMITS.maxExtractedCharacters;
  }

  async fetch(input: string): Promise<SourceFetchOutcome> {
    const initial = validateSourceDestination(input);
    if (!initial.allowed) {
      return {
        status: 'destination_blocked',
        coverage: 'url_only',
        retryable: false,
        errorCode: initial.reason,
        redirectCount: 0,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.deadlineMs);
    const visited = new Set<string>();
    let current = initial.url;
    let redirectCount = 0;

    try {
      while (true) {
        if (controller.signal.aborted) throw sourceAbortError();

        const destination = validateSourceDestination(current);
        if (!destination.allowed) {
          return {
            status: 'destination_blocked',
            coverage: 'url_only',
            retryable: false,
            errorCode: destination.reason,
            redirectCount,
          };
        }
        current = destination.url;

        if (visited.has(current.href)) {
          return {
            status: 'redirect_limit',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_REDIRECT_LIMIT',
            redirectCount,
          };
        }
        visited.add(current.href);

        const request = new Request(current.href, {
          method: 'GET',
          redirect: 'manual',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            accept: 'text/html, application/xhtml+xml, text/plain;q=0.9',
          },
        });

        const response = await abortableSourceOperation(
          this.fetchImpl(request),
          controller.signal,
        );

        if (REDIRECT_STATUSES.has(response.status)) {
          const location = response.headers.get('location');
          await cancelSourceBody(response);

          if (!location) {
            return {
              status: 'unavailable',
              coverage: 'url_only',
              retryable: false,
              fetchedFinalUrl: current.href,
              httpStatus: response.status,
              redirectCount,
            };
          }

          if (redirectCount >= this.maximumRedirects) {
            return {
              status: 'redirect_limit',
              coverage: 'url_only',
              retryable: false,
              errorCode: 'SOURCE_REDIRECT_LIMIT',
              fetchedFinalUrl: current.href,
              httpStatus: response.status,
              redirectCount,
            };
          }

          let target: URL;
          try {
            target = new URL(location, current);
          } catch {
            return {
              status: 'destination_blocked',
              coverage: 'url_only',
              retryable: false,
              errorCode: 'SOURCE_DESTINATION_BLOCKED',
              fetchedFinalUrl: current.href,
              httpStatus: response.status,
              redirectCount,
            };
          }

          const redirected = validateSourceDestination(target);
          if (!redirected.allowed) {
            return {
              status: 'destination_blocked',
              coverage: 'url_only',
              retryable: false,
              errorCode: redirected.reason,
              fetchedFinalUrl: current.href,
              httpStatus: response.status,
              redirectCount,
            };
          }

          redirectCount += 1;
          current = redirected.url;
          continue;
        }

        const classified = classifySourceHttpStatus(
          response.status,
          current.href,
          redirectCount,
        );
        if (classified) {
          await cancelSourceBody(response);
          return classified;
        }

        if (response.status === 204 || response.status === 205) {
          await cancelSourceBody(response);
          return {
            status: 'empty',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_EMPTY_CONTENT',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            redirectCount,
          };
        }

        const contentType = sourceMediaType(
          response.headers.get('content-type'),
        );
        if (!contentType || !SOURCE_FETCH_CONTENT_TYPES.has(contentType)) {
          await cancelSourceBody(response);
          return {
            status: 'unsupported_content',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_UNSUPPORTED_CONTENT',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            contentType,
            redirectCount,
          };
        }

        const body = await readBoundedSourceBody(
          response,
          this.maximumResponseBytes,
          controller.signal,
        );
        if (body.tooLarge) {
          return {
            status: 'too_large',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_TOO_LARGE',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            contentType,
            redirectCount,
          };
        }

        const bytes = body.bytes ?? new Uint8Array();
        let parsed: Awaited<ReturnType<SourceParser>>;
        try {
          parsed = await this.parseImpl(
            bytes,
            response.headers.get('content-type') ?? contentType,
            current.href,
            this.maximumExtractedCharacters,
          );
        } catch {
          if (controller.signal.aborted) throw sourceAbortError();
          return {
            status: 'parse_failed',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_PARSE_FAILED',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            contentType,
            responseBytes: bytes.byteLength,
            redirectCount,
          };
        }

        if (controller.signal.aborted) throw sourceAbortError();

        const metadata: SourceFetchMetadata = {
          title: parsed.title,
          description: parsed.description,
          siteName: parsed.siteName,
          canonicalHintUrl: parsed.canonicalHintUrl,
        };

        if (
          parsed.hasPasswordInput &&
          isSourceLoginDocument(parsed.text, parsed.title)
        ) {
          return {
            status: 'login_required',
            coverage: sourceMetadataCoverage(metadata),
            retryable: false,
            errorCode: 'SOURCE_LOGIN_REQUIRED',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            contentType,
            responseBytes: bytes.byteLength,
            redirectCount,
            ...metadata,
          };
        }

        if (!parsed.text) {
          const coverage = sourceMetadataCoverage(metadata);
          if (coverage === 'metadata_only') {
            return {
              status: 'metadata_only',
              coverage,
              retryable: false,
              fetchedFinalUrl: current.href,
              httpStatus: response.status,
              contentType,
              responseBytes: bytes.byteLength,
              redirectCount,
              ...metadata,
            };
          }
          return {
            status: 'empty',
            coverage: 'url_only',
            retryable: false,
            errorCode: 'SOURCE_EMPTY_CONTENT',
            fetchedFinalUrl: current.href,
            httpStatus: response.status,
            contentType,
            responseBytes: bytes.byteLength,
            redirectCount,
          };
        }

        return {
          status: 'acquired_text',
          coverage: 'acquired_text',
          retryable: false,
          fetchedFinalUrl: current.href,
          httpStatus: response.status,
          contentType,
          responseBytes: bytes.byteLength,
          redirectCount,
          acquiredText: parsed.text,
          extractedCharacters: Array.from(parsed.text).length,
          ...metadata,
        };
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        return {
          status: 'timeout',
          coverage: 'url_only',
          retryable: true,
          errorCode: 'SOURCE_TIMEOUT',
          redirectCount,
        };
      }

      return {
        status: 'network_error',
        coverage: 'url_only',
        retryable: true,
        errorCode: 'SOURCE_NETWORK_ERROR',
        redirectCount,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
