import type { DigestType } from './digest-period';

export const BACKGROUND_CRON = '17 * * * *';
export const DAILY_DIGEST_CRON = '0 2 * * *';
export const WEEKLY_DIGEST_CRON = '15 2 * * 1';

export type ScheduledWork = 'background' | DigestType | 'unknown';

export function scheduledWorkForCron(cron: string): ScheduledWork {
  if (cron === BACKGROUND_CRON) return 'background';
  if (cron === DAILY_DIGEST_CRON) return 'daily';
  if (cron === WEEKLY_DIGEST_CRON) return 'weekly';
  return 'unknown';
}
