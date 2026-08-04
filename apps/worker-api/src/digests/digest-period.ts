export type DigestType = 'daily' | 'weekly';

export interface DigestPeriod {
  digestType: DigestType;
  timezone: 'Asia/Kolkata';
  start: string;
  end: string;
}

const INDIA_OFFSET_MS = 330 * 60 * 1_000;

function localCalendarDate(timestamp: Date): Date {
  return new Date(timestamp.getTime() + INDIA_OFFSET_MS);
}

function localMidnightAsUtc(year: number, month: number, date: number): number {
  return Date.UTC(year, month, date) - INDIA_OFFSET_MS;
}

export function resolveDigestPeriod(
  digestType: DigestType,
  scheduledAt: Date,
): DigestPeriod {
  if (!Number.isFinite(scheduledAt.getTime())) {
    throw new RangeError('scheduledAt must be a valid date');
  }

  const local = localCalendarDate(scheduledAt);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const date = local.getUTCDate();
  const currentDayStart = localMidnightAsUtc(year, month, date);

  if (digestType === 'daily') {
    return {
      digestType,
      timezone: 'Asia/Kolkata',
      start: new Date(localMidnightAsUtc(year, month, date - 1)).toISOString(),
      end: new Date(currentDayStart).toISOString(),
    };
  }

  const dayOfWeek = local.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentWeekStart = localMidnightAsUtc(
    year,
    month,
    date - daysSinceMonday,
  );

  return {
    digestType,
    timezone: 'Asia/Kolkata',
    start: new Date(
      localMidnightAsUtc(year, month, date - daysSinceMonday - 7),
    ).toISOString(),
    end: new Date(currentWeekStart).toISOString(),
  };
}

export function digestPeriodKey(period: DigestPeriod): string {
  return `${period.digestType}:${period.start}:${period.end}`;
}
