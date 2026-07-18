const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'si',
]);

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(key)) {
      url.searchParams.delete(key);
    }
  }

  url.searchParams.sort();
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
  return url.toString();
}
