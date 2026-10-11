/** Browser-local review dates. Never slice UTC text into a datetime-local input. */
export function formatLocalReviewAt(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

/**
 * Convert a wall-clock selection to an absolute instant.
 * Reject nonexistent and ambiguous local times rather than silently choosing
 * an offset during DST transitions. The user can select another time.
 */
export function parseLocalReviewAt(local: string): string | null {
  if (!local) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error('Enter a valid local review date and time.');
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year < 1000 || year > 9999) {
    throw new Error('Enter a valid review year.');
  }
  const selected = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (formatLocalReviewAt(selected.toISOString()) !== local) {
    throw new Error('This local time does not exist. Choose another time.');
  }
  // A repeated wall-clock hour maps to two UTC instants. Look up to 3 hours
  // either side, including half-hour and quarter-hour offset transitions.
  for (let offset = -180; offset <= 180; offset += 15) {
    if (offset === 0) continue;
    const alternative = new Date(selected.getTime() + offset * 60_000);
    if (formatLocalReviewAt(alternative.toISOString()) === local) {
      throw new Error('This local time occurs twice. Choose another time.');
    }
  }
  return selected.toISOString();
}
