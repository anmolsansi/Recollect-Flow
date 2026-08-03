import { describe, expect, it } from 'vitest';

import { renderDigest } from '../src/digests/digest.renderer';
import type { DigestItemRow, DigestPayload } from '../src/digests/digest.types';

function item(id: string, title: string): DigestItemRow {
  return {
    id,
    title,
    privacyLevel: 'public',
    topicsJson: JSON.stringify(['Long topic name']),
    importance: 90,
    project: null,
    suggestedAction: null,
    lifecycleStatus: 'Inbox',
    capturedAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    deletedAt: null,
  };
}

describe('deterministic digest rendering', () => {
  it('keeps plain-text output within the Telegram message limit', () => {
    const ids = Array.from({ length: 20 }, (_, index) => `item-${index}`);
    const payload: DigestPayload = {
      schemaVersion: '1',
      selectorVersion: '2026-08-03.1',
      digestType: 'weekly',
      periodStart: '2026-07-26T18:30:00.000Z',
      periodEnd: '2026-08-02T18:30:00.000Z',
      timezone: 'Asia/Kolkata',
      eligibleItemIds: ids,
      topicGroups: Array.from({ length: 10 }, (_, index) => ({
        topic: `Long topic name ${index}`,
        itemIds: ids.slice(0, 5),
        count: 5,
      })),
      topItemIds: ids.slice(0, 5),
      suggestedActionItemIds: ids.slice(0, 5),
      failedProcessing: ids.map((id) => ({
        itemId: id,
        errorCode: 'VERY_LONG_SAFE_ERROR_CODE',
        updatedAt: '2026-08-02T00:00:00.000Z',
      })),
      highValueItemIds: ids,
      dormantProjects: Array.from({ length: 10 }, (_, index) => ({
        project: `Dormant project ${index}`,
        itemIds: ids.slice(0, 5),
        lastActivityAt: '2026-01-01T00:00:00.000Z',
      })),
      nearingArchiveItemIds: ids,
      contradictionStatus: 'not_evaluated_no_explicit_relation',
    };
    const items = ids.map((id) =>
      item(id, `A very long title ${id} ${'x'.repeat(80)}`),
    );

    const rendered = renderDigest(
      payload,
      items,
      `https://inbox.example.test/${'path/'.repeat(20)}`,
    );
    expect(rendered.text.length).toBeLessThanOrEqual(4096);
    expect(rendered.text).not.toContain('*');
    expect(rendered.text).not.toContain('parse_mode');
  });
});
