import type { Context, MiddlewareHandler } from 'hono';
import { getSignedCookie } from 'hono/cookie';

import type { AppContext } from '../env';
import { AppError } from './errors';

export async function constantTimeEqual(
  left: string,
  right: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let mismatch = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    mismatch |= leftBytes[index]! ^ rightBytes[index]!;
  }
  return mismatch === 0;
}

export function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const value = header.slice('Bearer '.length).trim();
  return value.length > 0 ? value : null;
}

export async function matchesCaptureToken(
  header: string | undefined,
  expectedToken: string,
): Promise<boolean> {
  const provided = bearerToken(header);
  return provided ? constantTimeEqual(provided, expectedToken) : false;
}

export async function matchesAdminSession(
  context: Context<AppContext>,
): Promise<boolean> {
  const cookieMatch = await getSignedCookie(
    context,
    context.env.ADMIN_TOKEN,
    'admin_session',
  );
  if (typeof cookieMatch !== 'string') return false;
  const match = /^authenticated:(\d{13})$/.exec(cookieMatch);
  if (!match) return false;
  const expiry = Number(match[1]);
  return (
    Number.isSafeInteger(expiry) &&
    expiry > Date.now() &&
    expiry <= Date.now() + 24 * 60 * 60 * 1000
  );
}

/**
 * Signed session cookies authorize writes only from this Worker's exact origin.
 * A missing/null Origin is rejected for cookie-backed mutations, including
 * requests from a different subdomain on the same site.
 * Bearer clients retain their non-browser no-Origin capability.
 */
function requireSessionWriteOrigin(context: Context<AppContext>): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) return;
  const origin = context.req.header('Origin');
  const expected = new URL(context.req.url).origin;
  if (!origin || origin === 'null' || origin !== expected) {
    throw new AppError(
      403,
      'ORIGIN_FORBIDDEN',
      'This browser write origin is not allowed.',
    );
  }
}

/**
 * Capture/admin bearer identity takes precedence over ambient browser cookies.
 * An invalid explicit Authorization header must never silently fall back to a
 * valid cookie, as that hides credential errors and can confuse permission scope.
 */
export const requireCaptureWrite: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  if (context.req.header('Authorization') !== undefined) {
    await requireCaptureToken(context, next);
    return;
  }
  if (!(await matchesAdminSession(context))) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'A valid capture token or owner session is required.',
    );
  }
  requireSessionWriteOrigin(context);
  await next();
};

export const requireCaptureToken: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const captureMatch = provided
    ? await constantTimeEqual(provided, context.env.CAPTURE_TOKEN)
    : false;
  const adminMatch = provided
    ? await constantTimeEqual(provided, context.env.ADMIN_TOKEN)
    : false;

  if (!captureMatch && !adminMatch) {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'A valid capture token is required.',
    );
  }
  await next();
};

export const requireAttachmentContentRead: MiddlewareHandler<
  AppContext
> = async (context, next) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const captureMatch = provided
    ? await constantTimeEqual(provided, context.env.CAPTURE_TOKEN)
    : false;
  const adminMatch = provided
    ? await constantTimeEqual(provided, context.env.ADMIN_TOKEN)
    : false;

  if (captureMatch || adminMatch) {
    await next();
    return;
  }

  if (await matchesAdminSession(context)) {
    await next();
    return;
  }

  throw new AppError(
    401,
    'UNAUTHENTICATED',
    'A valid capture token is required.',
  );
};

export const requireAdminToken: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const adminMatch = provided
    ? await constantTimeEqual(provided, context.env.ADMIN_TOKEN)
    : false;

  if (adminMatch) {
    await next();
    return;
  }

  // Explicit bearer failures cannot borrow the browser's ambient identity.
  if (
    context.req.header('Authorization') === undefined &&
    (await matchesAdminSession(context))
  ) {
    requireSessionWriteOrigin(context);
    await next();
    return;
  }

  throw new AppError(403, 'FORBIDDEN', 'A valid admin token is required.');
};

export const requireLocalWorkerToken: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const workerMatch = provided
    ? await constantTimeEqual(provided, context.env.LOCAL_WORKER_TOKEN)
    : false;
  if (!workerMatch) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'A valid local-worker token is required.',
    );
  }
  await next();
};
