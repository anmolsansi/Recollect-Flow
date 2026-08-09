import {
  NotionIntegrityError,
  NotionIntegrityService,
} from './notion-integrity.service';
import { IntegrityRepository } from './integrity.repository';

interface AttachmentRow {
  id: string;
  item_id: string | null;
  object_key: string;
  status: string;
  item_exists: number;
}

interface NotionRow {
  id: string;
  notion_page_id: string;
  deleted_at: string | null;
}

function safeIntegrityError(error: unknown): string {
  if (error instanceof NotionIntegrityError) return error.code;
  return 'INTEGRITY_CHECK_FAILED';
}

export interface IntegrityServiceOptions {
  now?: () => Date;
  fetcher?: typeof fetch;
}

export class IntegrityService {
  private readonly repository: IntegrityRepository;
  private readonly now: () => Date;

  constructor(
    private readonly db: D1Database,
    private readonly bucket: R2Bucket,
    private readonly notionToken: string,
    private readonly options: IntegrityServiceOptions = {},
  ) {
    this.repository = new IntegrityRepository(db);
    this.now = options.now ?? (() => new Date());
  }

  async run() {
    const runId = await this.repository.start(this.now());
    try {
      await this.checkAttachments(runId);
      await this.checkNotion(runId);
      await this.checkPurgeWorkflows(runId);
      await this.checkBackups(runId);
      await this.repository.complete(runId, this.now());
    } catch (error) {
      await this.repository.fail(runId, safeIntegrityError(error), this.now());
      throw error;
    }
    return this.repository.get(runId);
  }

  private async checkAttachments(runId: string): Promise<void> {
    const result = await this.db
      .prepare(
        `SELECT a.id, a.item_id, a.object_key, a.status,
                CASE WHEN i.id IS NULL THEN 0 ELSE 1 END AS item_exists
         FROM attachments a
         LEFT JOIN items i ON i.id = a.item_id
         WHERE a.status != 'deleted'`,
      )
      .all<AttachmentRow>();

    for (const attachment of result.results) {
      if (attachment.status === 'linked' && !attachment.item_id) {
        await this.repository.addFinding(
          runId,
          {
            findingType: 'attachment_link_state_mismatch',
            severity: 'error',
            attachmentId: attachment.id,
            externalRef: attachment.object_key,
            details: { status: attachment.status, item_linked: false },
          },
          this.now(),
        );
      }
      if (attachment.item_id && attachment.item_exists === 0) {
        await this.repository.addFinding(
          runId,
          {
            findingType: 'attachment_item_missing',
            severity: 'error',
            itemId: attachment.item_id,
            attachmentId: attachment.id,
            externalRef: attachment.object_key,
          },
          this.now(),
        );
      }
      const object = await this.bucket.head(attachment.object_key);
      if (!object) {
        await this.repository.addFinding(
          runId,
          {
            findingType: 'attachment_object_missing',
            severity: 'error',
            itemId: attachment.item_id,
            attachmentId: attachment.id,
            externalRef: attachment.object_key,
            details: { status: attachment.status },
          },
          this.now(),
        );
      }
    }
  }

  private async checkNotion(runId: string): Promise<void> {
    const items = await this.db
      .prepare(
        `SELECT id, notion_page_id, deleted_at
         FROM items WHERE notion_page_id IS NOT NULL`,
      )
      .all<NotionRow>();
    const notion = new NotionIntegrityService(
      this.notionToken,
      this.options.fetcher,
    );

    for (const item of items.results) {
      try {
        const state = await notion.pageState(item.notion_page_id);
        if (state === 'missing') {
          await this.repository.addFinding(
            runId,
            {
              findingType: 'notion_projection_missing',
              severity: item.deleted_at ? 'info' : 'warning',
              itemId: item.id,
              externalRef: item.notion_page_id,
              details: { item_soft_deleted: Boolean(item.deleted_at) },
            },
            this.now(),
          );
        }
      } catch (error) {
        await this.repository.addFinding(
          runId,
          {
            findingType: 'notion_integrity_check_unavailable',
            severity: 'warning',
            itemId: item.id,
            externalRef: item.notion_page_id,
            details: { error_code: safeIntegrityError(error) },
          },
          this.now(),
        );
      }
    }
  }

  private async checkPurgeWorkflows(runId: string): Promise<void> {
    const workflows = await this.db
      .prepare(
        `SELECT id, item_id, state, last_error_code, updated_at
         FROM purge_workflows
         WHERE state IN ('processing', 'partial')`,
      )
      .all<{
        id: string;
        item_id: string;
        state: string;
        last_error_code: string | null;
        updated_at: string;
      }>();
    for (const workflow of workflows.results) {
      await this.repository.addFinding(
        runId,
        {
          findingType: 'purge_workflow_incomplete',
          severity: workflow.state === 'partial' ? 'error' : 'warning',
          itemId: workflow.item_id,
          externalRef: workflow.id,
          details: {
            state: workflow.state,
            last_error_code: workflow.last_error_code,
            updated_at: workflow.updated_at,
          },
        },
        this.now(),
      );
    }
  }

  private async checkBackups(runId: string): Promise<void> {
    const nowIso = this.now().toISOString();
    const backups = await this.db
      .prepare(
        `SELECT id, object_key, state, sha256, size_bytes,
                verified_at, expires_at
         FROM backup_artifacts
         WHERE (state = 'complete' AND (
                  sha256 IS NULL OR size_bytes IS NULL OR verified_at IS NULL
                ))
            OR (state = 'complete' AND expires_at <= ?1)
            OR state IN ('creating', 'verifying')`,
      )
      .bind(nowIso)
      .all<{
        id: string;
        object_key: string;
        state: string;
        sha256: string | null;
        size_bytes: number | null;
        verified_at: string | null;
        expires_at: string;
      }>();

    for (const backup of backups.results) {
      const incompleteVerification =
        backup.state === 'complete' &&
        (!backup.sha256 || backup.size_bytes === null || !backup.verified_at);
      const overdue = backup.state === 'complete' && backup.expires_at <= nowIso;
      await this.repository.addFinding(
        runId,
        {
          findingType: incompleteVerification
            ? 'backup_verification_incomplete'
            : overdue
              ? 'backup_retention_overdue'
              : 'backup_workflow_incomplete',
          severity: incompleteVerification ? 'error' : 'warning',
          externalRef: backup.id,
          details: {
            state: backup.state,
            expires_at: backup.expires_at,
          },
        },
        this.now(),
      );
    }
  }
}
