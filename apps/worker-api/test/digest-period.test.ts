import { describe, expect, it } from 'vitest';

import { resolveDigestPeriod } from '../src/digests/digest-period';
import {
  BACKGROUND_CRON,
  DAILY_DIGEST_CRON,
  WEEKLY_DIGEST_CRON,
  scheduledWorkForCron,
} from '../src/digests/digest-schedule';

describe('Asia/Kolkata digest periods', () => {
  it('uses the previous completed calendar day before and after IST midnight', () => {
    expect(
      resolveDigestPeriod('daily', new Date('2026-08-03T18:29:59Z')),
    ).toEqual({
      digestType: 'daily',
      timezone: 'Asia/Kolkata',
      start: '2026-08-01T18:30:00.000Z',
      end: '2026-08-02T18:30:00.000Z',
    });
    expect(
      resolveDigestPeriod('daily', new Date('2026-08-03T18:30:01Z')),
    ).toEqual({
      digestType: 'daily',
      timezone: 'Asia/Kolkata',
      start: '2026-08-02T18:30:00.000Z',
      end: '2026-08-03T18:30:00.000Z',
    });
  });

  it('handles month, year and leap-day transitions without duration subtraction', () => {
    expect(
      resolveDigestPeriod('daily', new Date('2027-01-01T02:00:00Z')),
    ).toMatchObject({
      start: '2026-12-30T18:30:00.000Z',
      end: '2026-12-31T18:30:00.000Z',
    });
    expect(
      resolveDigestPeriod('daily', new Date('2028-03-01T02:00:00Z')),
    ).toMatchObject({
      start: '2028-02-28T18:30:00.000Z',
      end: '2028-02-29T18:30:00.000Z',
    });
  });

  it('uses the previous completed Monday-to-Monday week', () => {
    expect(
      resolveDigestPeriod('weekly', new Date('2026-08-03T02:15:00Z')),
    ).toEqual({
      digestType: 'weekly',
      timezone: 'Asia/Kolkata',
      start: '2026-07-26T18:30:00.000Z',
      end: '2026-08-02T18:30:00.000Z',
    });
    expect(
      resolveDigestPeriod('weekly', new Date('2026-08-02T18:29:59Z')),
    ).toEqual({
      digestType: 'weekly',
      timezone: 'Asia/Kolkata',
      start: '2026-07-19T18:30:00.000Z',
      end: '2026-07-26T18:30:00.000Z',
    });
  });
});

describe('scheduled cron routing', () => {
  it('routes only explicit cron expressions', () => {
    expect(scheduledWorkForCron(BACKGROUND_CRON)).toBe('background');
    expect(scheduledWorkForCron(DAILY_DIGEST_CRON)).toBe('daily');
    expect(scheduledWorkForCron(WEEKLY_DIGEST_CRON)).toBe('weekly');
    expect(scheduledWorkForCron('0 * * * *')).toBe('unknown');
  });
});
