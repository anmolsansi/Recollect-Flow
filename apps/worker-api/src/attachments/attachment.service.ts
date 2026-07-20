import type { AttachmentRepository } from './attachment.repository';

export async function cleanupExpiredAttachments(
  repository: AttachmentRepository,
  bucket: R2Bucket,
  now = new Date().toISOString(),
  limit = 100,
): Promise<number> {
  const expired = await repository.findExpiredOrphans(now, limit);
  for (const attachment of expired) {
    await bucket.delete(attachment.r2Key);
    await repository.markOrphaned(attachment.id, now);
  }
  return expired.length;
}

export async function deleteItemAttachments(
  repository: AttachmentRepository,
  bucket: R2Bucket,
  itemId: string,
  now = new Date().toISOString(),
): Promise<number> {
  const attachments = await repository.findByItemId(itemId);
  for (const attachment of attachments) {
    await bucket.delete(attachment.r2Key);
    await repository.markDeleted(attachment.id, now);
  }
  return attachments.length;
}
