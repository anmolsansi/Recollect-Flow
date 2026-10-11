import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { applyCaptureFollowUp, hasFollowUp, type FollowUpDraft } from './capture-follow-up';
import { deletePendingFollowUp } from './follow-up-recovery';

export function FollowUpFields({
  value,
  onChange,
  disabled,
  errors = {},
}: {
  value: FollowUpDraft;
  onChange: (value: FollowUpDraft) => void;
  disabled: boolean;
  errors?: Record<string, string>;
}) {
  return (
    <fieldset className="capture-follow-up">
      <legend>Optional follow-up after saving</legend>
      <p className="capture-muted">
        Your capture is saved first. Project is a text label, not a new project
        account. The review time uses this device's local timezone.
      </p>
      <div className="capture-options">
        <div className="capture-field">
          <label htmlFor="follow-up-project">Project (optional)</label>
          <input
            className="input"
            type="text"
            id="follow-up-project"
            name="project"
            maxLength={200}
            value={value.project}
            disabled={disabled}
            aria-invalid={Boolean(errors.project)}
            aria-describedby={errors.project ? 'follow-up-project-error' : undefined}
            onChange={(event) => onChange({ ...value, project: event.target.value })}
          />
          {errors.project && (
            <small id="follow-up-project-error" className="capture-error">{errors.project}</small>
          )}
        </div>
        <div className="capture-field">
          <label htmlFor="follow-up-review">Review date and time (optional)</label>
          <input
            className="input"
            type="datetime-local"
            id="follow-up-review"
            name="review_at"
            value={value.reviewLocal}
            disabled={disabled}
            aria-invalid={Boolean(errors.review_at)}
            aria-describedby={errors.review_at ? 'follow-up-review-error' : undefined}
            onChange={(event) => onChange({ ...value, reviewLocal: event.target.value })}
          />
          {errors.review_at && (
            <small id="follow-up-review-error" className="capture-error">{errors.review_at}</small>
          )}
        </div>
      </div>
    </fieldset>
  );
}

/** Saved is always truthful even when the optional metadata PATCH fails. */
export function SavedFollowUp({
  captureId,
  duplicateOf,
  followUp,
  autoApply = true,
  onResolved,
}: {
  captureId: string;
  duplicateOf: string | null;
  followUp: FollowUpDraft;
  autoApply?: boolean;
  onResolved?: () => void;
}) {
  const [status, setStatus] = useState<'ready' | 'working' | 'done' | 'duplicate' | 'warning'>(
    hasFollowUp(followUp) ? 'ready' : 'done',
  );
  const [message, setMessage] = useState('');
  const started = useRef(false);

  async function apply() {
    if (!hasFollowUp(followUp) || status === 'working') return;
    setStatus('working');
    setMessage('');
    try {
      const outcome = await applyCaptureFollowUp(captureId, duplicateOf, followUp);
      if (outcome.status === 'conflict') {
        setStatus('warning');
        setMessage('Saved; project/reminder needs review. Someone changed this item. Open the saved item to edit it without overwriting existing details.');
      } else {
        setStatus(outcome.status === 'duplicate' ? 'duplicate' : 'done');
        if (outcome.status === 'duplicate') {
          setMessage('This capture reused an existing item. Its project and review date were not replaced. Open the item to make an explicit edit.');
        } else {
          setMessage('Saved, including the follow-up details.');
        }
        try {
          deletePendingFollowUp(captureId);
        } catch {
          setMessage((current) => current + ' Clear saved recovery data on a shared device.');
        }
        onResolved?.();
      }
    } catch (cause) {
      setStatus('warning');
      setMessage('Saved; project/reminder needs retry. ' +
        (cause instanceof Error ? cause.message : 'Follow-up could not be confirmed.'));
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (autoApply && hasFollowUp(followUp)) void apply();
  }, [autoApply, captureId]);

  if (!hasFollowUp(followUp)) return null;
  return (
    <section className="capture-follow-up-status" aria-label="Saved item follow-up">
      <p role={status === 'warning' ? 'alert' : 'status'} aria-live="polite" className={status === 'warning' ? 'capture-error' : ''}>
        {status === 'ready'
          ? 'Saved; optional project/reminder details are ready to apply.'
          : status === 'working'
            ? 'Saved; updating optional project/reminder details…'
            : message}
      </p>
      {(status === 'ready' || status === 'warning') && (
        <div className="capture-actions">
          <button className="btn btn-outline" type="button" onClick={() => void apply()}>
            Retry follow-up only
          </button>
          <Link className="btn btn-outline" to={`/items/${encodeURIComponent(captureId)}`}>
            Edit saved item
          </Link>
        </div>
      )}
    </section>
  );
}
