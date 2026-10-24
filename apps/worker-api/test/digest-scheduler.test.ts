import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DAILY_DIGEST_CRON,
  WEEKLY_DIGEST_CRON,
} from '../src/digests/digest-schedule';

const mocks = vi.hoisted(() => ({
  processScheduledDigest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/digests/digest.worker', () => ({
  processScheduledDigest: mocks.processScheduledDigest,
}));

import { handleScheduled } from '../src/index';

function executionContext() {
  const promises: Promise<unknown>[] = [];
  const context = {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      promises.push(Promise.resolve(promise));
    }),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
  return { context, promises };
}

function controller(cron: string, scheduledTime: string): ScheduledController {
  return {
    cron,
    scheduledTime: new Date(scheduledTime).getTime(),
    noRetry: vi.fn(),
  } as unknown as ScheduledController;
}

function enabledSyntheticEnv(): Cloudflare.Env {
  return {
    DB: {},
    ATTACHMENTS: {},
    HOSTED_SCHEDULED_WORK_ENABLED: 'true',
    HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
  } as unknown as Cloudflare.Env;
}

describe('digest scheduled handler', () => {
  beforeEach(() => {
    mocks.processScheduledDigest.mockClear();
  });

  it.each([
    [DAILY_DIGEST_CRON, 'daily'],
    [WEEKLY_DIGEST_CRON, 'weekly'],
  ] as const)(
    'invokes only the %s digest job for its explicit cron',
    async (cron, type) => {
      const { context, promises } = executionContext();
      const scheduledAt = '2026-08-03T02:00:00.000Z';

      await handleScheduled(
        controller(cron, scheduledAt),
        enabledSyntheticEnv(),
        context,
      );
      await Promise.all(promises);

      expect(context.waitUntil).toHaveBeenCalledOnce();
      expect(mocks.processScheduledDigest).toHaveBeenCalledOnce();
      expect(mocks.processScheduledDigest).toHaveBeenCalledWith(
        expect.anything(),
        type,
        new Date(scheduledAt),
      );
    },
  );

  it('does not run digest work for an unknown cron', async () => {
    const { context } = executionContext();
    await handleScheduled(
      controller('0 * * * *', '2026-08-03T02:00:00.000Z'),
      enabledSyntheticEnv(),
      context,
    );

    expect(context.waitUntil).not.toHaveBeenCalled();
    expect(mocks.processScheduledDigest).not.toHaveBeenCalled();
  });
});
