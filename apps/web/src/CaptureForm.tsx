import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchApi } from './api';
import {
  CAPTURE_CATEGORIES,
  buildCapturePayload,
  captureDraftFromPayload,
  emptyCaptureDraft,
  validateCapture,
  type CaptureDraft,
  type CaptureMode,
} from './capture-model';

import {
  clearCaptureOperations, deleteCaptureOperation, isRecoveryEnabled,
  listCaptureOperations, newCaptureOperation, saveCaptureOperation,
  setRecoveryEnabled, type CaptureOperation,
} from './capture-recovery';

interface CaptureResult {
  capture_id: string;
  replayed: boolean;
  duplicate_of: string | null;
  processing_status: string;
  privacy_level: string;
}

function label(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CaptureForm() {
  const [draft, setDraft] = useState<CaptureDraft>(emptyCaptureDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [pending, setPending] = useState<CaptureOperation | null>(null);
  const [queue, setQueue] = useState<CaptureOperation[]>([]);
  const [durable, setDurable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    let alive = true;
    const enabled = isRecoveryEnabled();
    setDurable(enabled);
    if (!enabled) { setLoaded(true); return () => { alive = false; }; }
    void listCaptureOperations().then((records) => {
      if (alive) setQueue(records);
    }).catch((error: unknown) => {
      if (alive) setStorageWarning(error instanceof Error ? error.message : 'Draft recovery failed.');
    }).finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  async function remember(operation: CaptureOperation) {
    if (!durable) return;
    if (operation.payload.privacy_level === 'sensitive') {
      setStorageWarning('Sensitive captures are not stored in browser recovery. Keep this tab open.');
      return;
    }
    try { await saveCaptureOperation(operation); }
    catch (error) {
      setStorageWarning('Unfinished capture was NOT retained on this device: ' +
        (error instanceof Error ? error.message : 'Browser storage failed.') +
        ' Keep the tab open until resolved.');
    }
  }

  async function toggleDurable(value: boolean) {
    setStorageWarning('');
    if (value) {
      try {
        setRecoveryEnabled(true);
        setDurable(true);
        for (const operation of queue) {
          if (operation.payload.privacy_level !== 'sensitive')
            await saveCaptureOperation(operation);
        }
      } catch (error) {
        setStorageWarning('Recovery is not guaranteed: ' +
          (error instanceof Error ? error.message : 'Browser storage failed.'));
      }
    } else {
      try {
        await clearCaptureOperations();
        setRecoveryEnabled(false);
        setDurable(false);
      } catch (error) {
        setStorageWarning('Failed to clear stored drafts: ' +
          (error instanceof Error ? error.message : 'Browser storage failed.'));
      }
    }
  }

  async function retry(operation: CaptureOperation) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure('');
    setPending(operation);
    setQueue((items) => items.some((item) => item.id === operation.id)
      ? items : [...items, operation]);
    // Write ahead: a lost response can be replayed using the original key and payload.
    await remember(operation);
    try {
      const response = await fetchApi<CaptureResult>('/captures', {
        method: 'POST', body: JSON.stringify(operation.payload),
      });
      setResult(response);
      setPending(null);
      setQueue((items) => items.filter((item) => item.id !== operation.id));
      setDraft(emptyCaptureDraft());
      try { await deleteCaptureOperation(operation.id); }
      catch { setStorageWarning('Saved, but the old retry record could not be cleared. Discard it locally.'); }
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.details) {
        setErrors(error.details);
        setDraft(captureDraftFromPayload(operation.payload));
        setPending(null);
        setQueue((items) => items.filter((item) => item.id !== operation.id));
        try { await deleteCaptureOperation(operation.id); }
        catch { setStorageWarning('The rejected retry could not be deleted from browser storage.'); }
        const first = Object.keys(error.details)[0];
        window.requestAnimationFrame(() =>
          form.current?.querySelector<HTMLElement>('[name="' + first + '"]')?.focus(),
        );
      } else {
        const next: CaptureOperation = {
          ...operation,
          stage: error instanceof ApiError && (error.status === 401 || error.status === 403)
            ? 'auth_required' : 'uncertain',
          lastError: error instanceof Error ? error.message.slice(0, 300) : 'Uncertain outcome',
        };
        setPending(next);
        setQueue((items) => items.map((item) => item.id === next.id ? next : item));
        await remember(next);
      }
      setFailure(error instanceof ApiError && error.code === 'IDEMPOTENCY_CONFLICT'
        ? 'The server rejected this idempotency key for different content. Check Inbox before discarding the local retry.'
        : error instanceof Error ? error.message : 'Save outcome unknown. Retry the same operation.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function discard(id: string) {
    if (lock.current || !window.confirm(
      'Discard this local retry? The item may already exist on the server. Discard does not delete a server item.',
    )) return;
    try {
      await deleteCaptureOperation(id);
      setQueue((items) => items.filter((entry) => entry.id !== id));
      if (pending?.id === id) { setPending(null); setFailure(''); }
    } catch (error) {
      setStorageWarning('Cannot delete browser record: ' +
        (error instanceof Error ? error.message : 'Browser storage failed.'));
    }
  }
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  function change<K extends keyof CaptureDraft>(
    field: K,
    value: CaptureDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({
      ...previous,
      [field === 'sharedText'
        ? 'shared_text'
        : field === 'reason'
          ? 'user_reason'
          : field === 'category'
            ? 'quick_category'
            : field]: '',
    }));
    setFailure('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || result || !loaded) return;
    if (pending) { await retry(pending); return; }
    const nextErrors = validateCapture(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      window.requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>('[name="' + first + '"]')?.focus(),
      );
      return;
    }
    const payload = buildCapturePayload(
      draft, crypto.randomUUID(), new Date().toISOString(), '0.0.0',
    );
    await retry(newCaptureOperation(payload));
  }

  function reset() {
    setResult(null);
    setPending(null);
    setErrors({});
    setFailure('');
  }

  return (
    <main className="main-content fade-in">
      <div className="capture-heading">
        <div>
          <Link to="/">← Back to Inbox</Link>
          <h1>Save something</h1>
          <p className="capture-muted">
            Capture a webpage, pasted content, or a personal note.
          </p>
        </div>
        <Link className="btn btn-outline" to="/">
          Cancel
        </Link>
      </div>
      <section className="card capture-recovery-controls" aria-label="Capture recovery settings">
        <label className="capture-mode">
          <input type="checkbox" checked={durable} disabled={!loaded || busy}
            onChange={(event) => void toggleDurable(event.target.checked)} />
          Keep unfinished captures on this device for up to seven days
        </label>
        <p className="capture-muted">
          Off by default. When on, unfinished text, URLs, reasons, privacy choices
          and retry keys are stored in this browser without encryption. Avoid shared
          devices. Sensitive captures and original files are never stored. Disable
          this or log out to clear drafts. Browser storage is not a backup.
        </p>
        {!loaded && <p role="status">Restoring unfinished captures…</p>}
        {storageWarning && <p role="alert" className="capture-error">{storageWarning}</p>}
        {queue.length > 0 && <div className="capture-queued">
          <h2>Unfinished save attempts</h2>
          <p className="capture-muted">The server outcome may be uncertain. Retry
            resends the identical submission. Discard only removes the local record.</p>
          {queue.map((item) => <div key={item.id} className="capture-queued-entry">
            <p>{label(item.payload.source_type)} · {new Date(item.createdAt).toLocaleString()}
              {item.stage === 'auth_required' ? ' · Sign in to retry' : ' · Not confirmed saved'}</p>
            <div className="capture-actions">
              <button type="button" className="btn btn-outline"
                disabled={busy || !loaded} onClick={() => void retry(item)}>Retry original</button>
              <button type="button" className="btn btn-outline"
                disabled={busy || !loaded} onClick={() => void discard(item.id)}>Discard local retry</button>
            </div>
          </div>)}
        </div>}
      </section>
      {result ? (
        <section className="card" aria-live="polite" role="status">
          <h2>
            {result.replayed || result.duplicate_of ? 'Already Saved' : 'Saved'}
          </h2>
          <p>
            Your capture is durable. Processing and optional enrichment can
            continue separately.
          </p>
          <p>Processing status: {result.processing_status}</p>
          {result.duplicate_of && (
            <p>
              This capture reused an existing item. Your capture event and
              reason are retained.
            </p>
          )}
          <div className="capture-actions">
            <Link
              className="btn btn-primary"
              to={`/items/${result.capture_id}`}
            >
              Open saved item
            </Link>
            <button className="btn btn-outline" type="button" onClick={reset}>
              Save another
            </button>
          </div>
        </section>
      ) : (
        <form
          ref={form}
          className="card capture-form"
          onSubmit={submit}
          noValidate
        >
          <fieldset disabled={busy || !!pending || !loaded} className="capture-modes">
            <legend>What are you saving?</legend>
            {(['url', 'text', 'note'] as CaptureMode[]).map((mode) => (
              <label key={mode} className="capture-mode">
                <input
                  type="radio"
                  name="mode"
                  value={mode}
                  checked={draft.mode === mode}
                  onChange={() => change('mode', mode)}
                />
                {mode === 'url'
                  ? 'Web link'
                  : mode === 'text'
                    ? 'Pasted text'
                    : 'Note'}
              </label>
            ))}
          </fieldset>
          {draft.mode === 'url' ? (
            <div className="capture-field">
              <label htmlFor="capture-url">
                URL <span aria-hidden="true">*</span>
              </label>
              <input
                id="capture-url"
                name="url"
                className="input"
                type="url"
                maxLength={2048}
                required
                value={draft.url}
                aria-invalid={!!errors.url}
                aria-describedby="url-help url-error"
                onChange={(event) => change('url', event.target.value)}
                disabled={busy || !!pending || !loaded}
              />
              <small id="url-help" className="capture-muted">
                A saved link may have limited extraction coverage. Saving does
                not guarantee readable article text.
              </small>
              {errors.url && (
                <small className="capture-error" id="url-error">
                  {errors.url}
                </small>
              )}
            </div>
          ) : (
            <div className="capture-field">
              <label htmlFor="capture-text">
                {draft.mode === 'note' ? 'Note' : 'Pasted text'}{' '}
                <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="capture-text"
                name="shared_text"
                className="input"
                rows={7}
                maxLength={100000}
                required
                value={draft.sharedText}
                aria-invalid={!!errors.shared_text}
                aria-describedby="shared-text-error"
                onChange={(event) => change('sharedText', event.target.value)}
                disabled={busy || !!pending || !loaded}
              />
              {errors.shared_text && (
                <small className="capture-error" id="shared-text-error">
                  {errors.shared_text}
                </small>
              )}
            </div>
          )}
          <div className="capture-field">
            <label htmlFor="capture-reason">
              Why are you saving this? (optional)
            </label>
            <textarea
              id="capture-reason"
              name="user_reason"
              className="input"
              rows={3}
              maxLength={2000}
              value={draft.reason}
              aria-invalid={!!errors.user_reason}
              aria-describedby="reason-error"
              onChange={(event) => change('reason', event.target.value)}
              disabled={busy || !!pending || !loaded}
            />
            {errors.user_reason && (
              <small className="capture-error" id="reason-error">
                {errors.user_reason}
              </small>
            )}
          </div>
          <div className="capture-options">
            <div className="capture-field">
              <label htmlFor="capture-category">Quick category</label>
              <select
                id="capture-category"
                name="quick_category"
                className="input"
                value={draft.category}
                onChange={(event) =>
                  change(
                    'category',
                    event.target.value as CaptureDraft['category'],
                  )
                }
                disabled={busy || !!pending || !loaded}
              >
                <option value="">No category</option>
                {CAPTURE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {label(category)}
                  </option>
                ))}
              </select>
            </div>
            <div className="capture-field">
              <label htmlFor="capture-privacy">Privacy</label>
              <select
                id="capture-privacy"
                name="privacy_level"
                className="input"
                value={draft.privacy}
                onChange={(event) =>
                  change(
                    'privacy',
                    event.target.value as CaptureDraft['privacy'],
                  )
                }
                disabled={busy || !!pending || !loaded}
              >
                <option value="unknown">Unknown (default)</option>
                <option value="public">Public</option>
                <option value="personal">Personal</option>
                <option value="sensitive">Sensitive</option>
              </select>
              <small className="capture-muted">
                Unknown won't enable unapproved AI processing. Personal requires
                separate consent for hosted processing. Sensitive stays
                protected.
              </small>
            </div>
          </div>
          {failure && (
            <p role="alert" className="capture-error">
              {failure}
            </p>
          )}
          {pending && (
            <p role="status">
              This request may have reached the server. Retry the identical
              operation, or start a separate draft. An uncertain response is not Saved.
            </p>
          )}
          <div className="capture-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !loaded}>
              {busy ? 'Saving…' : pending ? 'Retry same save' : 'Save capture'}
            </button>
            {pending && (
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setPending(null);
                  setDraft(emptyCaptureDraft());
                  setFailure('A separate draft is ready. The previous retry remains listed above.');
                }}
              >
                Start new operation
              </button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
