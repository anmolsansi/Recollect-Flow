import type { Context } from 'hono';

import type { AppContext } from '../env';
import { AppError } from '../shared/errors';

/**
 * Login attempts have no account ID before authentication. Use only the
 * Cloudflare-authored connecting IP and hash it to a fixed-length key. Never
 * use a submitted token, cookie, forwarding header or arbitrary URL as a key.
 * The Workers limiter is edge-local and intentionally expires after 60 seconds.
 */
export async function enforceLoginAbuseLimit(
  context: Context<AppContext>,
): Promise<void> {
  const limiter = context.env.LOGIN_RATE_LIMITER;
  if (!limiter) {
    // Existing Node/workerd tests and local Wrangler use reserved test hosts.
    // Missing bindings on public HTTPS origins are a configuration failure,
    // not an unthrottled production login route.
    const host = new URL(context.req.url).hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.test')
    ) {
      return;
    }
    throw new AppError(
      503,
      'AUTH_RATE_LIMIT_UNAVAILABLE',
      'Login is temporarily unavailable.',
    );
  }

  const connectingIp = context.req.header('CF-Connecting-IP')?.trim() ?? '';
  const client = /^[0-9a-f:.]{3,64}$/i.test(connectingIp)
    ? connectingIp.toLowerCase()
    : 'unknown';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(client),
  );
  const key = Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  let permitted: boolean;
  try {
    permitted = (await limiter.limit({ key: `admin-login:${key}` })).success;
  } catch {
    throw new AppError(
      503,
      'AUTH_RATE_LIMIT_UNAVAILABLE',
      'Login is temporarily unavailable.',
    );
  }
  if (!permitted) {
    throw new AppError(429, 'LOGIN_RATE_LIMITED', 'Too many login attempts.');
  }
}

/** Browser-initiated login may not be triggered by a foreign origin. */
export function requireLoginOrigin(context: Context<AppContext>): void {
  const origin = context.req.header('Origin');
  if (origin === undefined) return; // Native clients can omit Origin with a valid admin secret.
  const requestOrigin = new URL(context.req.url).origin;
  const configuredWeb = context.env.WEB_INBOX_BASE_URL;
  let allowedWebOrigin: string | undefined;
  if (configuredWeb) {
    try {
      const url = new URL(configuredWeb);
      if (
        url.protocol === 'https:' ||
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1'
      ) {
        allowedWebOrigin = url.origin;
      }
    } catch {
      // An invalid configured origin must never authorize a foreign browser.
    }
  }
  if (
    origin === 'null' ||
    (origin !== requestOrigin && origin !== allowedWebOrigin)
  ) {
    throw new AppError(
      403,
      'ORIGIN_FORBIDDEN',
      'This browser write origin is not allowed.',
    );
  }
}
