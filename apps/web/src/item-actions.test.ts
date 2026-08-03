import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './api';
import {
  feedbackConfirmation,
  latestFeedbackType,
  runVersionedAction,
} from './item-actions';

describe('item detail actions', () => {
  it('uses the latest server version for soft delete instead of a stale UI version', async () => {
    const execute = vi.fn().mockResolvedValue({ edit_version: 8 });
    const refresh = vi.fn().mockResolvedValue(undefined);

    const result = await runVersionedAction({
      loadLatestVersion: vi.fn().mockResolvedValue(7),
      execute,
      refresh,
    });

    expect(result).toEqual({ ok: true, data: { edit_version: 8 } });
    expect(execute).toHaveBeenCalledWith(7);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('refreshes the item and resolves safely after a version conflict', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const conflict = new ApiError(
      'Item version conflict',
      409,
      'VERSION_CONFLICT',
    );

    await expect(
      runVersionedAction({
        loadLatestVersion: vi.fn().mockResolvedValue(3),
        execute: vi.fn().mockRejectedValue(conflict),
        refresh,
      }),
    ).resolves.toMatchObject({ ok: false, conflict: true, error: conflict });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('uses the newest feedback event as the visible selection', () => {
    expect(
      latestFeedbackType([
        {
          feedback_type: 'already_used',
          created_at: '2026-08-03T10:00:00.000Z',
        },
        {
          feedback_type: 'useful',
          created_at: '2026-08-03T09:00:00.000Z',
        },
      ]),
    ).toBe('already_used');
  });

  it('provides explicit feedback confirmation copy', () => {
    expect(feedbackConfirmation('not_relevant')).toBe(
      'Feedback recorded: not relevant.',
    );
  });
});
