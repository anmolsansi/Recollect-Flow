/** A server hint is an upper bounded delay, not a permission to retry. */
export function parseSourceRetryAfter(
  value: string | null,
  now = new Date(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) && seconds >= 1
      ? Math.min(seconds, 86_400)
      : undefined;
  }
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return undefined;
  const seconds = Math.ceil((timestamp - now.getTime()) / 1000);
  return seconds >= 1 ? Math.min(seconds, 86_400) : undefined;
}
