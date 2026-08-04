import type { DigestPeriod } from './digest-period';
import {
  ARCHIVE_RETENTION_DAYS,
  ARCHIVE_WARNING_DAYS,
  DIGEST_SCHEMA_VERSION,
  DIGEST_SELECTOR_VERSION,
  DORMANT_PROJECT_DAYS,
  HIGH_VALUE_THRESHOLD,
  type DigestDormantProject,
  type DigestFailedProcessing,
  type DigestItemRow,
  type DigestPayload,
  type DigestTopicGroup,
} from './digest.types';

interface ItemDatabaseRow {
  id: string;
  title: string | null;
  privacy_level: DigestItemRow['privacyLevel'];
  topics_json: string;
  importance: number | null;
  project: string | null;
  suggested_action: string | null;
  lifecycle_status: string;
  captured_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface FailedDatabaseRow {
  item_id: string;
  last_error_code: string | null;
  updated_at: string;
}

interface ProjectDatabaseRow {
  id: string;
  project: string;
  updated_at: string;
}

function safeErrorCode(value: string | null): string {
  const normalized = (value ?? 'PROCESSING_FAILED').trim().toUpperCase();
  return /^[A-Z0-9_.-]{1,80}$/.test(normalized)
    ? normalized
    : 'PROCESSING_FAILED';
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseTopics(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((topic): topic is string => typeof topic === 'string')
      .map((topic) => topic.normalize('NFC').trim().slice(0, 100))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function mapItem(row: ItemDatabaseRow): DigestItemRow {
  return {
    id: row.id,
    title: row.title,
    privacyLevel: row.privacy_level,
    topicsJson: row.topics_json,
    importance: row.importance,
    project: row.project,
    suggestedAction: row.suggested_action,
    lifecycleStatus: row.lifecycle_status,
    capturedAt: row.captured_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function rankedItems(items: DigestItemRow[]): DigestItemRow[] {
  return [...items].sort((left, right) => {
    const importance = (right.importance ?? -1) - (left.importance ?? -1);
    if (importance !== 0) return importance;
    const captured = compareText(right.capturedAt, left.capturedAt);
    return captured !== 0 ? captured : compareText(left.id, right.id);
  });
}

function topicGroups(
  items: DigestItemRow[],
  minimumCount: number,
): DigestTopicGroup[] {
  const groups = new Map<
    string,
    { label: string; itemIds: Set<string>; count: number }
  >();

  for (const item of items) {
    if (item.privacyLevel !== 'public') continue;
    const uniqueTopics = new Map<string, string>();
    for (const topic of parseTopics(item.topicsJson)) {
      const key = topic.toLocaleLowerCase('en-US');
      const current = uniqueTopics.get(key);
      if (!current || compareText(topic, current) < 0)
        uniqueTopics.set(key, topic);
    }
    for (const [key, topic] of uniqueTopics) {
      const existing = groups.get(key) ?? {
        label: topic,
        itemIds: new Set<string>(),
        count: 0,
      };
      existing.label =
        compareText(topic, existing.label) < 0 ? topic : existing.label;
      existing.itemIds.add(item.id);
      existing.count += 1;
      groups.set(key, existing);
    }
  }

  return [...groups.values()]
    .filter((group) => group.count >= minimumCount)
    .sort((left, right) => {
      const count = right.count - left.count;
      return count !== 0 ? count : compareText(left.label, right.label);
    })
    .slice(0, 10)
    .map((group) => ({
      topic: group.label,
      itemIds: [...group.itemIds].sort(compareText).slice(0, 5),
      count: group.count,
    }));
}

export class DigestSelector {
  constructor(private readonly db: D1Database) {}

  async select(period: DigestPeriod): Promise<DigestPayload> {
    const periodRows = await this.db
      .prepare(
        `SELECT id, title, privacy_level, topics_json, importance, project, suggested_action,
                lifecycle_status, captured_at, updated_at, deleted_at
         FROM items
         WHERE deleted_at IS NULL
           AND lifecycle_status NOT IN ('Deleted', 'Duplicate')
           AND captured_at >= ?1 AND captured_at < ?2
         ORDER BY captured_at DESC, id ASC`,
      )
      .bind(period.start, period.end)
      .all<ItemDatabaseRow>();
    const periodItems = (periodRows.results ?? []).map(mapItem);

    const failedRows = await this.db
      .prepare(
        `SELECT p.item_id, COALESCE(p.last_error_code, 'PROCESSING_FAILED') AS last_error_code,
                p.updated_at
         FROM processing_jobs p
         INNER JOIN items i ON i.id = p.item_id
         WHERE p.status = 'failed'
           AND p.updated_at >= ?1 AND p.updated_at < ?2
           AND i.deleted_at IS NULL
           AND i.lifecycle_status NOT IN ('Deleted', 'Duplicate')
         ORDER BY p.updated_at DESC, p.id ASC
         LIMIT 20`,
      )
      .bind(period.start, period.end)
      .all<FailedDatabaseRow>();
    const failedProcessing: DigestFailedProcessing[] = (
      failedRows.results ?? []
    ).map((row) => ({
      itemId: row.item_id,
      errorCode: safeErrorCode(row.last_error_code),
      updatedAt: row.updated_at,
    }));

    let highValueItemIds: string[] = [];
    let dormantProjects: DigestDormantProject[] = [];
    let nearingArchiveItemIds: string[] = [];

    if (period.digestType === 'weekly') {
      const highValueRows = await this.db
        .prepare(
          `SELECT id, title, privacy_level, topics_json, importance, project, suggested_action,
                  lifecycle_status, captured_at, updated_at, deleted_at
           FROM items
           WHERE deleted_at IS NULL
             AND lifecycle_status = 'Inbox'
             AND importance >= ?1
           ORDER BY importance DESC, captured_at ASC, id ASC
           LIMIT 20`,
        )
        .bind(HIGH_VALUE_THRESHOLD)
        .all<ItemDatabaseRow>();
      highValueItemIds = (highValueRows.results ?? []).map((row) => row.id);

      const dormantCutoff = new Date(
        new Date(period.end).getTime() - DORMANT_PROJECT_DAYS * 86_400_000,
      ).toISOString();
      const projectRows = await this.db
        .prepare(
          `SELECT id, project, updated_at
           FROM items
           WHERE deleted_at IS NULL
             AND lifecycle_status NOT IN ('Deleted', 'Duplicate')
             AND privacy_level = 'public'
             AND project IS NOT NULL AND trim(project) <> ''
           ORDER BY project ASC, updated_at DESC, id ASC`,
        )
        .all<ProjectDatabaseRow>();
      const projectMap = new Map<
        string,
        { project: string; itemIds: string[]; lastActivityAt: string }
      >();
      for (const row of projectRows.results ?? []) {
        const project = row.project.normalize('NFC').trim().slice(0, 100);
        if (!project) continue;
        const key = project.toLocaleLowerCase('en-US');
        const current = projectMap.get(key);
        if (!current) {
          projectMap.set(key, {
            project,
            itemIds: [row.id],
            lastActivityAt: row.updated_at,
          });
          continue;
        }
        if (current.itemIds.length < 5) current.itemIds.push(row.id);
        if (row.updated_at > current.lastActivityAt) {
          current.lastActivityAt = row.updated_at;
        }
        if (compareText(project, current.project) < 0)
          current.project = project;
      }
      dormantProjects = [...projectMap.values()]
        .filter((project) => project.lastActivityAt < dormantCutoff)
        .sort((left, right) => {
          const activity = compareText(
            left.lastActivityAt,
            right.lastActivityAt,
          );
          return activity !== 0
            ? activity
            : compareText(left.project, right.project);
        })
        .slice(0, 10);

      const archiveWindowStart = new Date(
        new Date(period.end).getTime() - ARCHIVE_RETENTION_DAYS * 86_400_000,
      ).toISOString();
      const archiveWindowEnd = new Date(
        new Date(period.end).getTime() -
          (ARCHIVE_RETENTION_DAYS - ARCHIVE_WARNING_DAYS) * 86_400_000,
      ).toISOString();
      const archiveRows = await this.db
        .prepare(
          `SELECT id
           FROM items
           WHERE deleted_at IS NULL
             AND lifecycle_status = 'Inbox'
             AND captured_at >= ?1 AND captured_at < ?2
           ORDER BY captured_at ASC, id ASC
           LIMIT 20`,
        )
        .bind(archiveWindowStart, archiveWindowEnd)
        .all<{ id: string }>();
      nearingArchiveItemIds = (archiveRows.results ?? []).map((row) => row.id);
    }

    const ranked = rankedItems(periodItems);
    return {
      schemaVersion: DIGEST_SCHEMA_VERSION,
      selectorVersion: DIGEST_SELECTOR_VERSION,
      digestType: period.digestType,
      periodStart: period.start,
      periodEnd: period.end,
      timezone: period.timezone,
      eligibleItemIds: periodItems.map((item) => item.id).sort(compareText),
      topicGroups: topicGroups(
        periodItems,
        period.digestType === 'weekly' ? 2 : 1,
      ),
      topItemIds: ranked.slice(0, 5).map((item) => item.id),
      suggestedActionItemIds: ranked
        .filter((item) => Boolean(item.suggestedAction?.trim()))
        .slice(0, 10)
        .map((item) => item.id),
      failedProcessing,
      highValueItemIds,
      dormantProjects,
      nearingArchiveItemIds,
      contradictionStatus: 'not_evaluated_no_explicit_relation',
    };
  }
}
