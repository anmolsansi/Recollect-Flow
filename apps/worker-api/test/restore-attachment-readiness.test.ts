import { describe, expect, it } from 'vitest';

import { inspectRestoreAttachments } from '../src/recovery/restore-attachment-readiness';
import type { RestorePlan } from '../src/recovery/restore-plan';

function plan(
  attachments: Record<string, unknown>[],
  skippedPurgedItemIds: string[] = [],
): RestorePlan {
  return {
    items: [
      {
        item: { id: 'live-item' },
        attachments,
      },
    ],
    purgeReceipts: [],
    skippedPurgedItemIds,
  } as unknown as RestorePlan;
}

function bucket(objects: Record<string, number>): R2Bucket {
  return {
    head: async (key: string) =>
      objects[key] === undefined ? null : { size: objects[key] },
  } as unknown as R2Bucket;
}

const original = {
  id: 'attachment-a',
  object_key: 'attachments/synthetic/file.pdf',
  size_bytes: 3,
  status: 'linked',
};

describe('BG-28 isolated attachment restore preflight', () => {
  it('requires the original object and its byte count', async () => {
    const missing = await inspectRestoreAttachments(
      plan([original]),
      bucket({}),
    );
    expect(missing).toEqual({
      checked: 1,
      problems: [
        {
          itemId: 'live-item',
          attachmentId: 'attachment-a',
          reason: 'missing',
        },
      ],
    });
    const truncated = await inspectRestoreAttachments(
      plan([original]),
      bucket({ 'attachments/synthetic/file.pdf': 2 }),
    );
    expect(truncated.problems[0]?.reason).toBe('size_mismatch');
    expect(
      await inspectRestoreAttachments(
        plan([original]),
        bucket({ 'attachments/synthetic/file.pdf': 3 }),
      ),
    ).toEqual({ checked: 1, problems: [] });
  });

  it('does not require deleted attachment bytes', async () => {
    expect(
      await inspectRestoreAttachments(
        plan([{ ...original, status: 'deleted' }]),
        bucket({}),
      ),
    ).toEqual({ checked: 0, problems: [] });
  });

  it('does not treat pending uploads as durable originals', async () => {
    expect(
      await inspectRestoreAttachments(
        plan([{ ...original, status: 'pending' }]),
        bucket({}),
      ),
    ).toEqual({ checked: 0, problems: [] });
  });

  it('rejects malformed attachment metadata before any apply', async () => {
    await expect(
      inspectRestoreAttachments(
        plan([{ ...original, size_bytes: -1 }]),
        bucket({}),
      ),
    ).rejects.toMatchObject({
      code: 'RESTORE_ATTACHMENT_REFERENCE_INVALID',
    });
  });
});
