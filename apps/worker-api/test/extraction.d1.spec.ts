import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { JobService } from '../src/jobs/job.service';
import type { AttachmentExtractionResult } from '../src/jobs/extraction/extraction.types';
import { processExtractionJobs } from '../src/jobs/extraction/extraction.worker';
import { createApp } from '../src/app';
import { POLICY_VERSION } from '../src/policy/policy.service';

function arrayBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildPdf(text: string): ArrayBuffer {
  const escaped = text
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
  const stream = `BT /F1 12 Tf 72 100 Td (${escaped}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return arrayBuffer(pdf);
}

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
        id.replace('00000000', '22222222'),
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
        provider_eligibility, privacy_level_snapshot, policy_version,
        credential_source, hosted_processing_consent,
        zero_data_retention_required, data_collection_denied, input_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id.replace('00000000', '11111111'),
        id,
        'extract',
        'pending',
        new Date().toISOString(),
        0,
        new Date().toISOString(),
        new Date().toISOString(),
        'openrouter',
        'public',
        POLICY_VERSION,
        'app_managed',
        0,
        1,
        1,
        'input-hash',
      )
      .run();
  };

  it('leases extract job and completes successfully, chaining enrich', async () => {
    await insertItemAndJob('00000000-0000-0000-0000-000000000001');

    const ownerId = 'owner-1';
    const jobs = await jobService.leaseProcessingJobs('extract', ownerId, 5, 1);
    expect(jobs.length).toBe(1);
    expect(jobs[0]!.id).toBe('11111111-0000-0000-0000-000000000001');

    const results: AttachmentExtractionResult[] = [
      {
        attachmentId: '22222222-0000-0000-0000-000000000001',
        extractorName: 'unpdf',
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
      '00000000-0000-0000-0000-000000000001',
      results,
      true,
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('11111111-0000-0000-0000-000000000001')
      .first();
    expect(job).toBeDefined();
    expect(job!.status).toBe('complete');

    const enrichJob = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE item_id = ? AND job_type = ?',
    )
      .bind('00000000-0000-0000-0000-000000000001', 'enrich')
      .first();
    expect(enrichJob).toBeDefined();
    expect(enrichJob?.status).toBe('pending');
    expect(enrichJob).toMatchObject({
      privacy_level_snapshot: 'public',
      provider_eligibility: 'openrouter',
      policy_version: POLICY_VERSION,
      credential_source: 'app_managed',
      hosted_processing_consent: 0,
      zero_data_retention_required: 1,
      data_collection_denied: 1,
    });

    const records = await env.DB.prepare(
      'SELECT * FROM extraction_records WHERE item_id = ?',
    )
      .bind('00000000-0000-0000-0000-000000000001')
      .all();
    expect(records.results.length).toBe(1);
    expect(records.results[0]!.extracted_text).toBe('Extracted PDF text');
  });

  it('handles unsupported extraction outcome safely without enrich if no usable text', async () => {
    await insertItemAndJob('00000000-0000-0000-0000-000000000002');

    const ownerId = 'owner-2';
    const jobs = await jobService.leaseProcessingJobs('extract', ownerId, 5, 1);

    const results: AttachmentExtractionResult[] = [
      {
        attachmentId: '22222222-0000-0000-0000-000000000002',
        extractorName: 'unpdf',
        extractorVersion: '1.0',
        completeness: 'unsupported',
        coverage: 'none',
        errorCode: 'PDF_ENCRYPTED',
      },
    ];

    await jobService.submitExtractionResults(
      jobs[0]!.id,
      ownerId,
      '00000000-0000-0000-0000-000000000002',
      results,
      false,
    );

    const job = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE id = ?',
    )
      .bind('11111111-0000-0000-0000-000000000002')
      .first();
    expect(job).toBeDefined();
    expect(job!.status).toBe('complete');

    // Should NOT enqueue enrich because there was no usable text and no existing raw_text/user_note
    const enrichJob = await env.DB.prepare(
      'SELECT * FROM processing_jobs WHERE item_id = ? AND job_type = ?',
    )
      .bind('00000000-0000-0000-0000-000000000002', 'enrich')
      .first();
    expect(enrichJob).toBeNull();

    const response = await createApp().request(
      '/api/v1/items/00000000-0000-0000-0000-000000000002',
      { headers: { Authorization: 'Bearer test-admin-token' } },
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json<{
      data: {
        extraction: { attachment_id: string; completeness: string } | null;
        extractions: Array<{
          attachment_id: string;
          completeness: string;
          error_code: string | null;
        }>;
      };
    }>();
    expect(body.data.extraction).toMatchObject({
      attachment_id: '22222222-0000-0000-0000-000000000002',
      completeness: 'unsupported',
    });
    expect(body.data.extractions).toEqual([
      expect.objectContaining({
        attachment_id: '22222222-0000-0000-0000-000000000002',
        completeness: 'unsupported',
        error_code: 'PDF_ENCRYPTED',
      }),
    ]);
  });

  it('rejects stale submissions without writing extraction records', async () => {
    await insertItemAndJob('item-stale');
    const ownerId = 'owner-stale';
    const [job] = await jobService.leaseProcessingJobs(
      'extract',
      ownerId,
      5,
      1,
    );
    expect(job).toBeDefined();

    await env.DB.prepare(
      `UPDATE processing_jobs
       SET lease_owner = 'replacement-owner'
       WHERE id = ?1`,
    )
      .bind(job!.id)
      .run();

    const accepted = await jobService.submitExtractionResults(
      job!.id,
      ownerId,
      'item-stale',
      [
        {
          attachmentId: 'att-stale',
          extractorName: 'unpdf',
          extractorVersion: '1.0',
          extractedText: 'stale text',
          completeness: 'complete',
          coverage: 'full',
        },
      ],
      true,
    );

    expect(accepted).toBe(false);
    expect(
      await env.DB.prepare(
        `SELECT id FROM extraction_records WHERE item_id = 'item-stale'`,
      ).first(),
    ).toBeNull();
    expect(
      await env.DB.prepare(
        `SELECT id FROM processing_jobs
         WHERE item_id = 'item-stale' AND job_type = 'enrich'`,
      ).first(),
    ).toBeNull();
  });

  it('rejects extraction results submitted after the lease expires', async () => {
    await insertItemAndJob('item-expired');
    const ownerId = 'owner-expired';
    const [job] = await jobService.leaseProcessingJobs(
      'extract',
      ownerId,
      5,
      1,
    );
    await env.DB.prepare(
      `UPDATE processing_jobs SET lease_expires_at = ?1 WHERE id = ?2`,
    )
      .bind(new Date(Date.now() - 1_000).toISOString(), job!.id)
      .run();

    const accepted = await jobService.submitExtractionResults(
      job!.id,
      ownerId,
      'item-expired',
      [
        {
          attachmentId: 'att-expired',
          extractorName: 'unpdf',
          extractorVersion: '1.0',
          extractedText: 'expired text',
          completeness: 'complete',
          coverage: 'full',
        },
      ],
      true,
    );

    expect(accepted).toBe(false);
    expect(
      await env.DB.prepare(
        `SELECT id FROM extraction_records WHERE item_id = 'item-expired'`,
      ).first(),
    ).toBeNull();
  });

  it('returns every attachment extraction while preserving the legacy singular field', async () => {
    await insertItemAndJob('00000000-0000-0000-0000-000000000003');
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO attachments (
         id, item_id, object_key, size_bytes, declared_content_type,
         file_name, status, expires_at, created_at, updated_at
       ) VALUES (
         '22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'dummy-key-b', 10, 'image/png',
         'second.png', 'linked', ?1, ?2, ?2
       )`,
    )
      .bind(new Date(Date.now() + 60_000).toISOString(), now)
      .run();
    const [job] = await jobService.leaseProcessingJobs(
      'extract',
      'owner-multi',
      5,
      1,
    );

    expect(
      await jobService.submitExtractionResults(
        job!.id,
        'owner-multi',
        '00000000-0000-0000-0000-000000000003',
        [
          {
            attachmentId: '22222222-0000-0000-0000-000000000003',
            extractorName: 'unpdf',
            extractorVersion: '1.0',
            extractedText: 'PDF text',
            completeness: 'complete',
            coverage: 'full',
          },
          {
            attachmentId: '22222222-0000-0000-0000-000000000004',
            extractorName: 'vision-model',
            extractorVersion: '1.0',
            imageDescription: 'Screenshot description',
            confidence: 0.9,
            completeness: 'complete',
            coverage: 'full',
          },
        ],
        true,
      ),
    ).toBe(true);

    const response = await createApp().request(
      '/api/v1/items/00000000-0000-0000-0000-000000000003',
      { headers: { Authorization: 'Bearer test-admin-token' } },
      env,
    );
    const body = await response.json<{
      data: {
        extraction: { attachment_id: string } | null;
        extractions: Array<{ attachment_id: string }>;
      };
    }>();
    expect(
      body.data.extractions.map((row) => row.attachment_id).sort(),
    ).toEqual([
      '22222222-0000-0000-0000-000000000003',
      '22222222-0000-0000-0000-000000000004',
    ]);
    expect(body.data.extraction).toEqual(body.data.extractions[0]);
  });

  it('extracts a stored PDF through R2, the leased worker, D1, and enrichment chaining', async () => {
    await insertItemAndJob('00000000-0000-0000-0000-000000000004');
    const bytes = buildPdf('Worker   pipeline   text');
    const objectKey = 'ope223/item-worker/document.pdf';
    await env.ATTACHMENTS.put(objectKey, bytes, {
      httpMetadata: { contentType: 'application/pdf' },
    });
    await env.DB.prepare(
      `UPDATE attachments
       SET object_key = ?1, size_bytes = ?2, content_hash = ?3,
           detected_content_type = 'application/pdf'
       WHERE id = '22222222-0000-0000-0000-000000000004'`,
    )
      .bind(objectKey, bytes.byteLength, await sha256(bytes))
      .run();

    await processExtractionJobs(env);

    const record = await env.DB.prepare(
      `SELECT attachment_id, extracted_text, confidence, page_count,
              completeness, coverage, error_code
       FROM extraction_records WHERE item_id = '00000000-0000-0000-0000-000000000004'`,
    ).first<{
      attachment_id: string;
      extracted_text: string | null;
      confidence: number | null;
      page_count: number | null;
      completeness: string;
      coverage: string;
      error_code: string | null;
    }>();
    expect(record).toEqual({
      attachment_id: '22222222-0000-0000-0000-000000000004',
      extracted_text: 'Worker pipeline text',
      confidence: 1,
      page_count: 1,
      completeness: 'complete',
      coverage: 'full',
      error_code: null,
    });

    const jobs = await env.DB.prepare(
      `SELECT job_type, status, privacy_level_snapshot, provider_eligibility,
              policy_version, credential_source, zero_data_retention_required,
              data_collection_denied
       FROM processing_jobs WHERE item_id = '00000000-0000-0000-0000-000000000004'
       ORDER BY job_type`,
    ).all();
    expect(jobs.results).toEqual([
      expect.objectContaining({
        job_type: 'enrich',
        status: 'pending',
        privacy_level_snapshot: 'public',
        provider_eligibility: 'openrouter',
        policy_version: POLICY_VERSION,
        credential_source: 'app_managed',
        zero_data_retention_required: 1,
        data_collection_denied: 1,
      }),
      expect.objectContaining({ job_type: 'extract', status: 'complete' }),
    ]);
  });

  it('extracts a stored screenshot through policy routing and persists provider evidence', async () => {
    await insertItemAndJob('00000000-0000-0000-0000-000000000005');
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]).buffer;
    const objectKey = 'ope223/item-image/screenshot.png';
    await env.ATTACHMENTS.put(objectKey, bytes, {
      httpMetadata: { contentType: 'image/png' },
    });
    await env.DB.prepare(
      `UPDATE attachments
       SET object_key = ?1, size_bytes = ?2, content_hash = ?3,
           declared_content_type = 'image/png',
           detected_content_type = 'image/png', file_name = 'screenshot.png'
       WHERE id = '22222222-0000-0000-0000-000000000005'`,
    )
      .bind(objectKey, bytes.byteLength, await sha256(bytes))
      .run();

    await processExtractionJobs(env);

    const record = await env.DB.prepare(
      `SELECT attachment_id, extracted_text, image_description, confidence,
              completeness, provider_name, model_name, error_code
       FROM extraction_records WHERE item_id = '00000000-0000-0000-0000-000000000005'`,
    ).first();
    expect(record).toEqual({
      attachment_id: '22222222-0000-0000-0000-000000000005',
      extracted_text: 'Mock visible text from image',
      image_description: 'Mock image description',
      confidence: 0.95,
      completeness: 'complete',
      provider_name: 'openrouter',
      model_name: 'mock-vision-model',
      error_code: null,
    });
  });

  it('does not expose test-only extraction endpoints in the deployed app', async () => {
    const response = await createApp().request(
      '/api/test/extraction/pdf',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer test-local-worker-token' },
      },
      env,
    );
    expect(response.status).toBe(404);
  });
});
