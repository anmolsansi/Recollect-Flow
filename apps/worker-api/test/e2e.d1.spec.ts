import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, beforeAll } from 'vitest';
import { EnrichService } from '../src/jobs/enrich.service';
import type { JobRecord } from '../src/jobs/job.service';
import * as fs from 'fs';

describe('E2E Evidence Generation', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!, '../../migrations');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).AI_PROVIDERS_ENABLED = 'openrouter,cloudflare';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).AI_PROVIDER_IMPLEMENTATIONS = JSON.stringify({
      openrouter: 'MockAiAdapter',
      cloudflare: 'MockAiAdapter'
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env as any).MOCK_AI_ENABLED = 'true';
  });

  it('runs an e2e enrichment and saves evidence', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichService = new EnrichService(env as any, env.DB);

    const itemId = 'e2e-item-evidence-1';
    const jobId = 'e2e-job-evidence-1';
    
    await env.DB.prepare(
      `INSERT INTO items (id, idempotency_key, source_url, source_app, source_type, raw_text, privacy_level, processing_status, captured_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(itemId, 'key-e2e', 'https://example.com', 'web', 'url', 'Extract this!', 'public', 'pending', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();

    await env.DB.prepare(
      `INSERT INTO processing_jobs (id, item_id, job_type, status, privacy_level_snapshot, provider_eligibility, attempts, lease_owner, created_at, updated_at, available_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(jobId, itemId, 'enrich', 'processing', 'public', 'cloudflare', 1, 'local-owner', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();

    const rawJob = await env.DB.prepare('SELECT * FROM processing_jobs WHERE id = ?').bind(jobId).first();
    const jobRecord = {
      id: rawJob.id,
      itemId: rawJob.item_id,
      jobType: rawJob.job_type,
      status: rawJob.status,
      privacyLevelSnapshot: rawJob.privacy_level_snapshot,
      providerEligibility: rawJob.provider_eligibility,
      attempts: rawJob.attempts,
    } as unknown as JobRecord;

    await enrichService.processEnrichmentJob(jobRecord, 'local-owner');

    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(itemId).first();
    const job = await env.DB.prepare('SELECT * FROM processing_jobs WHERE id = ?').bind(jobId).first();
    const usage = await env.DB.prepare('SELECT * FROM provider_usage WHERE item_id = ?').bind(itemId).first();

    const evidence = `
# End-to-End Enrichment Evidence

## Item
\`\`\`json
${JSON.stringify(item, null, 2)}
\`\`\`

## Job
\`\`\`json
${JSON.stringify(job, null, 2)}
\`\`\`

## Provider Usage
\`\`\`json
${JSON.stringify(usage, null, 2)}
\`\`\`
    `;
    
    console.log(evidence);
  });
});
