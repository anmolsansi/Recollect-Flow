import type { PortableItemExport, PortableRecord } from './export.types';
import { PurgeRepository } from './purge.repository';

function groupByItem(
  rows: readonly PortableRecord[],
  key = 'item_id',
): Map<string, PortableRecord[]> {
  const grouped = new Map<string, PortableRecord[]>();
  for (const row of rows) {
    const itemId = row[key];
    if (typeof itemId !== 'string') continue;
    const copy = { ...row };
    if (key === '__item_id') delete copy.__item_id;
    const existing = grouped.get(itemId) ?? [];
    existing.push(copy);
    grouped.set(itemId, existing);
  }
  return grouped;
}

export class ExportRepository {
  private readonly purges: PurgeRepository;

  constructor(private readonly db: D1Database) {
    this.purges = new PurgeRepository(db);
  }

  private async rows(query: string): Promise<PortableRecord[]> {
    const result = await this.db.prepare(query).all<PortableRecord>();
    return result.results ?? [];
  }

  async readItems(): Promise<PortableItemExport[]> {
    const [
      items,
      captures,
      attachments,
      extractions,
      jobs,
      jobResults,
      syncAttempts,
      providerUsage,
      overrides,
      feedback,
      audit,
      deduplicationKeys,
    ] = await Promise.all([
      this.rows('SELECT * FROM items ORDER BY captured_at ASC, id ASC'),
      this.rows('SELECT * FROM capture_events ORDER BY created_at ASC, id ASC'),
      this.rows('SELECT * FROM attachments ORDER BY created_at ASC, id ASC'),
      this.rows(
        'SELECT * FROM extraction_records ORDER BY created_at ASC, id ASC',
      ),
      this.rows(
        'SELECT * FROM processing_jobs ORDER BY created_at ASC, id ASC',
      ),
      this.rows(
        `SELECT r.*, j.item_id AS __item_id
         FROM processing_job_results r
         JOIN processing_jobs j ON j.id = r.job_id
         ORDER BY r.created_at ASC, r.job_id ASC`,
      ),
      this.rows('SELECT * FROM sync_attempts ORDER BY created_at ASC, id ASC'),
      this.rows('SELECT * FROM provider_usage ORDER BY created_at ASC, id ASC'),
      this.rows(
        'SELECT * FROM item_field_overrides ORDER BY created_at ASC, id ASC',
      ),
      this.rows(
        'SELECT * FROM item_feedback_events ORDER BY created_at ASC, id ASC',
      ),
      this.rows('SELECT * FROM audit_events ORDER BY created_at ASC, id ASC'),
      this.rows(
        'SELECT * FROM item_deduplication_keys ORDER BY created_at ASC, deduplication_key ASC',
      ),
    ]);

    const grouped = {
      captures: groupByItem(captures),
      attachments: groupByItem(attachments),
      extractions: groupByItem(extractions),
      jobs: groupByItem(jobs),
      jobResults: groupByItem(jobResults, '__item_id'),
      syncAttempts: groupByItem(syncAttempts),
      providerUsage: groupByItem(providerUsage),
      overrides: groupByItem(overrides),
      feedback: groupByItem(feedback),
      audit: groupByItem(audit),
      deduplicationKeys: groupByItem(deduplicationKeys),
    };

    return items
      .filter((item) => typeof item.id === 'string')
      .map((item) => {
        const itemId = item.id as string;
        return {
          item,
          captureEvents: grouped.captures.get(itemId) ?? [],
          attachments: grouped.attachments.get(itemId) ?? [],
          extractions: grouped.extractions.get(itemId) ?? [],
          processingJobs: grouped.jobs.get(itemId) ?? [],
          processingJobResults: grouped.jobResults.get(itemId) ?? [],
          syncAttempts: grouped.syncAttempts.get(itemId) ?? [],
          providerUsage: grouped.providerUsage.get(itemId) ?? [],
          fieldOverrides: grouped.overrides.get(itemId) ?? [],
          feedbackEvents: grouped.feedback.get(itemId) ?? [],
          auditEvents: grouped.audit.get(itemId) ?? [],
          deduplicationKeys: grouped.deduplicationKeys.get(itemId) ?? [],
        };
      });
  }

  async readPurgeReceipts() {
    return this.purges.listReceipts();
  }
}
