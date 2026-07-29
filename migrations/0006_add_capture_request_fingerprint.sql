-- Bind idempotency keys to the payload that first claimed them.
-- Existing events remain replay-compatible until they are naturally replaced.

ALTER TABLE capture_events ADD COLUMN request_fingerprint TEXT;

CREATE INDEX idx_capture_events_request_fingerprint
  ON capture_events(request_fingerprint);
