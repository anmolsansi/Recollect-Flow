/**
 * BG-21: Keep the static application shell public while preserving private API
 * authorization. Only known browser routes receive index.html.
 */
export interface StaticAssets {
  fetch(request: Request): Promise<Response>;
}

const shellRoutes = new Set(['/', '/capture', '/capture/file']);
const hashedAsset = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;

function isShellRoute(pathname: string): boolean {
  return shellRoutes.has(pathname) || /^\/items\/[^/]+$/.test(pathname);
}

function withCacheHeaders(response: Response, cacheControl: string): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Content-Type-Options', 'nosniff');
  // A 304 has no response body. Preserve conditional ETag replies on reload.
  return new Response(response.status === 304 ? null : response.body, {
    status: response.status,
    headers,
  });
}

/** Returns null for requests which must instead be handled by Hono. */
export async function servePublicAsset(
  request: Request,
  assets: StaticAssets | undefined,
): Promise<Response | null> {
  const url = new URL(request.url);
  const isShell = isShellRoute(url.pathname);
  const isBundle = url.pathname.startsWith('/assets/');
  if (!isShell && !isBundle) return null;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    });
  }

  if (!assets) {
    return new Response('Web assets are unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const assetUrl = isShell ? new URL('/index.html', request.url) : url;
  const assetRequest = new Request(assetUrl, {
    method: request.method,
    headers: request.headers,
  });
  const response = await assets.fetch(assetRequest);
  if (response.status !== 304 && !response.ok) {
    // Never return a stale HTML shell to a failed script/style request.
    return new Response('Asset unavailable', {
      status: response.status === 404 ? 404 : 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const cache = isShell
    ? 'no-cache, must-revalidate'
    : hashedAsset.test(url.pathname)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, must-revalidate';
  return withCacheHeaders(response, cache);
}
