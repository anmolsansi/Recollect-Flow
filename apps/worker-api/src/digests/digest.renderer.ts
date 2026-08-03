import { AppError } from '../shared/errors';
import { digestPayloadSchema } from './digest.schema';
import {
  TELEGRAM_TEXT_LIMIT,
  type DigestItemRow,
  type DigestPayload,
} from './digest.types';

const SAFE_MESSAGE_LIMIT = TELEGRAM_TEXT_LIMIT - 96;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseTopics(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((topic): topic is string => typeof topic === 'string')
          .map((topic) => topic.normalize('NFC').trim())
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function safeLabel(value: string | null, fallback: string): string {
  const normalized = value?.normalize('NFC').replace(/\s+/g, ' ').trim();
  return (normalized || fallback).slice(0, 90);
}

function validatedBaseUrl(value: string): URL {
  const url = new URL(value);
  const localHttp =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.username || url.password) {
    throw new TypeError('WEB_INBOX_BASE_URL must not contain credentials.');
  }
  if (url.protocol !== 'https:' && !localHttp) {
    throw new TypeError(
      'WEB_INBOX_BASE_URL must use HTTPS, except for localhost development.',
    );
  }
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function itemLink(baseUrl: URL, itemId: string): string {
  return new URL(`items/${encodeURIComponent(itemId)}`, baseUrl).toString();
}

function activeItem(item: DigestItemRow | undefined): item is DigestItemRow {
  return Boolean(
    item &&
    !item.deletedAt &&
    item.lifecycleStatus !== 'Deleted' &&
    item.lifecycleStatus !== 'Duplicate',
  );
}

function itemLine(item: DigestItemRow, baseUrl: URL): string {
  const link = itemLink(baseUrl, item.id);
  if (item.privacyLevel === 'public') {
    return `- ${safeLabel(item.title, 'Saved item')}: ${link}`;
  }
  if (item.privacyLevel === 'sensitive') {
    return `- Private item due for review. ${link}`;
  }
  return `- Private item: ${link}`;
}

function safeErrorLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9_.-]{1,80}$/.test(normalized)
    ? normalized
    : 'PROCESSING_FAILED';
}

