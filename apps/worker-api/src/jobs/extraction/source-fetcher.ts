import { validateSourceDestination } from './source-destination';
import { parseSourceDocument } from './source-document.parser';
import {
  SOURCE_FETCH_CONTENT_TYPES,
  SOURCE_FETCH_LIMITS,
  type SourceFetch,
  type SourceFetchMetadata,
  type SourceFetchOutcome,
} from './source-fetcher.types';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function mediaType(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = value.split(';', 1)[0].trim().toLowerCase();
  return parsed || undefined;
}

function metadataCoverage(
  metadata: SourceFetchMetadata,
): 'metadata_only' | 'url_only' {
  return metadata.title ||
    metadata.description ||
    metadata.siteName ||
    metadata.canonicalHintUrl
    ? 'metadata_only'
    : 'url_only';
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort after the outcome is already determined.
  }
}

function abortError(signal: AbortSignal): Error {
  const error = new Error('Source fetch aborted');
  error.name = 'AbortError';
  if (!signal.aborted) {
    return error;
  }
  return error;
}

async function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw abortError(signal);

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<{ bytes?: Uint8Array; tooLarge: boolean }> {
  const advertised = response.headers.get('content-length');
  if (advertised) {
    const length = Number(advertised);
    if (Number.isFinite(length) && length > maximumBytes) {
      await cancelBody(response);
      return { tooLarge: true };
    }
  }

  if (!response.body) {
    return { bytes: new Uint8Array(), tooLarge: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await abortable(reader.read(), signal);
      if (done) break;
      if (!value) continue;

      if (total + value.byteLength > maximumBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }

      total += value.byteLength;
      chunks.push(value);
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // The read failure is the authoritative outcome.
    }
    throw error;
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes: combined, tooLarge: false };
}

function isLoginDocument(text: string, title: string | undefined): boolean {
  const candidate = `${title ?? ''}\n${text}`.toLowerCase();
  return /\b(log[ -]?in|sign[ -]?in|password|authenticate)\b/.test(candidate);
}

function statusOutcome(
  status: number,
  finalUrl: string,
  redirectCount: number,
): SourceFetchOutcome | null {
  if (status === 401) {
    return {
      status: 'login_required',
      coverage: 'url_only',
      retryable: false,
      errorCode: 'SOURCE_LOGIN_REQUIRED',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  if (status === 403) {
    return {
      status: 'login_required',
      coverage: 'url_only',
      retryable: false,
      errorCode: 'SOURCE_ACCESS_DENIED',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  if (status === 404 || status === 410) {
    return {
      status: 'unavailable',
      coverage: 'url_only',
      retryable: false,
      errorCode: 'SOURCE_NOT_FOUND',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  if (status === 429) {
    return {
      status: 'rate_limited',
      coverage: 'url_only',
      retryable: true,
      errorCode: 'SOURCE_RATE_LIMITED',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  if (status >= 500 && status <= 599) {
    return {
      status: 'server_error',
      coverage: 'url_only',
      retryable: true,
      errorCode: 'SOURCE_SERVER_ERROR',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  if (status >= 400) {
    return {
      status: 'unavailable',
      coverage: 'url_only',
      retryable: false,
      errorCode: 'SOURCE_ACCESS_DENIED',
      fetchedFinalUrl: finalUrl,
      httpStatus: status,
      redirectCount,
    };
  }
  return null;
}

export interface SourceFetcherOptions {
  fetchImpl?: SourceFetch;
  deadlineMs?: number;
  maximumRedirects?: number;
  maximumResponseBytes?: number;
  maximumExtractedCharacters?: number;
}

export class SourceFetcher {
  private readonly fetchImpl: SourceFetch;
  private readonly deadlineMs: number;
  private readonly maximumRedirects: number;
  private readonly maximumResponseBytes: number;
  private readonly maximumExtractedCharacters: number;

  constructor(options: SourceFetcherOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
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
        if (controller.signal.aborted) throw abortError(controller.signal);

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

        const response = await abortable(
          this.fetchImpl(request),
          controller.signal,
        );

        if (REDIRECT_STATUSES.has(response.status)) {
          const location = response.headers.get('location');
          await cancelBody(response);

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

        const classified = statusOutcome(
          response.status,
          current.href,
          redirectCount,
        );
        if (classified) {
          await cancelBody(response);
          return classified;
        }

        if (response.status === 204 || response.status === 205) {
          await cancelBody(response);
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

        const contentType = mediaType(response.headers.get('content-type'));
        if (!contentType || !SOURCE_FETCH_CONTENT_TYPES.has(contentType)) {
          await cancelBody(response);
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

        const body = await readBoundedBody(
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
        const parsed = await parseSourceDocument(
          bytes,
          response.headers.get('content-type') ?? contentType,
          current.href,
          this.maximumExtractedCharacters,
        );
        const metadata: SourceFetchMetadata = {
          title: parsed.title,
          description: parsed.description,
          siteName: parsed.siteName,
          canonicalHintUrl: parsed.canonicalHintUrl,
        };

        if (
          parsed.hasPasswordInput &&
          isLoginDocument(parsed.text, parsed.title)
        ) {
          return {
            status: 'login_required',
            coverage: metadataCoverage(metadata),
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
          const coverage = metadataCoverage(metadata);
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
