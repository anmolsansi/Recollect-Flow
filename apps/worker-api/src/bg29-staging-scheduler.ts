import type { Env } from './env';
import { BACKGROUND_CRON } from './digests/digest-schedule';
import { createScheduledHandler } from './scheduled-handler';
import { createBg29StagingSourceFetcher } from './jobs/extraction/bg29-staging-source';
import { processSourceAcquisitionJobs } from './jobs/extraction/source-acquisition.worker';
import { processExtractionJobs } from './jobs/extraction/extraction.worker';
import { createBg29StagingEnrichmentHarness } from './jobs/ai/bg29-staging-enrichment';
import { createBg29StagingNotionHarness } from './sync/bg29-staging-notion';
import { createBg29DurableNotionStore } from './sync/bg29-staging-durable-notion';

/**
 * Step 4 / BG-29.078: staging-only scheduled pipeline.
 *
 * A deliberately closed set of bindings prevents accidentally passing any
 * production secrets, live Workers AI bindings or notification credentials
 * into the acceptance Worker. There is no production fallback and no direct
 * outbound fetch from this module. Only the existing offline URL transport,
 * mock AI adapters and offline Notion transport are allowed to run.
 *
 * This is NOT a global network firewall. A future change adding a live
 * transport to this file must fail source review and negative CI tests.
 */
const STAGING_BINDINGS = new Set([
  'DB',
  'ATTACHMENTS',
  'MAX_ATTACHMENT_BYTES',
  'UPLOAD_TTL_SECONDS',
  'MOCK_AI_ENABLED',
  'AI_PROVIDER_DEFAULT',
  'AI_PROVIDERS_ENABLED',
  'AI_PROVIDER_IMPLEMENTATIONS',
  'DIGEST_AI_ENABLED',
  'HOSTED_BACKUP_AUTOCREATE_ENABLED',
  'WEB_INBOX_BASE_URL',
]);

function deny(reason: string): never {
  throw new Error(`BG29_STAGING_EGRESS_DENIED: ${reason}`);
}

export function assertBg29StagingBindings(env: Cloudflare.Env): void {
  const values = env as unknown as Record<string, unknown>;
  if (!values || typeof values !== 'object') deny('missing environment');

  // Cloudflare bindings must be a plain own-property record, never an
  // inherited object or a getter that could execute code during inspection.
  const prototype = Object.getPrototypeOf(values);
  if (prototype !== Object.prototype && prototype !== null)
    deny('inherited staging binding');
  for (const key of Reflect.ownKeys(values)) {
    if (typeof key !== 'string' || !STAGING_BINDINGS.has(key))
      deny('unexpected binding');
    const descriptor = Object.getOwnPropertyDescriptor(values, key);
    if (!descriptor || !('value' in descriptor))
      deny('staging binding accessor forbidden');
  }
  if (!values.DB) deny('staging D1 binding required');
  if (values.MOCK_AI_ENABLED !== 'true') deny('mock AI must be enabled');
  if (values.DIGEST_AI_ENABLED !== 'false') deny('digest AI must be disabled');
  if (values.HOSTED_BACKUP_AUTOCREATE_ENABLED !== 'false')
    deny('hosted backup must be disabled');

  if (
    values.AI_PROVIDER_DEFAULT !== 'openrouter' ||
    values.AI_PROVIDERS_ENABLED !== 'openrouter'
  )
    deny('unexpected AI provider selection');

  let implementations: unknown;
  try {
    implementations = JSON.parse(String(values.AI_PROVIDER_IMPLEMENTATIONS));
  } catch {
    deny('invalid AI implementation mapping');
  }
  if (
    !implementations ||
    typeof implementations !== 'object' ||
    Array.isArray(implementations) ||
    Object.keys(implementations).length !== 1 ||
    (implementations as Record<string, unknown>).openrouter !== 'mock'
  )
    deny('all enabled AI implementations must be mock');

  if (values.WEB_INBOX_BASE_URL !== 'https://invalid.test')
    deny('inbox URL must be an unusable sentinel');

  if (
    values.ATTACHMENTS !== undefined &&
    (typeof values.ATTACHMENTS !== 'object' || values.ATTACHMENTS === null)
  )
    deny('invalid isolated R2 binding');

  if (
    values.MAX_ATTACHMENT_BYTES !== '25000000' ||
    values.UPLOAD_TTL_SECONDS !== '3600'
  )
    deny('unexpected attachment safety limits');
}

