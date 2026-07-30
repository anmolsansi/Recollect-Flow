import { sha256 } from '../captures/hash';
import { JobService } from '../jobs/job.service';
import type { NotionItemPayload } from './notion-sync.service';
import {
  NotFoundError,
  NotionSyncError,
  NotionSyncService,
} from './notion-sync.service';

interface NotionItemRow {
  id: string;
  title: string | null;
  source_url: string | null;
  source_app: string;
  source_type: string;
  captured_at: string;
  privacy_level: string;
  user_note: string | null;
  summary: string | null;
  project: string | null;
  topics_json: string;
  importance: number | null;
  suggested_action: string | null;
  lifecycle_status: string;
  processing_status: string;
  coverage: string;
  review_at: string | null;
  projection_version: number;
  notion_page_id: string | null;
}

export interface NotionWorkerOptions {
  now?: () => Date;
  fetcher?: typeof fetch;
  batchSize?: number;
  leaseMinutes?: number;
  timeoutMs?: number;
}

function parseTopics(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((topic): topic is string => typeof topic === 'string')
      : [];
  } catch {
    return [];
  }
}

function itemProjection(row: NotionItemRow): Record<string, unknown> {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    sourceApp: row.source_app,
    sourceType: row.source_type,
    capturedAt: row.captured_at,
    privacyLevel: row.privacy_level,
    userNote: row.user_note,
    summary: row.summary,
    suggestedAction: row.suggested_action,
    processingStatus: row.processing_status,
    coverage: row.coverage,
    projectionVersion: row.projection_version,
  };
}

export async function processNotionSyncJobs(
  db: D1Database,
  notionToken: string,
  notionDatabaseId: string,
  options: NotionWorkerOptions = {},
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const jobService = new JobService(db);
  const notionService = new NotionSyncService(
    notionToken,
    notionDatabaseId,
    options.fetcher,
    options.timeoutMs,
  );
  const ownerId = `notion-cron:${crypto.randomUUID()}`;
  const attempts = await jobService.leaseSyncAttempts(
    'notion',
    ownerId,
    options.leaseMinutes ?? 2,
    options.batchSize ?? 25,
    now(),
  );

  for (const attempt of attempts) {
    try {
      const item = await db
        .prepare(`SELECT * FROM items WHERE id = ?1 AND deleted_at IS NULL`)
        .bind(attempt.itemId)
        .first<NotionItemRow>();
      if (!item) {
        await jobService.failSyncAttempt(
          attempt.id,
          ownerId,
          'ITEM_NOT_FOUND',
          false,
          5,
          now(),
        );
        continue;
      }
      const syncedAt = now().toISOString();
      const projectionHash = await sha256(JSON.stringify(itemProjection(item)));
      const payload: NotionItemPayload = {
        id: item.id,
        title: item.title ?? undefined,
        sourceUrl: item.source_url ?? undefined,
        sourceApp: item.source_app,
        sourceType: item.source_type,
        capturedAt: item.captured_at,
        privacyLevel: item.privacy_level,
        userNote: item.user_note ?? undefined,
        summary: item.summary ?? undefined,
        project: item.project ?? undefined,
        topics: parseTopics(item.topics_json),
        importance: item.importance ?? undefined,
        suggestedAction: item.suggested_action ?? undefined,
        lifecycleStatus: item.lifecycle_status,
        processingStatus: item.processing_status,
        coverage: item.coverage,
        reviewAt: item.review_at ?? undefined,
        projectionVersion: item.projection_version,
        projectionHash,
        notionPageId: item.notion_page_id ?? undefined,
        syncedAt,
      };
      const result = await notionService.syncItem(payload);
      const persisted = await db
        .prepare(
          `UPDATE items
           SET notion_page_id = ?1, projection_hash = ?2,
               notion_last_synced_at = ?3, notion_missing_at = NULL,
               updated_at = ?3
           WHERE id = ?4
             AND (notion_page_id IS NULL OR notion_page_id = ?1)`,
        )
        .bind(result.pageId, projectionHash, syncedAt, item.id)
        .run();
      if (persisted.meta.changes !== 1) {
        await jobService.failSyncAttempt(
          attempt.id,
          ownerId,
          'NOTION_PAGE_ID_CONFLICT',
          false,
          5,
          now(),
        );
        continue;
      }
      const completed = await jobService.completeSyncAttempt(
        attempt.id,
        ownerId,
        now(),
      );
      if (!completed) {
        console.warn(
          JSON.stringify({
            event: 'notion_sync_lease_lost_after_write',
            item_id: item.id,
            sync_attempt_id: attempt.id,
            mode: result.mode,
          }),
        );
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        const missingAt = now().toISOString();
        await db
          .prepare(
            `UPDATE items SET notion_missing_at = ?1, updated_at = ?1
             WHERE id = ?2`,
          )
          .bind(missingAt, attempt.itemId)
          .run();
      }
      const syncError =
        error instanceof NotionSyncError
          ? error
          : new NotionSyncError('SYNC_INTERNAL_ERROR', true);
      const failureTime = now();
      const exactRetryAt =
        syncError.retryable && syncError.retryAfterSeconds
          ? new Date(
              failureTime.getTime() + syncError.retryAfterSeconds * 1_000,
            )
          : undefined;
      const failed = await jobService.failSyncAttempt(
        attempt.id,
        ownerId,
        syncError.code,
        syncError.retryable,
        5,
        failureTime,
        exactRetryAt,
      );
      if (!failed) {
        console.warn(
          JSON.stringify({
            event: 'notion_sync_failure_after_lease_loss',
            item_id: attempt.itemId,
            sync_attempt_id: attempt.id,
            error_code: syncError.code,
          }),
        );
      }
    }
  }
}
