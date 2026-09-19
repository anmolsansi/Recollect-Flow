import { serializeCsv } from './csv';
import { ExportRepository } from './export.repository';
import { sanitizePortableValue } from './export-sanitize';
import type {
  PortableExportEnvelope,
  PortableItemExport,
} from './export.types';
import { PORTABLE_EXPORT_VERSION } from './recovery.types';

const CSV_COLUMNS = [
  'id',
  'title',
  'source_type',
  'source_app',
  'source_url',
  'raw_text',
  'user_note',
  'summary',
  'project',
  'topics_json',
  'importance',
  'suggested_action',
  'lifecycle_status',
  'processing_status',
  'privacy_level',
  'captured_at',
  'deleted_at',
  'attachments',
  'url_acquisition',
  'processing_jobs',
  'sync_attempts',
] as const;

function currentUrlAcquisition(
  item: PortableItemExport,
): Record<string, unknown> | null {
  const sourceRevision = item.item.source_revision;
  const privacyLevel = item.item.privacy_level;
  const current = [...item.urlAcquisitions]
    .reverse()
    .find(
      (entry) =>
        entry.source_revision === sourceRevision &&
        entry.privacy_level_snapshot === privacyLevel,
    );
  if (!current) return null;
  return {
    status: current.status ?? null,
    coverage: current.coverage ?? null,
    completed_at: current.completed_at ?? null,
    fetched_final_url: current.fetched_final_url ?? null,
    content_type: current.content_type ?? null,
    response_bytes: current.response_bytes ?? null,
    extracted_characters: current.extracted_characters ?? null,
    error_code: current.error_code ?? null,
    retryable: current.retryable ?? null,
    source_title: current.source_title ?? null,
  };
}

function portableCsvRow(item: PortableItemExport): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const column of CSV_COLUMNS) {
    if (column === 'attachments') row[column] = item.attachments;
    else if (column === 'url_acquisition')
      row[column] = currentUrlAcquisition(item);
    else if (column === 'processing_jobs') row[column] = item.processingJobs;
    else if (column === 'sync_attempts') row[column] = item.syncAttempts;
    else row[column] = item.item[column] ?? null;
  }
  return row;
}

export class ExportService {
  private readonly repository: ExportRepository;

  constructor(
    db: D1Database,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.repository = new ExportRepository(db);
  }

  async buildJson(): Promise<PortableExportEnvelope> {
    const [items, purgeReceipts] = await Promise.all([
      this.repository.readItems(),
      this.repository.readPurgeReceipts(),
    ]);
    return sanitizePortableValue({
      format: 'recollectflow-portable-export',
      schemaVersion: PORTABLE_EXPORT_VERSION,
      generatedAt: this.now().toISOString(),
      itemCount: items.length,
      items,
      purgeReceipts,
      disclosures: {
        attachmentBytesIncluded: false,
        credentialsIncluded: false,
        ownerControlledCopiesOutsideRemoteDeletion: true,
      },
    }) as PortableExportEnvelope;
  }

  async buildCsv(): Promise<string> {
    const items = await this.repository.readItems();
    return serializeCsv(
      CSV_COLUMNS,
      items.map((item) =>
        sanitizePortableValue(portableCsvRow(item)),
      ) as Record<string, unknown>[],
    );
  }
}
