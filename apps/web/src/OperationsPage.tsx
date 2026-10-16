import { useEffect, useState } from 'react';
import { fetchApi } from './api';
import type { OperationsSummary, UsageSnapshot } from './operations.types';
import './OperationsPage.css';

const REFRESH_MS = 60_000;
type Snapshot = { usage: UsageSnapshot; operations: OperationsSummary };

function timestamp(value: string | null): string {
  if (!value) return 'Unavailable';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? 'Unavailable' : time.toLocaleString();
}
function age(value: string | null, generated: string): string {
  if (!value) return 'Unavailable';
  const delta = new Date(generated).getTime() - new Date(value).getTime();
  return Number.isFinite(delta) && delta >= 0
    ? Math.floor(delta / 60_000).toLocaleString() + ' minutes'
    : 'Unavailable';
}
function label(value: string): string {
  return (
    (
      {
        requests: 'Requests',
        input_units: 'Estimated input units',
        output_units: 'Estimated output units',
        provider_units: 'Estimated provider units',
        warning_70: '70% warning',
        warning_90: '90% warning',
        hard: 'Hard stop',
        retry_wait: 'Waiting for retry time',
        failed: 'Failed, inspect before retry',
      } as Record<string, string>
    )[value] ?? value.replaceAll('_', ' ')
  );
}

