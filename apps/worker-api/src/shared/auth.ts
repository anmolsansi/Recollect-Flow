import type { MiddlewareHandler } from 'hono';

import type { AppContext } from '../env';
import { AppError } from './errors';

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const value = header.slice('Bearer '.length).trim();
  return value.length > 0 ? value : null;
}

export const requireCaptureToken: MiddlewareHandler<AppContext> = async (
  context,
  next,
) => {
  const provided = bearerToken(context.req.header('Authorization'));
  const captureMatch = provided
    ? constantTimeEqual(provided, context.env.CAPTURE_TOKEN)
    : false;
  const adminMatch = provided
    ? constantTimeEqual(provided, context.env.ADMIN_TOKEN)
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
    ? constantTimeEqual(provided, context.env.ADMIN_TOKEN)
    : false;

  if (!adminMatch) {
    throw new AppError(403, 'FORBIDDEN', 'A valid admin token is required.');
  }
  await next();
};
