import type { MiddlewareHandler } from 'hono';

import type { AppContext } from '../env';
import { AppError } from './errors';

async function constantTimeEqual(
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

export const requireAdminToken: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const adminMatch = provided
    ? await constantTimeEqual(provided, context.env.ADMIN_TOKEN)
    : false;

  if (!adminMatch) {
    throw new AppError(403, 'FORBIDDEN', 'A valid admin token is required.');
  }
  await next();
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