export function OperationsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      try {
        const [usage, operations] = await Promise.all([
          fetchApi<UsageSnapshot>('/usage', { signal: current.signal }),
          fetchApi<OperationsSummary>('/operations/summary', {
            signal: current.signal,
          }),
        ]);
        if (!active || current.signal.aborted) return;
        setSnapshot({ usage, operations });
        setLastReceivedAt(new Date().toISOString());
        setError(null);
      } catch {
        if (active && !current.signal.aborted) {
          setError('Refresh failed. Last successful readings are stale.');
        }
      } finally {
        if (active && !current.signal.aborted) setLoading(false);
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  return (
    <main className="main-content operations-page">
      <header className="operations-heading">
        <div>
          <h1>Operations</h1>
          <p className="operations-muted">
            Private operational signals, not a provider billing dashboard.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setRefreshToken((n) => n + 1)}
        >
          Refresh
        </button>
      </header>
      <p className="operations-status" role="status" aria-live="polite">
        {loading && !snapshot ? 'Loading operations data…' : null}
        {error ? <strong className="operations-danger">{error}</strong> : null}
        {!error && snapshot ? 'Latest refresh succeeded.' : null}
        {lastReceivedAt
          ? ' Last successful refresh: ' + timestamp(lastReceivedAt) + '.'
          : null}
      </p>
      {!snapshot && !loading ? (
        <div className="card">
          <p>No successful reading is available.</p>
          <button
            className="btn btn-primary"
            onClick={() => setRefreshToken((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}
      {snapshot ? (
        <div className={error ? 'operations-stale' : ''}>
          {error ? (
            <p className="operations-warning">
              Stale snapshot. Do not treat counts or green statuses as current.
            </p>
          ) : null}
          <section aria-labelledby="usage-heading">
            <h2 id="usage-heading">AI usage and quota</h2>
            <p className="operations-muted">
              Policy {snapshot.usage.policy_version}. Measured{' '}
              {timestamp(snapshot.usage.generated_at)}. Warning levels:{' '}
              {snapshot.usage.warning_thresholds.warning_70 * 100}%,{' '}
              {snapshot.usage.warning_thresholds.warning_90 * 100}%, hard limit{' '}
              {snapshot.usage.warning_thresholds.hard * 100}%.
            </p>
            {snapshot.usage.windows.length === 0 ? (
              <div className="card">
                No active usage windows returned. This is not proof of zero
                historical usage or unlimited quota.
              </div>
            ) : (
              <div className="operations-grid">
                {snapshot.usage.windows.map((w) => (
                  <article
                    className="card"
                    key={w.provider + ':' + w.scope_key + ':' + w.window_start}
                  >
                    <h3>
                      {w.provider} · {w.window_kind}
                    </h3>
                    <p className="operations-muted">{w.scope_key}</p>
                    <p
                      className={
                        w.level === 'hard'
                          ? 'operations-danger'
                          : w.level === 'normal'
                            ? ''
                            : 'operations-warning'
                      }
                    >
                      <strong>{label(w.level)}</strong>
                    </p>
                    <p>Window ends {timestamp(w.window_end)}</p>
                    {w.dimensions.length === 0 ? (
                      <p>Limit dimensions unavailable.</p>
                    ) : (
                      <ul>
                        {w.dimensions.map((d) => (
                          <li key={d.dimension}>
                            {label(d.dimension)}: {d.used.toLocaleString()} /{' '}
                            {d.limit.toLocaleString()} used,{' '}
                            {d.remaining.toLocaleString()} remaining.
                            <small>
                              {' '}
                              {d.consumed.toLocaleString()} consumed +{' '}
                              {d.reserved.toLocaleString()} reserved.
                            </small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="operations-grid">
              <article className="card">
                <h3>Deferred AI work</h3>
                {snapshot.usage.deferred_jobs.length === 0 ? (
                  <p>No current capacity deferrals reported.</p>
                ) : (
                  <ul>
                    {snapshot.usage.deferred_jobs.map((row) => (
                      <li key={row.reason}>
                        {row.reason}: {row.count}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="operations-muted">
                  Manual retry cannot bypass hard limits.
                </p>
              </article>
              <article className="card">
                <h3>Circuit breakers</h3>
                {snapshot.usage.circuit_breakers.length === 0 ? (
                  <p>No breaker records reported.</p>
                ) : (
                  <ul>
                    {snapshot.usage.circuit_breakers.map((br) => (
                      <li key={br.provider + ':' + br.operation}>
                        {br.provider} / {br.operation}: {br.state}.{' '}
                        {br.next_probe_at
                          ? 'Next probe ' + timestamp(br.next_probe_at)
                          : 'Next probe unavailable'}
                        .
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
            <p className="operations-muted">
              Last successful provider calls:{' '}
              {snapshot.usage.last_successful_provider_calls.length === 0
                ? 'None reported'
                : snapshot.usage.last_successful_provider_calls
                    .map(
                      (s) =>
                        s.provider +
                        '/' +
                        s.operation +
                        ' at ' +
                        timestamp(s.at),
                    )
                    .join(' · ')}
            </p>
          </section>
          <section aria-labelledby="backlog-heading">
            <h2 id="backlog-heading">Processing and Notion backlog</h2>
            <p className="operations-muted">
              {snapshot.operations.backlog.scope}. Measured{' '}
              {timestamp(snapshot.operations.generated_at)}.
            </p>
            {snapshot.operations.backlog.truncated ? (
              <p className="operations-warning">
                Group limit reached. This is a partial summary, not a global
                total.
              </p>
            ) : null}
            {snapshot.operations.backlog.groups.length === 0 ? (
              <div className="card">
                No current queued, active, waiting, or failed jobs reported.
              </div>
            ) : (
              <div className="operations-grid">
                {snapshot.operations.backlog.groups.map((g) => (
                  <article
                    className="card"
                    key={
                      g.kind +
                      ':' +
                      g.type +
                      ':' +
                      g.status +
                      ':' +
                      (g.sample_error_code ?? 'none')
                    }
                  >
                    <h3>
                      {g.kind === 'sync' ? 'Notion sync' : 'Processing'} ·{' '}
                      {g.type}
                    </h3>
                    <p>
                      <strong>{g.count.toLocaleString()}</strong> ·{' '}
                      {label(g.status)}
                    </p>
                    <p>
                      Oldest job:{' '}
                      {age(
                        g.oldest_created_at,
                        snapshot.operations.generated_at,
                      )}
                    </p>
                    <p>
                      Oldest eligible queued:{' '}
                      {g.oldest_eligible_created_at
                        ? age(
                            g.oldest_eligible_created_at,
                            snapshot.operations.generated_at,
                          )
                        : 'None in this group'}
                    </p>
                    {g.next_available_at ? (
                      <p>Next retry: {timestamp(g.next_available_at)}</p>
                    ) : null}
                    {g.sample_error_code ? (
                      <p>Reason code: {g.sample_error_code} ({g.count} in this group)</p>
                    ) : null}
                    <a
                      href={
                        '/api/v1/jobs?kind=' +
                        g.kind +
                        '&status=' +
                        g.status +
                        '&type=' +
                        encodeURIComponent(g.type) +
                        '&limit=50'
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Inspect up to 50 jobs
                    </a>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section aria-labelledby="recovery-heading">
            <h2 id="recovery-heading">Recovery signals</h2>
            <div className="operations-grid">
              <article className="card">
                <h3>Purge and backup</h3>
                <p>
                  Partial purge workflows:{' '}
                  {snapshot.operations.recovery.partial_purges}
                </p>
                {snapshot.operations.recovery.partial_purge_samples.map(
                  (purge) => (
                    <p key={purge.id}>
                      <a
                        href={'/api/v1/purges/' + encodeURIComponent(purge.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspect purge {purge.id}
                      </a>
                      {purge.last_error_code
                        ? ' · ' + purge.last_error_code
                        : ''}
                    </p>
                  ),
                )}
                <p>
                  Failed hosted backups:{' '}
                  {snapshot.operations.recovery.failed_backups}
                </p>
                <p>
                  Latest verified backup:{' '}
                  {snapshot.operations.recovery.latest_verified_backup
                    ? snapshot.operations.recovery.latest_verified_backup.id +
                      ' · ' +
                      timestamp(
                        snapshot.operations.recovery.latest_verified_backup
                          .verified_at,
                      )
                    : 'Unavailable, no verified backup recorded'}
                </p>
                <a href="/api/v1/backups" target="_blank" rel="noreferrer">
                  Inspect backup records
                </a>
                <p className="operations-muted">
                  A partial purge requires per-workflow inspection, not a
                  generic retry.
                </p>
              </article>
              <article className="card">
                <h3>Integrity and delivery</h3>
                <p>
                  Latest integrity check:{' '}
                  {snapshot.operations.recovery.latest_integrity
                    ? snapshot.operations.recovery.latest_integrity.state +
                      ' · ' +
                      snapshot.operations.recovery.latest_integrity
                        .finding_count +
                      ' findings'
                    : 'Unavailable, no check recorded'}
                </p>
                {snapshot.operations.recovery.latest_integrity ? (
                  <a
                    href={
                      '/api/v1/integrity-checks/' +
                      encodeURIComponent(
                        snapshot.operations.recovery.latest_integrity.id,
                      )
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect integrity result
                  </a>
                ) : null}
                <p>
                  Ambiguous digest deliveries:{' '}
                  {snapshot.operations.recovery.ambiguous_digests}
                </p>
                <p>
                  Missing Notion projections:{' '}
                  {snapshot.operations.recovery.missing_notion_projections}
                </p>
                <a
                  href="https://github.com/anmolsansi/Recollect-Flow/blob/main/docs/RECOLLECTFLOW_BUILD_GUIDE.md#33-bg-27--make-digest-review-and-delivery-uncertainty-operable"
                  target="_blank"
                  rel="noreferrer"
                >
                  Digest reconciliation guidance
                </a>
              </article>
            </div>
          </section>
          <section aria-labelledby="storage-heading">
            <h2 id="storage-heading">Storage indicators</h2>
            <div className="card">
              <p>
                Attachment metadata:{' '}
                {snapshot.operations.storage.recorded_objects.toLocaleString()}{' '}
                objects,{' '}
                {snapshot.operations.storage.recorded_bytes.toLocaleString()}{' '}
                bytes.
              </p>
              <p>
                Orphaned metadata:{' '}
                {snapshot.operations.storage.orphaned_objects.toLocaleString()}{' '}
                objects,{' '}
                {snapshot.operations.storage.orphaned_bytes.toLocaleString()}{' '}
                bytes.
              </p>
              <p className="operations-muted">
                {snapshot.operations.storage.source}. Recorded{' '}
                {timestamp(snapshot.operations.storage.measured_at)}.
              </p>
              <p>
                Actual R2 bucket objects/bytes and D1 capacity/rows
                read/written: unavailable. Use Cloudflare dashboards for
                provider-measured totals.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
