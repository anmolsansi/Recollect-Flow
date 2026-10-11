import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import {
  applyCaptureFollowUp,
  emptyFollowUp,
  validateFollowUp,
} from './capture-follow-up';

const item = (overrides: Record<string, unknown> = {}) => ({
  item: {
    id: 'item-01',
    edit_version: 4,
    project: null,
    review_at: null,
    duplicate_of: null,
    ...overrides,
  },
});

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

describe('BG-19 two-stage follow-up', () => {
  it('does not add metadata to the strict capture payload or call item API if empty', async () => {
    const api = vi.fn();
    expect(
      await applyCaptureFollowUp('item-01', null, emptyFollowUp(), api),
    ).toEqual({ status: 'none' });
    expect(api).not.toHaveBeenCalled();
  });

  it('GETs version, PATCHes only project/review and verifies server state', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce(item())
      .mockResolvedValueOnce({ item_id: 'item-01', edit_version: 5 })
      .mockResolvedValueOnce(
        item({
          edit_version: 5,
          project: 'Release notes',
          review_at: '2026-10-11T03:30:00.000Z',
        }),
      );
    const prior = env.TZ;
    try {
      env.TZ = 'Asia/Kolkata';
      await expect(
        applyCaptureFollowUp(
          'item-01',
          null,
          { project: ' Release notes ', reviewLocal: '2026-10-11T09:00' },
          api,
        ),
      ).resolves.toEqual({ status: 'applied' });
    } finally {
      if (prior === undefined) delete env.TZ;
      else env.TZ = prior;
    }
    expect(api.mock.calls[1]![0]).toBe('/items/item-01');
    expect(api.mock.calls[1]![1].method).toBe('PATCH');
    expect(JSON.parse(api.mock.calls[1]![1].body)).toEqual({
      edit_version: 4,
      project: 'Release notes',
      review_at: '2026-10-11T03:30:00.000Z',
    });
  });

  it('never overwrites metadata on an older canonical duplicate', async () => {
    const api = vi.fn().mockResolvedValue(item({ project: 'Original' }));
    await expect(
      applyCaptureFollowUp(
        'item-01',
        'item-00',
        { project: 'New', reviewLocal: '' },
        api,
      ),
    ).resolves.toEqual({ status: 'duplicate' });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a concurrent owner edit', async () => {
    const api = vi
      .fn()
      .mockResolvedValue(item({ project: 'Existing project' }));
    await expect(
      applyCaptureFollowUp(
        'item-01',
        null,
        { project: 'Different project', reviewLocal: '' },
        api,
      ),
    ).resolves.toEqual({ status: 'conflict' });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('returns conflict instead of blindly replaying a versioned PATCH', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce(item())
      .mockRejectedValueOnce(new ApiError('stale', 409, 'VERSION_CONFLICT'));
    await expect(
      applyCaptureFollowUp(
        'item-01',
        null,
        { project: 'New', reviewLocal: '' },
        api,
      ),
    ).resolves.toEqual({ status: 'conflict' });
  });

  it('reconciles a prior successful PATCH from server state on retry', async () => {
    const api = vi.fn().mockResolvedValue(item({ project: 'Already there' }));
    await expect(
      applyCaptureFollowUp(
        'item-01',
        null,
        { project: 'Already there', reviewLocal: '' },
        api,
      ),
    ).resolves.toEqual({ status: 'applied' });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('surfaces a network error without pretending capture itself failed', async () => {
    const api = vi.fn().mockRejectedValue(new Error('Network unavailable'));
    await expect(
      applyCaptureFollowUp(
        'item-01',
        null,
        { project: 'New', reviewLocal: '' },
        api,
      ),
    ).rejects.toThrow('Network unavailable');
  });

  it('validates bad date locally and reports the input field', () => {
    expect(
      validateFollowUp({ project: '', reviewLocal: 'broken' }).review_at,
    ).toBeTruthy();
  });
});
