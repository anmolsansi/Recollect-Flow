import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import type {
  ItemDetailData,
  ItemResponse,
  SearchItem,
} from '@recollect/contracts';

import {
  ApiError,
  fetchApi,
  fetchApiEnvelope,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from './api';
import {
  FEEDBACK_TYPES,
  feedbackConfirmation,
  feedbackLabel,
  latestFeedbackType,
  runVersionedAction,
} from './item-actions';
import './index.css';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';
type LifecycleFilter =
  | 'All'
  | 'Inbox'
  | 'Reviewed'
  | 'Actioned'
  | 'Archived'
  | 'Duplicate'
  | 'Deleted';

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
    return 'This item changed in another session. Reload it before saving.';
  }
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminSession()
      .then(() => setAuthState('authenticated'))
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  if (authState === 'checking') {
    return <div className="main-content">Checking session…</div>;
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="app-container" style={{ justifyContent: 'center' }}>
        <div
          className="card"
          style={{ width: 420, maxWidth: '90%', margin: '10vh auto' }}
        >
          <h2>Admin Access</h2>
          {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              try {
                await loginAdmin(inputToken);
                setAuthState('authenticated');
              } catch (loginError) {
                setError(messageFor(loginError));
              }
            }}
          >
            <input
              className="input"
              type="password"
              placeholder="Enter ADMIN_TOKEN"
              value={inputToken}
              onChange={(event) => setInputToken(event.target.value)}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12 }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Inbox() {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [filter, setFilter] = useState<LifecycleFilter>('All');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (cursor?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (query.trim()) params.set('q', query.trim());
      if (topic.trim()) params.set('topic', topic.trim());
      if (filter !== 'All') params.set('lifecycle_status', filter);
      if (cursor) params.set('cursor', cursor);

      const response = await fetchApiEnvelope<SearchItem[]>(
        `/items?${params.toString()}`,
      );
      setItems((current) =>
        cursor ? [...current, ...response.data] : response.data,
      );
      setNextCursor(response.meta.next_cursor);
    } catch (loadError) {
      setError(messageFor(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [filter, query, topic]);

  return (
    <main className="main-content fade-in">
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}
      >
        <h1>Inbox</h1>
        <button
          className="btn"
          onClick={() => logoutAdmin().then(() => window.location.reload())}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <input
          className="input"
          aria-label="Search"
          placeholder="Search saved content"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <input
          className="input"
          aria-label="Topic"
          placeholder="Topic filter"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
      </div>

      <div className="inbox-filters" style={{ marginTop: 16 }}>
        {(
          [
            'All',
            'Inbox',
            'Reviewed',
            'Actioned',
            'Archived',
            'Duplicate',
            'Deleted',
          ] as const
        ).map((status) => (
          <button
            key={status}
            className={`filter-chip ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
      {loading && items.length === 0 ? <p>Loading…</p> : null}

      <div className="inbox-grid">
        {items.map((item) => (
          <Link
            to={`/items/${item.id}`}
            key={item.id}
            className="card hover-lift"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span className="badge">{item.lifecycle_status}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {new Date(item.captured_at).toLocaleString()}
              </span>
            </div>
            <h3>{item.title || 'Untitled'}</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {item.snippet?.segments.map((segment, index) =>
                segment.highlighted ? (
                  <mark key={index}>{segment.text}</mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
              {item.snippet?.truncated ? '…' : null}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.coverage && <span className="badge">{item.coverage}</span>}
              {item.topics.map((value) => (
                <span className="badge" key={value}>
                  {value}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {nextCursor && (
        <button
          className="btn btn-outline"
          disabled={loading}
          onClick={() => void load(nextCursor)}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <strong>{label}</strong>
      {children}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ItemDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ItemDetailData | null>(null);
  const [draft, setDraft] = useState<ItemResponse | null>(null);
  const [original, setOriginal] = useState<ItemResponse | null>(null);
  const [topicsText, setTopicsText] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mutationLock = useRef(false);

  const load = async () => {
    setError('');
    try {
      const response = await fetchApi<ItemDetailData>(`/items/${id}`);
      setDetail(response);
      setDraft(response.item);
      setOriginal(response.item);
      setTopicsText(response.item.topics.join(', '));
      setDuplicateTarget(response.item.duplicate_of ?? '');
    } catch (loadError) {
      setError(messageFor(loadError));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const changed = useMemo(() => {
    if (!draft || !original) return false;
    return (
      JSON.stringify(draft) !== JSON.stringify(original) ||
      topicsText !== original.topics.join(', ')
    );
  }, [draft, original, topicsText]);

  if (!draft || !detail || !original) {
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
  };

  const save = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    let version = original.edit_version;
    try {
      const topics = topicsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const genericChanged =
        draft.title !== original.title ||
        draft.summary !== original.summary ||
        draft.project !== original.project ||
        draft.importance !== original.importance ||
        draft.suggested_action !== original.suggested_action ||
        draft.review_at !== original.review_at ||
        JSON.stringify(topics) !== JSON.stringify(original.topics);

      if (genericChanged) {
        const result = await fetchApi<{
          item_id: string;
          edit_version: number;
        }>(`/items/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            edit_version: version,
            title: draft.title,
            summary: draft.summary,
            topics,
            project: draft.project,
            importance: draft.importance,
            suggested_action: draft.suggested_action,
            review_at: draft.review_at,
          }),
        });
        version = result.edit_version;
      }

      if (draft.lifecycle_status !== original.lifecycle_status) {
        const result = await fetchApi<{
          item_id: string;
          edit_version: number;
        }>(`/items/${id}/status`, {
          method: 'POST',
          body: JSON.stringify({
            edit_version: version,
            lifecycle_status: draft.lifecycle_status,
          }),
        });
        version = result.edit_version;
      }

      if (draft.privacy_level !== original.privacy_level) {
        await fetchApi(`/items/${id}/privacy`, {
          method: 'PATCH',
          body: JSON.stringify({
            edit_version: version,
            privacy_level: draft.privacy_level,
            derived_data_action: 'reprocess',
          }),
        });
      }

      await load();
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
  };

  return (
    <main className="main-content fade-in">
      <button className="btn btn-outline" onClick={() => navigate('/')}>
        ← Back to Inbox
      </button>
      <h1>{draft.title || 'Untitled'}</h1>
      {error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <Section title="Review">
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Title">
            <input
              className="input"
              value={draft.title ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </Field>
          <Field label="Summary">
            <textarea
              className="input"
              rows={4}
              value={draft.summary ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, summary: event.target.value })
              }
            />
          </Field>
          <Field label="Project">
            <input
              className="input"
              value={draft.project ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, project: event.target.value || null })
              }
            />
          </Field>
          <Field label="Topics">
            <input
              className="input"
              value={topicsText}
              onChange={(event) => setTopicsText(event.target.value)}
            />
          </Field>
          <Field label="Importance">
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              value={draft.importance ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  importance:
                    event.target.value === ''
                      ? null
                      : Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Suggested action">
            <input
              className="input"
              value={draft.suggested_action ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  suggested_action: event.target.value || null,
                })
              }
            />
          </Field>
          <Field label="Review date">
            <input
              className="input"
              type="datetime-local"
              value={draft.review_at?.slice(0, 16) ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  review_at: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                })
              }
            />
          </Field>
          <Field label="Lifecycle">
            <select
              className="input"
              value={draft.lifecycle_status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  lifecycle_status: event.target
                    .value as ItemResponse['lifecycle_status'],
                })
              }
            >
              {['Inbox', 'Reviewed', 'Actioned', 'Archived'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Privacy">
            <select
              className="input"
              value={draft.privacy_level}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  privacy_level: event.target
                    .value as ItemResponse['privacy_level'],
                })
              }
            >
              {['unknown', 'public', 'personal', 'sensitive'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <button
            className="btn btn-primary"
            disabled={saving || !changed}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Section>

      <Section title="Source and coverage">
        <p>
          <strong>Captured:</strong>{' '}
          {new Date(draft.captured_at).toLocaleString()}
        </p>
        <p>
          <strong>Source:</strong> {draft.source_app} / {draft.source_type}
        </p>
        <p>
          <strong>Coverage:</strong> {draft.coverage ?? 'Unknown'}
        </p>
        <p>
          <strong>Processing:</strong> {draft.processing_status ?? 'Unknown'}
        </p>
        <textarea
          className="input"
          rows={8}
          readOnly
          value={draft.raw_text ?? ''}
        />
      </Section>

      <Section title="Attachments and extraction">
        {detail.attachments.length === 0 && <p>No attachments.</p>}
        {detail.attachments.map((attachment) => (
          <article
            key={attachment.id}
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: 12,
            }}
          >
            <strong>{attachment.file_name}</strong>
            <p>
              {attachment.detected_content_type ??
                attachment.declared_content_type}
              , {attachment.size_bytes} bytes, {attachment.status}
            </p>
            <a href={`/api/v1/attachments/${attachment.id}/content`}>
              Download
            </a>
          </article>
        ))}
        {detail.extractions.map((extraction) => (
          <article key={extraction.attachment_id} style={{ marginTop: 14 }}>
            <p>
              <strong>{extraction.completeness}</strong>, coverage{' '}
              {extraction.coverage ?? 'unknown'}
            </p>
            {extraction.error_code && <p>Error: {extraction.error_code}</p>}
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {extraction.extracted_text ?? extraction.image_description}
            </pre>
          </article>
        ))}
      </Section>

      <Section title="Jobs and sync attempts">
        {detail.processing_jobs.map((job) => (
          <div
            key={job.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span>
              {job.jobType}: {job.visibleStatus}{' '}
              {job.lastErrorCode ? `(${job.lastErrorCode})` : ''}
            </span>
            {job.visibleStatus === 'failed' && (
              <button
                className="btn btn-outline"
                disabled={saving}
                onClick={() =>
                  void mutate(
                    `/jobs/${job.id}/retry?kind=processing`,
                    { method: 'POST' },
                    'Processing job queued for retry.',
                  )
                }
              >
                Retry
              </button>
            )}
          </div>
        ))}
        {detail.sync_attempts.map((attempt) => (
          <div
            key={attempt.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span>
              {attempt.destination}: {attempt.visibleStatus}{' '}
              {attempt.lastErrorCode ? `(${attempt.lastErrorCode})` : ''}
            </span>
            {attempt.visibleStatus === 'failed' &&
              attempt.lastErrorCode !== 'NOTION_PAGE_MISSING' && (
                <button
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() =>
                    void mutate(
                      `/jobs/${attempt.id}/retry?kind=sync`,
                      { method: 'POST' },
                      'Sync attempt queued for retry.',
                    )
                  }
                >
                  Retry
                </button>
              )}
          </div>
        ))}
        {draft.notion_missing_at && (
          <button
            className="btn btn-outline"
            disabled={saving}
            onClick={() =>
              void mutate(
                `/items/${id}/notion/recreate`,
                { method: 'POST' },
                'Notion page recreation queued.',
              )
            }
          >
            Recreate missing Notion page
          </button>
        )}
      </Section>

      <Section title="Feedback">
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
      </Section>

      <Section title="Duplicate handling">
        <Field label="Canonical item ID">
          <input
            className="input"
            value={duplicateTarget}
            onChange={(event) => setDuplicateTarget(event.target.value)}
          />
        </Field>
        <button
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
        >
          Mark duplicate
        </button>
      </Section>

      <Section title="Recovery actions">
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
      </Section>

      <Section title="Provenance and audit history">
        <h3>Capture events</h3>
        {detail.provenance.capture_events.map((event) => (
          <p key={event.id}>
            {new Date(event.created_at).toLocaleString()} · {event.source_app} ·
            duplicate of {event.duplicate_of ?? 'none'}
          </p>
        ))}
        <h3>Provider usage</h3>
        {detail.provenance.provider_usage.map((usage) => (
          <p key={usage.id}>
            {usage.provider} · {usage.operation} · {usage.status ?? 'recorded'}
          </p>
        ))}
        <h3>Audit</h3>
        {detail.audit_history.map((event) => (
          <details key={event.id}>
            <summary>
              {new Date(event.created_at).toLocaleString()} · {event.event_type}
            </summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{event.details_json}</pre>
          </details>
        ))}
      </Section>
    </main>
  );
}

function Layout() {
  return (
    <div className="app-container">
      <nav className="navbar glass">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h2>Recollect Flow</h2>
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<Inbox />} />
        <Route path="/items/:id" element={<ItemDetail />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Layout />
      </AuthGuard>
    </BrowserRouter>
  );
}
