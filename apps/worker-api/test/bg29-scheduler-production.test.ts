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
  ...(await importOriginal<
    typeof import('../src/attachments/attachment.service')
  >()),
  cleanupExpiredAttachments: production.cleanupExpiredAttachments,
}));
vi.mock('../src/jobs/ai/capacity.worker', () => ({
  cleanupExpiredCapacityReservations:
    production.cleanupExpiredCapacityReservations,
}));
vi.mock('../src/recovery/backup-cleanup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/recovery/backup-cleanup')>()),
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
