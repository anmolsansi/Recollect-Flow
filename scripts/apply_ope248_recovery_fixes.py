from pathlib import Path


def replace_once(source: str, before: str, after: str, label: str) -> str:
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"Expected one {label}, found {count}")
    return source.replace(before, after, 1)


app_path = Path("apps/web/src/App.tsx")
app = app_path.read_text()

app = replace_once(
    app,
    "import { useEffect, useMemo, useState } from 'react';",
    "import { useEffect, useMemo, useRef, useState } from 'react';",
    "React hook import",
)

app = replace_once(
    app,
    """} from './api';
import './index.css';""",
    """} from './api';
import {
  FEEDBACK_TYPES,
  feedbackConfirmation,
  feedbackLabel,
  latestFeedbackType,
  runVersionedAction,
} from './item-actions';
import './index.css';""",
    "item action imports",
)

app = replace_once(
    app,
    """  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');""",
    """  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mutationLock = useRef(false);""",
    "item detail state",
)

app = replace_once(
    app,
    """  if (!draft || !detail || !original) {
    return <main className="main-content">{error || 'Loading…'}</main>;
  }

  const mutate = async <T,>(endpoint: string, options: RequestInit) => {
    setSaving(true);
    setError('');
    try {
      const result = await fetchApi<T>(endpoint, options);
      await load();
      return result;
    } catch (mutationError) {
      setError(messageFor(mutationError));
      throw mutationError;
    } finally {
      setSaving(false);
    }
  };""",
    """  if (!draft || !detail || !original) {
    return <main className="main-content">{error || 'Loading…'}</main>;
  }

  const selectedFeedback = latestFeedbackType(detail.feedback);

  const mutate = async <T,>(
    endpoint: string,
    options: RequestInit,
    successMessage?: string,
  ): Promise<T | undefined> => {
    if (mutationLock.current) return undefined;
    mutationLock.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await fetchApi<T>(endpoint, options);
      await load();
      if (successMessage) setNotice(successMessage);
      return result;
    } catch (mutationError) {
      if (
        mutationError instanceof ApiError &&
        mutationError.code === 'VERSION_CONFLICT'
      ) {
        await load();
        setError('The item changed and was refreshed. Retry the action.');
      } else {
        setError(messageFor(mutationError));
      }
      return undefined;
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const mutateVersioned = async <T,>(
    endpoint: string,
    payload: (editVersion: number) => Record<string, unknown>,
    successMessage: string,
  ): Promise<T | undefined> => {
    if (mutationLock.current) return undefined;
    if (changed) {
      setError('Save or refresh your edits before running this action.');
      return undefined;
    }

    mutationLock.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const outcome = await runVersionedAction<T>({
        loadLatestVersion: async () => {
          const latest = await fetchApi<ItemDetailData>(`/items/${id}`);
          return latest.item.edit_version;
        },
        execute: (editVersion) =>
          fetchApi<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload(editVersion)),
          }),
        refresh: async () => {
          await load();
        },
      });

      if (outcome.ok) {
        setNotice(successMessage);
        return outcome.data;
      }

      setError(
        outcome.conflict
          ? 'The item changed and was refreshed. Retry the action.'
          : messageFor(outcome.error),
      );
      return undefined;
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };""",
    "safe mutation helpers",
)

app = replace_once(
    app,
    """  const save = async () => {
    setSaving(true);
    setError('');""",
    """  const save = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setError('');
    setNotice('');""",
    "save start",
)

app = replace_once(
    app,
    """      await load();
    } catch (saveError) {
      setError(messageFor(saveError));
    } finally {
      setSaving(false);
    }
  };""",
    """      await load();
      setNotice('Changes saved.');
    } catch (saveError) {
      if (
        saveError instanceof ApiError &&
        saveError.code === 'VERSION_CONFLICT'
      ) {
        await load();
        setError(
          'The item changed and was refreshed. Review and retry your edit.',
        );
      } else {
        setError(messageFor(saveError));
      }
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };""",
    "save completion",
)

app = replace_once(
    app,
    """      <h1>{draft.title || 'Untitled'}</h1>
      {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}""",
    """      <h1>{draft.title || 'Untitled'}</h1>
      {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}""",
    "notice rendering",
)

