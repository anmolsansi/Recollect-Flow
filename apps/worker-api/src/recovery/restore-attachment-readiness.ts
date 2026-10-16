import { AppError } from '../shared/errors';
import type { RestorePlan } from './restore-plan';

export interface RestoreAttachmentProblem {
  itemId: string;
  attachmentId: string;
  reason: 'missing' | 'size_mismatch';
}

export interface RestoreAttachmentReadiness {
  checked: number;
  problems: RestoreAttachmentProblem[];
}

/**
 * Portable JSON does not contain original attachment bytes. Only inspect
 * references in items that will actually be restored (not purged items).
 * A separate full-byte SHA-256 copy verification is still required.
 */
export async function inspectRestoreAttachments(
  plan: RestorePlan,
  bucket: R2Bucket,
): Promise<RestoreAttachmentReadiness> {
  const problems: RestoreAttachmentProblem[] = [];
  let checked = 0;

  for (const entry of plan.items) {
    for (const attachment of entry.attachments) {
      // A pending upload never promised original bytes. Only uploaded,
      // finalized or linked references need a surviving R2 object.
      if (
        attachment.status === 'deleted' ||
        attachment.status === 'pending' ||
        attachment.status === 'orphaned'
      ) {
        continue;
      }
      const itemId = entry.item.id;
      const attachmentId = attachment.id;
      const objectKey = attachment.object_key;
      const sizeBytes = attachment.size_bytes;
      if (
        typeof itemId !== 'string' ||
        typeof attachmentId !== 'string' ||
        typeof objectKey !== 'string' ||
        !objectKey ||
        typeof sizeBytes !== 'number' ||
        !Number.isSafeInteger(sizeBytes) ||
        sizeBytes < 0
      ) {
        throw new AppError(
          422,
          'RESTORE_ATTACHMENT_REFERENCE_INVALID',
          'The portable export contains an invalid attachment reference.',
        );
      }

      checked += 1;
      const object = await bucket.head(objectKey);
      if (!object) {
        problems.push({ itemId, attachmentId, reason: 'missing' });
      } else if (object.size !== sizeBytes) {
        problems.push({ itemId, attachmentId, reason: 'size_mismatch' });
      }
    }
  }

  return { checked, problems };
}
