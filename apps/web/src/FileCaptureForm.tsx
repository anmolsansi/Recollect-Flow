import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from './api';
import {
  CAPTURE_CATEGORIES,
  type CaptureCategory,
  type CapturePrivacy,
} from './capture-model';
import {
  canRetryCapture,
  deleteCaptureOperation,
  isRecoveryEnabled,
  listCaptureOperations,
  saveCaptureOperation,
  type CaptureOperation,
} from './capture-recovery';
import {
  hashOriginalFile,
  loadUploadPolicy,
  prepareFileOperation,
  restartExpiredUpload,
  runFileCapture,
  validateBrowserFile,
  type FileCaptureResult,
  type UploadPolicy,
} from './file-upload';

const isFile = (operation: CaptureOperation) =>
  operation.payload.source_type === 'image' ||
  operation.payload.source_type === 'file';

export function FileCaptureForm() {
  const [policy, setPolicy] = useState<UploadPolicy | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  const [privacy, setPrivacy] = useState<CapturePrivacy>('unknown');
  const [category, setCategory] = useState<'' | CaptureCategory>('');
  const [operation, setOperation] = useState<CaptureOperation | null>(null);
  const [queue, setQueue] = useState<CaptureOperation[]>([]);
  const [result, setResult] = useState<FileCaptureResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [durable] = useState(isRecoveryEnabled);
  const lock = useRef(false);
  const lastAttempts = useRef(new Map<string, number>());
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadUploadPolicy(),
      durable ? listCaptureOperations() : Promise.resolve([]),
    ])
      .then(([config, entries]) => {
        if (!active) return;
        setPolicy(config);
        setQueue(entries.filter(isFile));
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to read upload settings.',
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [durable]);

  async function retain(next: CaptureOperation) {
    setOperation(next);
    setQueue((entries) =>
      entries.some((entry) => entry.id === next.id)
        ? entries.map((entry) => (entry.id === next.id ? next : entry))
        : [...entries, next],
    );
    if (!durable || next.payload.privacy_level === 'sensitive') return;
    try {
      await saveCaptureOperation(next);
    } catch (cause) {
      setWarning(
        'Local recovery was not saved. Keep this tab open: ' +
          (cause instanceof Error ? cause.message : 'Browser storage failure.'),
      );
    }
  }

  async function execute(initial: CaptureOperation, selected: File | null) {
    if (lock.current) return;
    const time = Date.now();
    if (!canRetryCapture(lastAttempts.current.get(initial.id), time)) {
      setError(
        'Retry is briefly paused to avoid repeated requests. Try again shortly.',
      );
      return;
    }
    lastAttempts.current.set(initial.id, time);
    lock.current = true;
    setBusy(true);
    setError('');
    setResult(null);
    let latest = initial;
    const abort = new AbortController();
    controller.current = abort;
    try {
      await retain(initial);
      const saved = await runFileCapture(
        initial,
        selected,
        async (next, description) => {
          latest = next;
          setStage(description);
          await retain(next);
        },
        abort.signal,
      );
      setResult(saved);
      setStage('');
      setOperation(null);
      setFile(null);
      setQueue((entries) => entries.filter((entry) => entry.id !== latest.id));
      lastAttempts.current.delete(initial.id);
      if (durable) {
        try {
          await deleteCaptureOperation(latest.id);
        } catch {
          setWarning(
            'Saved, but local retry cleanup failed. Clear it before retrying.',
          );
        }
      }
    } catch (cause) {
      const next = {
        ...latest,
        stage:
          cause instanceof ApiError && [401, 403].includes(cause.status)
            ? ('auth_required' as const)
            : ('uncertain' as const),
        lastError:
          cause instanceof Error
            ? cause.message.slice(0, 300)
            : 'Unknown outcome',
      };
      await retain(next);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Upload outcome unknown. Retry after checking the original.',
      );
      setStage('Retry needed');
    } finally {
      lock.current = false;
      controller.current = null;
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !loaded || !policy || result) return;
    if (operation) {
      await execute(operation, file);
      return;
    }
    if (!file) {
      setError('Choose one file first.');
      return;
    }
    const admission = validateBrowserFile(file, policy);
    if (admission) {
      setError(admission);
      return;
    }
    if (reason.length > 2000) {
      setError('Reason can be at most 2,000 characters.');
      return;
    }
    setBusy(true);
    setStage('Preparing checksum');
    lock.current = true;
    const preparing = new AbortController();
    controller.current = preparing;
    let prepared: CaptureOperation | null = null;
    try {
      const checksum = await hashOriginalFile(file);
      if (preparing.signal.aborted) {
        setError('File preparation canceled. Nothing was uploaded.');
        return;
      }
      prepared = prepareFileOperation(file, checksum, reason, privacy, category);
      await retain(prepared);
      if (preparing.signal.aborted) {
        setError('File preparation canceled. Nothing was uploaded.');
        return;
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to read file. Reselect it.',
      );
    } finally {
      controller.current = null;
      lock.current = false;
      setBusy(false);
      setStage('');
    }
    if (prepared && !preparing.signal.aborted) await execute(prepared, file);
  }

  async function discard() {
    if (
      busy ||
      !operation ||
      !window.confirm(
        'Discard this local retry? It may already be saved on the server. This does not delete any server attachment or item.',
      )
    )
      return;
    if (durable) {
      try {
        await deleteCaptureOperation(operation.id);
      } catch {
        setWarning('Unable to delete local retry.');
        return;
      }
    }
    setQueue((entries) => entries.filter((entry) => entry.id !== operation.id));
    setOperation(null);
    setFile(null);
    setError('');
    setStage('');
  }

  async function restartExpired() {
    if (
      !operation ||
      !operation.attachment ||
      !window.confirm(
        'Create a replacement upload reservation? The expired object is left for safe server cleanup.',
      )
    )
      return;
    const next = restartExpiredUpload(operation);
    await retain(next);
    setError(
      'The old reservation was replaced locally. Reselect the original file and choose Retry.',
    );
  }

  return (
    <main className="main-content fade-in">
      <div className="capture-heading">
        <div>
          <Link to="/capture">← Back to text and link capture</Link>
          <h1>Upload one file</h1>
          <p className="capture-muted">
            The file is only Saved when its original bytes are finalized and
            linked to an item.
          </p>
        </div>
        <Link to="/" className="btn btn-outline">
          Cancel
        </Link>
      </div>
      <section className="card capture-form">
        <p className="capture-muted">
          {durable
            ? 'Browser recovery is enabled. File name, size, hash, stage and retry key may be retained for up to seven days. Original bytes are never stored here.'
            : 'Browser recovery is off. Keep this tab open until Saved. You can enable it from the text capture page.'}{' '}
          Sensitive uploads never store a recovery record.
        </p>
        {!loaded && <p role="status">Checking server upload limits…</p>}
        {policy && (
          <p className="capture-muted">
            Server limit: {policy.max_size_bytes.toLocaleString()} bytes.
            Browser file recovery supports up to 25,000,000 bytes (25 MB).
            Accepted types: {policy.allowed_mime_types.join(', ')}.
          </p>
        )}
        {queue.length > 0 && (
          <div className="capture-queued">
            <h2>Unfinished file saves</h2>
            {queue.map((entry) => (
              <div key={entry.id} className="capture-queued-entry">
                <p>
                  {entry.attachment?.name} · {entry.attachment?.stage} · Not
                  confirmed Saved
                </p>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => {
                    setResult(null);
                    setOperation(entry);
                    setFile(null);
                    setError('');
                    setReason(entry.payload.user_reason ?? '');
                    setPrivacy(entry.payload.privacy_level);
                    setCategory(entry.payload.quick_category ?? '');
                  }}
                >
                  Resume this save
                </button>
              </div>
            ))}
          </div>
        )}
        {result ? (
          <section role="status" aria-live="polite">
            <h2>
              {result.replayed || result.duplicate_of
                ? 'Already Saved'
                : 'Saved'}
            </h2>
            <p>
              Original bytes finalized and capture confirmed. Processing may
              continue separately.
            </p>
            <Link
              className="btn btn-primary"
              to={'/items/' + result.capture_id}
            >
              Open saved item
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setResult(null);
                setOperation(null);
                setFile(null);
                setReason('');
                setPrivacy('unknown');
                setCategory('');
                setError('');
              }}
            >
              Upload another
            </button>
          </section>
        ) : (
          <form onSubmit={(event) => void submit(event)} noValidate>
            <div className="capture-field">
              <label htmlFor="capture-file">Choose one original file</label>
              <input
                className="input"
                id="capture-file"
                type="file"
                name="file"
                disabled={busy || !loaded || !policy}
                accept={policy?.allowed_mime_types.join(',')}
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] ?? null;
                  setFile(selected);
                  setError('');
                }}
              />
              {file && (
                <small className="capture-muted">
                  Selected: {file.name}, {file.size.toLocaleString()} bytes
                </small>
              )}
              {operation && (
                <small className="capture-muted">
                  Original pending: {operation.attachment?.name}. Reselect the
                  identical original if bytes are needed. Saving always reuses
                  the same capture key and timestamp.
                </small>
              )}
            </div>
            <div className="capture-field">
              <label htmlFor="file-reason">
                Why are you saving this? (optional)
              </label>
              <textarea
                className="input"
                id="file-reason"
                maxLength={2000}
                rows={3}
                value={reason}
                disabled={busy || !!operation}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="capture-options">
              <div className="capture-field">
                <label htmlFor="file-category">Quick category</label>
                <select
                  id="file-category"
                  className="input"
                  value={category}
                  disabled={busy || !!operation}
                  onChange={(event) =>
                    setCategory(event.target.value as '' | CaptureCategory)
                  }
                >
                  <option value="">No category</option>
                  {CAPTURE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="capture-field">
                <label htmlFor="file-privacy">Privacy</label>
                <select
                  id="file-privacy"
                  className="input"
                  value={privacy}
                  disabled={busy || !!operation}
                  onChange={(event) =>
                    setPrivacy(event.target.value as CapturePrivacy)
                  }
                >
                  <option value="unknown">Unknown (default)</option>
                  <option value="public">Public</option>
                  <option value="personal">Personal</option>
                  <option value="sensitive">Sensitive</option>
                </select>
              </div>
            </div>
            {warning && (
              <p role="alert" className="capture-error">
                {warning}
              </p>
            )}
            {error && (
              <p role="alert" className="capture-error">
                {error}
              </p>
            )}
            {busy && (
              <p role="status" aria-live="polite">
                {stage || 'Working…'} (progress unavailable)
              </p>
            )}
            {!busy && operation && (
              <p role="status">
                Retry needed. The server may already have accepted one stage. We
                will check its status before proceeding.
              </p>
            )}
            <div className="capture-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !loaded || !policy}
              >
                {busy
                  ? stage || 'Working…'
                  : operation
                    ? 'Retry original save'
                    : 'Upload and save'}
              </button>
              {busy && (
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => controller.current?.abort()}
                >
                  Stop request
                </button>
              )}
              {operation && !busy && (
                <>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => void discard()}
                  >
                    Discard local retry
                  </button>
                  {error.includes('UPLOAD_EXPIRED') && (
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => void restartExpired()}
                    >
                      Restart expired upload
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
