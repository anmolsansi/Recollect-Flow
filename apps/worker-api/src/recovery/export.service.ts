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
  'processing_jobs',
  'sync_attempts',
] as const;

function portableCsvRow(item: PortableItemExport): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const column of CSV_COLUMNS) {
    if (column === 'attachments') row[column] = item.attachments;
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
