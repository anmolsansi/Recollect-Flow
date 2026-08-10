import { AppError } from '../shared/errors';
import type { RestorePlan } from './restore-plan';

function requireOwnedRows(
  rows: readonly Record<string, unknown>[],
  itemId: string,
  collection: string,
): void {
  for (const [index, row] of rows.entries()) {
    if (row.item_id !== itemId) {
      throw new AppError(
        422,
        'RESTORE_REFERENCE_INVALID',
        `${collection}[${index}] does not belong to its portable item.`,
      );
    }
  }
}

export function validateRestorePlan(plan: RestorePlan): void {
  const itemIds = new Set<string>();
  const globalRecordIds = new Set<string>();

  for (const entry of plan.items) {
    const itemId = entry.item.id;
    if (typeof itemId !== 'string' || !itemId) {
      throw new AppError(
        422,
        'RESTORE_REFERENCE_INVALID',
        'Portable item id is invalid.',
      );
    }
    itemIds.add(itemId);

    requireOwnedRows(entry.captureEvents, itemId, 'captureEvents');
    requireOwnedRows(entry.attachments, itemId, 'attachments');
    requireOwnedRows(entry.extractions, itemId, 'extractions');
    requireOwnedRows(entry.processingJobs, itemId, 'processingJobs');
    requireOwnedRows(entry.syncAttempts, itemId, 'syncAttempts');
    requireOwnedRows(entry.providerUsage, itemId, 'providerUsage');
    requireOwnedRows(entry.fieldOverrides, itemId, 'fieldOverrides');
    requireOwnedRows(entry.feedbackEvents, itemId, 'feedbackEvents');
    requireOwnedRows(entry.auditEvents, itemId, 'auditEvents');
    requireOwnedRows(entry.deduplicationKeys, itemId, 'deduplicationKeys');

    const attachmentIds = new Set(
      entry.attachments
        .map((row) => row.id)
        .filter((value): value is string => typeof value === 'string'),
    );
    const jobIds = new Set(
      entry.processingJobs
        .map((row) => row.id)
        .filter((value): value is string => typeof value === 'string'),
    );

    for (const extraction of entry.extractions) {
      if (
        typeof extraction.attachment_id !== 'string' ||
        !attachmentIds.has(extraction.attachment_id)
      ) {
        throw new AppError(
          422,
          'RESTORE_REFERENCE_INVALID',
          'Extraction record references an attachment outside its portable item.',
        );
      }
    }
    for (const capture of entry.captureEvents) {
      if (
        capture.attachment_id !== null &&
        capture.attachment_id !== undefined &&
        (typeof capture.attachment_id !== 'string' ||
          !attachmentIds.has(capture.attachment_id))
      ) {
        throw new AppError(
          422,
          'RESTORE_REFERENCE_INVALID',
          'Capture event references an attachment outside its portable item.',
        );
      }
    }
    for (const result of entry.processingJobResults) {
      if (typeof result.job_id !== 'string' || !jobIds.has(result.job_id)) {
        throw new AppError(
          422,
          'RESTORE_REFERENCE_INVALID',
          'Processing result references a job outside its portable item.',
        );
      }
    }

    for (const collection of [
      entry.captureEvents,
      entry.attachments,
      entry.extractions,
      entry.processingJobs,
      entry.syncAttempts,
      entry.providerUsage,
      entry.fieldOverrides,
      entry.feedbackEvents,
      entry.auditEvents,
    ]) {
      for (const row of collection) {
        if (typeof row.id !== 'string') continue;
        const key = `${itemId}:${row.id}`;
        if (globalRecordIds.has(key)) {
          throw new AppError(
            422,
            'RESTORE_REFERENCE_INVALID',
            'Portable child record ids must be unique per item.',
          );
        }
        globalRecordIds.add(key);
      }
    }
  }

  for (const entry of plan.items) {
    const duplicateOf = entry.item.duplicate_of;
    if (
      duplicateOf !== null &&
      duplicateOf !== undefined &&
      typeof duplicateOf !== 'string'
    ) {
      throw new AppError(
        422,
        'RESTORE_REFERENCE_INVALID',
        'Item duplicate target must be a string or null.',
      );
    }
  }
}