function localDate(timestamp: string): string {
  const shifted = new Date(new Date(timestamp).getTime() + 330 * 60 * 1_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const date = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function boundDigestMessage(lines: string[]): string {
  const accepted: string[] = [];
  let length = 0;
  for (const line of lines) {
    const addition = `${accepted.length ? '\n' : ''}${line}`;
    if (length + addition.length > SAFE_MESSAGE_LIMIT) {
      if (length + 2 <= SAFE_MESSAGE_LIMIT) accepted.push('…');
      break;
    }
    accepted.push(line);
    length += addition.length;
  }
  return accepted.join('\n');
}

function appendItemSection(
  lines: string[],
  heading: string,
  itemIds: readonly string[],
  items: Map<string, DigestItemRow>,
  baseUrl: URL,
): number {
  const selected = itemIds
    .map((id) => items.get(id))
    .filter(activeItem)
    .slice(0, 10);
  lines.push('', `${heading}:`);
  if (selected.length === 0) {
    lines.push('- None');
    return 0;
  }
  for (const item of selected) lines.push(itemLine(item, baseUrl));
  return selected.length;
}

export function referencedItemIds(payload: DigestPayload): string[] {
  const ids = new Set<string>([
    ...payload.eligibleItemIds,
    ...payload.topItemIds,
    ...payload.suggestedActionItemIds,
    ...payload.highValueItemIds,
    ...payload.nearingArchiveItemIds,
    ...payload.failedProcessing.map((failure) => failure.itemId),
  ]);
  for (const group of payload.topicGroups) {
    for (const id of group.itemIds) ids.add(id);
  }
  for (const project of payload.dormantProjects) {
    for (const id of project.itemIds) ids.add(id);
  }
  return [...ids].sort(compareText);
}

export interface RenderedDigest {
  text: string;
  empty: boolean;
  currentEligibleCount: number;
}

export function renderDigest(
  rawPayload: DigestPayload,
  currentItems: readonly DigestItemRow[],
  webInboxBaseUrl: string,
): RenderedDigest {
  const payload = digestPayloadSchema.parse(rawPayload);
  const baseUrl = validatedBaseUrl(webInboxBaseUrl);
  const items = new Map(currentItems.map((item) => [item.id, item]));
  const currentEligible = payload.eligibleItemIds
    .map((id) => items.get(id))
    .filter(activeItem);
  const currentFailed = payload.failedProcessing.filter((failure) =>
    activeItem(items.get(failure.itemId)),
  );

  const lines: string[] = [];
  if (payload.digestType === 'daily') {
    lines.push(`Daily digest — ${localDate(payload.periodStart)} IST`);
  } else {
    const endInclusive = new Date(new Date(payload.periodEnd).getTime() - 1);
    lines.push(
      `Weekly review — ${localDate(payload.periodStart)} to ${localDate(endInclusive.toISOString())} IST`,
    );
  }
  lines.push(`Items saved: ${currentEligible.length}`);

  lines.push(
    '',
    payload.digestType === 'weekly' ? 'Repeated themes:' : 'Topic groups:',
  );
  let visibleTopicGroups = 0;
  for (const group of payload.topicGroups) {
    const publicMembers = group.itemIds.filter((id) => {
      const item = items.get(id);
      return (
        activeItem(item) &&
        item.privacyLevel === 'public' &&
        parseTopics(item.topicsJson).some(
          (topic) =>
            topic.toLocaleLowerCase('en-US') ===
            group.topic.toLocaleLowerCase('en-US'),
        )
      );
    });
    if (publicMembers.length === 0) continue;
    visibleTopicGroups += 1;
    lines.push(
      `- ${safeLabel(group.topic, 'Topic')} (${publicMembers.length})`,
    );
  }
  if (visibleTopicGroups === 0) lines.push('- None');

  appendItemSection(lines, 'Top items', payload.topItemIds, items, baseUrl);

  lines.push('', 'Failed processing:');
  if (currentFailed.length === 0) {
    lines.push('- None');
  } else {
    for (const failure of currentFailed.slice(0, 10)) {
      const item = items.get(failure.itemId)!;
      lines.push(
        `- ${safeErrorLabel(failure.errorCode)} — ${itemLink(baseUrl, item.id)}`,
      );
    }
  }

  let visibleProjects = 0;
  if (payload.digestType === 'weekly') {
    appendItemSection(
      lines,
      'Unreviewed high-value items',
      payload.highValueItemIds,
      items,
      baseUrl,
    );

    lines.push('', 'Dormant projects:');
    for (const project of payload.dormantProjects) {
      const stillPublic = project.itemIds.some((id) => {
        const item = items.get(id);
        return (
          activeItem(item) &&
          item.privacyLevel === 'public' &&
          item.project?.trim().toLocaleLowerCase('en-US') ===
            project.project.trim().toLocaleLowerCase('en-US')
        );
      });
      if (!stillPublic) continue;
      visibleProjects += 1;
      lines.push(
        `- ${safeLabel(project.project, 'Project')} (inactive since ${localDate(project.lastActivityAt)})`,
      );
    }
    if (visibleProjects === 0) lines.push('- None');

    lines.push('', 'Contradictions requiring review:');
    lines.push(
      '- Not evaluated: no explicit contradiction relation is stored.',
    );

    appendItemSection(
      lines,
      'Items nearing archive',
      payload.nearingArchiveItemIds,
      items,
      baseUrl,
    );
  }

  lines.push('', 'Suggested actions:');
  const currentSuggestedActions = payload.suggestedActionItemIds
    .map((id) => items.get(id))
    .filter(activeItem)
    .filter((item) => Boolean(item.suggestedAction?.trim()))
    .slice(0, 5);
  for (const item of currentSuggestedActions) {
    lines.push(`- Review saved item: ${itemLink(baseUrl, item.id)}`);
  }
  if (currentFailed.length > 0) {
    lines.push(
      `- Retry or inspect ${currentFailed.length} failed processing job(s).`,
    );
  }
  const currentHighValue = payload.highValueItemIds.filter((id) =>
    activeItem(items.get(id)),
  ).length;
  if (currentHighValue > 0) {
    lines.push(`- Review ${currentHighValue} high-value Inbox item(s).`);
  }
  const currentArchive = payload.nearingArchiveItemIds.filter((id) =>
    activeItem(items.get(id)),
  ).length;
  if (currentArchive > 0) {
    lines.push(
      `- Review ${currentArchive} item(s) before archival eligibility.`,
    );
  }
  if (
    currentSuggestedActions.length === 0 &&
    currentFailed.length === 0 &&
    currentHighValue === 0 &&
    currentArchive === 0
  ) {
    lines.push('- None');
  }

  const empty =
    currentEligible.length === 0 &&
    currentFailed.length === 0 &&
    (payload.digestType === 'daily' ||
      (currentHighValue === 0 &&
        currentArchive === 0 &&
        visibleProjects === 0));

  return {
    text: boundDigestMessage(lines),
    empty,
    currentEligibleCount: currentEligible.length,
  };
}

export function parseDigestPayload(value: string): DigestPayload {
  return digestPayloadSchema.parse(JSON.parse(value) as unknown);
}

export function renderAiProjection(
  rawPayload: DigestPayload,
  currentItems: readonly DigestItemRow[],
): string {
  const payload = digestPayloadSchema.parse(rawPayload);
  const items = new Map(currentItems.map((item) => [item.id, item]));
  const currentEligibleCount = payload.eligibleItemIds.filter((id) =>
    activeItem(items.get(id)),
  ).length;
  const currentFailedCount = payload.failedProcessing.filter((failure) =>
    activeItem(items.get(failure.itemId)),
  ).length;
  const publicTopics = payload.topicGroups
    .map((group) => {
      const count = group.itemIds.filter((id) => {
        const item = items.get(id);
        return (
          activeItem(item) &&
          item.privacyLevel === 'public' &&
          parseTopics(item.topicsJson).some(
            (topic) =>
              topic.toLocaleLowerCase('en-US') ===
              group.topic.toLocaleLowerCase('en-US'),
          )
        );
      }).length;
      return count > 0 ? `${safeLabel(group.topic, 'Topic')} (${count})` : null;
    })
    .filter((value): value is string => value !== null);

  const lines = [
    `Digest type: ${payload.digestType}`,
    `Eligible item count: ${currentEligibleCount}`,
    `Failed processing count: ${currentFailedCount}`,
    `Suggested-action item count: ${
      payload.suggestedActionItemIds.filter((id) => {
        const item = items.get(id);
        return activeItem(item) && Boolean(item.suggestedAction?.trim());
      }).length
    }`,
    `Public topic groups: ${publicTopics.length ? publicTopics.join(', ') : 'none'}`,
  ];
  if (payload.digestType === 'weekly') {
    lines.push(
      `High-value Inbox count: ${payload.highValueItemIds.filter((id) => activeItem(items.get(id))).length}`,
      `Nearing-archive count: ${payload.nearingArchiveItemIds.filter((id) => activeItem(items.get(id))).length}`,
      `Dormant public project count: ${
        payload.dormantProjects.filter((project) =>
          project.itemIds.some((id) => {
            const item = items.get(id);
            return activeItem(item) && item.privacyLevel === 'public';
          }),
        ).length
      }`,
    );
  }
  return lines.join('\n');
}

function containsControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    );
  });
}

