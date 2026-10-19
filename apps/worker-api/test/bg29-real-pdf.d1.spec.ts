import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { processExtractionJobs } from '../src/jobs/extraction/extraction.worker';
import { ExtractionService } from '../src/jobs/extraction/extraction.service';
import { createBg29PdfFixture, bg29PdfSentinel, bg29PdfSha256 } from './fixtures/bg29-synthetic-pdf';

const ITEM_COUNT = 12;
const ids = Array.from({ length: ITEM_COUNT }, (_, i) => String(i + 1).padStart(2, '0'));

function itemId(n: string) {
  return `bg29-078-local-pdf-${n}`;
}
function objectKey(n: string) {
  return `bg29-078-local-only/${n}/original.pdf`;
}

async function reset() {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM provider_usage'),
    env.DB.prepare('DELETE FROM extraction_records'),
    env.DB.prepare('DELETE FROM attachments'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM processing_job_results'),
    env.DB.prepare('DELETE FROM url_acquisitions'),
    env.DB.prepare('DELETE FROM processing_jobs'),
    env.DB.prepare('DELETE FROM sync_attempts'),
    env.DB.prepare('DELETE FROM capture_events'),
    env.DB.prepare('DELETE FROM item_deduplication_keys'),
    env.DB.prepare('DELETE FROM items'),
  ]);
  for (const n of ids) await env.ATTACHMENTS.delete(objectKey(n));
}

async function seedPdfOriginals(): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  const at = new Date(Date.now() - 60_000).toISOString();
  for (const n of ids) {
    const bytes = createBg29PdfFixture(Number(n));
    const hash = await bg29PdfSha256(bytes);
    hashes.set(n, hash);
    const key = objectKey(n);
    const existing = await env.ATTACHMENTS.get(key);
    if (existing) {
      if (existing.size !== bytes.byteLength || await bg29PdfSha256(await existing.arrayBuffer()) !== hash) {
        throw new Error('BG29 original PDF changed during repeat seed');
      }
    } else {
      await env.ATTACHMENTS.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
    }

    await env.DB.prepare(
      `INSERT OR IGNORE INTO items
       (id, idempotency_key, source_type, source_app, privacy_level,
        processing_status, captured_at, created_at, updated_at)
       VALUES (?1, ?2, 'file', 'BG29 PDF offline', 'public',
        'pending', ?3, ?3, ?3)`,
    ).bind(itemId(n), `bg29-078-local-pdf-idem-${n}`, at).run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO attachments
       (id, item_id, object_key, size_bytes, content_hash,
        declared_content_type, detected_content_type, file_name, status,
        expires_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5,
        'application/pdf', 'application/pdf', 'synthetic.pdf', 'linked',
        ?6, ?7, ?7)`,
    ).bind(
      `bg29-pdf-attachment-${n}`, itemId(n), key, bytes.byteLength, hash,
      new Date(Date.now() + 86_400_000).toISOString(), at,
    ).run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO processing_jobs
       (id, item_id, job_type, status, attempts, available_at,
        created_at, updated_at, input_hash, privacy_level_snapshot,
        provider_eligibility, policy_version, credential_source,
        hosted_processing_consent, zero_data_retention_required,
        data_collection_denied)
       VALUES (?1, ?2, 'extract', 'pending', 0, ?3,
        ?3, ?3, ?4, 'public', 'openrouter', 'BG29-offline',
        'none', 0, 0, 1)`,
    ).bind(`bg29-pdf-extract-job-${n}`, itemId(n), at, hash).run();
  }
  return hashes;
}

describe('BG-29.078 real local PDF extraction with emulated R2', () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS!);
  });
  beforeEach(reset);

  it('seeds 12 valid immutable original PDF files twice without duplicating D1 rows or R2 objects', async () => {
    const first = await seedPdfOriginals();
    const second = await seedPdfOriginals();
    expect(second).toEqual(first);
    const count = async (table: string) =>
      (await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table}`).first<{ total: number }>())?.total;
    expect(await count('items')).toBe(12);
    expect(await count('attachments')).toBe(12);
    expect(await count('processing_jobs')).toBe(12);
    for (const n of ids) {
      const object = await env.ATTACHMENTS.get(objectKey(n));
      expect(object).not.toBeNull();
      expect(await bg29PdfSha256(await object!.arrayBuffer())).toBe(first.get(n));
    }
  }, 120_000);

  it('runs the actual leased ExtractionService over all 12 PDF bytes and preserves originals', async () => {
    const originalHashes = await seedPdfOriginals();
    const outbound = vi.spyOn(globalThis, 'fetch');
    try {
      // Existing extract worker leases up to ten jobs per pass, so two
      // real passes are required to drain a twelve-file queue.
      await processExtractionJobs(env);
      await processExtractionJobs(env);

      const records = await env.DB.prepare(
        `SELECT item_id, extracted_text, completeness, extractor_name, error_code
         FROM extraction_records ORDER BY item_id`,
      ).all<{
        item_id: string;
        extracted_text: string | null;
        completeness: string;
        extractor_name: string;
        error_code: string | null;
      }>();
      expect(records.results).toHaveLength(ITEM_COUNT);
      records.results.forEach((row, index) => {
        expect(row.item_id).toBe(itemId(ids[index]!));
        expect(row.extracted_text).toContain(bg29PdfSentinel(index + 1));
        expect(row.completeness).toBe('complete');
        expect(row.extractor_name).toBe('unpdf');
        expect(row.error_code).toBeNull();
      });

      const jobs = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM processing_jobs WHERE job_type = 'extract' AND status = 'complete'",
      ).first<{ total: number }>();
      const remaining = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM processing_jobs WHERE job_type = 'extract' AND status IN ('pending', 'processing', 'failed')",
      ).first<{ total: number }>();
      const originals = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM items WHERE source_app = 'BG29 PDF offline' AND deleted_at IS NULL AND raw_text IS NULL",
      ).first<{ total: number }>();
      expect(jobs?.total).toBe(ITEM_COUNT);
      expect(remaining?.total).toBe(0);
      expect(originals?.total).toBe(ITEM_COUNT);
      for (const n of ids) {
        const object = await env.ATTACHMENTS.get(objectKey(n));
        expect(await bg29PdfSha256(await object!.arrayBuffer())).toBe(originalHashes.get(n));
      }
      expect(outbound).not.toHaveBeenCalled();
    } finally {
      outbound.mockRestore();
    }
  }, 120_000);

  it('rejects altered checksums before parsing and never overwrites originals', async () => {
    const hashes = await seedPdfOriginals();
    const result = await new ExtractionService(env).extract({
      attachmentId: 'bg29-pdf-attachment-01',
      objectKey: objectKey('01'),
      itemId: itemId('01'),
      declaredContentType: 'application/pdf',
      detectedContentType: 'application/pdf',
      sizeBytes: createBg29PdfFixture(1).byteLength,
      contentHash: '0'.repeat(64),
      routing: {
        privacyLevel: 'public',
        requestedProvider: 'openrouter',
        credentialSource: 'none',
        hostedProcessingConsent: false,
        zeroDataRetentionEnforced: false,
        dataCollectionDenied: true,
      },
    });
    expect(result.errorCode).toBe('CHECKSUM_MISMATCH');
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM extraction_records',
    ).first<{ total: number }>();
    expect(count?.total).toBe(0);
    const original = await env.ATTACHMENTS.get(objectKey('01'));
    expect(await bg29PdfSha256(await original!.arrayBuffer())).toBe(hashes.get('01'));
  }, 120_000);
});
