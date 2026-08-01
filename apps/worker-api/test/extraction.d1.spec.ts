import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { JobService } from '../src/jobs/job.service';

describe('Extraction Pipeline (D1 Integration)', () => {
  let jobService: JobService;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!, '../../migrations');
  });

  beforeEach(async () => {
    const tables = [
      'extraction_records',
      'processing_job_results',
      'processing_jobs',
      'audit_events',
      'provider_usage',
      'item_field_overrides',
      'sync_attempts',
      'attachments',
      'items',
    ];
    for (const table of tables) {
      await env.DB.prepare(`DELETE FROM ${table}`).run();
    }
    jobService = new JobService(env.DB);
  });

  const insertItemAndJob = async (id: string) => {
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app,
        title, summary, raw_text, user_note, project, topics_json,
        lifecycle_status, processing_status, privacy_level, importance,
        captured_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `,
    )
      .bind(
        id,
        id,
        'file',
        'web',
        null,
        null,
        null,
        null,
        null,
        '[]',
        'Inbox',
        'pending',
        'public',
        5,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    // Insert dummy attachment to satisfy foreign key for extraction_records
    await env.DB.prepare(
      `
      INSERT INTO attachments (
        id, item_id, object_key, size_bytes, declared_content_type, file_name, status, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        `att-${id.split('-')[1]}`,
        id,
        'dummy-key',
        1000,
        'application/pdf',
        'dummy.pdf',
        'linked',
        new Date(Date.now() + 60000).toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    await env.DB.prepare(
      `
      INSERT INTO processing_jobs (
        id, item_id, job_type, status, available_at, attempts, created_at, updated_at,
        provider_eligibility, privacy_level_snapshot, hosted_processing_consent, input_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        `job-${id}`,
        id,
        'extract',
        'pending',
        new Date().toISOString(),
        0,
        new Date().toISOString(),
        new Date().toISOString(),
        'openrouter',
        'public',
        0,
        'input-hash',
      )
      .run();
  };

  it('leases extract job and completes successfully, chaining enrich', async () => {
    await insertItemAndJob('item-1');

    const ownerId = 'owner-1';
    const jobs = await jobService.leaseProcessingJobs('extract', ownerId, 5, 1);
    expect(jobs.length).toBe(1);
    expect(jobs[0]!.id).toBe('job-item-1');

    const results = [
      {
        attachmentId: 'att-1',
        extractorName: 'pdfjs-dist',
        extractorVersion: '1.0',
        extractedText: 'Extracted PDF text',
        pageCount: 1,
        completeness: 'complete',
        coverage: 'full',
      },
    ];

    await jobService.submitExtractionResults(
      jobs[0]!.id,
      ownerId,
      'item-1',
      results,
      true,
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('job-item-1')
      .first();
    expect(job).toBeDefined();
    expect(job!.status).toBe('complete');

    const enrichJob = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE item_id = ? AND job_type = ?',
    )
      .bind('item-1', 'enrich')
      .first();
    expect(enrichJob).toBeDefined();
    expect(enrichJob?.status).toBe('pending');

    const records = await env.DB.prepare(
      'SELECT * FROM extraction_records WHERE item_id = ?',
    )
      .bind('item-1')
      .all();
    expect(records.results.length).toBe(1);
    expect(records.results[0]!.extracted_text).toBe('Extracted PDF text');
  });

  it('handles unsupported extraction outcome safely without enrich if no usable text', async () => {
    await insertItemAndJob('item-2');

    const ownerId = 'owner-2';
    const jobs = await jobService.leaseProcessingJobs('extract', ownerId, 5, 1);

    const results = [
      {
        attachmentId: 'att-2',
        extractorName: 'pdfjs-dist',
        extractorVersion: '1.0',
        completeness: 'unsupported',
        coverage: 'none',
        errorCode: 'PDF_ENCRYPTED',
      },
    ];

    await jobService.submitExtractionResults(
      jobs[0]!.id,
      ownerId,
      'item-2',
      results,
      false,
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('job-item-2')
      .first();
    expect(job).toBeDefined();
    expect(job!.status).toBe('complete');

    // Should NOT enqueue enrich because there was no usable text and no existing raw_text/user_note
    const enrichJob = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE item_id = ? AND job_type = ?',
    )
      .bind('item-2', 'enrich')
      .first();
    expect(enrichJob).toBeNull();
  });
});
