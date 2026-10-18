import { describe, expect, it, vi } from 'vitest';

import {
  BACKGROUND_CRON,
  DAILY_DIGEST_CRON,
  WEEKLY_DIGEST_CRON,
} from '../src/digests/digest-schedule';
import {
  createScheduledHandler,
  type ScheduledHandlerDependencies,
} from '../src/scheduled-handler';

function controller(cron: string): ScheduledController {
  return {
    cron,
    scheduledTime: Date.parse('2026-10-18T02:17:37.889Z'),
    noRetry: vi.fn(),
  } as unknown as ScheduledController;
}

function executionContext() {
  const promises: Promise<unknown>[] = [];
  const context = {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      promises.push(promise);
    }),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
  return { context, promises };
}

function fixture() {
  const invoked: string[] = [];
  const release: Array<() => void> = [];
  const stage = (name: string) =>
    vi.fn(() => {
      invoked.push(name);
      return new Promise<void>((resolve) => {
        release.push(resolve);
      });
    });
  const dependencies = {
    cleanupAttachments: stage('cleanupAttachments'),
    cleanupCapacity: stage('cleanupCapacity'),
    cleanupBackups: stage('cleanupBackups'),
    purgeWorkflows: stage('purgeWorkflows'),
    extractFiles: stage('extractFiles'),
    acquireUrls: stage('acquireUrls'),
    enrichItems: stage('enrichItems'),
    syncNotion: stage('syncNotion'),
    digest: vi.fn(async () => {}),
    weeklyBackup: vi.fn(async () => {}),
  } satisfies ScheduledHandlerDependencies;
  return { dependencies, invoked, release };
}

describe('BG-29 MC-01 scheduler dependency injection', () => {
  it('starts all eight original background jobs without waiting for earlier stages', async () => {
    const { dependencies, invoked, release } = fixture();
    const { context, promises } = executionContext();
    const env = { DB: {}, ATTACHMENTS: {} } as Cloudflare.Env;
    const handler = createScheduledHandler(dependencies);

    // None of the stage promises resolve before the handler returns.
    await handler(controller(BACKGROUND_CRON), env, context);

    expect(invoked).toEqual([
      'cleanupAttachments',
      'cleanupCapacity',
      'cleanupBackups',
      'purgeWorkflows',
      'extractFiles',
      'acquireUrls',
      'enrichItems',
      'syncNotion',
    ]);
    expect(context.waitUntil).toHaveBeenCalledTimes(8);
    expect(promises).toHaveLength(8);
    for (const job of [
      dependencies.extractFiles,
      dependencies.acquireUrls,
      dependencies.enrichItems,
      dependencies.syncNotion,
    ]) {
      expect(job).toHaveBeenCalledExactlyOnceWith(env);
    }
    expect(dependencies.digest).not.toHaveBeenCalled();
    expect(dependencies.weeklyBackup).not.toHaveBeenCalled();
    for (const resolve of release) resolve();
    await Promise.all(promises);
  });

  it('captures dependencies at construction and isolates two scheduler instances', async () => {
    const first = fixture();
    const second = fixture();
    const staging = createScheduledHandler(first.dependencies);
    const unrelated = createScheduledHandler(second.dependencies);
    const originallyInjected = first.dependencies.acquireUrls;
    first.dependencies.acquireUrls = vi.fn(async () => {
      throw new Error('mutable injection must not run');
    });
    const firstCtx = executionContext();
    await staging(
      controller(BACKGROUND_CRON),
      {} as Cloudflare.Env,
      firstCtx.context,
    );
    expect(originallyInjected).toHaveBeenCalledOnce();
    expect(first.dependencies.acquireUrls).not.toHaveBeenCalled();
    expect(second.invoked).toEqual([]);
    const secondCtx = executionContext();
    await unrelated(
      controller(BACKGROUND_CRON),
      {} as Cloudflare.Env,
      secondCtx.context,
    );
    expect(second.invoked).toHaveLength(8);
    for (const done of [...first.release, ...second.release]) done();
    await Promise.all([...firstCtx.promises, ...secondCtx.promises]);
  });

  it.each([
    [DAILY_DIGEST_CRON, 'daily'],
    [WEEKLY_DIGEST_CRON, 'weekly'],
  ] as const)('routes %s only to its digest task', async (cron, type) => {
    const fixtureData = fixture();
    const { context, promises } = executionContext();
    await createScheduledHandler(fixtureData.dependencies)(
      controller(cron),
      {} as Cloudflare.Env,
      context,
    );
    expect(fixtureData.invoked).toEqual([]);
    expect(fixtureData.dependencies.digest).toHaveBeenCalledOnce();
    expect(fixtureData.dependencies.digest).toHaveBeenCalledWith(
      expect.anything(),
      type,
      new Date('2026-10-18T02:17:37.889Z'),
    );
    expect(fixtureData.dependencies.weeklyBackup).not.toHaveBeenCalled();
    expect(context.waitUntil).toHaveBeenCalledOnce();
    await Promise.all(promises);
  });

  it('keeps weekly backup opt-in and never runs it for daily Cron', async () => {
    const { dependencies, invoked } = fixture();
    const handler = createScheduledHandler(dependencies);
    const env = {
      HOSTED_BACKUP_AUTOCREATE_ENABLED: 'true',
    } as unknown as Cloudflare.Env;
    const weekly = executionContext();
    await handler(controller(WEEKLY_DIGEST_CRON), env, weekly.context);
    expect(weekly.context.waitUntil).toHaveBeenCalledTimes(2);
    expect(dependencies.weeklyBackup).toHaveBeenCalledOnce();
    const daily = executionContext();
    await handler(controller(DAILY_DIGEST_CRON), env, daily.context);
    expect(daily.context.waitUntil).toHaveBeenCalledOnce();
    expect(dependencies.weeklyBackup).toHaveBeenCalledOnce();
    expect(invoked).toEqual([]);
    await Promise.all([...weekly.promises, ...daily.promises]);
  });

  it('runs no services for an unrecognized Cron', async () => {
    const { dependencies, invoked } = fixture();
    const { context } = executionContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await createScheduledHandler(dependencies)(
        controller('0 * * * *'),
        {} as Cloudflare.Env,
        context,
      );
      expect(context.waitUntil).not.toHaveBeenCalled();
      expect(invoked).toEqual([]);
      expect(dependencies.digest).not.toHaveBeenCalled();
      expect(dependencies.weeklyBackup).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('scheduled_cron_unrecognized'),
      );
    } finally {
      warn.mockRestore();
    }
  });
});
