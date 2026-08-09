import type { NotionPurgeService } from './notion-purge.service';

export type NotionPurgeDisposition =
  | 'archived'
  | 'already_missing'
  | 'not_linked';

export class PurgeNotionProjectionService {
  constructor(
    private readonly db: D1Database,
    private readonly notion: NotionPurgeService,
  ) {}

  async archiveProjection(itemId: string): Promise<NotionPurgeDisposition> {
    const item = await this.db
      .prepare('SELECT notion_page_id FROM items WHERE id = ?1')
      .bind(itemId)
      .first<{ notion_page_id: string | null }>();
    if (!item?.notion_page_id) return 'not_linked';
    return this.notion.archivePage(item.notion_page_id);
  }
}