app = replace_once(
    app,
    """              <button
                className="btn btn-outline"
                onClick={() =>
                  void mutate(`/jobs/${job.id}/retry?kind=processing`, {
                    method: 'POST',
                  })
                }
              >""",
    """              <button
                className="btn btn-outline"
                disabled={saving}
                onClick={() =>
                  void mutate(
                    `/jobs/${job.id}/retry?kind=processing`,
                    { method: 'POST' },
                    'Processing job queued for retry.',
                  )
                }
              >""",
    "processing retry button",
)

app = replace_once(
    app,
    """                <button
                  className="btn btn-outline"
                  onClick={() =>
                    void mutate(`/jobs/${attempt.id}/retry?kind=sync`, {
                      method: 'POST',
                    })
                  }
                >""",
    """                <button
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() =>
                    void mutate(
                      `/jobs/${attempt.id}/retry?kind=sync`,
                      { method: 'POST' },
                      'Sync attempt queued for retry.',
                    )
                  }
                >""",
    "sync retry button",
)

app = replace_once(
    app,
    """          <button
            className="btn btn-outline"
            onClick={() =>
              void mutate(`/items/${id}/notion/recreate`, { method: 'POST' })
            }
          >""",
    """          <button
            className="btn btn-outline"
            disabled={saving}
            onClick={() =>
              void mutate(
                `/items/${id}/notion/recreate`,
                { method: 'POST' },
                'Notion page recreation queued.',
              )
            }
          >""",
    "Notion recreation button",
)

app = replace_once(
    app,
    """      <Section title="Feedback">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(
            ['useful', 'not_relevant', 'already_used', 'outdated'] as const
          ).map((feedbackType) => (
            <button
              className="btn btn-outline"
              key={feedbackType}
              onClick={() =>
                void mutate(`/items/${id}/feedback`, {
                  method: 'POST',
                  body: JSON.stringify({
                    idempotency_key: crypto.randomUUID(),
                    feedback_type: feedbackType,
                    source_surface: 'web_item_detail',
                  }),
                })
              }
            >
              {feedbackType.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </Section>""",
    """      <Section title="Feedback">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FEEDBACK_TYPES.map((feedbackType) => {
            const selected = selectedFeedback === feedbackType;
            return (
              <button
                aria-pressed={selected}
                className={selected ? 'btn btn-primary' : 'btn btn-outline'}
                disabled={saving}
                key={feedbackType}
                onClick={() =>
                  void mutate(
                    `/items/${id}/feedback`,
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        idempotency_key: crypto.randomUUID(),
                        feedback_type: feedbackType,
                        source_surface: 'web_item_detail',
                      }),
                    },
                    feedbackConfirmation(feedbackType),
                  )
                }
              >
                {feedbackLabel(feedbackType)}
              </button>
            );
          })}
        </div>
        <p>
          Current feedback:{' '}
          <strong>
            {selectedFeedback ? feedbackLabel(selectedFeedback) : 'none'}
          </strong>
        </p>
      </Section>""",
    "feedback section",
)

app = replace_once(
    app,
    """        <button
          className="btn btn-outline"
          disabled={!duplicateTarget || saving}
          onClick={() =>
            void mutate(`/items/${id}/duplicate`, {
              method: 'POST',
              body: JSON.stringify({
                edit_version: draft.edit_version,
                duplicate_of: duplicateTarget,
              }),
            })
          }
        >""",
    """        <button
          className="btn btn-outline"
          disabled={!duplicateTarget || saving || changed}
          onClick={() =>
            void mutateVersioned(
              `/items/${id}/duplicate`,
              (editVersion) => ({
                edit_version: editVersion,
                duplicate_of: duplicateTarget,
              }),
              'Item marked as a duplicate.',
            )
          }
        >""",
    "duplicate button",
)

app = replace_once(
    app,
    """      <Section title="Recovery actions">
        {draft.deleted_at ? (
          <button
            className="btn btn-outline"
            onClick={() =>
              void mutate(`/items/${id}/restore`, {
                method: 'POST',
                body: JSON.stringify({ edit_version: draft.edit_version }),
              })
            }
          >
            Restore item
          </button>
        ) : (
          <button
            className="btn btn-outline"
            onClick={() =>
              void mutate(`/items/${id}/delete`, {
                method: 'POST',
                body: JSON.stringify({ edit_version: draft.edit_version }),
              })
            }
          >
            Soft delete
          </button>
        )}
      </Section>""",
    """      <Section title="Recovery actions">
        {changed && <p>Save or refresh edits before using recovery actions.</p>}
        {draft.deleted_at ? (
          <button
            className="btn btn-outline"
            disabled={saving || changed}
            onClick={() =>
              void mutateVersioned(
                `/items/${id}/restore`,
                (editVersion) => ({ edit_version: editVersion }),
                'Item restored.',
              )
            }
          >
            Restore item
          </button>
        ) : (
          <button
            className="btn btn-outline"
            disabled={saving || changed}
            onClick={() =>
              void mutateVersioned(
                `/items/${id}/delete`,
                (editVersion) => ({ edit_version: editVersion }),
                'Item moved to Deleted.',
              )
            }
          >
            Soft delete
          </button>
        )}
      </Section>""",
    "recovery actions",
)

