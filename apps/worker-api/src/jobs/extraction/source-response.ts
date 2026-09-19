import type {
  SourceFetchMetadata,
  SourceFetchOutcome,
} from './source-fetcher.types';

export const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function sourceMediaType(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = value.split(';', 1)[0].trim().toLowerCase();
  return parsed || undefined;
}

export function sourceMetadataCoverage(
  metadata: SourceFetchMetadata,
): 'metadata_only' | 'url_only' {
  return metadata.title ||
    metadata.description ||
    metadata.siteName ||
    metadata.canonicalHintUrl
    ? 'metadata_only'
    : 'url_only';
}

export async function cancelSourceBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort after the outcome is already determined.
  }
}

export function sourceAbortError(): Error {
  const error = new Error('Source fetch aborted');
  error.name = 'AbortError';
  return error;
}

export async function abortableSourceOperation<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw sourceAbortError();

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(sourceAbortError());
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

export async function readBoundedSourceBody(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<{ bytes?: Uint8Array; tooLarge: boolean }> {
  const advertised = response.headers.get('content-length');
  if (advertised) {
    const length = Number(advertised);
    if (Number.isFinite(length) && length > maximumBytes) {
      await cancelSourceBody(response);
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
      const { done, value } = await abortableSourceOperation(
        reader.read(),
        signal,
      );
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

export function isSourceLoginDocument(
  text: string,
  title: string | undefined,
): boolean {
  const candidate = `${title ?? ''}\n${text}`.toLowerCase();
  return /\b(log[ -]?in|sign[ -]?in|password|authenticate)\b/.test(candidate);
}

export function classifySourceHttpStatus(
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
