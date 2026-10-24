import { describe, expect, it, vi } from 'vitest';

const production = vi.hoisted(() => ({
  cleanupExpiredAttachments: vi.fn().mockResolvedValue(0),
  cleanupExpiredCapacityReservations: vi.fn().mockResolvedValue(0),
  cleanupExpiredHostedBackups: vi.fn().mockResolvedValue(0),
  processPurgeWorkflows: vi.fn().mockResolvedValue(undefined),
  processExtractionJobs: vi.fn().mockResolvedValue(undefined),
  processSourceAcquisitionJobs: vi.fn().mockResolvedValue(undefined),
  processEnrichJobs: vi.fn().mockResolvedValue(undefined),
  processNotionSyncJobs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/attachments/attachment.service', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  cleanupExpiredAttachments: production.cleanupExpiredAttachments,
}));
vi.mock('../src/jobs/ai/capacity.worker', () => ({
  cleanupExpiredCapacityReservations:
    production.cleanupExpiredCapacityReservations,
}));
vi.mock('../src/recovery/backup-cleanup', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  cleanupExpiredHostedBackups: production.cleanupExpiredHostedBackups,
}));
vi.mock('../src/recovery/purge.worker', () => ({
  processPurgeWorkflows: production.processPurgeWorkflows,
}));
vi.mock('../src/jobs/extraction/extraction.worker', () => ({
  processExtractionJobs: production.processExtractionJobs,
}));
vi.mock('../src/jobs/extraction/source-acquisition.worker', () => ({
  processSourceAcquisitionJobs: production.processSourceAcquisitionJobs,
}));
vi.mock('../src/jobs/enrich.worker', () => ({
  processEnrichJobs: production.processEnrichJobs,
}));
vi.mock('../src/sync/sync.worker', () => ({
  processNotionSyncJobs: production.processNotionSyncJobs,
}));

import worker, { handleScheduled } from '../src/index';
import { BACKGROUND_CRON } from '../src/digests/digest-schedule';
import { D1AttachmentRepository } from '../src/attachments/attachment.repository';
import {
  createScheduledHandler,
  type ScheduledHandlerDependencies,
} from '../src/scheduled-handler';

function controller(): ScheduledController {
  return {
    cron: BACKGROUND_CRON,
    scheduledTime: Date.parse('2026-10-18T05:17:37.889Z'),
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

describe('BG-29 MC-01 production handler isolation', () => {
  it('always dispatches the original eight services after staging DI is constructed', async () => {
    vi.clearAllMocks();
    const unexpected = vi.fn().mockResolvedValue(undefined);
    const stages = {
      cleanupAttachments: unexpected,
      cleanupCapacity: unexpected,
      cleanupBackups: unexpected,
      purgeWorkflows: unexpected,
      extractFiles: unexpected,
      acquireUrls: unexpected,
      enrichItems: unexpected,
      syncNotion: unexpected,
      digest: unexpected,
      weeklyBackup: unexpected,
    } satisfies ScheduledHandlerDependencies;

    // This is an independent staging handler; no global override hook exists.
    const stagingHandler = createScheduledHandler(stages);
    expect(stagingHandler).not.toBe(handleScheduled);
    expect(worker.scheduled).toBe(handleScheduled);

    const env = {
      DB: { stagingIsolationSentinel: true },
      ATTACHMENTS: { stagingIsolationSentinel: true },
      NOTION_ACCESS_TOKEN: 'production-test-token-not-used',
      NOTION_DATABASE_ID: 'production-test-db-not-used',
      HOSTED_SCHEDULED_WORK_ENABLED: 'true',
      HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
    } as unknown as Cloudflare.Env;
    const { context, promises } = executionContext();
    await handleScheduled(controller(), env, context);

    expect(context.waitUntil).toHaveBeenCalledTimes(8);
    expect(
      production.cleanupExpiredAttachments,
    ).toHaveBeenCalledExactlyOnceWith(
      expect.any(D1AttachmentRepository),
      env.ATTACHMENTS,
    );
    expect(
      production.cleanupExpiredCapacityReservations,
    ).toHaveBeenCalledExactlyOnceWith(env);
    expect(
      production.cleanupExpiredHostedBackups,
    ).toHaveBeenCalledExactlyOnceWith(env.DB, env.ATTACHMENTS);
    expect(production.processPurgeWorkflows).toHaveBeenCalledExactlyOnceWith(
      env,
    );
    expect(production.processExtractionJobs).toHaveBeenCalledExactlyOnceWith(
      env,
    );
    expect(
      production.processSourceAcquisitionJobs,
    ).toHaveBeenCalledExactlyOnceWith(env);
    expect(production.processEnrichJobs).toHaveBeenCalledExactlyOnceWith(env);
    expect(production.processNotionSyncJobs).toHaveBeenCalledExactlyOnceWith(
      env.DB,
      env.NOTION_ACCESS_TOKEN,
      env.NOTION_DATABASE_ID,
    );
    expect(unexpected).not.toHaveBeenCalled();
    await Promise.all(promises);
  });
});

// BG-31: production entry must never start any dependency (including cleanup,
// queued external sends or digest tasks) until both controls are explicit.
describe('BG-31 production scheduler fail-closed admission', () => {
  it.each([
    [{}, 'missing switches'],
    [{ HOSTED_SCHEDULED_WORK_ENABLED: 'true' }, 'external dispatch absent'],
    [{ HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true' }, 'scheduled work absent'],
    [
      {
        HOSTED_SCHEDULED_WORK_ENABLED: 'TRUE',
        HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
      },
      'malformed scheduled flag',
    ],
    [
      {
        HOSTED_SCHEDULED_WORK_ENABLED: 'true',
        HOSTED_EXTERNAL_DISPATCH_ENABLED: '1',
      },
      'malformed external flag',
    ],
    [
      {
        HOSTED_SCHEDULED_WORK_ENABLED: 'false',
        HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
      },
      'explicitly disabled schedule',
    ],
  ])('does no work for %s (%s)', async (flags) => {
    vi.clearAllMocks();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const env = {
        DB: {},
        ATTACHMENTS: {},
        ...flags,
      } as unknown as Cloudflare.Env;
      const { context, promises } = executionContext();
      await handleScheduled(controller(), env, context);
      expect(context.waitUntil).not.toHaveBeenCalled();
      expect(promises).toEqual([]);
      for (const mock of Object.values(production)) {
        expect(mock).not.toHaveBeenCalled();
      }
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('bg31_hosted_schedule_blocked'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('rejects missing production bindings before starting any services', async () => {
    vi.clearAllMocks();
    const env = {
      HOSTED_SCHEDULED_WORK_ENABLED: 'true',
      HOSTED_EXTERNAL_DISPATCH_ENABLED: 'true',
    } as unknown as Cloudflare.Env;
    const { context } = executionContext();
    await expect(handleScheduled(controller(), env, context)).rejects.toThrow(
      'BG31_PRODUCTION_BINDINGS_MISSING',
    );
    expect(context.waitUntil).not.toHaveBeenCalled();
    for (const mock of Object.values(production)) {
      expect(mock).not.toHaveBeenCalled();
    }
  });
});
