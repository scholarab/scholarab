-- One counter row per (key, window), replacing the row-per-hit tables.
--
-- The old shape could not be made atomic: `rate_limit` and `auth_rate_limit`
-- carry only a non-unique index, so there is nothing for ON CONFLICT to target
-- and every caller was left doing SELECT-count-then-INSERT as two round trips.
-- Concurrent requests all read the same pre-insert count and all passed, which
-- made the 5-per-15-minutes cap on the admin password bounded by the
-- attacker's concurrency rather than by 5. The Neon HTTP driver has no
-- transactions, so the atomicity has to fit inside one statement -- which the
-- primary key below makes possible.
CREATE TABLE IF NOT EXISTS rate_limit_counter (
  key text NOT NULL,
  window_start timestamp NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  CONSTRAINT rate_limit_counter_pk PRIMARY KEY (key, window_start)
);

-- Drives the 24h sweep only; the primary key already serves every read.
CREATE INDEX IF NOT EXISTS rate_limit_counter_window_idx
  ON rate_limit_counter (window_start);

-- `rate_limit` and `auth_rate_limit` are deliberately left in place. Deploys
-- are not ordered against migrations, so dropping them here would break the
-- still-running old code -- and on /admin/api/login a missing table is a 503
-- for everyone, not a fail-open. They hold nothing but expired hit rows and
-- can be dropped in a later migration once this one has been live a while.
