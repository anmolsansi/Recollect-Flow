/** Source-host content is untrusted. Use only static, owner-safe recovery advice. */
const MESSAGES: Record<string,string> = {
  acquired_text: 'Page text was saved.',
  metadata_only: 'Only page metadata was available. Add your own text or a screenshot.',
  unavailable: 'The page is unavailable, but your bookmark is safe. Add your own text or a screenshot.',
  destination_blocked: 'The URL is blocked by the safe-fetch policy. Your bookmark remains saved.',
  policy_blocked: 'This privacy level does not allow automatic website fetching. You may add your own text.',
  login_required: 'This page requires an account or denied access. Add an excerpt instead. Do not share passwords.',
  timeout: 'The website took too long. A retry can help.',
  network_error: 'The website could not be reached. A retry can help.',
  rate_limited: 'The website temporarily limited requests. Try later.',
  server_error: 'The website reported a temporary problem. Try again later.',
  unsupported_content: 'This content type cannot be fetched as page text. Add your own text or upload a supported file.',
  too_large: 'This page exceeds the size limit. Add a shorter excerpt.',
  redirect_limit: 'The page redirected too many times. Add your own text instead.',
  empty: 'No readable page text was found. Add your own excerpt.',
  parse_failed: 'The page could not be read. Add your own text instead.',
};

export function sourceStatusMessage(status: string | null): string {
  return status ? (MESSAGES[status] ?? 'The page result is unavailable.') :
    'No page has been acquired yet. The original URL is still saved.';
}
