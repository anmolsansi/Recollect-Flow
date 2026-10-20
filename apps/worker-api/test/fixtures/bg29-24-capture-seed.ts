import { BG29_STAGING_URLS } from '../../src/jobs/extraction/bg29-staging-source';
import { createBg29PdfFixture, bg29PdfSha256 } from './bg29-synthetic-pdf';

export interface Bg29SeedOriginal {
  id: string;
  type: 'url' | 'file';
  sha256: string;
  source: string;
}

/**
 * Test-only. Seeds the frozen twelve URL and twelve actual PDF originals.
 * Reseeding never overwrites a prior R2 object, raw capture or existing job.
 * This is intentionally not part of any deployed Worker entry point.
 */
export async function seedBg29TwentyFour(
  db: D1Database,
  r2: R2Bucket,
): Promise<Bg29SeedOriginal[]> {
  const at = new Date(Date.now() - 60_000).toISOString();
  const manifest: Bg29SeedOriginal[] = [];

  for (let index = 0; index < 24; index++) {
    const n = String((index % 12) + 1).padStart(2, '0');
    const isUrl = index < 12;
    const id = `bg29-078-${isUrl ? 'url' : 'file'}-${n}`;
    const url = isUrl ? BG29_STAGING_URLS[index]! : null;
    const pdf = isUrl ? null : createBg29PdfFixture(index - 11);
    const key = isUrl ? null : `bg29-078/file-${n}/original.pdf`;
    const payload = isUrl
      ? new TextEncoder().encode(`bg29-url-v1:${url}`).buffer
      : pdf!;
    const fingerprint = await bg29PdfSha256(payload as ArrayBuffer);
    manifest.push({
      id,
      type: isUrl ? 'url' : 'file',
      sha256: fingerprint,
      source: url ?? key!,
    });

    if (key && pdf) {
      const prior = await r2.get(key);
      if (prior) {
        if (
          prior.size !== pdf.byteLength ||
          (await bg29PdfSha256(await prior.arrayBuffer())) !== fingerprint
        ) {
          throw new Error(`BG29_RESEED_ORIGINAL_MISMATCH:${id}`);
        }
      } else {
        await r2.put(key, pdf, {
          httpMetadata: { contentType: 'application/pdf' },
        });
      }
    }

    await db
      .prepare(
        `INSERT OR IGNORE INTO items
         (id, idempotency_key, source_type, source_app, source_url,
          privacy_level, processing_status, captured_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'BG29-078 sealed fixtures', ?4,
          'public', 'pending', ?5, ?5, ?5)`,
      )
      .bind(id, `bg29-078-fixed-idem-${id}`, isUrl ? 'url' : 'file', url, at)
      .run();

    if (key && pdf) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO attachments
           (id, item_id, object_key, size_bytes, content_hash,
            declared_content_type, detected_content_type, file_name,
            status, expires_at, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'application/pdf',
            'application/pdf', 'synthetic.pdf', 'linked', ?6, ?7, ?7)`,
        )
        .bind(
          `bg29-078-attachment-${n}`,
          id,
          key,
          pdf.byteLength,
          fingerprint,
          new Date(Date.now() + 86_400_000).toISOString(),
          at,
        )
        .run();
    }

    await db
      .prepare(
        `INSERT OR IGNORE INTO processing_jobs
         (id, item_id, job_type, status, attempts, available_at,
          created_at, updated_at, input_hash, privacy_level_snapshot,
          provider_eligibility, policy_version, credential_source,
          hosted_processing_consent, zero_data_retention_required,
          data_collection_denied)
         VALUES (?1, ?2, ?3, 'pending', 0, ?4, ?4, ?4,
          ?5, 'public', 'openrouter', 'BG29-078-fixture', 'none', 0, 0, 1)`,
      )
      .bind(
        `bg29-078-job-${id}`,
        id,
        isUrl ? 'acquire_url' : 'extract',
        at,
        isUrl ? 'url-source-v1:1' : fingerprint,
      )
      .run();

    await db
      .prepare(
        `INSERT OR IGNORE INTO sync_attempts
         (id, item_id, destination, status, attempts,
          available_at, created_at, updated_at)
         VALUES (?1, ?2, 'notion', 'pending', 0, ?3, ?3, ?3)`,
      )
      .bind(`bg29-078-sync-${id}`, id, at)
      .run();
  }

  // Verify identity independently of the INSERT OR IGNORE results.
  const originals = await db
    .prepare(
      `SELECT id, source_type, source_url, deleted_at
       FROM items WHERE source_app = 'BG29-078 sealed fixtures'`,
    )
    .all<{
      id: string;
      source_type: string;
      source_url: string | null;
      deleted_at: string | null;
    }>();
  if (originals.results.length !== 24) {
    throw new Error('BG29_SEED_COUNT_MISMATCH');
  }
  for (const original of manifest) {
    const row = originals.results.find((value) => value.id === original.id);
    if (
      !row ||
      row.source_type !== original.type ||
      row.deleted_at !== null ||
      (original.type === 'url' && row.source_url !== original.source)
    ) {
      throw new Error(`BG29_SEED_IDENTITY_MISMATCH:${original.id}`);
    }
  }

  // INSERT OR IGNORE cannot silently accept altered durable fixture metadata.
  const itemRows = await db
    .prepare(
      "SELECT id, idempotency_key FROM items WHERE source_app = 'BG29-078 sealed fixtures'",
    )
    .all<{ id: string; idempotency_key: string }>();
  for (const original of manifest) {
    const row = itemRows.results.find((entry) => entry.id === original.id);
    if (row?.idempotency_key !== 'bg29-078-fixed-idem-' + original.id) {
      throw new Error('BG29_SEED_IDEMPOTENCY_MISMATCH:' + original.id);
    }
  }

  const attachments = await db
    .prepare(
      "SELECT item_id, object_key, size_bytes, content_hash, declared_content_type, detected_content_type, status FROM attachments WHERE item_id LIKE 'bg29-078-file-%' OR object_key LIKE 'bg29-078/%'",
    )
    .all<{
      item_id: string;
      object_key: string;
      size_bytes: number;
      content_hash: string | null;
      declared_content_type: string;
      detected_content_type: string | null;
      status: string;
    }>();
  if (attachments.results.length !== 12)
    throw new Error('BG29_SEED_ATTACHMENT_COUNT_MISMATCH');
  for (const original of manifest.filter((entry) => entry.type === 'file')) {
    const row = attachments.results.find(
      (entry) => entry.item_id === original.id,
    );
    const pdf = createBg29PdfFixture(Number(original.id.slice(-2)));
    if (
      !row ||
      row.object_key !== original.source ||
      row.size_bytes !== pdf.byteLength ||
      row.content_hash !== original.sha256 ||
      row.declared_content_type !== 'application/pdf' ||
      row.detected_content_type !== 'application/pdf' ||
      row.status !== 'linked'
    )
      throw new Error('BG29_SEED_ATTACHMENT_MISMATCH:' + original.id);
  }

  const sourceJobs = await db
    .prepare(
      "SELECT id, item_id, job_type, input_hash FROM processing_jobs WHERE (item_id LIKE 'bg29-078-%' AND job_type IN ('acquire_url', 'extract')) OR id LIKE 'bg29-078-job-%'",
    )
    .all<{
      id: string;
      item_id: string;
      job_type: string;
      input_hash: string | null;
    }>();
  if (sourceJobs.results.length !== 24)
    throw new Error('BG29_SEED_SOURCE_JOB_COUNT_MISMATCH');
  for (const original of manifest) {
    const job = sourceJobs.results.find((row) => row.item_id === original.id);
    if (
      !job ||
      job.id !== 'bg29-078-job-' + original.id ||
      job.job_type !== (original.type === 'url' ? 'acquire_url' : 'extract') ||
      job.input_hash !==
        (original.type === 'url' ? 'url-source-v1:1' : original.sha256)
    )
      throw new Error('BG29_SEED_SOURCE_JOB_MISMATCH:' + original.id);
  }

  const syncRows = await db
    .prepare(
      "SELECT id, item_id, destination FROM sync_attempts WHERE id LIKE 'bg29-078-sync-%'",
    )
    .all<{ id: string; item_id: string; destination: string }>();
  if (syncRows.results.length !== 24)
    throw new Error('BG29_SEED_SYNC_COUNT_MISMATCH');
  for (const original of manifest) {
    const row = syncRows.results.find((entry) => entry.item_id === original.id);
    if (
      !row ||
      row.id !== 'bg29-078-sync-' + original.id ||
      row.destination !== 'notion'
    )
      throw new Error('BG29_SEED_SYNC_MISMATCH:' + original.id);
  }

  const objects = await r2.list({ prefix: 'bg29-078/' });
  const expectedKeys = new Set(
    manifest
      .filter((entry) => entry.type === 'file')
      .map((entry) => entry.source),
  );
  if (
    objects.truncated ||
    objects.objects.length !== 12 ||
    objects.objects.some((object) => !expectedKeys.has(object.key))
  )
    throw new Error('BG29_SEED_R2_INVENTORY_MISMATCH');

  return manifest;
}
