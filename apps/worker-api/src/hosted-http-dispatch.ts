/**
 * BG-31: admission for production HTTP actions capable of running an
 * outbound provider or re-arming a queued outbound job.
 *
 * This intentionally gates only the public production Worker entry; local
 * Hono fixture tests and isolated BG-29 staging transports retain their
 * existing injected mocks. The list must be reviewed whenever API routes
 * are added. It is not a global network firewall.
 */
const MANUAL_DISPATCH_ROUTES = [
  /^\/api\/v1\/digests\/generate$/,
  /^\/api\/v1\/digests\/[^/]+\/regenerate$/,
  /^\/api\/v1\/digests\/[^/]+\/deliver$/,
  /^\/api\/v1\/digest-deliveries\/[^/]+\/retry$/,
  /^\/api\/v1\/jobs\/[^/]+\/retry$/,
  /^\/api\/v1\/items\/[^/]+\/notion\/recreate$/,
  /^\/api\/v1\/items\/[^/]+\/source\/retry$/,
  /^\/api\/v1\/admin\/source-reprocess\/run$/,
  /^\/api\/v1\/worker\/jobs\/lease$/,
] as const;

export function requiresHostedHttpDispatch(
  method: string,
  pathname: string,
): boolean {
  if (method.toUpperCase() !== 'POST') return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // A malformed encoded API path must never bypass admission.
    return pathname.startsWith('/api/v1/');
  }

  // Hono may accept encoded path segments or optional trailing slashes.
  // Check the original spelling and its decoded form; do not trust one
  // interpretation of the requested route as an allow-list bypass.
  return [pathname, decoded].some((candidate) => {
    const canonical = candidate.replace(/\/+$/, '');
    return MANUAL_DISPATCH_ROUTES.some((route) => route.test(canonical));
  });
}

export function hostedHttpDispatchEnabled(env: unknown): boolean {
  if (!env || typeof env !== 'object') return false;
  const flags = env as {
    HOSTED_HTTP_DISPATCH_ENABLED?: string;
    HOSTED_EXTERNAL_DISPATCH_ENABLED?: string;
  };
  return (
    flags.HOSTED_HTTP_DISPATCH_ENABLED === 'true' &&
    flags.HOSTED_EXTERNAL_DISPATCH_ENABLED === 'true'
  );
}
