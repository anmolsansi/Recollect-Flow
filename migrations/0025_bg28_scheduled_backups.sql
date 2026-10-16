-- BG-28: idempotent weekly hosted portable JSON creation.
-- Activation is opt-in; this table does not itself schedule work.
-- The unique UTC Monday key prevents overlapping weekly Cron retries from
-- creating multiple artifacts in the same period.
CREATE TABLE scheduled_backup_periods (
  period_key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('running', 'complete', 'failed')),
  backup_id TEXT,
  claimed_at TEXT NOT NULL,
  finished_at TEXT,
  failure_code TEXT
);

CREATE INDEX idx_scheduled_backup_periods_state
  ON scheduled_backup_periods(state, claimed_at DESC);