function invalidAiText(value: string): boolean {
  return (
    !value.trim() ||
    value.length > 500 ||
    /https?:\/\/|www\.|t\.me|\/items\//i.test(value) ||
    containsControlCharacters(value)
  );
}

export function renderAiWording(result: {
  summary: string;
  suggestedActions: string[];
}): string {
  if (invalidAiText(result.summary) || result.suggestedActions.length > 10) {
    throw new AppError(
      500,
      'AI_INVALID_OUTPUT',
      'Digest AI wording failed output validation.',
    );
  }
  const actions = result.suggestedActions.slice(0, 3);
  if (actions.some(invalidAiText)) {
    throw new AppError(
      500,
      'AI_INVALID_OUTPUT',
      'Digest AI wording failed output validation.',
    );
  }
  const lines = [safeLabel(result.summary, 'Digest summary')];
  for (const action of actions) {
    const label = safeLabel(action, 'Review saved items');
    if (label) lines.push(`- ${label}`);
  }
  return boundDigestMessage(lines).slice(0, 1_200);
}

export function combineDigestText(
  aiText: string | null,
  deterministicText: string,
): string {
  if (!aiText?.trim()) return deterministicText;
  return boundDigestMessage([
    ...aiText.split('\n'),
    '',
    ...deterministicText.split('\n'),
  ]);
}