app_path.write_text(app)

Path("apps/web/src/item-actions.ts").write_text(
    """import { ApiError } from './api';

export const FEEDBACK_TYPES = [
  'useful',
  'not_relevant',
  'already_used',
  'outdated',
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

interface FeedbackEvent {
  feedback_type: string;
  created_at?: string;
}

export function feedbackLabel(type: FeedbackType): string {
  return type.replaceAll('_', ' ');
}

export function feedbackConfirmation(type: FeedbackType): string {
  return `Feedback recorded: ${feedbackLabel(type)}.`;
}

export function latestFeedbackType(
  events: readonly FeedbackEvent[],
): FeedbackType | null {
  const latest = events.find((event) =>
    FEEDBACK_TYPES.includes(event.feedback_type as FeedbackType),
  );
  return latest ? (latest.feedback_type as FeedbackType) : null;
}

export function isVersionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'VERSION_CONFLICT';
}

interface VersionedActionOptions<T> {
  loadLatestVersion: () => Promise<number>;
  execute: (editVersion: number) => Promise<T>;
  refresh: () => Promise<void>;
}

export type VersionedActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; conflict: boolean; error: unknown };

export async function runVersionedAction<T>(
  options: VersionedActionOptions<T>,
): Promise<VersionedActionResult<T>> {
  try {
    const editVersion = await options.loadLatestVersion();
    const data = await options.execute(editVersion);
    await options.refresh();
    return { ok: true, data };
  } catch (error) {
    const conflict = isVersionConflict(error);
    if (conflict) {
      try {
        await options.refresh();
      } catch {
        // Preserve the original version conflict for the caller.
      }
    }
    return { ok: false, conflict, error };
  }
}
"""
)

Path("apps/web/src/item-actions.test.ts").write_text(
    """import { describe, expect, it, vi } from 'vitest';

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
"""
)

search_path = Path("apps/worker-api/src/search/search.service.ts")
search = search_path.read_text()
search = replace_once(
    search,
    """  const conditions = [
    'i.deleted_at IS NULL',
    `i.privacy_level IN (${ADMIN_VISIBLE_PRIVACY_LEVELS.map(() => '?').join(', ')})`,
  ];""",
    """  const conditions = [
    input.lifecycle_status === 'Deleted'
      ? 'i.deleted_at IS NOT NULL'
      : 'i.deleted_at IS NULL',
    `i.privacy_level IN (${ADMIN_VISIBLE_PRIVACY_LEVELS.map(() => '?').join(', ')})`,
  ];""",
    "deleted-item search condition",
)
search_path.write_text(search)

search_test_path = Path("apps/worker-api/test/search.d1.spec.ts")
search_test = search_test_path.read_text()
search_test = replace_once(
    search_test,
    """  it('rejects malformed cursors, invalid JSON, wrong versions, and query mismatches', async () => {""",
    """  it('lists soft-deleted items through the Deleted lifecycle filter', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `
      INSERT INTO items (
        id, idempotency_key, source_type, source_app, privacy_level,
        processing_status, lifecycle_status, deleted_at,
        captured_at, created_at, updated_at, title
      ) VALUES (
        'deleted-filter-item', 'deleted-filter-key', 'url', 'web', 'public',
        'complete', 'Deleted', ?1, ?1, ?1, ?1, 'Deleted filter test'
      )
    `,
    )
      .bind(now)
      .run();

    const deleted = await executeSearch(env.DB, {
      lifecycle_status: 'Deleted',
      limit: 25,
    });
    expect(deleted.data.map((item) => item.id)).toContain(
      'deleted-filter-item',
    );

    const normal = await executeSearch(env.DB, { limit: 25 });
    expect(normal.data.map((item) => item.id)).not.toContain(
      'deleted-filter-item',
    );
  });

  it('rejects malformed cursors, invalid JSON, wrong versions, and query mismatches', async () => {""",
    "Deleted lifecycle search test",
)
search_test_path.write_text(search_test)
