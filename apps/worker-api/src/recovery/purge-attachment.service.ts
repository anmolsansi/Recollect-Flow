import { D1AttachmentRepository } from '../attachments/attachment.repository';
import { deleteItemAttachments } from '../attachments/attachment.service';

export class PurgeAttachmentService {
  constructor(
    private readonly db: D1Database,
    private readonly bucket: R2Bucket,
  ) {}

  async deleteLinkedAttachments(itemId: string, now: Date): Promise<number> {
    return deleteItemAttachments(
      new D1AttachmentRepository(this.db),
      this.bucket,
      itemId,
      now.toISOString(),
    );
  }
}
