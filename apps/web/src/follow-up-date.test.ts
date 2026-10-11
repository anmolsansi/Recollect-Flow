import { describe, expect, it } from 'vitest';
import { formatLocalReviewAt, parseLocalReviewAt } from './follow-up-date';

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

describe('BG-19 review time conversion', () => {
  it('returns null for cleared date and rejects malformed input', () => {
    expect(parseLocalReviewAt('')).toBeNull();
    expect(formatLocalReviewAt(null)).toBe('');
    expect(() => parseLocalReviewAt('2026-02-30T09:00')).toThrow();
    expect(() => parseLocalReviewAt('2026-05-01')).toThrow();
  });

  it('round-trips India morning to UTC without UTC digit slicing', () => {
    const previous = env.TZ;
    try {
      env.TZ = 'Asia/Kolkata';
      expect(parseLocalReviewAt('2026-10-11T09:00')).toBe(
        '2026-10-11T03:30:00.000Z',
      );
      expect(formatLocalReviewAt('2026-10-11T03:30:00.000Z')).toBe(
        '2026-10-11T09:00',
      );
    } finally {
      if (previous === undefined) delete env.TZ;
      else env.TZ = previous;
    }
  });

  it('rejects both nonexistent and ambiguous New York DST clock times', () => {
    const previous = env.TZ;
    try {
      env.TZ = 'America/New_York';
      expect(() => parseLocalReviewAt('2026-03-08T02:30')).toThrow(
        /does not exist/,
      );
      expect(() => parseLocalReviewAt('2026-11-01T01:30')).toThrow(
        /occurs twice/,
      );
      expect(parseLocalReviewAt('2026-11-01T03:30')).toBe(
        '2026-11-01T08:30:00.000Z',
      );
    } finally {
      if (previous === undefined) delete env.TZ;
      else env.TZ = previous;
    }
  });
});