/**
 * Creates the only approved staging dependencies. The normal production
 * scheduled handler (src/index.ts) is never imported or modified.
 *
 * URL acquisition uses the real job worker with an offline exact-URL
 * transport. Enrichment uses the real worker with mock adapters only.
 * Notion uses the real sync worker with a durable D1-backed, tokenless transport.
 * Notifications, hosted backups, cleanup and purge are deliberately inert.
 *
 * R2/PDF extraction executes the real worker only for explicitly seeded
 * synthetic PDF originals. Missing/foreign R2 bindings and unexpected source
 * paths fail closed rather than silently recording extracted fixtures.
 */
export interface Bg29StagingFaultPlan {
  url503For?: string;
  notion429For?: string;
  /** Test-only clock; hosted Worker always uses wall time. */
  now?: () => Date;
}

export function createBg29StagingScheduler(
  environment: Cloudflare.Env,
  faults: Bg29StagingFaultPlan = {},
) {
  assertBg29StagingBindings(environment);
  const db = environment.DB;
  const ledger = createBg29DurableNotionStore(db);
  const source = createBg29StagingSourceFetcher({
    failOnceFor: faults.url503For,
    claimOnce: (url) => ledger.claimFaultOnce(`url503:${url}`),
  });
  const ai = createBg29StagingEnrichmentHarness(db);
  const notion = createBg29StagingNotionHarness({
    db,
    rateLimitOnceFor: faults.notion429For,
  });
  const isolatedEnv = Object.freeze({ DB: db }) as unknown as Env;
  // Never spread the caller's bindings: this is the complete R2/PDF-only
  // environment that the actual ExtractionService is allowed to see.
  const extractionEnv = Object.freeze({
    DB: db,
    ATTACHMENTS: environment.ATTACHMENTS,
    MAX_ATTACHMENT_BYTES: '25000000',
    MOCK_AI_ENABLED: 'true',
    AI_PROVIDER_DEFAULT: 'openrouter',
    AI_PROVIDERS_ENABLED: 'openrouter',
    AI_PROVIDER_IMPLEMENTATIONS: '{"openrouter":"mock"}',
  }) as unknown as Env;

  const handler = createScheduledHandler({
    cleanupAttachments: async () => {},
    cleanupCapacity: async () => {},
    cleanupBackups: async () => {},
    purgeWorkflows: async () => {},
    extractFiles: async () => {
      const outstanding = await db
        .prepare(
          `SELECT COUNT(*) AS total FROM processing_jobs
           WHERE job_type = 'extract' AND status IN ('pending', 'processing')`,
        )
        .first<{ total: number }>();
      if ((outstanding?.total ?? 0) === 0) return;
      if (
        !environment.ATTACHMENTS ||
        typeof environment.ATTACHMENTS.get !== 'function'
      ) {
        deny('R2 extraction not configured; do not claim files processed');
      }

      const forbidden = await db
        .prepare(
          `SELECT COUNT(*) AS total FROM processing_jobs AS job
           WHERE job.job_type = 'extract'
             AND job.status IN ('pending', 'processing')
             AND (
               job.item_id NOT LIKE 'bg29-078-file-%'
               OR NOT EXISTS (
                 SELECT 1 FROM attachments AS attachment
                 WHERE attachment.item_id = job.item_id
                   AND attachment.status = 'linked'
                   AND attachment.object_key LIKE 'bg29-078/%'
                   AND attachment.declared_content_type = 'application/pdf'
                   AND attachment.detected_content_type = 'application/pdf'
               )
             )`,
        )
        .first<{ total: number }>();
      if ((forbidden?.total ?? 0) !== 0) {
        deny('unapproved R2 PDF source or missing verified attachment');
      }
      await processExtractionJobs(extractionEnv);
    },
    acquireUrls: () =>
      processSourceAcquisitionJobs(isolatedEnv, {
        fetcher: source,
        now: faults.now,
      }),
    enrichItems: () => ai.run(),
    syncNotion: () => notion.run(db, { now: faults.now }),
    digest: async () => deny('digest and notification jobs disabled'),
    weeklyBackup: async () => deny('hosted backup disabled'),
  });

  return Object.freeze({
    scheduled: async (
      controller: ScheduledController,
      env: Cloudflare.Env,
      ctx: ExecutionContext,
    ): Promise<void> => {
      // Both checks happen before any service schedules a waitUntil promise.
      if (controller.cron !== BACKGROUND_CRON) deny('unapproved Cron schedule');
      assertBg29StagingBindings(env);
      if (env.DB !== db) deny('staging D1 binding changed');
      return handler(controller, env, ctx);
    },
    notionRequests: () => notion.requestsAsync(),
    notionPages: () => notion.pagesAsync(),
  });
}
