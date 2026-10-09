import { describe, expect, it } from 'vitest';
import { parseSourceRetryAfter } from '../src/jobs/extraction/source-retry-after';
import {
  canManuallyRetrySource,
  sourceRecoveryAdvice,
} from '../src/jobs/extraction/source-recovery.policy';

describe('BG-11 safe retry outcomes', () => {
  const now = new Date('2026-10-09T12:00:00.000Z');

  it('honors bounded delta seconds and HTTP-date retry hints', () => {
    expect(parseSourceRetryAfter('120', now)).toBe(120);
    expect(parseSourceRetryAfter('Fri, 09 Oct 2026 12:01:30 GMT', now)).toBe(
      90,
    );
    expect(parseSourceRetryAfter('1', now)).toBe(1);
  });

  it('rejects unbounded, expired, malformed and zero retry hints', () => {
    expect(parseSourceRetryAfter('0', now)).toBeUndefined();
    expect(parseSourceRetryAfter('9999999999', now)).toBe(86_400);
    expect(
      parseSourceRetryAfter('Thu, 08 Oct 2026 12:00:00 GMT', now),
    ).toBeUndefined();
    expect(parseSourceRetryAfter('not-an-http-date', now)).toBeUndefined();
    expect(parseSourceRetryAfter(null, now)).toBeUndefined();
  });

  it('only retries legacy omissions and transient failures', () => {
    for (const status of [
      'timeout',
      'network_error',
      'rate_limited',
      'server_error',
    ] as const) {
      expect(canManuallyRetrySource(status)).toBe(true);
      expect(sourceRecoveryAdvice(status).nextAction).toBe('retry');
    }
    expect(canManuallyRetrySource(null)).toBe(true);
    for (const status of [
      'login_required',
      'destination_blocked',
      'policy_blocked',
      'unavailable',
      'unsupported_content',
      'acquired_text',
    ] as const) {
      expect(canManuallyRetrySource(status)).toBe(false);
      expect(sourceRecoveryAdvice(status).nextAction).not.toBe('retry');
    }
  });

  it('never repeats the original URL or site body in recovery advice', () => {
    const advice = sourceRecoveryAdvice('login_required');
    expect(advice.message).toContain('password');
    expect(advice.message).not.toContain('https://');
  });
});
