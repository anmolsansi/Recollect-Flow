import { useEffect, useState } from 'react';
import { ApiError, fetchApi } from './api';
import type {
  DigestDelivery,
  DigestDetails,
  DigestSummary,
  GeneratedDigest,
} from './digest.types';
import './DigestReviewPage.css';

function dateInIndia(value: string | null): string {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'DIGEST_PERIOD_DELIVERY_EXISTS') {
    return 'Another generation already has delivery history for this period. Inspect its delivery and reconcile it before doing anything else.';
  }
  return error instanceof Error ? error.message : 'Digest request failed.';
}

function deliveryDescription(delivery: DigestDelivery): string {
  switch (delivery.state) {
    case 'sent':
      return 'Confirmed sent. Do not send another copy.';
    case 'unknown':
      return 'Delivery outcome unknown. A message may already have arrived. Inspect the destination before reconciling. Never retry directly.';
    case 'failed':
      return 'Definite failure. Review the error before manually retrying.';
    case 'pending':
      return 'Queued or waiting for its eligible retry time. Not confirmed sent.';
    case 'leased':
      return 'Delivery attempt in progress. Do not submit another send.';
    case 'skipped':
      return 'Skipped. An empty period is not a successful delivered day.';
  }
}

export function DigestReviewPage() {
  const [summaries, setSummaries] = useState<DigestSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState<DigestDetails | null>(null);
  const [digestType, setDigestType] = useState<'daily' | 'weekly'>('daily');
  const [reviewer, setReviewer] = useState('admin');
  const [confirmedEvidence, setConfirmedEvidence] = useState(false);
  const [reconciledState, setReconciledState] = useState<'sent' | 'failed'>('sent');
  const [messageId, setMessageId] = useState('');
  const [listVersion, setListVersion] = useState(0);
  const [detailVersion, setDetailVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetchApi<DigestSummary[]>('/digests', { signal: controller.signal })
      .then((runs) => {
        if (controller.signal.aborted) return;
        setSummaries(runs);
        setSelectedId((old) => old || runs[0]?.id || '');
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(requestError));
      });
    return () => controller.abort();
  }, [listVersion]);

  useEffect(() => {
    const controller = new AbortController();
    setDetails(null);
    setLoading(Boolean(selectedId));
    setConfirmedEvidence(false);
    setMessageId('');
    if (!selectedId) {
      return () => controller.abort();
    }
    void fetchApi<DigestDetails>(
      '/digests/' + encodeURIComponent(selectedId),
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setDetails(data);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, detailVersion]);

  async function act(
    action: () => Promise<string | void>,
    description: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const nextId = await action();
      if (nextId) setSelectedId(nextId);
      setListVersion((value) => value + 1);
      setDetailVersion((value) => value + 1);
      setNotice(description);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function generate() {
    void act(async () => {
      const result = await fetchApi<GeneratedDigest>('/digests/generate', {
        method: 'POST',
        body: JSON.stringify({ digest_type: digestType }),
      });
      return result.run.id;
    }, 'Preview generated. No Telegram message was queued or sent.');
  }

  function markReviewed() {
    if (!details) return;
    void act(async () => {
      await fetchApi('/digests/' + encodeURIComponent(details.run.id) + '/review', {
        method: 'POST',
        body: JSON.stringify({ reviewed_by: reviewer.trim() || 'admin' }),
      });
    }, 'Digest marked reviewed. Delivery has not been queued.');
  }

  function regenerate() {
    if (!details) return;
    void act(async () => {
      const result = await fetchApi<GeneratedDigest>(
        '/digests/' + encodeURIComponent(details.run.id) + '/regenerate',
        { method: 'POST', body: '{}' },
      );
      return result.run.id;
    }, 'New generation created for review. The previous record was preserved.');
  }

  function queueDelivery() {
    if (!details || busy || details.run.reviewStatus !== 'reviewed') return;
    if (!window.confirm(
      'Queue this reviewed digest to the configured private Telegram destination? This can cause an external message. Previewing alone never sends.',
    )) return;
    void act(async () => {
      await fetchApi(
        '/digests/' + encodeURIComponent(details.run.id) + '/deliver',
        { method: 'POST', body: '{}' },
      );
    }, 'Delivery queued. This is not confirmation that Telegram received it.');
  }

  function reconcile(delivery: DigestDelivery) {
    if (!confirmedEvidence || delivery.state !== 'unknown') return;
    if (reconciledState === 'sent' && !messageId.trim()) {
      setError('Enter the actual Telegram message ID observed in the destination.');
      return;
    }
    void act(async () => {
      await fetchApi(
        '/digest-deliveries/' + encodeURIComponent(delivery.id) + '/reconcile',
        {
          method: 'POST',
          body: JSON.stringify({
            state: reconciledState,
            telegram_message_id:
              reconciledState === 'sent' ? messageId.trim() : null,
          }),
        },
      );
    }, 'Unknown delivery reconciled. The outcome is recorded in the audit history.');
  }

  function retry(delivery: DigestDelivery) {
    if (delivery.state !== 'failed') return;
    if (!window.confirm(
      'Retry this definite failed delivery? Only proceed after checking the earlier outcome.',
    )) return;
    void act(async () => {
      await fetchApi(
        '/digest-deliveries/' + encodeURIComponent(delivery.id) + '/retry',
        { method: 'POST', body: '{}' },
      );
    }, 'Failed delivery returned to the queue. It is not yet sent.');
  }

  return (
    <main className="main-content digest-review-page">
      <header>
        <h1>Digest review</h1>
        <p className="digest-muted">
          Review a private daily or weekly digest before queueing delivery.
          Generating a preview does not send Telegram or advance delivery history.
        </p>
      </header>

      <section className="card digest-controls" aria-label="Digest selection">
        <label htmlFor="digest-type">New preview type</label>
        <select
          id="digest-type"
          className="input"
          value={digestType}
          onChange={(event) => setDigestType(event.target.value as 'daily' | 'weekly')}
          disabled={busy}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={generate}>
          Generate preview only
        </button>
        <label htmlFor="digest-run">Inspect existing digest</label>
        <select
          id="digest-run"
          className="input"
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setError('');
            setNotice('');
          }}
          disabled={busy || summaries.length === 0}
        >
          {summaries.length === 0 && <option value="">No digest runs yet</option>}
          {summaries.map((run) => (
            <option key={run.id} value={run.id}>
              {run.digest_type} · {dateInIndia(run.period_start)} · generation {run.generation_version}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy || !selectedId}
          onClick={() => setDetailVersion((value) => value + 1)}
        >
          Refresh current state
        </button>
      </section>

      <p role="status" aria-live="polite">
        {busy ? 'Updating digest state…' : loading ? 'Loading preview…' : notice}
      </p>
      {error && <p role="alert" className="digest-error">{error}</p>}
      {!details && !loading && !selectedId && (
        <p>No digest has been generated yet. Start with a preview.</p>
      )}

      {details && (
        <>
          <section className="card" aria-label="Current digest preview">
            <h2>{details.run.digestType === 'daily' ? 'Daily digest' : 'Weekly review'}</h2>
            <dl className="digest-facts">
              <div><dt>Run ID</dt><dd><code>{details.run.id}</code></dd></div>
              <div><dt>Period starts, IST</dt><dd>{dateInIndia(details.run.periodStart)}</dd></div>
              <div><dt>Period ends, IST (exclusive)</dt><dd>{dateInIndia(details.run.periodEnd)}</dd></div>
              <div><dt>Timezone</dt><dd>{details.run.timezone}</dd></div>
              <div><dt>Generation</dt><dd>{details.run.generationVersion}</dd></div>
              <div><dt>Current eligible items</dt><dd>{details.preview.currentEligibleCount}</dd></div>
              <div><dt>Review</dt><dd>{details.run.reviewStatus}</dd></div>
              <div><dt>Delivery</dt><dd>{details.deliveries[0]?.state ?? 'Not queued'}</dd></div>
            </dl>
            <p className="digest-muted">
              Preview only, not a delivery receipt. Current privacy and deletion
              are rechecked when the Worker sends. Eligibility may change.
            </p>
            {details.preview.empty && (
              <p role="status">
                Empty period. Delivery will be skipped, not counted as a successful day.
              </p>
            )}
            <pre className="digest-message">{details.preview.text}</pre>
            {details.preview.items.length > 0 && (
              <>
                <h3>Current eligible items</h3>
                <ul className="digest-links">
                  {details.preview.items.map((item) => (
                    <li key={item.id}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
                {details.preview.currentEligibleCount > details.preview.items.length && (
                  <p className="digest-muted">Showing the first 50 eligible item links.</p>
                )}
              </>
            )}
          </section>

          <section className="card digest-controls" aria-label="Digest review actions">
            <h2>Review and queue</h2>
            <label htmlFor="digest-reviewer">Review operator</label>
            <input
              className="input"
              id="digest-reviewer"
              value={reviewer}
              maxLength={100}
              onChange={(event) => setReviewer(event.target.value)}
              disabled={busy}
            />
            <div className="digest-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={regenerate}
              >
                Regenerate preview
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || details.run.reviewStatus === 'reviewed'}
                onClick={markReviewed}
              >
                Mark reviewed
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || details.run.reviewStatus !== 'reviewed' ||
                  details.deliveries.length > 0 || details.preview.empty}
                onClick={queueDelivery}
              >
                Queue reviewed digest
              </button>
            </div>
            <p className="digest-muted">
              Queueing is separate from sending. If a different generation has
              already been queued or sent for this period, the server rejects a
              second delivery. Regeneration never changes a sent message.
            </p>
          </section>

          <section aria-label="Delivery and recovery status" className="digest-deliveries">
            <h2>Delivery records</h2>
            {details.deliveries.length === 0 && <p>No delivery has been queued.</p>}
            {details.deliveries.map((delivery) => (
              <article className="card" key={delivery.id}>
                <h3>Telegram · {delivery.state}</h3>
                <p>{deliveryDescription(delivery)}</p>
                <p><strong>Delivery ID:</strong> <code>{delivery.id}</code></p>
                <p>Attempts: {delivery.attempts}</p>
                <p>Next eligible time, IST: {dateInIndia(delivery.availableAt)}</p>
                {delivery.leaseExpiresAt && (
                  <p>Lease expires, IST: {dateInIndia(delivery.leaseExpiresAt)}</p>
                )}
                {delivery.lastErrorCode && (
                  <p>Safe error code: <code>{delivery.lastErrorCode}</code></p>
                )}
                {delivery.state === 'sent' && (
                  <p>Telegram message ID: {delivery.telegramMessageId ?? 'Unavailable'}</p>
                )}
                {delivery.state === 'failed' && (
                  <button type="button" disabled={busy} className="btn btn-outline" onClick={() => retry(delivery)}>
                    Retry definite failure
                  </button>
                )}
                {delivery.state === 'unknown' && (
                  <div className="digest-reconcile">
                    <p>
                      Check the configured Telegram destination and trusted provider
                      records using this run ID, delivery ID and attempt time. Do not
                      infer non-delivery from an absent message.
                    </p>
                    <label htmlFor={'reconcile-state-' + delivery.id}>Verified outcome</label>
                    <select
                      className="input"
                      id={'reconcile-state-' + delivery.id}
                      value={reconciledState}
                      onChange={(event) => setReconciledState(event.target.value as 'sent' | 'failed')}
                      disabled={busy}
                    >
                      <option value="sent">Confirmed sent</option>
                      <option value="failed">Confirmed not sent</option>
                    </select>
                    {reconciledState === 'sent' && (
                      <>
                        <label htmlFor={'message-id-' + delivery.id}>Observed Telegram message ID</label>
                        <input
                          id={'message-id-' + delivery.id}
                          className="input"
                          value={messageId}
                          maxLength={100}
                          onChange={(event) => setMessageId(event.target.value)}
                          disabled={busy}
                        />
                      </>
                    )}
                    <label className="digest-confirm">
                      <input
                        type="checkbox"
                        checked={confirmedEvidence}
                        onChange={(event) => setConfirmedEvidence(event.target.checked)}
                        disabled={busy}
                      />
                      I examined reliable delivery evidence and verified this
                      outcome. Message absence alone is not proof of failure.
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={busy || !confirmedEvidence ||
                        (reconciledState === 'sent' && !messageId.trim())}
                      onClick={() => reconcile(delivery)}
                    >
                      Record verified reconciliation
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
