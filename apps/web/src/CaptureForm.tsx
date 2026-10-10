import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchApi } from './api';
import {
  CAPTURE_CATEGORIES,
  buildCapturePayload,
  emptyCaptureDraft,
  validateCapture,
  type CaptureDraft,
  type CapturePayload,
  type CaptureMode,
} from './capture-model';

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
  const [pending, setPending] = useState<CapturePayload | null>(null);
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
    if (lock.current || result) return;
    if (!pending) {
      const nextErrors = validateCapture(draft);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) {
        const first = Object.keys(nextErrors)[0];
        window.requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus(),
        );
        return;
      }
    }
    const payload =
      pending ??
      buildCapturePayload(
        draft,
        crypto.randomUUID(),
        new Date().toISOString(),
        '0.0.0',
      );
    setPending(payload);
    lock.current = true;
    setBusy(true);
    setFailure('');
    try {
      const response = await fetchApi<CaptureResult>('/captures', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(response);
      setPending(null);
      setDraft(emptyCaptureDraft());
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.details) {
        const fields = error.details;
        setErrors(fields);
        const first = Object.keys(fields)[0];
        window.requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus(),
        );
        setPending(null);
      }
      setFailure(
        error instanceof Error ? error.message : 'Unable to save. Try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function reset() {
    setDraft(emptyCaptureDraft());
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
          <fieldset disabled={busy || !!pending} className="capture-modes">
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
                disabled={busy || !!pending}
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
                disabled={busy || !!pending}
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
              disabled={busy || !!pending}
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
                disabled={busy || !!pending}
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
                disabled={busy || !!pending}
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
              The save result is uncertain. Retry the identical operation, or
              cancel to start a separate capture. The existing request may
              already have saved.
            </p>
          )}
          <div className="capture-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : pending ? 'Retry same save' : 'Save capture'}
            </button>
            {pending && (
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setPending(null);
                  setFailure(
                    'Started a new operation. The previous request may already have saved.',
                  );
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
