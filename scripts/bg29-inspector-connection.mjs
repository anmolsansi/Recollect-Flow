/* global WebSocket */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Open the local Wrangler DevTools inspector with its required loopback Origin. */
export function createLoopbackInspectorSocket(rawUrl) {
  const endpoint = new URL(rawUrl);
  if (endpoint.protocol !== 'ws:' || !LOOPBACK_HOSTS.has(endpoint.hostname)) {
    throw new Error('BG-29 inspector connection must use loopback ws');
  }

  // Node's built-in WebSocket sends User-Agent but no Origin by default.
  // Wrangler's inspector proxy rejects that handshake with HTTP 400.
  return new WebSocket(endpoint, { headers: { Origin: 'http://localhost' } });
}
