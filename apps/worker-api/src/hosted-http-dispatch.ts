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
  return (
    method.toUpperCase() === 'POST' &&
    MANUAL_DISPATCH_ROUTES.some((route) => route.test(pathname))
  );
}

export function hostedHttpDispatchEnabled(env: {
  HOSTED_HTTP_DISPATCH_ENABLED?: string;
  HOSTED_EXTERNAL_DISPATCH_ENABLED?: string;
}): boolean {
  return (
    env.HOSTED_HTTP_DISPATCH_ENABLED === 'true' &&
    env.HOSTED_EXTERNAL_DISPATCH_ENABLED === 'true'
  );
}
